import React, { useEffect, useState } from "react";
import { supabase } from "@/supabaseClient";
import { useUser } from "../components/Contexts/userContext";
import { useNavigate } from "react-router-dom";

const AddInventory = () => {
  const { userData } = useUser();
  const navigate = useNavigate();

  const [product, setProduct] = useState({
    name: "",
    description: "",
    price: "",
    cost_price: "",
    category: "",
  });

  const [categories, setCategories] = useState([]);
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  const [schools, setSchools] = useState([]);
  const [selectedSchools, setSelectedSchools] = useState({});
  const [loading, setLoading] = useState(false);

  // 🔹 Restock alert state
  const [showRestockAlert, setShowRestockAlert] = useState(false);

  // 🔹 Phase 3: Cleanup object URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // 🔹 Fetch proprietor schools
  useEffect(() => {
    const fetchSchools = async () => {
      if (!userData?.user_id) return;
      const { data, error } = await supabase
        .from("schools")
        .select("id, name")
        .eq("school_owner", userData.user_id);

      if (error) {
        console.error("Error fetching schools:", error.message);
      } else {
        setSchools(data || []);
      }
    };
    fetchSchools();
  }, [userData?.user_id]);

  // 🔹 Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name")
        .order("name");

      if (error) {
        console.error("Error fetching categories:", error.message);
      } else {
        setCategories(data || []);
      }
    };
    fetchCategories();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProduct((prev) => ({ ...prev, [name]: value }));
  };

  // 🔹 Phase 3: Cleanup old object URL before creating new one
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  // 🔹 Toggle school selection & stock input
  const toggleSchool = (schoolId) => {
    setSelectedSchools((prev) => {
      const updated = { ...prev };
      if (updated[schoolId]) {
        delete updated[schoolId];
      } else {
        updated[schoolId] = { stock: "" };
      }
      return updated;
    });
  };

  const handleStockChange = (schoolId, value) => {
    setSelectedSchools((prev) => ({
      ...prev,
      [schoolId]: { stock: value },
    }));
  };

  // 🔹 Calculate total stock across all selected schools
  const totalStock = Object.values(selectedSchools).reduce((sum, { stock }) => {
    const num = parseInt(stock, 10);
    return sum + (isNaN(num) ? 0 : num);
  }, 0);

  // 🔹 Calculate expected profit dynamically
  const sellingPrice = parseFloat(product.price) || 0;
  const costPrice = parseFloat(product.cost_price) || 0;
  const profitPerUnit = sellingPrice - costPrice;
  const expectedProfit = profitPerUnit * totalStock;

  // 🔹 Phase 2: Client-side validation
  const validateInputs = () => {
    const errors = [];

    if (!product.name.trim()) {
      errors.push("Product name is required");
    }

    const priceNum = parseFloat(product.price);
    if (isNaN(priceNum) || priceNum < 0) {
      errors.push("Selling price must be a valid number and cannot be negative");
    }

    const costPriceNum = parseFloat(product.cost_price);
    if (product.cost_price && (isNaN(costPriceNum) || costPriceNum < 0)) {
      errors.push("Cost price must be a valid number and cannot be negative");
    }

    if (!isNaN(priceNum) && !isNaN(costPriceNum) && costPriceNum > priceNum) {
      errors.push("Cost price cannot be higher than selling price");
    }

    for (const [schoolId, { stock }] of Object.entries(selectedSchools)) {
      const stockNum = parseInt(stock, 10);
      const schoolName =
        schools.find((s) => s.id === parseInt(schoolId))?.name ||
        `School ID #{schoolId}`;

      if (isNaN(stockNum) || stockNum < 0) {
        errors.push(
          `Stock for #{schoolName} must be a valid number and cannot be negative`
        );
      }
    }

    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Phase 2: Run validation
    const validationErrors = validateInputs();
    if (validationErrors.length > 0) {
      alert(validationErrors.join("\n"));
      return;
    }

    if (!Object.keys(selectedSchools).length) {
      alert("⚠️ Please select at least one school.");
      return;
    }

    setLoading(true);

    try {
      let imageUrl = null;

      // Upload image to Products bucket
      if (imageFile) {
        const fileExt = imageFile.name.split(".").pop();
        const fileName = `#{Date.now()}.#{fileExt}`;
        const filePath = `products/#{fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("Products")
          .upload(filePath, imageFile);

        if (uploadError) throw uploadError;

        imageUrl = supabase.storage
          .from("Products")
          .getPublicUrl(filePath).data.publicUrl;
      }

      // 🔹 Phase 6: Single query duplicate check for all selected schools
      const selectedSchoolIds = Object.keys(selectedSchools).map(Number);

      const { data: existingProducts, error: dupError } = await supabase
        .from("products")
        .select("id, school_id, schools(name)")
        .eq("name", product.name)
        .eq("proprietor_id", userData.user_id)
        .in("school_id", selectedSchoolIds);

      if (dupError) throw dupError;

      if (existingProducts && existingProducts.length > 0) {
        const schoolNames = existingProducts
          .map((p) => p.schools?.name || `School ID #{p.school_id}`)
          .join(", ");

        alert(
          `⚠️ "#{product.name}" already exists at: #{schoolNames}. Please restock instead.`
        );
        setShowRestockAlert(true);
        setLoading(false);
        return;
      }

      // Prepare and insert product rows
      const productsToInsert = Object.entries(selectedSchools).map(
        ([schoolId, { stock }]) => ({
          name: product.name,
          description: product.description,
          price: parseFloat(product.price),
          cost_price: product.cost_price ? parseFloat(product.cost_price) : null,
          stock: parseInt(stock, 10) || 0,
          category_id: product.category,
          proprietor_id: userData.user_id,
          product_image: imageUrl,
          school_id: parseInt(schoolId, 10),
        })
      );

      const { error: productError } = await supabase
        .from("products")
        .insert(productsToInsert);

      if (productError) throw productError;

      alert("✅ Product(s) added successfully to selected schools!");

      // Phase 3: Clean up blob URL from memory
      if (previewUrl) URL.revokeObjectURL(previewUrl);

      // Reset form
      setProduct({ name: "", description: "", price: "", cost_price: "", category: "" });
      setImageFile(null);
      setPreviewUrl(null);
      setSelectedSchools({});
    } catch (err) {
      console.error("Error adding product:", err.message);
      alert(`❌ Failed to add product: #{err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto relative">
      {/* Restock Button */}
      <div className="absolute top-0 right-0">
        <button
          onClick={() => navigate("/dashboard/restock")}
          className={`px-4 py-2 rounded-lg font-bold text-white transition #{
            showRestockAlert
              ? "bg-red-600 animate-pulse"
              : "bg-green-600 hover:bg-green-700"
          }`}
        >
          Restock
        </button>
        {showRestockAlert && (
          <div className="absolute -top-10 right-0 bg-red-600 text-white text-sm px-3 py-1 rounded shadow-lg">
            ⬆ Item already exists — restock the item if exhausted
          </div>
        )}
      </div>

      <h2 className="text-2xl font-bold mb-6">Add New Inventory Item</h2>

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 md:grid-cols-2 gap-6"
      >
        {/* Left side */}
        <div className="space-y-4">
          <input
            type="text"
            name="name"
            placeholder="Product Name"
            value={product.name}
            onChange={handleChange}
            className="w-full border rounded-lg px-4 py-2"
            required
          />
          <textarea
            name="description"
            placeholder="Description"
            value={product.description}
            onChange={handleChange}
            className="w-full border rounded-lg px-4 py-2"
            rows="4"
          />

          {/* Price inputs row */}
          <div className="grid grid-cols-2 gap-4">
            <input
              type="number"
              name="cost_price"
              placeholder="Cost Price (#)"
              value={product.cost_price}
              onChange={handleChange}
              className="w-full border rounded-lg px-4 py-2"
            />
            <input
              type="number"
              name="price"
              placeholder="Selling Price (#)"
              value={product.price}
              onChange={handleChange}
              className="w-full border rounded-lg px-4 py-2"
              required
            />
          </div>

          {/* Category Dropdown */}
          <select
            name="category"
            value={product.category}
            onChange={handleChange}
            className="w-full border rounded-lg px-4 py-2"
            required
          >
            <option value="">Select Category</option>
            {categories?.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat?.name}
              </option>
            ))}
          </select>

          {/* Image Upload */}
          <label className="block border-2 border-dashed rounded-lg p-4 cursor-pointer text-center hover:bg-gray-50">
            <span className="text-gray-600">📷 Upload Product Image</span>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              hidden
            />
          </label>

          {/* School Multi-select */}
          <div className="mt-4">
            <h3 className="font-semibold mb-2">Assign to Schools</h3>
            <div className="space-y-2">
              {schools.map((school) => (
                <div
                  key={school.id}
                  className="flex items-center justify-between border rounded-lg px-3 py-2"
                >
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={!!selectedSchools[school.id]}
                      onChange={() => toggleSchool(school.id)}
                    />
                    <span>{school.name}</span>
                  </label>
                  {selectedSchools[school.id] && (
                    <input
                      type="number"
                      placeholder="Stock"
                      className="border rounded px-2 py-1 w-24"
                      value={selectedSchools[school.id]?.stock || ""}
                      onChange={(e) =>
                        handleStockChange(school.id, e.target.value)
                      }
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Dynamic Profit Calculation */}
          {sellingPrice > 0 && costPrice > 0 && totalStock > 0 && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
              <h4 className="font-semibold text-emerald-800 mb-2">
                📊 Expected Profit
              </h4>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Profit per unit</p>
                  <p className={`font-bold #{profitPerUnit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                    #{profitPerUnit.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Total stock</p>
                  <p className="font-bold text-gray-800">{totalStock} units</p>
                </div>
                <div>
                  <p className="text-gray-500">Expected profit</p>
                  <p className={`font-bold text-lg #{expectedProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                    #{expectedProfit.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
          >
            {loading ? "Adding..." : "Add Product"}
          </button>
        </div>

        {/* Right side - Preview */}
        <div className="bg-white border rounded-lg shadow p-4">
          <h3 className="font-semibold mb-2">Live Preview</h3>
          <div className="border rounded-lg overflow-hidden">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Preview"
                className="w-full h-48 object-cover"
              />
            ) : (
              <div className="w-full h-48 flex items-center justify-center text-gray-400">
                No image
              </div>
            )}
          </div>
          <div className="mt-3">
            <h4 className="font-bold">{product.name || "Product Name"}</h4>
            <p className="text-sm text-gray-600">
              {product.description || "Product description goes here..."}
            </p>
            <div className="flex items-center gap-4 mt-2">
              <p className="text-blue-600 font-bold">
                {product.price ? `##{product.price}` : "#0.00"}
              </p>
              {product.cost_price && (
                <p className="text-sm text-gray-400">
                  Cost: #{product.cost_price}
                </p>
              )}
            </div>
            <p className="text-sm text-gray-500">
              Category:{" "}
              {categories.find((c) => c.id === product.category)?.name || "N/A"}
            </p>
          </div>
        </div>
      </form>
    </div>
  );
};

export default AddInventory;