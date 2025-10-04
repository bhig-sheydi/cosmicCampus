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

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!Object.keys(selectedSchools).length) {
      alert("⚠️ Please select at least one school.");
      return;
    }

    setLoading(true);

    try {
      let imageUrl = null;

      // 🔹 Upload image to Products bucket
      if (imageFile) {
        const fileExt = imageFile.name.split(".").pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `products/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("Products")
          .upload(filePath, imageFile);

        if (uploadError) throw uploadError;

        imageUrl =
          supabase.storage.from("Products").getPublicUrl(filePath).data.publicUrl;
      }

      // 🔹 Check for duplicates first
      for (const schoolId of Object.keys(selectedSchools)) {
        const { data: existing } = await supabase
          .from("products")
          .select("id")
          .eq("name", product.name)
          .eq("school_id", schoolId)
          .eq("proprietor_id", userData.user_id)
          .maybeSingle();

        if (existing) {
          setShowRestockAlert(true); // 🚨 trigger blinking restock button
          setLoading(false);
          return;
        }
      }

      // 🔹 Prepare product rows
      const productsToInsert = Object.entries(selectedSchools).map(
        ([schoolId, { stock }]) => ({
          name: product.name,
          description: product.description,
          price: parseFloat(product.price),
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
      setProduct({ name: "", description: "", price: "", category: "" });
      setImageFile(null);
      setPreviewUrl(null);
      setSelectedSchools({});
    } catch (err) {
      console.error("Error adding product:", err.message);
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
          className={`px-4 py-2 rounded-lg font-bold text-white transition ${
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
          <input
            type="number"
            name="price"
            placeholder="Price ($)"
            value={product.price}
            onChange={handleChange}
            className="w-full border rounded-lg px-4 py-2"
            required
          />

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
            <p className="text-blue-600 font-bold mt-2">
              {product.price ? `$${product.price}` : "$0.00"}
            </p>
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
