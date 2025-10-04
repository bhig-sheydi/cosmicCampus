import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "@/supabaseClient";
import { useUser } from "@/components/Contexts/userContext";

const PAGE_SIZE = 12;

const RestockPage = () => {
  const { userData } = useUser(); // ✅ Always from context
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const [searchInput, setSearchInput] = useState(""); // raw text
  const [search, setSearch] = useState(""); // debounced query

  const [schools, setSchools] = useState([]);
  const [selectedSchool, setSelectedSchool] = useState("");

  // ✅ Stock filter
  const [minStock, setMinStock] = useState("");
  const [maxStock, setMaxStock] = useState("");

  // ✅ Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setSearch(searchInput);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchInput]);

  // ✅ Fetch schools for proprietor
  useEffect(() => {
    const fetchSchools = async () => {
      if (!userData) return;

      const { data, error } = await supabase
        .from("schools")
        .select("id, name, school_owner")
        .eq("school_owner", userData.user_id || userData.id);

      if (error) {
        console.error("Error fetching schools:", error.message);
      } else {
        setSchools(data || []);
      }
    };
    fetchSchools();
  }, [userData]);

  // ✅ Fetch products with filters + pagination
  const fetchProducts = useCallback(
    async () => {
      if (!userData?.user_id) return;
      setLoading(true);

      let query = supabase
        .from("products")
        .select("*", { count: "exact" })
        .eq("proprietor_id", userData.user_id)
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (selectedSchool) {
        query = query.eq("school_id", selectedSchool);
      }

      if (search) {
        query = query.or(
          `name.ilike.%${search}%,description.ilike.%${search}%`
        );
      }

      // ✅ Stock filtering (lean fetch)
      if (minStock !== "") {
        query = query.gte("stock_quantity", parseInt(minStock));
      }
      if (maxStock !== "") {
        query = query.lte("stock_quantity", parseInt(maxStock));
      }

      const { data, error, count } = await query;

      if (error) {
        console.error("Error fetching products:", error.message);
      } else {
        setProducts(data || []);
        setTotalCount(count || 0);
      }
      setLoading(false);
    },
    [userData?.user_id, page, selectedSchool, search, minStock, maxStock]
  );

  // ✅ Fetch whenever filters/page change
  useEffect(() => {
    if (userData?.user_id) {
      fetchProducts();
    }
  }, [page, selectedSchool, search, minStock, maxStock, userData?.user_id]);

  // ✅ Save product updates
  const handleSave = async (product) => {
    const { error } = await supabase
      .from("products")
      .update({
        name: product.name,
        description: product.description,
        price: product.price,
        stock_quantity: product.stock_quantity,
        updated_at: new Date(),
      })
      .eq("id", product.id);

    if (error) {
      console.error("Error updating product:", error.message);
      alert("Failed to update product");
    } else {
      alert("Product updated successfully!");
      setEditingProduct(null);
      fetchProducts();
    }
  };

  // ✅ Pagination controls
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Restock & Manage Products</h2>

      {!userData?.user_id ? (
        <p className="text-red-600">Please log in to manage products.</p>
      ) : (
        <>
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <input
              type="text"
              placeholder="Search products..."
              className="border p-2 flex-1"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            <select
              className="border p-2"
              value={selectedSchool}
              onChange={(e) => setSelectedSchool(e.target.value)}
            >
              <option value="">All Schools</option>
              {schools.map((school) => (
                <option key={school.id} value={school.id}>
                  {school.name}
                </option>
              ))}
            </select>

            {/* ✅ Stock filter inputs */}
            <input
              type="number"
              placeholder="Min Stock"
              className="border p-2 w-28"
              value={minStock}
              onChange={(e) => setMinStock(e.target.value)}
            />
            <input
              type="number"
              placeholder="Max Stock"
              className="border p-2 w-28"
              value={maxStock}
              onChange={(e) => setMaxStock(e.target.value)}
            />
          </div>

          {/* Products */}
          {loading && products.length === 0 ? (
            <p>Loading products...</p>
          ) : products.length === 0 ? (
            <p>No products found.</p>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {products.map((product) => (
                  <div
                    key={product.id}
                    className="border rounded-lg shadow-md bg-white p-4"
                  >
                    {editingProduct === product.id ? (
                      <>
                        <input
                          type="text"
                          className="w-full p-2 border mb-2"
                          value={product.name}
                          onChange={(e) =>
                            setProducts((prev) =>
                              prev.map((p) =>
                                p.id === product.id
                                  ? { ...p, name: e.target.value }
                                  : p
                              )
                            )
                          }
                        />
                        <textarea
                          className="w-full p-2 border mb-2"
                          value={product.description || ""}
                          onChange={(e) =>
                            setProducts((prev) =>
                              prev.map((p) =>
                                p.id === product.id
                                  ? { ...p, description: e.target.value }
                                  : p
                              )
                            )
                          }
                        />
                        <input
                          type="number"
                          className="w-full p-2 border mb-2"
                          value={product.price}
                          onChange={(e) =>
                            setProducts((prev) =>
                              prev.map((p) =>
                                p.id === product.id
                                  ? { ...p, price: parseFloat(e.target.value) }
                                  : p
                              )
                            )
                          }
                        />
                        <input
                          type="number"
                          className="w-full p-2 border mb-2"
                          value={product.stock_quantity}
                          onChange={(e) =>
                            setProducts((prev) =>
                              prev.map((p) =>
                                p.id === product.id
                                  ? {
                                      ...p,
                                      stock_quantity: parseInt(e.target.value),
                                    }
                                  : p
                              )
                            )
                          }
                        />
                        <div className="flex justify-between">
                          <button
                            onClick={() => handleSave(product)}
                            className="bg-green-600 text-white px-3 py-1 rounded"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingProduct(null)}
                            className="bg-gray-400 text-white px-3 py-1 rounded"
                          >
                            Cancel
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <img
                          src={product.product_image || "/placeholder.png"}
                          alt={product.name}
                          className="w-full h-32 object-cover rounded mb-2"
                        />
                        <h3 className="font-semibold text-lg">{product.name}</h3>
                        <p className="text-sm text-gray-600">
                          {product.description}
                        </p>
                        <p className="mt-1 font-bold">₦{product.price}</p>
                        <p className="text-sm">
                          Stock: {product.stock_quantity}
                        </p>
                        <button
                          onClick={() => setEditingProduct(product.id)}
                          className="mt-2 w-full bg-blue-600 text-white px-3 py-1 rounded"
                        >
                          Edit
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>

              {/* ✅ Pagination controls */}
              <div className="flex justify-center items-center gap-4 mt-6">
                <button
                  disabled={page === 0}
                  onClick={() => setPage((p) => Math.max(p - 1, 0))}
                  className="px-3 py-1 bg-gray-300 rounded disabled:opacity-50"
                >
                  Previous
                </button>
                <span>
                  Page {page + 1} of {totalPages}
                </span>
                <button
                  disabled={page + 1 >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1 bg-gray-300 rounded disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default RestockPage;
