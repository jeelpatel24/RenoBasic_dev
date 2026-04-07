"use client";

import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import ProtectedRoute from "@/components/layout/ProtectedRoute";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";
import { Bid } from "@/types";
import { withdrawBid } from "@/lib/bids";
import { formatDate } from "@/lib/utils";
import toast from "react-hot-toast";
import {
  HiCollection,
  HiClock,
  HiCurrencyDollar,
  HiCheckCircle,
  HiXCircle,
  HiArrowRight,
  HiTrash,
  HiExclamation,
} from "react-icons/hi";

export default function ContractorBidsPage() {
  const { userProfile } = useAuth();
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "submitted" | "accepted" | "rejected">("all");
  const [withdrawing, setWithdrawing] = useState<string | null>(null);
  const [confirmBid, setConfirmBid] = useState<Bid | null>(null);

  const handleWithdrawClick = (e: React.MouseEvent, bid: Bid) => {
    e.preventDefault();
    e.stopPropagation();
    setConfirmBid(bid);
  };

  const handleConfirmWithdraw = async () => {
    if (!confirmBid) return;
    const bid = confirmBid;
    setConfirmBid(null);
    setWithdrawing(bid.id);
    try {
      await withdrawBid(bid.id);
      toast.success("Bid withdrawn successfully.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to withdraw bid.";
      toast.error(msg);
    } finally {
      setWithdrawing(null);
    }
  };

  useEffect(() => {
    if (!userProfile) return;
    const q = query(
      collection(db, "bids"),
      where("contractorUid", "==", userProfile.uid),
      orderBy("submittedAt", "desc")
    );
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        setBids(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Bid)));
        setLoading(false);
      },
      (error) => { console.error("Error loading bids:", error); setLoading(false); }
    );
    return () => unsub();
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
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex gap-2">
                        <div className="h-5 w-24 bg-gray-200 rounded-full" />
                        <div className="h-5 w-20 bg-gray-200 rounded-full" />
                      </div>
                      <div className="flex gap-4 mt-3">
                        <div className="h-4 w-20 bg-gray-200 rounded" />
                        <div className="h-4 w-24 bg-gray-200 rounded" />
                      </div>
                      <div className="h-3 w-32 bg-gray-100 rounded" />
                    </div>
                    <div className="h-5 w-5 bg-gray-200 rounded" />
                  </div>
                </div>
              ))}
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
                  href={`/dashboard/contractor/bids/${bid.id}`}
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
                          ${(Number(bid.totalAmount ?? bid.totalCost ?? 0)).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                        </span>
                        <span className="flex items-center gap-1">
                          <HiClock size={16} className="text-gray-400" />
                          {bid.estimatedTimeline}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-2">
                        Submitted {formatDate(bid.submittedAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {bid.status === "submitted" && (
                        <button
                          onClick={(e) => handleWithdrawClick(e, bid)}
                          disabled={withdrawing === bid.id}
                          title="Withdraw bid"
                          className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50"
                        >
                          <HiTrash size={16} />
                        </button>
                      )}
                      <HiArrowRight size={18} className="text-gray-400 mt-1" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Withdraw Confirmation Modal */}
        {confirmBid && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                  <HiExclamation size={20} className="text-red-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Withdraw Bid</h3>
                  <p className="text-sm text-gray-500">This action cannot be undone.</p>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-6">
                Are you sure you want to withdraw your{" "}
                <span className="font-medium text-gray-800">${(confirmBid.totalAmount ?? confirmBid.totalCost ?? 0).toFixed(0)}</span>{" "}
                bid for{" "}
                <span className="font-medium text-gray-800">{confirmBid.projectCategory}</span>?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmBid(null)}
                  className="flex-1 px-4 py-2 rounded-xl border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmWithdraw}
                  className="flex-1 px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors"
                >
                  Withdraw Bid
                </button>
              </div>
            </div>
          </div>
        )}
      </DashboardLayout>
    </ProtectedRoute>
  );
}
