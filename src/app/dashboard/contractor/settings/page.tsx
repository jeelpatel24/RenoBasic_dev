"use client";

import { useState } from "react";
import { ref, update } from "firebase/database";
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
    fullName: contractor?.fullName || "",
    phone: contractor?.phone || "",
    companyName: contractor?.companyName || "",
    contactName: contractor?.contactName || "",
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = async () => {
    if (!contractor) return;
    setLoading(true);
    try {
      await update(ref(db, `users/${contractor.uid}`), {
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

  if (!contractor) return null;

  return (
    <ProtectedRoute allowedRoles={["contractor"]}>
      <DashboardLayout role="contractor">
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
              <Input label="Full Name" name="fullName" value={form.fullName} onChange={handleChange} />
              <Input label="Phone" name="phone" value={form.phone} onChange={handleChange} />
              <Input label="Company Name" name="companyName" value={form.companyName} onChange={handleChange} />
              <Input label="Contact Name" name="contactName" value={form.contactName} onChange={handleChange} />

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
      </DashboardLayout>
    </ProtectedRoute>
  );
}

