"use client";

import { useState, useEffect, useRef } from "react";
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import ProtectedRoute from "@/components/layout/ProtectedRoute";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import Button from "@/components/ui/Button";
import { Bid } from "@/types";
import { updateBidStatus, acceptBid } from "@/lib/bids";
import { createNotification } from "@/lib/notifications";
import { getHomeownerReviewedBidIds, getContractorRatingSummary } from "@/lib/reviews";
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
  const [ratingSummaries, setRatingSummaries] = useState<Record<string, { count: number; average: number }>>({});
  const fetchedUids = useRef<Set<string>>(new Set());

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

  // Load rating summaries for contractors we haven't fetched yet
  useEffect(() => {
    const newUids = bids
      .map((b) => b.contractorUid)
      .filter((uid): uid is string => !!uid && !fetchedUids.current.has(uid));
    if (newUids.length === 0) return;
    newUids.forEach((uid) => fetchedUids.current.add(uid));
    Promise.all(
      newUids.map((uid) =>
        getContractorRatingSummary(uid)
          .then((summary) => ({ uid, summary }))
          .catch(() => ({ uid, summary: { count: 0, average: 0 } }))
      )
    ).then((results) => {
      setRatingSummaries((prev) => {
        const next = { ...prev };
        results.forEach(({ uid, summary }) => { next[uid] = summary; });
        return next;
      });
    });
  }, [bids]);

  const handleStatusUpdate = async (bid: Bid, status: "accepted" | "rejected") => {
    setActionLoading(bid.id);
    try {
      if (status === "accepted") {
        // Accept this bid, auto-reject siblings, move project to in_progress.
        const rejected = await acceptBid(bid.id, bid.projectId);

        // Notify the accepted contractor.
        await createNotification({
          recipientUid: bid.contractorUid,
          type: "bid_accepted",
          title: "Bid Accepted!",
          message: `Your bid for "${bid.projectCategory}" has been accepted.`,
          read: false,
          createdAt: new Date().toISOString(),
          relatedId: bid.projectId,
        });

        // Notify every auto-rejected contractor.
        await Promise.all(
          rejected.map((r) =>
            createNotification({
              recipientUid: r.contractorUid,
              type: "bid_rejected",
              title: "Bid Not Selected",
              message: `Another contractor was selected for "${r.projectCategory}".`,
              read: false,
              createdAt: new Date().toISOString(),
              relatedId: bid.projectId,
            })
          )
        );
      } else {
        // Simple rejection of this single bid.
        await updateBidStatus(bid.id, status);
        await createNotification({
          recipientUid: bid.contractorUid,
          type: "bid_rejected",
          title: "Bid Rejected",
          message: `Your bid for "${bid.projectCategory}" has been rejected.`,
          read: false,
          createdAt: new Date().toISOString(),
          relatedId: bid.projectId,
        });
      }

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
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
                  <div className="flex items-start justify-between mb-3">
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <div className="h-5 w-24 bg-gray-200 rounded-full" />
                        <div className="h-5 w-20 bg-gray-200 rounded-full" />
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-4 bg-gray-200 rounded-full" />
                        <div className="h-4 w-32 bg-gray-200 rounded" />
                      </div>
                    </div>
                    <div className="h-4 w-20 bg-gray-200 rounded" />
                  </div>
                  <div className="border border-gray-100 rounded-lg p-3 mb-3 space-y-2">
                    <div className="h-3 w-full bg-gray-100 rounded" />
                    <div className="h-3 w-3/4 bg-gray-100 rounded" />
                    <div className="h-3 w-1/2 bg-gray-100 rounded" />
                  </div>
                  <div className="flex gap-4">
                    <div className="h-4 w-24 bg-gray-200 rounded" />
                    <div className="h-4 w-24 bg-gray-200 rounded" />
                  </div>
                </div>
              ))}
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
                      <div className="flex items-center gap-2 mt-2 text-sm text-gray-600 flex-wrap">
                        <HiUser size={16} className="text-gray-400" />
                        <span className="font-medium">{bid.contractorName}</span>
                        {bid.contractorUid && ratingSummaries[bid.contractorUid] !== undefined && (
                          ratingSummaries[bid.contractorUid].count === 0 ? (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">New</span>
                          ) : (
                            <span className="flex items-center gap-1 text-xs font-semibold text-amber-800">
                              <HiStar size={13} className="text-yellow-400" />
                              {ratingSummaries[bid.contractorUid].average.toFixed(1)} · {ratingSummaries[bid.contractorUid].count}
                            </span>
                          )
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 shrink-0 ml-2">
                      {formatDate(bid.submittedAt)}
                    </p>
                  </div>

                  {/* Invoice / Itemized costs */}
                  {bid.lineItems && bid.lineItems.length > 0 ? (
                    <div className="border border-gray-200 rounded-lg overflow-hidden mb-3 text-sm">
                      {/* Contractor details */}
                      {(bid.companyName || bid.contactEmail || bid.contactPhone) && (
                        <div className="bg-orange-50 px-3 py-2 border-b border-orange-100">
                          {bid.companyName && <p className="font-semibold text-orange-700">{bid.companyName}</p>}
                          {bid.contactName && <p className="text-gray-600 text-xs">{bid.contactName}</p>}
                          {bid.contactEmail && <p className="text-gray-500 text-xs">{bid.contactEmail}</p>}
                          {bid.contactPhone && <p className="text-gray-500 text-xs">{bid.contactPhone}</p>}
                        </div>
                      )}
                      {/* Column headers */}
                      <div className="grid grid-cols-[1fr_40px_80px_80px] gap-1 px-3 py-1.5 bg-gray-100 text-xs font-semibold text-gray-500">
                        <span>Description</span>
                        <span className="text-center">Qty</span>
                        <span className="text-right">Unit Price</span>
                        <span className="text-right">Subtotal</span>
                      </div>
                      {/* Line items */}
                      {bid.lineItems.map((item, i) => (
                        <div key={i} className="grid grid-cols-[1fr_40px_80px_80px] gap-1 px-3 py-1.5 border-b border-gray-100 text-sm">
                          <span className="text-gray-700">{item.description}</span>
                          <span className="text-center text-gray-500">{item.qty}</span>
                          <span className="text-right text-gray-500">${(item.unitPrice || 0).toFixed(2)}</span>
                          <span className="text-right font-medium text-gray-800">${(item.subtotal || 0).toFixed(2)}</span>
                        </div>
                      ))}
                      {/* Summary */}
                      <div className="px-3 py-2 space-y-1 text-sm">
                        <div className="flex justify-between text-gray-500">
                          <span>Subtotal</span>
                          <span>${(bid.subtotal ?? 0).toFixed(2)}</span>
                        </div>
                        {(bid.taxRate ?? 0) > 0 && (
                          <div className="flex justify-between text-gray-500">
                            <span>Tax ({bid.taxRate}%)</span>
                            <span>${(bid.taxAmount ?? 0).toFixed(2)}</span>
                          </div>
                        )}
                        <div className="flex justify-between font-bold text-gray-900 border-t border-gray-200 pt-1">
                          <span>Total</span>
                          <span className="text-orange-600">${(bid.totalAmount ?? bid.totalCost ?? 0).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Legacy format */
                    <div className="bg-gray-50 rounded-lg p-3 mb-3 text-sm">
                      {(bid.itemizedCosts ?? []).map((item: {description: string; cost: number}, i: number) => (
                        <div key={i} className="flex justify-between py-1">
                          <span className="text-gray-600">{item.description}</span>
                          <span className="text-gray-900 font-medium">
                            ${(Number(item.cost) || 0).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                          </span>
                        </div>
                      ))}
                      <div className="flex justify-between py-1 border-t border-gray-200 mt-1 pt-2 font-bold">
                        <span className="text-gray-900">Total</span>
                        <span className="text-orange-600">
                          ${(Number(bid.totalCost) || 0).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                        </span>
                      </div>
                    </div>
                  )}

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
