// src/Pages/ReceiptPage.jsx
import React, { useEffect, useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import { supabase } from "../supabaseClient"; // adjust path if needed
import { useAuth } from "../components/Contexts/AuthContext";

export default function ReceiptPage() {
  const { userId, orderId } = useParams(); // updated to read userId
  const location = useLocation(); // for query params
  const { session } = useAuth(); // get current session (user token)
  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // optional: read trxref or reference from query params
  const trxRef = new URLSearchParams(location.search).get("trxref");

  useEffect(() => {
    const fetchReceipt = async () => {
      try {
        if (!session) {
          setError("You must be logged in to view this receipt.");
          setLoading(false);
          return;
        }

        console.log("Fetching receipt for order:", orderId, "user:", userId, "trxRef:", trxRef);

        // call the deployed function "getrecipt"
        const { data, error: funcError } = await supabase.functions.invoke(
          "getrecipt",
          {
            method: "POST",
            body: { order_id: orderId },
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          }
        );

        console.log("Function response:", data, funcError);

        if (funcError) {
          setError(funcError.message || "Error fetching receipt.");
          setLoading(false);
          return;
        }

        setReceipt(data);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching receipt:", err);
        setError("Failed to load receipt.");
        setLoading(false);
      }
    };

    fetchReceipt();
  }, [orderId, userId, session, trxRef]);

  if (loading) return <p>Loading receipt...</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;
  if (!receipt) return <p>No receipt found.</p>;

  return (
    <div style={{ padding: "20px" }}>
      <h2>Receipt</h2>
      <p><strong>Order ID:</strong> {receipt.order_id}</p>
      <p><strong>Status:</strong> {receipt.status}</p>
      <p><strong>Paid At:</strong> {receipt.paid_at}</p>
      <p><strong>Transaction Ref:</strong> {receipt.transaction_ref}</p>
      <p><strong>Total:</strong> ₦{receipt.total_amount}</p>

      <h3>Items</h3>
      <ul>
        {receipt.items.map((item, index) => (
          <li key={index}>
            <strong>{item.product_name}</strong> - {item.quantity} × ₦{item.unit_price} = ₦{item.subtotal}
            <br />
            <em>{item.description}</em>
          </li>
        ))}
      </ul>
    </div>
  );
}
