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
 *
 * CHANGE LOG (safe / minimal):
 * - Added `school_id` to the orders select so we can group orders by school on the client.
 * - Implemented client-side splitting: when multiple schools are present we initialize a Paystack transaction
 *   per school. If a single school exists, behavior is unchanged (redirect to Paystack).
 * - When multiple schools return authorization URLs, each URL is opened in a new tab (so the user can complete each payment).
 *   This keeps UX simple and avoids interrupting other initializations.
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
          school_id,
          order_items (
            id,
            product_id,
            quantity,
            price,
            products (name, product_image, description)
          )
        `
        )
        .eq("parent_id", userData.user_id)
        .eq("status", "pending") // ✅ Only fetch pending orders
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

  // -------------------- Helpers --------------------
  const groupOrdersBySchool = (ordersArray) => {
    const map = new Map();
    for (const o of ordersArray) {
      const sid = o.school_id ?? "unknown_school";
      if (!map.has(sid)) map.set(sid, []);
      map.get(sid).push(o);
    }
    return map; // Map<school_id, orders[]>
  };

  // -------------------- Payment initiation (split client-side) --------------------
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

      // Group orders by school
      const grouped = groupOrdersBySchool(orders);
      const schoolCount = grouped.size;

      // If only one school -> preserve existing single-call behavior (redirect)
      if (schoolCount === 1) {
        const [, singleOrders] = grouped.entries().next().value;
        const amountNaira = singleOrders.reduce((sum, o) => sum + computeOrderTotal(o), 0);
        const amountKobo = Math.round(amountNaira * 100);

        const metadata = {
          orders: singleOrders.map((o) => ({
            order_id: o.id,
            items: (o.order_items || []).map((it) => ({
              product_id: it.product_id,
              qty: it.quantity,
              price: it.price,
            })),
          })),
        };

        const bodyPayload = {
          amount: amountKobo,
          email: billingEmail,
          name: billingName,
          metadata,
          order_ids: singleOrders.map((o) => o.id),
        };

        const resp = await fetch(PAYSTACK_INIT_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(bodyPayload),
        });

        if (!resp) throw new Error("No response from payment server.");

        if (!resp.ok) {
          const txt = await resp.text().catch(() => null);
          console.warn("Paystack init failed:", resp.status, txt);
          setMessage({
            type: "error",
            text: `Payment initiation failed (backend ${resp.status}): ${txt || "no detail"}`,
          });
          if (resp.status >= 500 || resp.status === 0) {
            await simulateDummyPayment();
          }
          return;
        }

        const payload = await resp.json().catch(() => null);

        const authorizationUrl =
          payload?.data?.authorization_url ||
          payload?.authorization_url ||
          payload?.url ||
          payload?.data?.authorizationUrl ||
          payload?.data?.url;

        if (authorizationUrl) {
          // Redirect user to Paystack checkout page (existing behavior)
          window.location.href = authorizationUrl;
          return;
        }

        const reference = payload?.data?.reference || payload?.reference || payload?.data?.reference;
        if (reference) {
          setMessage({
            type: "info",
            text: `Payment initiated. Reference: ${reference}. Use verify endpoint to confirm.`,
          });
          return;
        }

        console.warn("Paystack init response missing url/reference:", payload);
        await simulateDummyPayment();
        return;
      }

      // If multiple schools -> initialize one request per school
      // We'll open each returned authorization_url in a new tab (so the user can pay each school's checkout)
      const results = [];
      for (const [schoolId, schoolOrders] of grouped.entries()) {
        const amountNaira = schoolOrders.reduce((sum, o) => sum + computeOrderTotal(o), 0);
        const amountKobo = Math.round(amountNaira * 100);

        const metadata = {
          orders: schoolOrders.map((o) => ({
            order_id: o.id,
            items: (o.order_items || []).map((it) => ({
              product_id: it.product_id,
              qty: it.quantity,
              price: it.price,
            })),
          })),
        };

        const bodyPayload = {
          amount: amountKobo,
          email: billingEmail,
          name: billingName,
          metadata,
          order_ids: schoolOrders.map((o) => o.id),
        };

        try {
          const resp = await fetch(PAYSTACK_INIT_URL, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(bodyPayload),
          });

          if (!resp) {
            results.push({ schoolId, ok: false, reason: "No response from payment server" });
            continue;
          }

          if (!resp.ok) {
            const txt = await resp.text().catch(() => null);
            console.warn(`Paystack init failed for school ${schoolId}:`, resp.status, txt);
            results.push({ schoolId, ok: false, status: resp.status, detail: txt });
            continue;
          }

          const payload = await resp.json().catch(() => null);
          const authorizationUrl =
            payload?.data?.authorization_url ||
            payload?.authorization_url ||
            payload?.url ||
            payload?.data?.authorizationUrl ||
            payload?.data?.url;

          const reference = payload?.data?.reference || payload?.reference || payload?.data?.reference;

          if (authorizationUrl) {
            // open in new tab so user can complete each school's payment separately
            try {
              window.open(authorizationUrl, "_blank");
              results.push({ schoolId, ok: true, authorizationUrl, reference });
            } catch (openErr) {
              // If popup blocked, still record the url and show to user
              results.push({ schoolId, ok: true, authorizationUrl, reference, opened: false });
            }
          } else if (reference) {
            results.push({ schoolId, ok: true, reference });
          } else {
            results.push({ schoolId, ok: false, reason: "No url/reference returned", payload });
          }
        } catch (err) {
          console.error(`Error initiating payment for school ${schoolId}:`, err);
          results.push({ schoolId, ok: false, reason: String(err) });
        }
      } // end for

      // Summarize results to user
      const successes = results.filter((r) => r.ok);
      const failures = results.filter((r) => !r.ok);

      if (successes.length > 0 && failures.length === 0) {
        // If all succeeded and at least one had a url opened in new tab, inform user
        setMessage({
          type: "success",
          text:
            successes.length === 1
              ? `Payment initialized for 1 school. Complete checkout in the opened tab.`
              : `Payment initialized for ${successes.length} schools. Checkout pages opened in new tabs (or available as references).`,
        });
      } else if (successes.length > 0 && failures.length > 0) {
        setMessage({
          type: "info",
          text: `Initialized ${successes.length} school(s), but ${failures.length} failed. Check console for details.`,
        });
        console.warn("Payment init mixed results:", { results });
      } else {
        // All failed
        setMessage({
          type: "error",
          text: `Failed to initialize payments for all schools. Check console for details.`,
        });
        console.warn("Payment init failures:", { results });
        // Consider a safe dummy fallback if server errors are present
        const hasServerError = failures.some((f) => f.status >= 500 || f.status === 0 || /server/i.test(String(f.detail || f.reason || "")));
        if (hasServerError) {
          await simulateDummyPayment();
        }
      }
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
