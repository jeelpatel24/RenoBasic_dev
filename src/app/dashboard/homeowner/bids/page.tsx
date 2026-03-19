"use client";

import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import ProtectedRoute from "@/components/layout/ProtectedRoute";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import Button from "@/components/ui/Button";
import { Bid } from "@/types";
import { updateBidStatus } from "@/lib/bids";
import { createNotification } from "@/lib/notifications";
import { getHomeownerReviewedBidIds } from "@/lib/reviews";
import { ReviewModal } from "@/components/ui/ReviewModal";
import toast from "react-hot-toast";
import { formatDate } from "@/lib/utils";
import {
  HiCollection,
  HiClock,
  HiCurrencyDollar,
  HiCheckCircle,
  HiXCircle,
  HiUser,
  HiStar,
} from "react-icons/hi";

export default function HomeownerBidsPage() {
  const { userProfile } = useAuth();
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "submitted" | "accepted" | "rejected">("all");
  const [reviewedBidIds, setReviewedBidIds] = useState<Set<string>>(new Set());
  const [reviewModalBid, setReviewModalBid] = useState<Bid | null>(null);

  // Subscribe to bids in real time
  useEffect(() => {
    if (!userProfile) return;
    const q = query(
      collection(db, "bids"),
      where("homeownerUid", "==", userProfile.uid),
      orderBy("submittedAt", "desc")
    );
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        setBids(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Bid)));
        setLoading(false);
      },
      (error) => {
        console.error("Error loading bids:", error);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [userProfile]);

  // Load which bids this homeowner has already reviewed
  useEffect(() => {
    if (!userProfile) return;
    getHomeownerReviewedBidIds(userProfile.uid)
      .then(setReviewedBidIds)
      .catch((err) => console.error("Error loading reviewed bids:", err));
  }, [userProfile]);

  const refreshReviewedBids = () => {
    if (!userProfile) return;
    getHomeownerReviewedBidIds(userProfile.uid)
      .then(setReviewedBidIds)
      .catch((err) => console.error("Error refreshing reviewed bids:", err));
  };

  const handleStatusUpdate = async (bid: Bid, status: "accepted" | "rejected") => {
    setActionLoading(bid.id);
    try {
      await updateBidStatus(bid.id, status);
      await createNotification({
        recipientUid: bid.contractorUid,
        type: status === "accepted" ? "bid_accepted" : "bid_rejected",
        title: status === "accepted" ? "Bid Accepted!" : "Bid Rejected",
        message: `Your bid for "${bid.projectCategory}" has been ${status}.`,
        read: false,
        createdAt: new Date().toISOString(),
        relatedId: bid.projectId,
      });
      toast.success(`Bid ${status} successfully!`);
    } catch {
      toast.error("Failed to update bid status.");
    } finally {
      setActionLoading(null);
    }
  };

  const filteredBids = filter === "all" ? bids : bids.filter((b) => b.status === filter);

  const statusStyles: Record<string, string> = {
    submitted: "bg-amber-100 text-amber-700",
    accepted: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-700",
  };

  return (
    <ProtectedRoute allowedRoles={["homeowner"]}>
      <DashboardLayout role="homeowner">
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Bids Received</h1>
            <p className="text-gray-500 mt-1">Review and manage bids from contractors.</p>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-2 flex-wrap">
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

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredBids.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-6 text-center py-12">
              <HiCollection size={48} className="mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500 font-medium">No bids received yet</p>
              <p className="text-sm text-gray-400 mt-1">
                Post a project and contractors will submit bids.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredBids.map((bid) => (
                <div
                  key={bid.id}
                  className="bg-white rounded-xl border border-gray-200 p-5"
                >
                  {/* Bid header */}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="bg-orange-100 text-orange-700 text-xs font-medium px-2.5 py-1 rounded-full">
                          {bid.projectCategory}
                        </span>
                        <span
                          className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                            statusStyles[bid.status] ?? "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {bid.status.charAt(0).toUpperCase() + bid.status.slice(1)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">
                        <HiUser size={16} className="text-gray-400" />
                        <span className="font-medium">{bid.contractorName}</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 shrink-0 ml-2">
                      {formatDate(bid.submittedAt)}
                    </p>
                  </div>

                  {/* Itemized costs */}
                  <div className="bg-gray-50 rounded-lg p-3 mb-3 text-sm">
                    {bid.itemizedCosts.map((item, i) => (
                      <div key={i} className="flex justify-between py-1">
                        <span className="text-gray-600">{item.description}</span>
                        <span className="text-gray-900 font-medium">
                          ${(Number(item.cost) || 0)
                            .toFixed(0)
                            .replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                        </span>
                      </div>
                    ))}
                    <div className="flex justify-between py-1 border-t border-gray-200 mt-1 pt-2 font-bold">
                      <span className="text-gray-900">Total</span>
                      <span className="text-orange-600">
                        ${(Number(bid.totalCost) || 0)
                          .toFixed(0)
                          .replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-3">
                    <span className="flex items-center gap-1">
                      <HiClock size={16} className="text-gray-400" />
                      {bid.estimatedTimeline}
                    </span>
                    <span className="flex items-center gap-1">
                      <HiCurrencyDollar size={16} className="text-gray-400" />
                      ${(Number(bid.totalCost) || 0)
                        .toFixed(0)
                        .replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                    </span>
                  </div>

                  {bid.notes && (
                    <p className="text-sm text-gray-500 mb-3 italic">
                      &quot;{bid.notes}&quot;
                    </p>
                  )}

                  {/* Actions */}
                  <div className="flex flex-wrap gap-3 pt-2">
                    {bid.status === "submitted" && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => handleStatusUpdate(bid, "accepted")}
                          loading={actionLoading === bid.id}
                          className="!bg-green-600 hover:!bg-green-700"
                        >
                          <HiCheckCircle size={16} className="mr-1" />
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => handleStatusUpdate(bid, "rejected")}
                          loading={actionLoading === bid.id}
                        >
                          <HiXCircle size={16} className="mr-1" />
                          Reject
                        </Button>
                      </>
                    )}

                    {/* Review button — only shown for accepted bids */}
                    {bid.status === "accepted" &&
                      (reviewedBidIds.has(bid.id) ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-amber-50 text-amber-700 border border-amber-200">
                          <HiStar size={14} className="text-amber-500" />
                          Reviewed
                        </span>
                      ) : (
                        <button
                          onClick={() => setReviewModalBid(bid)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100 transition-colors"
                        >
                          <HiStar size={14} />
                          Leave Review
                        </button>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Review modal rendered outside the list to avoid z-index issues */}
        {reviewModalBid && userProfile && (
          <ReviewModal
            bid={reviewModalBid}
            homeownerUid={userProfile.uid}
            homeownerName={userProfile.fullName}
            onClose={() => setReviewModalBid(null)}
            onSubmitted={refreshReviewedBids}
          />
        )}
      </DashboardLayout>
    </ProtectedRoute>
  );
}
