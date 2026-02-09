"use client";

import { useState, useEffect } from "react";
import { ref, onValue, update } from "firebase/database";
import { db } from "@/lib/firebase";
import ProtectedRoute from "@/components/layout/ProtectedRoute";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Button from "@/components/ui/Button";
import { ContractorUser } from "@/types";
import toast from "react-hot-toast";
import {
  HiShieldCheck,
  HiCheckCircle,
  HiXCircle,
  HiClock,
  HiOfficeBuilding,
  HiPhone,
  HiMail,
  HiSearch,
  HiX,
} from "react-icons/hi";

export default function AdminVerificationsPage() {
  const [contractors, setContractors] = useState<ContractorUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const usersRef = ref(db, "users");
    const unsub = onValue(usersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const allContractors: ContractorUser[] = Object.entries(data)
          .map(([uid, value]) => ({ ...(value as Record<string, unknown>), uid } as unknown as ContractorUser))
          .filter((u) => u.role === "contractor");
        setContractors(allContractors);
      } else {
        setContractors([]);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleVerification = async (uid: string, status: "approved" | "rejected") => {
    setActionLoading(uid);
    try {
      await update(ref(db, `users/${uid}`), {
        verificationStatus: status,
        verifiedDate: status === "approved" ? new Date().toISOString() : null,
        updatedAt: new Date().toISOString(),
      });
      toast.success(`Contractor ${status} successfully!`);
    } catch {
      toast.error("Failed to update verification.");
    } finally {
      setActionLoading(null);
    }
  };

  // Filter by status
  const statusFiltered =
    filter === "all"
      ? contractors
      : contractors.filter((c) => c.verificationStatus === filter);

  // Filter by search query (name, company, email, phone, BN, OBR)
  const filteredContractors = searchQuery.trim()
    ? statusFiltered.filter((c) => {
        const q = searchQuery.toLowerCase();
        return (
          (c.fullName && c.fullName.toLowerCase().includes(q)) ||
          (c.companyName && c.companyName.toLowerCase().includes(q)) ||
          (c.email && c.email.toLowerCase().includes(q)) ||
          (c.phone && c.phone.toLowerCase().includes(q)) ||
          (c.businessNumber && c.businessNumber.toLowerCase().includes(q)) ||
          (c.obrNumber && c.obrNumber.toLowerCase().includes(q))
        );
      })
    : statusFiltered;

  // Count by status for filter badges
  const statusCounts = {
    pending: contractors.filter((c) => c.verificationStatus === "pending").length,
    approved: contractors.filter((c) => c.verificationStatus === "approved").length,
    rejected: contractors.filter((c) => c.verificationStatus === "rejected").length,
    all: contractors.length,
  };

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <DashboardLayout role="admin">
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Contractor Verifications</h1>
              <p className="text-gray-500 mt-1">
                {filteredContractors.length} contractor{filteredContractors.length !== 1 ? "s" : ""}{" "}
                {filter !== "all" ? `(${filter})` : "total"}
                {searchQuery.trim() ? ` matching "${searchQuery.trim()}"` : ""}
              </p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <HiSearch size={20} className="text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search by name, company, email, phone, BN, or OBR..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-10 py-3 border border-gray-200 rounded-xl bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all text-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
              >
                <HiX size={18} />
              </button>
            )}
          </div>

          {/* Filter */}
          <div className="flex flex-wrap gap-2">
            {(["pending", "approved", "rejected", "all"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                  filter === f
                    ? "bg-orange-500 text-white"
                    : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
                <span
                  className={`text-xs px-1.5 py-0.5 rounded-full ${
                    filter === f
                      ? f === "pending" && statusCounts.pending > 0
                        ? "bg-red-600 text-white"
                        : "bg-orange-600 text-orange-100"
                      : f === "pending" && statusCounts.pending > 0
                      ? "bg-red-100 text-red-600"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {statusCounts[f]}
                </span>
              </button>
            ))}
          </div>

          {/* List */}
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredContractors.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-6 text-center py-16">
              <HiShieldCheck size={48} className="mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500 font-medium">
                {searchQuery.trim()
                  ? `No contractors found matching "${searchQuery.trim()}"`
                  : `No ${filter === "all" ? "" : filter + " "}contractors found`}
              </p>
              {searchQuery.trim() && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="mt-3 text-sm text-orange-500 hover:text-orange-600 font-medium"
                >
                  Clear search
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredContractors.map((c) => (
                <div key={c.uid} className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-bold text-gray-900">{c.fullName}</h3>
                      <p className="text-sm text-gray-500">{c.companyName}</p>
                    </div>
                    <span
                      className={`text-xs font-medium px-2.5 py-1 rounded-full flex items-center gap-1 ${
                        c.verificationStatus === "approved"
                          ? "bg-green-100 text-green-700"
                          : c.verificationStatus === "rejected"
                          ? "bg-red-100 text-red-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {c.verificationStatus === "approved" ? (
                        <HiCheckCircle size={14} />
                      ) : c.verificationStatus === "rejected" ? (
                        <HiXCircle size={14} />
                      ) : (
                        <HiClock size={14} />
                      )}
                      {c.verificationStatus}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-600 mb-4">
                    <span className="flex items-center gap-2">
                      <HiMail size={16} className="text-gray-400" /> {c.email}
                    </span>
                    <span className="flex items-center gap-2">
                      <HiPhone size={16} className="text-gray-400" /> {c.phone}
                    </span>
                    <span className="flex items-center gap-2">
                      <HiOfficeBuilding size={16} className="text-gray-400" /> BN: {c.businessNumber}
                    </span>
                    <span className="flex items-center gap-2">
                      <HiShieldCheck size={16} className="text-gray-400" /> OBR: {c.obrNumber}
                    </span>
                  </div>

                  {c.verificationStatus === "pending" && (
                    <div className="flex gap-3">
                      <Button
                        size="sm"
                        onClick={() => handleVerification(c.uid, "approved")}
                        loading={actionLoading === c.uid}
                        className="!bg-green-600 hover:!bg-green-700"
                      >
                        <HiCheckCircle size={16} className="mr-1" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleVerification(c.uid, "rejected")}
                        loading={actionLoading === c.uid}
                      >
                        <HiXCircle size={16} className="mr-1" /> Reject
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}

