// CartPage.jsx
import React, { useEffect, useState } from "react";
import { supabase } from "@/supabaseClient";
import { useUser } from "@/components/Contexts/userContext";

/**
 * CartPage - DB-only cart + checkout UI (Paystack-ready)
 *
 * Notes:
 * - This expects a Supabase Edge Function endpoint (server-side) that initializes Paystack.
 * - The function URL should be in REACT_APP_PAYSTACK_INIT_URL or it will use a sensible default.
 * - The front-end sends an Authorization bearer token (current session access token) to the edge function.
 * - The payload sent includes order_id and items (client-side values used only for cross-check; server MUST validate).
 */

const CartPage = () => {
  const { userData } = useUser();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // checkout form state
  const [billingName, setBillingName] = useState("");
  const [billingEmail, setBillingEmail] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("paystack"); // 'paystack' | 'transfer'
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState(null);

  // ENV: paystack init URL (Supabase Edge Function)
  const PAYSTACK_INIT_URL =
    "https://sfpgcjkmpqijniyzykau.supabase.co/functions/v1/initiate-payment";

  // -------------------- Load Cart --------------------
  const loadCart = async () => {
    setLoading(true);
    try {
      if (!userData?.user_id) {
        setOrders([]);
        return;
      }

      const { data, error } = await supabase
        .from("orders")
        .select(
          `
          id,
          status,
          total_amount,
          created_at,
          order_items (
            id,
            product_id,
            quantity,
            price,
            products (name, product_image, description)
          )
        `
        )
        .eq("parent_id", userData.user_id, )
        .eq("status", "pending")   // ✅ Only fetch pending orders
        .order("created_at", { ascending: false });
        

      if (error) throw error;
      setOrders(data || []);
    } catch (err) {
      console.error("Error loading cart:", err?.message || err);
      setMessage({ type: "error", text: "Failed to load cart." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userData]);

  // -------------------- Compute totals --------------------
  const computeOrderTotal = (order) =>
    (order?.order_items || []).reduce(
      (sum, it) => sum + (Number(it.price) || 0) * (Number(it.quantity) || 0),
      0
    );

  const grandTotal = (orders || []).reduce((g, order) => g + computeOrderTotal(order), 0);

  // -------------------- Remove item --------------------
  const handleRemove = async (orderId, productId) => {
    try {
      setIsProcessing(true);
      setMessage(null);

      const { error } = await supabase
        .from("order_items")
        .delete()
        .eq("order_id", orderId)
        .eq("product_id", productId);

      if (error) throw error;

      // Cleanup order if empty
      const { count, error: cntErr } = await supabase
        .from("order_items")
        .select("*", { count: "exact", head: true })
        .eq("order_id", orderId);

      if (cntErr) {
        console.warn("Count check error:", cntErr);
      } else if (count === 0) {
        const { error: delOrderErr } = await supabase.from("orders").delete().eq("id", orderId);
        if (delOrderErr) console.warn("Failed to delete empty order:", delOrderErr);
      }

      // Refresh UI
      await loadCart();
      setMessage({ type: "success", text: "Item removed." });
    } catch (err) {
      console.error("Error removing item:", err?.message || err);
      setMessage({ type: "error", text: "Could not remove item." });
    } finally {
      setIsProcessing(false);
    }
  };

  // -------------------- Dummy fallback (dev only) --------------------
  // When the real payment flow is not available (dev), this gives developer peace of mind.
  // This DOES NOT call Paystack or modify DB state. It's purely client-side message simulation.
  const simulateDummyPayment = async () => {
    try {
      // small delay to simulate network
      await new Promise((res) => setTimeout(res, 700));
      setMessage({
        type: "success",
        text: "Dummy payment simulated — this does NOT update DB. Implement webhook + verify for real payments.",
      });
      return true;
    } catch (err) {
      console.error("simulateDummyPayment error:", err);
      setMessage({ type: "error", text: "Dummy payment failed." });
      return false;
    }
  };

  // -------------------- Payment initiation --------------------
  const startPayment = async () => {
    if (!userData?.user_id) {
      setMessage({ type: "error", text: "You must be signed in to pay." });
      return;
    }

    if ((orders || []).length === 0) {
      setMessage({ type: "error", text: "No orders to pay for." });
      return;
    }
    if (!billingEmail || !billingName) {
      setMessage({ type: "error", text: "Please provide name and email for billing." });
      return;
    }

    setIsProcessing(true);
    setMessage(null);

    try {
      // compute total in kobo (Paystack expects smallest currency unit)
      const amountNaira = grandTotal;
      const amountKobo = Math.round(amountNaira * 100);

      // Build metadata — we'll include order ids and minimal items info
      const metadata = {
        orders: orders.map((o) => ({
          order_id: o.id,
          items: (o.order_items || []).map((it) => ({
            product_id: it.product_id,
            qty: it.quantity,
            price: it.price,
          })),
        })),
      };

      // Get the current user's access token from Supabase client
      const {
        data: { session },
        error: sessionErr,
      } = await supabase.auth.getSession();

      if (sessionErr) {
        console.warn("getSession error:", sessionErr);
      }

      const token = session?.access_token;
      if (!token) {
        // If token is missing, we can't call protected edge function
        throw new Error("Missing auth token. Please re-login and try again.");
      }

      // Prepare body: we include a single order_id if you prefer one-transaction-per-order,
      // but here we send the full metadata. Your server is the final authority.
      const bodyPayload = {
        amount: amountKobo,
        email: billingEmail,
        name: billingName,
        // send the client-side items too (server must validate using DB)
        metadata,
        // include an explicit list of order ids (helps server)
        order_ids: orders.map((o) => o.id),
      };

      // Call backend to initialize transaction (Edge Function)
      const resp = await fetch(PAYSTACK_INIT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`, // vital: the edge function validates user
        },
        body: JSON.stringify(bodyPayload),
      });

      // If network-level failure
      if (!resp) {
        throw new Error("No response from payment server.");
      }

      // If server responded with non-OK, read details and fail gracefully.
      if (!resp.ok) {
        const txt = await resp.text().catch(() => null);
        console.warn("Paystack init failed:", resp.status, txt);
        setMessage({
          type: "error",
          text: `Payment initiation failed (backend ${resp.status}): ${
            txt || "no detail"
          }`,
        });

        // Do not auto-fallback to dummy in production errors that look real.
        // But during development, simulate as convenience if CORS/edge not ready.
        // We decide based on status: 500/502 -> try simulate; 401/403 -> do NOT simulate.
        if (resp.status >= 500 || resp.status === 0) {
          await simulateDummyPayment();
        }

        return;
      }

      const payload = await resp.json().catch(() => null);

      // The Edge Function returns { success: true, data: { authorization_url, reference, ... } }
      const authorizationUrl =
        payload?.data?.authorization_url ||
        payload?.authorization_url ||
        payload?.url ||
        payload?.data?.authorizationUrl ||
        payload?.data?.url;

      if (authorizationUrl) {
        // Redirect user to Paystack checkout page
        window.location.href = authorizationUrl;
        return;
      }

      // maybe server returned a reference (inline preferred)
      const reference = payload?.data?.reference || payload?.reference || payload?.data?.reference;
      if (reference) {
        setMessage({
          type: "info",
          text: `Payment initiated. Reference: ${reference}. Use verify endpoint to confirm.`,
        });
        return;
      }

      // Nothing useful returned -> fallback to dummy for dev
      console.warn("Paystack init response missing url/reference:", payload);
      await simulateDummyPayment();
    } catch (err) {
      console.error("Payment error:", err?.message || err);
      setMessage({
        type: "error",
        text: `Payment initiation failed: ${err?.message || "Unknown error"}`,
      });

      // Try a safe dummy fallback (dev convenience)
      await simulateDummyPayment();
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) return <p className="p-6">Loading cart...</p>;

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: orders list */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-3xl font-bold text-gray-800">Your Cart</h2>

          {orders.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <p className="text-gray-600">No items in your cart.</p>
            </div>
          ) : (
            orders.map((order) => {
              const orderTotal = computeOrderTotal(order);
              return (
                <div key={order.id} className="bg-white rounded-2xl shadow p-5">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-700">Order #{order.id}</h3>
                      <p className="text-sm text-gray-500">
                        Created: {new Date(order.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="mt-3 md:mt-0">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                          order.status === "pending" ? "bg-yellow-100 text-yellow-800" : "bg-green-100 text-green-800"
                        }`}
                      >
                        {order.status === "pending" ? "Not Paid" : "Paid"}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {order.order_items.map((it) => (
                      <div key={it.id} className="flex gap-4 items-center border-b pb-4">
                        <img
                          src={it.products?.product_image || "/placeholder.png"}
                          alt={it.products?.name}
                          className="w-20 h-20 rounded-lg object-cover"
                        />
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-medium text-gray-800">{it.products?.name}</h4>
                              <p className="text-sm text-gray-500">{it.products?.description || ""}</p>
                            </div>
                            <div className="text-right">
                              <div className="text-sm text-gray-500">₦{Number(it.price).toLocaleString()} each</div>
                              <div className="font-semibold">₦{(Number(it.price) * Number(it.quantity)).toLocaleString()}</div>
                            </div>
                          </div>
                          <div className="mt-2 flex items-center gap-3">
                            <div className="text-sm text-gray-600">Qty: {it.quantity}</div>
                            {order.status === "pending" && (
                              <button
                                onClick={() => handleRemove(order.id, it.product_id)}
                                disabled={isProcessing}
                                className="ml-auto inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-between items-center mt-4 pt-3 border-t">
                    <div className="text-sm text-gray-600">Order total</div>
                    <div className="text-lg font-bold">₦{orderTotal.toLocaleString()}</div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right: summary & payment */}
        <aside className="bg-white rounded-2xl shadow p-5 sticky top-6">
          <h3 className="text-xl font-semibold text-gray-700 mb-3">Order Summary</h3>

          <div className="mb-4">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Items total</span>
              <span>₦{grandTotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between mt-2 font-semibold text-gray-900">
              <span>Grand Total</span>
              <span>₦{grandTotal.toLocaleString()}</span>
            </div>
          </div>

          <div className="border-t pt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Billing</h4>
            <label className="text-xs text-gray-500">Full name</label>
            <input
              value={billingName}
              onChange={(e) => setBillingName(e.target.value)}
              className="w-full mt-1 mb-3 p-2 border rounded-md text-sm"
              placeholder="Your full name"
            />
            <label className="text-xs text-gray-500">Email</label>
            <input
              value={billingEmail}
              onChange={(e) => setBillingEmail(e.target.value)}
              className="w-full mt-1 mb-3 p-2 border rounded-md text-sm"
              placeholder="you@example.com"
            />
          </div>

          <div className="mt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Payment</h4>
            <div className="flex flex-col gap-2">
              <label className={`p-3 rounded-lg border cursor-pointer ${paymentMethod === "paystack" ? "ring-2 ring-blue-200 bg-blue-50" : ""}`}>
                <input
                  type="radio"
                  name="pm"
                  value="paystack"
                  checked={paymentMethod === "paystack"}
                  onChange={() => setPaymentMethod("paystack")}
                  className="mr-2"
                />
                Pay with card (Paystack)
              </label>

              <label className={`p-3 rounded-lg border cursor-pointer ${paymentMethod === "transfer" ? "ring-2 ring-blue-200 bg-blue-50" : ""}`}>
                <input
                  type="radio"
                  name="pm"
                  value="transfer"
                  checked={paymentMethod === "transfer"}
                  onChange={() => setPaymentMethod("transfer")}
                  className="mr-2"
                />
                Bank Transfer / Manual
              </label>
            </div>
          </div>

          {message && (
            <div className={`mt-4 p-3 rounded-md text-sm ${message.type === "error" ? "bg-red-50 text-red-700" : message.type === "success" ? "bg-green-50 text-green-700" : "bg-blue-50 text-blue-700"}`}>
              {message.text}
            </div>
          )}

          <div className="mt-4">
            <button
              onClick={startPayment}
              disabled={isProcessing || orders.length === 0}
              className="w-full inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-semibold disabled:opacity-60"
            >
              {isProcessing ? "Processing..." : `Pay Now • ₦${grandTotal.toLocaleString()}`}
            </button>

            <button
              onClick={() => {
                setMessage({
                  type: "info",
                  text: "Manual payment selected — implement bank transfer instructions.",
                });
              }}
              className="w-full mt-3 inline-flex items-center justify-center gap-2 border border-gray-200 px-4 py-2 rounded-lg text-gray-700"
            >
              Pay later / Bank transfer
            </button>
          </div>

          <p className="mt-3 text-xs text-gray-500">
            By clicking Pay Now you'll be redirected to the payment gateway. Ensure your server endpoint is set in{" "}
            <code className="bg-gray-100 px-1 rounded">REACT_APP_PAYSTACK_INIT_URL</code>.
          </p>
        </aside>
      </div>
    </div>
  );
};

export default CartPage;
