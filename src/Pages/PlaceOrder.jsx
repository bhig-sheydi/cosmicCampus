import React, { useEffect, useState } from "react";
import { supabase } from "@/supabaseClient";
import { useUser } from "@/components/Contexts/userContext";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

const PAGE_SIZE = 20; // 🔑 Products per fetch

const PlaceOrder = () => {
  const { userData } = useUser();
  const navigate = useNavigate();

  const [schools, setSchools] = useState([]);
  const [selectedSchool, setSelectedSchool] = useState(null);

  const [children, setChildren] = useState([]);
  const [products, setProducts] = useState([]);

  const [cart, setCart] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [modalProduct, setModalProduct] = useState(null);
  const [selectedChild, setSelectedChild] = useState("");
  const [quantity, setQuantity] = useState(1);

  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // ✅ Load cart from localStorage
  useEffect(() => {
    try {
      const storedCart = localStorage.getItem("guardian_cart");
      if (storedCart) setCart(JSON.parse(storedCart));
    } catch (err) {
      console.error("Error loading cart from storage:", err?.message || err);
    }
  }, []);

  // ✅ Save cart to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("guardian_cart", JSON.stringify(cart));
    } catch (err) {
      console.error("Error saving cart to storage:", err?.message || err);
    }
  }, [cart]);

  // ✅ Fetch guardian's schools + children (lean fetch)
  useEffect(() => {
    const fetchSchoolsAndChildren = async () => {
      if (!userData?.user_id) return;

      try {
        const { data: guardianChildren, error: childrenError } = await supabase
          .from("guardian_children")
          .select("child_id")
          .eq("guardian_name", userData.user_id);

        if (childrenError) throw new Error(childrenError.message);
        if (!guardianChildren?.length) return;

        const childIds = guardianChildren.map((c) => c.child_id);

        const { data: students, error: studentError } = await supabase
          .from("students")
          .select("id, student_name, school_id")
          .in("id", childIds);

        if (studentError) throw new Error(studentError.message);
        if (!students?.length) return;

        setChildren(students);

        const schoolIds = [...new Set(students.map((s) => s.school_id))];
        if (schoolIds.length > 0) {
          const { data: schoolData, error: schoolError } = await supabase
            .from("schools")
            .select("id, name")
            .in("id", schoolIds);

          if (schoolError) throw new Error(schoolError.message);

          setSchools(schoolData || []);
        }
      } catch (err) {
        console.error("Error fetching guardian schools:", err?.message || err);
      }
    };

    fetchSchoolsAndChildren();
  }, [userData]);

  // ✅ Fetch products with pagination
  const fetchProducts = async (pageNum = 0) => {
    if (!selectedSchool) return;

    setLoading(true);
    try {
      const from = pageNum * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error } = await supabase
        .from("products")
        .select("id, name, description, price, stock_quantity, product_image")
        .eq("school_id", selectedSchool)
        .range(from, to);

      if (error) throw new Error(error.message);

      if (pageNum === 0) {
        setProducts(data || []);
      } else {
        setProducts((prev) => [...prev, ...(data || [])]);
      }

      setHasMore(data?.length === PAGE_SIZE);
    } catch (err) {
      console.error("Error fetching products:", err?.message || err);
      if (pageNum === 0) setProducts([]);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Reset pagination when school changes
  useEffect(() => {
    if (selectedSchool) {
      setPage(0);
      fetchProducts(0);
    }
  }, [selectedSchool]);

  // ---------------------------
  // Helper: create order(s) for child items (used when confirming add)
  // ---------------------------
  const createOrderForChildItems = async (childId, childItems) => {
    if (!userData?.user_id) {
      console.warn("No userData.user_id — cannot create order.");
      return { success: false, message: "Not authenticated" };
    }
    if (!childItems || childItems.length === 0) {
      return { success: false, message: "No items to order" };
    }

    try {
      // compute total amount
      const totalAmount = childItems.reduce(
        (sum, item) => sum + (parseFloat(item.price) || 0) * (item.quantity || 1),
        0
      );

      // insert order
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .insert([
          {
            parent_id: userData.user_id,
            student_id: childId,
            school_id: selectedSchool,
            proprietor_id: userData.user_id,
            total_amount: totalAmount,
            status: "pending",
          },
        ])
        .select()
        .single();

      if (orderError) {
        console.error("Order insert error:", orderError);
        return { success: false, message: orderError.message || "Order insert failed" };
      }

      const orderId = orderData.id;

      // build order_items payload
      const orderItemsPayload = childItems.map((item) => ({
        order_id: orderId,
        product_id: item.id,
        quantity: item.quantity || 1,
        price: item.price,
      }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItemsPayload);

      if (itemsError) {
        console.error("Order items insert error:", itemsError);
        return { success: false, message: itemsError.message || "Order items insert failed" };
      }

      // NOTE: we DO NOT clear localStorage/cart here per your request
      return { success: true, orderId };
    } catch (err) {
      console.error("createOrderForChildItems caught error:", err?.message || err);
      return { success: false, message: err?.message || "Unknown error" };
    }
  };

  // ---------------------------
  // Add to cart modal (unchanged UX): open modal for selection
  // ---------------------------
  const handleAddToCart = (product) => {
    setModalProduct(product);
    setShowModal(true);
  };

  // When Confirm is clicked in modal:
  // 1) Add item to local cart & localStorage (existing behaviour)
  // 2) ALSO create order and order_items in Supabase for the confirmed child/items
  //    (this moves the old checkout DB behavior into the Confirm flow)
  const confirmAddToCart = async () => {
    if (!selectedChild) {
      alert("Please select a child");
      return;
    }

    // assemble item to add
    const newItem = {
      ...modalProduct,
      child_id: selectedChild,
      quantity,
    };

    // 1) update local cart (so /cart page can still read it)
    setCart((prev) => {
      const next = [...prev, newItem];
      // localStorage will be updated by effect
      return next;
    });

    // 2) create order record(s) in DB for this confirmed child item
    //    createOrderForChildItems expects an array of items for the child
    try {
      const { success, orderId, message } = await createOrderForChildItems(
        selectedChild,
        [newItem]
      );

      if (success) {
        // Inform user that DB order was created — but DO NOT clear the local cart
        // (you asked that localStorage remain)
        console.log("Order created for added item, orderId:", orderId);
        // Optionally you can show a toast instead of alert
        alert("Item added to cart and order created (cart still saved locally).");
      } else {
        console.warn("Order creation failed:", message);
        alert("Item added to cart locally, but creating the order failed. Try again later.");
      }
    } catch (err) {
      console.error("confirmAddToCart create order error:", err?.message || err);
      alert("Item added to cart locally, but creating the order failed.");
    } finally {
      // close modal and reset selection
      setShowModal(false);
      setSelectedChild("");
      setQuantity(1);
    }
  };

  // ---------------------------
  // Checkout button: only route to /dashboard/carts (no DB action)
  // ---------------------------
  const handleCheckout = () => {
    if (cart.length === 0) {
      alert("Cart is empty!");
      return;
    }
    navigate("/dashboard/carts");
  };

  // ---------------------------
  // Render
  // ---------------------------
  return (
    <div className="p-6 relative">
      <h2 className="text-2xl font-bold mb-4">Place Order</h2>

      {/* Floating cart icon */}
      <motion.div
        className="fixed top-6 right-6 bg-blue-600 text-white w-12 h-12 rounded-full flex items-center justify-center shadow-lg cursor-pointer"
        whileHover={{ scale: 1.1 }}
        onClick={() => navigate("/dashboard/cart")}
      >
        🛒{" "}
        {cart.length > 0 && (
          <span className="absolute -top-2 -right-2 bg-red-600 text-xs rounded-full px-2">
            {cart.length}
          </span>
        )}
      </motion.div>

      {/* Schools as squares */}
      {!selectedSchool ? (
        <div className="grid grid-cols-2 gap-4">
          {schools.map((school) => (
            <div
              key={school.id}
              className="p-6 border rounded-lg shadow hover:shadow-lg cursor-pointer text-center"
              onClick={() => setSelectedSchool(school.id)}
            >
              <h3 className="text-lg font-semibold">{school.name}</h3>
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Products grid */}
          {loading && page === 0 ? (
            <p>Loading inventory...</p>
          ) : products.length === 0 ? (
            <p>No products available in this school.</p>
          ) : (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {products.map((product) => (
                  <div
                    key={product.id}
                    className="p-4 border rounded-lg shadow bg-white"
                  >
                    <img
                      src={product.product_image || "/placeholder.png"}
                      alt={product.name}
                      className="w-full h-32 object-cover mb-2 rounded"
                    />
                    <h3 className="font-semibold">{product.name}</h3>
                    <p className="text-sm text-gray-600">
                      {product.description}
                    </p>
                    <p className="font-bold">₦{product.price}</p>
                    <p className="text-sm">Stock: {product.stock_quantity}</p>
                    <button
                      onClick={() => handleAddToCart(product)}
                      className="mt-2 bg-green-600 text-white px-3 py-1 rounded w-full"
                    >
                      Add to Cart
                    </button>
                  </div>
                ))}
              </div>

              {/* Load More */}
              {hasMore && (
                <div className="flex justify-center mt-4">
                  <button
                    onClick={() => {
                      const nextPage = page + 1;
                      setPage(nextPage);
                      fetchProducts(nextPage);
                    }}
                    disabled={loading}
                    className="bg-gray-700 text-white px-6 py-2 rounded disabled:opacity-50"
                  >
                    {loading ? "Loading..." : "Load More"}
                  </button>
                </div>
              )}
            </div>
          )}

          {cart.length > 0 && (
            <div className="mt-4 flex justify-end">
              <button
                onClick={handleCheckout}
                className="bg-blue-600 text-white px-6 py-2 rounded"
              >
                Checkout
              </button>
            </div>
          )}
        </>
      )}

      {/* Modal for child + quantity selection */}
      {showModal && modalProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="font-bold mb-4">
              Who is this for? ({modalProduct.name})
            </h3>
            <select
              className="border w-full p-2 mb-4"
              value={selectedChild}
              onChange={(e) => setSelectedChild(e.target.value)}
            >
              <option value="">Select Child</option>
              {children
                .filter((c) => c.school_id === selectedSchool)
                .map((child) => (
                  <option key={child.id} value={child.id}>
                    {child.student_name}
                  </option>
                ))}
            </select>
            <input
              type="number"
              className="border w-full p-2 mb-4"
              value={quantity}
              min="1"
              onChange={(e) => setQuantity(parseInt(e.target.value || "1"))}
            />
            <div className="flex justify-between">
              <button
                onClick={confirmAddToCart}
                className="bg-blue-600 text-white px-4 py-2 rounded"
              >
                Confirm
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="bg-gray-400 text-white px-4 py-2 rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlaceOrder;
