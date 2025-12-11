// src/Pages/ReceiptPage.jsx
import React, { useEffect, useState, useRef } from "react";
import { supabase } from "../supabaseClient";
import { useUser } from "../components/Contexts/userContext";
import Logo from "../assets/cosmic.png";

export default function ReceiptPage() {
  const { userData } = useUser();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const containerRef = useRef(null);
  const pageSize = 5; // number of sessions per fetch

  // Fetch paginated sessions
  const fetchSessions = async () => {
    if (!userData?.user_id) return;
    setLoading(true);
    try {
      const { data: fetchedSessions, error: sessionError } = await supabase
        .from("checkout_sessions")
        .select("*")
        .eq("user_id", userData.user_id)
        .eq("status", "paid")
        .order("created_at", { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (sessionError) throw sessionError;
      if (!fetchedSessions || fetchedSessions.length === 0) return;

      // Fetch orders and items for each session
      const allSessionsWithItems = await Promise.all(
        fetchedSessions.map(async (session) => {
          const orderIds = session.order_ids || [];
          if (!orderIds.length) return { ...session, items: [] };

          const { data: items } = await supabase
            .from("order_items")
            .select(`
              id,
              order_id,
              quantity,
              price,
              products (
                name,
                description,
                product_image
              )
            `)
            .in("order_id", orderIds);

          const formattedItems = (items || []).map((item) => ({
            product_name: item.products?.name || "Unknown Product",
            description: item.products?.description || "",
            product_image: item.products?.product_image || null,
            unit_price: Number(item.price),
            quantity: item.quantity,
            subtotal: Number(item.price) * item.quantity,
          }));

          return {
            ...session,
            items: formattedItems,
            total_amount: formattedItems.reduce((acc, cur) => acc + cur.subtotal, 0),
          };
        })
      );

      setSessions((prev) => [...prev, ...allSessionsWithItems]);
      setPage((prev) => prev + 1);
    } catch (err) {
      console.error("Error fetching sessions:", err);
      setError("Failed to load receipts.");
    } finally {
      setLoading(false);
    }
  };

  // Infinite scroll
  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;
      const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
      if (scrollTop + clientHeight >= scrollHeight - 100 && !loading) {
        fetchSessions();
      }
    };
    const container = containerRef.current;
    container?.addEventListener("scroll", handleScroll);
    return () => container?.removeEventListener("scroll", handleScroll);
  }, [loading, userData, page]);

  useEffect(() => {
    setSessions([]);
    setPage(0);
    if (userData?.user_id) fetchSessions();
  }, [userData]);

  if (!userData) return <p className="p-6">Please log in to view your receipts.</p>;
  if (error) return <p className="p-6 text-red-500">{error}</p>;

  return (
    <div
      ref={containerRef}
      className="p-6 max-w-4xl mx-auto bg-gray-50 min-h-screen overflow-y-auto space-y-4"
    >
      <h1 className="text-3xl font-bold mb-4 text-center">My Receipts</h1>
      {sessions.map((session, idx) => (
        <details
          key={session.id}
          className="bg-white rounded-xl shadow p-4 hover:shadow-md transition-shadow"
        >
          <summary className="flex items-center justify-between cursor-pointer">
            <div className="flex items-center gap-4">
              <img src={Logo} alt="Company Logo" className="w-10 h-10 object-cover rounded-full" />
              <div>
                <p className="font-semibold">Session ID: {session.id}</p>
                <p className="text-sm text-gray-500">
                  Paid At: {new Date(session.created_at).toLocaleString()}
                </p>
              </div>
            </div>
            <p className="font-bold">₦{session.total_amount.toLocaleString()}</p>
          </summary>

          <div className="mt-4 border-t pt-4 space-y-4">
            <p><strong>Paystack Ref:</strong> {session.paystack_ref}</p>
            <ul className="space-y-2">
              {session.items.map((item, i) => (
                <li key={i} className="flex gap-4 items-center">
                  {item.product_image && (
                    <img
                      src={item.product_image}
                      alt={item.product_name}
                      className="w-16 h-16 object-cover rounded"
                    />
                  )}
                  <div>
                    <p className="font-semibold">{item.product_name}</p>
                    <p className="text-sm text-gray-600">{item.description}</p>
                    <p className="text-sm">
                      {item.quantity} × ₦{item.unit_price.toLocaleString()} = ₦{item.subtotal.toLocaleString()}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </details>
      ))}

      {loading && <p className="text-center mt-4">Loading more receipts...</p>}
      {!loading && sessions.length === 0 && <p className="text-center mt-4">No receipts found.</p>}
    </div>
  );
}
