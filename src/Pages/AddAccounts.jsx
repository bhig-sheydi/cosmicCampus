import React, { useEffect, useState } from "react";
import { supabase } from "@/supabaseClient";
import { useUser } from "@/components/Contexts/userContext";
import { motion } from "framer-motion";

const SchoolAccountSetup = () => {
  const { userData } = useUser();
  const [schools, setSchools] = useState([]);
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [banks, setBanks] = useState([]);

  const [bankDetails, setBankDetails] = useState({
    bank_name: "",
    account_name: "",
    account_number: "",
    bank_code: "",
  });

  const fallbackBanks = [
    { name: "Access Bank", code: "044" },
    { name: "Fidelity Bank", code: "070" },
    { name: "First Bank of Nigeria", code: "011" },
    { name: "GTBank", code: "058" },
    { name: "UBA", code: "033" },
    { name: "Zenith Bank", code: "057" },
    { name: "Union Bank", code: "032" },
    { name: "Ecobank Nigeria", code: "050" },
    { name: "Polaris Bank", code: "076" },
    { name: "Sterling Bank", code: "232" },
    { name: "Wema Bank", code: "035" },
    { name: "Keystone Bank", code: "082" },
    { name: "Kuda Microfinance Bank", code: "50211" },
    { name: "Moniepoint MFB", code: "50515" },
    { name: "PalmPay", code: "999991" },
    { name: "Opay", code: "999992" },
  ];

  // Fetch Nigerian banks (with caching)
  useEffect(() => {
    const fetchBanks = async () => {
      try {
        const cached = localStorage.getItem("nigerian_banks");
        if (cached) {
          setBanks(JSON.parse(cached));
          return;
        }
        const res = await fetch("https://api.paystack.co/bank?country=nigeria");
        const data = await res.json();
        if (data?.status && data?.data?.length) {
          localStorage.setItem("nigerian_banks", JSON.stringify(data.data));
          setBanks(data.data);
        } else {
          setBanks(fallbackBanks);
        }
      } catch (err) {
        console.error("Error fetching banks:", err);
        setBanks(fallbackBanks);
      }
    };
    fetchBanks();
  }, []);

  // Fetch proprietor's schools
  useEffect(() => {
    const fetchSchools = async () => {
      if (!userData?.user_id) return;
      try {
        const { data, error } = await supabase
          .from("schools")
          .select("id, name")
          .eq("school_owner", userData.user_id)
          .eq("is_deleted", false);

        if (error) throw error;
        setSchools(data || []);
      } catch (err) {
        console.error("Error fetching proprietor schools:", err.message);
      }
    };
    fetchSchools();
  }, [userData]);

  // Fetch account for selected school
  const fetchAccount = async (schoolId) => {
    if (!schoolId || !userData?.user_id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("school_bank_details")
        .select("id, bank_name, account_name, account_number, bank_code")
        .eq("school_id", schoolId)
        .eq("proprietor_id", userData.user_id)
        .single();

      if (error && error.code !== "PGRST116") throw error;

      setAccount(data || null);
      setBankDetails(
        data
          ? {
              bank_name: data.bank_name,
              account_name: data.account_name,
              account_number: data.account_number,
              bank_code: data.bank_code,
            }
          : { bank_name: "", account_name: "", account_number: "", bank_code: "" }
      );
    } catch (err) {
      console.error("Error fetching school account:", err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle school selection
  const handleSelectSchool = (school) => {
    setSelectedSchool(school);
    fetchAccount(school.id);
  };

  // Handle bank dropdown selection
  const handleBankSelect = (e) => {
    const selected = banks.find((b) => b.name === e.target.value);
    setBankDetails({
      ...bankDetails,
      bank_name: selected?.name || "",
      bank_code: selected?.code || "",
    });
  };

  // Verify account via Edge Function using session token
// Verify account via Edge Function using session token
const verifyAccount = async () => {
  // Only proceed if necessary fields are valid
  if (!bankDetails.bank_name || bankDetails.account_number.length !== 10 || !selectedSchool)
    return;

  // Avoid double verification
  if (verifying) return;

  setVerifying(true);
  try {
    // Get current session
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) throw new Error("User not authenticated");
    const accessToken = session.access_token;

    console.log("Starting account verification...", {
      bankName: bankDetails.bank_name,
      accountNumber: bankDetails.account_number,
      schoolId: selectedSchool.id,
    });

    const res = await fetch(
      "https://sfpgcjkmpqijniyzykau.supabase.co/functions/v1/smart-worker",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          bankName: bankDetails.bank_name,
          accountNumber: bankDetails.account_number,
          schoolId: selectedSchool.id,
        }),
      }
    );

    const data = await res.json();

    console.log("Verification response:", data);

    if (!res.ok || !data.success) {
      alert(data.error || "Verification failed");
      return;
    }

    setBankDetails({
      ...bankDetails,
      account_name: data.accountName,
      bank_code: data.bankCode,
    });

    // Refresh account from Supabase
    await fetchAccount(selectedSchool.id);

    console.log("Account verification successful!");
  } catch (err) {
    console.error("Verification error:", err);
    alert("Network error during verification");
  } finally {
    setVerifying(false);
  }
};

