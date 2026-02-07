"use client";

import { useState, useEffect } from "react";
import ProtectedRoute from "@/components/layout/ProtectedRoute";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";
import { Bid } from "@/types";
import { getContractorBids } from "@/lib/bids";
import {
  HiCollection,
  HiClock,
  HiCurrencyDollar,
  HiCheckCircle,
  HiXCircle,
  HiArrowRight,
} from "react-icons/hi";

export default function ContractorBidsPage() {
  const { userProfile } = useAuth();
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "submitted" | "accepted" | "rejected">("all");

  useEffect(() => {
    if (!userProfile) return;
    getContractorBids(userProfile.uid)
      .then(setBids)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [userProfile]);

  const filteredBids = filter === "all" ? bids : bids.filter((b) => b.status === filter);

  const statusStyles = {
    submitted: "bg-amber-100 text-amber-700",
    accepted: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-700",
  };

  const statusIcons = {
    submitted: <HiClock size={14} />,
    accepted: <HiCheckCircle size={14} />,
    rejected: <HiXCircle size={14} />,
  };

  return (
    <ProtectedRoute allowedRoles={["contractor"]}>
      <DashboardLayout role="contractor">
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Bids</h1>
            <p className="text-gray-500 mt-1">Track all your submitted bids and their status.</p>
          </div>

          {/* Filter */}
          <div className="flex gap-2">
            {(["all", "submitted", "accepted", "rejected"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === f
                    ? "bg-orange-500 text-white"
                    : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          {/* Bids List */}
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredBids.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-6 text-center py-12">
              <HiCollection size={48} className="mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500 font-medium">No bids found</p>
              <p className="text-sm text-gray-400 mt-1">
                Browse the marketplace to find projects and submit bids.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredBids.map((bid) => (
                <Link
                  key={bid.id}
                  href={`/dashboard/contractor/marketplace/${bid.projectId}`}
                  className="block bg-white rounded-xl border border-gray-200 p-5 hover:border-orange-200 hover:shadow-sm transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="bg-orange-100 text-orange-700 text-xs font-medium px-2.5 py-1 rounded-full">
                          {bid.projectCategory}
                        </span>
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full flex items-center gap-1 ${statusStyles[bid.status]}`}>
                          {statusIcons[bid.status]}
                          {bid.status.charAt(0).toUpperCase() + bid.status.slice(1)}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <HiCurrencyDollar size={16} className="text-gray-400" />
                          ${bid.totalCost.toLocaleString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <HiClock size={16} className="text-gray-400" />
                          {bid.estimatedTimeline}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-2">
                        Submitted {new Date(bid.submittedAt).toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" })}
                      </p>
                    </div>
                    <HiArrowRight size={18} className="text-gray-400 shrink-0 mt-1" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}

