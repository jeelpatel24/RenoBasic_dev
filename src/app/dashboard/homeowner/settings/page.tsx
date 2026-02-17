"use client";

import { useState, useEffect } from "react";
import { ref, set, get } from "firebase/database";
import { db } from "@/lib/firebase";
import ProtectedRoute from "@/components/layout/ProtectedRoute";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import toast from "react-hot-toast";
import {
  HiCog,
  HiUser,
  HiMail,
  HiCheckCircle,
  HiExclamation,
  HiCalendar,
  HiBadgeCheck,
} from "react-icons/hi";

export default function HomeownerSettingsPage() {
  const { firebaseUser, userProfile, refreshProfile } = useAuth();
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Pre-fill form with user data
  useEffect(() => {
    if (userProfile) {
      setForm({
        fullName: userProfile.fullName || "",
        email: userProfile.email || "",
        phone: userProfile.phone || "",
      });
      setInitialLoading(false);
    }
  }, [userProfile]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setErrors((prev) => ({ ...prev, [e.target.name]: "" }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!form.fullName.trim()) newErrors.fullName = "Full name is required.";
    if (!form.phone.trim()) newErrors.phone = "Phone number is required.";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      const userRef = ref(db, `users/${userProfile!.uid}`);
      const snapshot = await get(userRef);
      const existingData = snapshot.val();

      await set(userRef, {
        ...existingData,
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
        updatedAt: new Date().toISOString(),
      });

      await refreshProfile();
      toast.success("Profile updated successfully!");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const isEmailVerified = firebaseUser?.emailVerified ?? false;
  const memberSince = userProfile?.createdAt
    ? new Date(userProfile.createdAt).toLocaleDateString("en-CA", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "--";

  if (initialLoading) {
    return (
      <ProtectedRoute allowedRoles={["homeowner"]}>
        <DashboardLayout role="homeowner">
          <div className="flex items-center justify-center py-16">
            <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={["homeowner"]}>
      <DashboardLayout role="homeowner">
        <div className="space-y-8">
          {/* Page Header */}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Profile Settings</h1>
            <p className="text-gray-500 mt-1">
              Manage your account information and preferences.
            </p>
          </div>

          {/* Profile Form */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-orange-100 text-orange-500 p-2 rounded-lg">
                <HiUser size={24} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  Personal Information
                </h2>
                <p className="text-sm text-gray-500">
                  Update your profile details below.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 max-w-lg">
              <Input
                label="Full Name"
                name="fullName"
                type="text"
                placeholder="Your full name"
                value={form.fullName}
                onChange={handleChange}
                error={errors.fullName}
              />

              <div className="w-full">
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Email Address
                </label>
                <div className="relative">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={form.email}
                    readOnly
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-500 bg-gray-50 cursor-not-allowed"
                  />
                  <HiMail
                    size={18}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-400">
                  Email address cannot be changed.
                </p>
              </div>

              <Input
                label="Phone Number"
                name="phone"
                type="tel"
                placeholder="(416) 555-0123"
                value={form.phone}
                onChange={handleChange}
                error={errors.phone}
              />

              <div className="pt-2">
                <Button type="submit" loading={loading}>
                  Update Profile
                </Button>
              </div>
            </form>
          </div>

          {/* Account Information */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-gray-100 text-gray-600 p-2 rounded-lg">
                <HiCog size={24} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Account</h2>
                <p className="text-sm text-gray-500">
                  Your account details and status.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Role */}
              <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                <div className="bg-orange-100 text-orange-500 p-2 rounded-lg shrink-0">
                  <HiBadgeCheck size={20} />
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">
                    Role
                  </p>
                  <p className="text-sm font-semibold text-gray-900 capitalize mt-0.5">
                    {userProfile?.role}
                  </p>
                </div>
              </div>

              {/* Member Since */}
              <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                <div className="bg-blue-100 text-blue-500 p-2 rounded-lg shrink-0">
                  <HiCalendar size={20} />
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">
                    Member Since
                  </p>
                  <p className="text-sm font-semibold text-gray-900 mt-0.5">
                    {memberSince}
                  </p>
                </div>
              </div>

              {/* Email Verification */}
              <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                <div
                  className={`${
                    isEmailVerified
                      ? "bg-green-100 text-green-500"
                      : "bg-amber-100 text-amber-500"
                  } p-2 rounded-lg shrink-0`}
                >
                  {isEmailVerified ? (
                    <HiCheckCircle size={20} />
                  ) : (
                    <HiExclamation size={20} />
                  )}
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">
                    Email Verification
                  </p>
                  <p
                    className={`text-sm font-semibold mt-0.5 ${
                      isEmailVerified ? "text-green-700" : "text-amber-700"
                    }`}
                  >
                    {isEmailVerified ? "Verified" : "Not Verified"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}