// Auto-verify when account number reaches 10 digits and account_name is empty
useEffect(() => {
  if (
    bankDetails.account_number.length === 10 &&
    bankDetails.bank_name &&
    selectedSchool &&
    !verifying &&
    !bankDetails.account_name // Only verify if account_name is empty
  ) {
    const timer = setTimeout(() => {
      verifyAccount();
    }, 1000); // Debounce to avoid multiple calls on fast typing

    return () => clearTimeout(timer);
  }
}, [
  bankDetails.account_number,
  bankDetails.bank_name,
  selectedSchool,
  verifying,
  bankDetails.account_name,
]);



  // Auto-verify when account number reaches 10 digits
  useEffect(() => {
    if (
      bankDetails.account_number.length === 10 &&
      bankDetails.bank_name &&
      selectedSchool &&
      !verifying
    ) {
      verifyAccount();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bankDetails.account_number]);

  // Form submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSchool) return alert("Select a school first");

    if (!bankDetails.account_name) {
      await verifyAccount();
    } else {
      alert("Account is verified and saved.");
    }
  };

  return (
    <div className="p-6 relative">
      <h2 className="text-2xl font-bold mb-4">School Account Setup</h2>

      {!selectedSchool ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {schools.length === 0 ? (
            <p>No schools found for this proprietor.</p>
          ) : (
            schools.map((school) => (
              <div
                key={school.id}
                className="p-6 border rounded-lg shadow hover:shadow-lg cursor-pointer text-center bg-white"
                onClick={() => handleSelectSchool(school)}
              >
                <h3 className="text-lg font-semibold">{school.name}</h3>
              </div>
            ))
          )}
        </div>
      ) : (
        <>
          <button
            onClick={() => {
              setSelectedSchool(null);
              setAccount(null);
            }}
            className="mb-4 text-sm text-blue-600 underline"
          >
            ← Back to Schools
          </button>

          <h3 className="text-xl font-semibold mb-2">{selectedSchool.name}</h3>

          <form
            onSubmit={handleSubmit}
            className="p-4 bg-white rounded-xl shadow-md mb-6 max-w-md"
          >
            <h4 className="text-lg font-semibold mb-3">
              {account ? "Update Account" : "Add Account"}
            </h4>

            <select
              className="border rounded-lg p-2 w-full mb-2"
              value={bankDetails.bank_name}
              onChange={handleBankSelect}
              required
            >
              <option value="">Select Bank</option>
              {banks.map((bank) => (
                <option key={bank.code} value={bank.name}>
                  {bank.name}
                </option>
              ))}
            </select>

            <input
              type="text"
              placeholder="Account Number"
              className="border rounded-lg p-2 w-full mb-2"
              value={bankDetails.account_number}
              onChange={(e) =>
                setBankDetails({ ...bankDetails, account_number: e.target.value })
              }
              maxLength={10}
              required
            />

            <input
              type="text"
              placeholder={verifying ? "Verifying..." : "Account Name"}
              className="border rounded-lg p-2 w-full mb-4"
              value={bankDetails.account_name}
              readOnly
              required
            />

            <button
              type="submit"
              disabled={verifying}
              className={`${
                verifying ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"
              } text-white px-4 py-2 rounded`}
            >
              {verifying ? "Verifying..." : account ? "Update Account" : "Save Account"}
            </button>
          </form>

          {loading ? (
            <p>Loading account...</p>
          ) : account ? (
            <motion.div
              key={account.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 border rounded-lg bg-white shadow max-w-md"
            >
              <p className="font-semibold">{account.bank_name}</p>
              <p className="text-sm">{account.account_name}</p>
              <p className="text-sm">{account.account_number}</p>
              {account.bank_code && (
                <p className="text-xs text-gray-600">Code: {account.bank_code}</p>
              )}
            </motion.div>
          ) : (
            <p>No account set for this school yet.</p>
          )}
        </>
      )}
    </div>
  );
};

export default SchoolAccountSetup;
