"use client";

import { useState, useEffect } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import ProtectedRoute from "@/components/layout/ProtectedRoute";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { ContractorUser } from "@/types";
import toast from "react-hot-toast";
import { HiCog, HiShieldCheck, HiCreditCard } from "react-icons/hi";

export default function ContractorSettingsPage() {
  const { userProfile, refreshProfile } = useAuth();
  const contractor = userProfile as ContractorUser | null;
  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    companyName: "",
    contactName: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  // Sync form when contractor profile loads
  useEffect(() => {
    if (!contractor) return;
    setForm({
      fullName: contractor.fullName || "",
      phone: contractor.phone || "",
      companyName: contractor.companyName || "",
      contactName: contractor.contactName || "",
    });
  }, [contractor]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setErrors((prev) => ({ ...prev, [e.target.name]: "" }));
  };

  const handleSave = async () => {
    if (!contractor) return;

    const newErrors: Record<string, string> = {};
    if (!form.fullName.trim()) newErrors.fullName = "Full name is required.";
    if (!form.companyName.trim()) newErrors.companyName = "Company name is required.";
    if (!form.contactName.trim()) newErrors.contactName = "Contact name is required.";
    if (!form.phone.trim()) {
      newErrors.phone = "Phone number is required.";
    } else {
      const phoneDigits = form.phone.replace(/\D/g, "");
      if (phoneDigits.length !== 10 && !(phoneDigits.length === 11 && phoneDigits[0] === "1")) {
        newErrors.phone = "Enter a valid 10-digit phone number.";
      }
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      await updateDoc(doc(db, "users", contractor.uid), {
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
        companyName: form.companyName.trim(),
        contactName: form.contactName.trim(),
        updatedAt: new Date().toISOString(),
      });
      await refreshProfile();
      toast.success("Profile updated successfully!");
    } catch {
      toast.error("Failed to update profile.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={["contractor"]}>
      <DashboardLayout role="contractor">
        {!contractor ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-6 max-w-2xl">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
              <p className="text-gray-500 mt-1">Manage your contractor profile.</p>
            </div>

            {/* Verification Status */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <HiShieldCheck size={24} className="text-orange-500" />
                <h2 className="text-lg font-bold text-gray-900">Verification Status</h2>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`text-sm font-medium px-3 py-1 rounded-full ${
                    contractor.verificationStatus === "approved"
                      ? "bg-green-100 text-green-700"
                      : contractor.verificationStatus === "rejected"
                      ? "bg-red-100 text-red-700"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {contractor.verificationStatus === "approved"
                    ? "Verified"
                    : contractor.verificationStatus === "rejected"
                    ? "Rejected"
                    : "Pending"}
                </span>
                <span className="text-sm text-gray-500">
                  BN: {contractor.businessNumber} | OBR: {contractor.obrNumber}
                </span>
              </div>
            </div>

            {/* Credit Balance */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-2">
                <HiCreditCard size={24} className="text-orange-500" />
                <h2 className="text-lg font-bold text-gray-900">Credit Balance</h2>
              </div>
              <p className="text-3xl font-bold text-gray-900">{contractor.creditBalance ?? 0} credits</p>
            </div>

            {/* Profile Form */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-6">
                <HiCog size={24} className="text-orange-500" />
                <h2 className="text-lg font-bold text-gray-900">Profile Information</h2>
              </div>
              <div className="space-y-4">
                <Input label="Full Name" name="fullName" value={form.fullName} onChange={handleChange} error={errors.fullName} />
                <Input label="Phone" name="phone" type="tel" placeholder="(416) 555-0123" value={form.phone} onChange={handleChange} error={errors.phone} />
                <Input label="Company Name" name="companyName" value={form.companyName} onChange={handleChange} error={errors.companyName} />
                <Input label="Contact Name" name="contactName" value={form.contactName} onChange={handleChange} error={errors.contactName} />

                <div className="pt-2">
                  <p className="text-sm text-gray-500 mb-1">Email</p>
                  <p className="text-gray-700">{contractor.email}</p>
                </div>

                <Button fullWidth loading={loading} onClick={handleSave}>
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        )}
      </DashboardLayout>
    </ProtectedRoute>
  );
}

