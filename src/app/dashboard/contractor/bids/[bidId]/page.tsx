"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import ProtectedRoute from "@/components/layout/ProtectedRoute";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";
import { Bid } from "@/types";
import { formatDate } from "@/lib/utils";
import {
  HiArrowLeft,
  HiClock,
  HiCheckCircle,
  HiXCircle,
  HiExclamation,
} from "react-icons/hi";

export default function ContractorBidDetailPage() {
  const params = useParams();
  const bidId = params.bidId as string;
  const { userProfile } = useAuth();
  const [bid, setBid] = useState<Bid | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userProfile) return;
    const fetchBid = async () => {
      try {
        const snap = await getDoc(doc(db, "bids", bidId));
        if (!snap.exists()) {
          setError("Bid not found.");
          setLoading(false);
          return;
        }
        const data = { id: snap.id, ...snap.data() } as Bid;
        // Security: only the contractor who submitted the bid can view it
        if (data.contractorUid !== userProfile.uid) {
          setError("You don't have permission to view this bid.");
          setLoading(false);
          return;
        }
        setBid(data);
      } catch (err) {
        console.error("Error fetching bid:", err);
        setError("Failed to load bid details.");
      } finally {
        setLoading(false);
      }
    };
    fetchBid();
  }, [bidId, userProfile]);

  const statusStyles: Record<string, string> = {
    submitted: "bg-amber-100 text-amber-700",
    accepted: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-700",
  };

  const statusIcons: Record<string, React.ReactNode> = {
    submitted: <HiClock size={14} />,
    accepted: <HiCheckCircle size={14} />,
    rejected: <HiXCircle size={14} />,
  };

  return (
    <ProtectedRoute allowedRoles={["contractor"]}>
      <DashboardLayout role="contractor">
        <div className="max-w-2xl space-y-6">
          {/* Back link + title */}
          <div>
            <Link
              href="/dashboard/contractor/bids"
              className="inline-flex items-center gap-2 text-gray-600 hover:text-orange-600 transition-colors text-sm mb-4"
            >
              <HiArrowLeft size={16} /> Back to My Bids
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Bid Details</h1>
          </div>

          {loading ? (
            <div className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse space-y-4">
              <div className="flex gap-2">
                <div className="h-6 w-24 bg-gray-200 rounded-full" />
                <div className="h-6 w-20 bg-gray-200 rounded-full" />
              </div>
              <div className="border border-gray-100 rounded-lg p-4 space-y-2">
                <div className="h-4 w-full bg-gray-100 rounded" />
                <div className="h-4 w-3/4 bg-gray-100 rounded" />
                <div className="h-4 w-1/2 bg-gray-100 rounded" />
              </div>
              <div className="h-4 w-40 bg-gray-200 rounded" />
            </div>
          ) : error ? (
            <div className="bg-white rounded-xl border border-gray-200 p-6 text-center py-12">
              <HiExclamation size={48} className="mx-auto mb-4 text-red-300" />
              <p className="font-medium text-gray-700 mb-4">{error}</p>
              <Link
                href="/dashboard/contractor/bids"
                className="px-5 py-2 rounded-lg bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 transition-colors"
              >
                Back to Bids
              </Link>
            </div>
          ) : bid ? (
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
              {/* Badges */}
              <div className="flex flex-wrap gap-2">
                <span className="bg-orange-100 text-orange-700 text-xs font-medium px-2.5 py-1 rounded-full">
                  {bid.projectCategory}
                </span>
                <span
                  className={`text-xs font-medium px-2.5 py-1 rounded-full flex items-center gap-1 ${
                    statusStyles[bid.status] ?? "bg-gray-100 text-gray-700"
                  }`}
                >
                  {statusIcons[bid.status]}
                  {bid.status.charAt(0).toUpperCase() + bid.status.slice(1)}
                </span>
              </div>

              {/* Invoice — new format */}
              {bid.lineItems && bid.lineItems.length > 0 ? (
                <div className="border border-gray-200 rounded-lg overflow-hidden text-sm">
                  {(bid.companyName || bid.contactEmail || bid.contactPhone) && (
                    <div className="bg-orange-50 px-4 py-3 border-b border-orange-100">
                      {bid.companyName && (
                        <p className="font-semibold text-orange-700">{bid.companyName}</p>
                      )}
                      {bid.contactName && (
                        <p className="text-gray-600 text-xs mt-0.5">{bid.contactName}</p>
                      )}
                      {bid.contactEmail && (
                        <p className="text-gray-500 text-xs">{bid.contactEmail}</p>
                      )}
                      {bid.contactPhone && (
                        <p className="text-gray-500 text-xs">{bid.contactPhone}</p>
                      )}
                    </div>
                  )}
                  <div className="grid grid-cols-[1fr_40px_80px_80px] gap-1 px-4 py-2 bg-gray-50 text-xs font-semibold text-gray-500">
                    <span>Description</span>
                    <span className="text-center">Qty</span>
                    <span className="text-right">Unit Price</span>
                    <span className="text-right">Subtotal</span>
                  </div>
                  {bid.lineItems.map((item, i) => (
                    <div
                      key={i}
                      className="grid grid-cols-[1fr_40px_80px_80px] gap-1 px-4 py-2 border-b border-gray-100"
                    >
                      <span className="text-gray-700">{item.description}</span>
                      <span className="text-center text-gray-500">{item.qty}</span>
                      <span className="text-right text-gray-500">
                        ${(item.unitPrice || 0).toFixed(2)}
                      </span>
                      <span className="text-right font-medium text-gray-800">
                        ${(item.subtotal || 0).toFixed(2)}
                      </span>
                    </div>
                  ))}
                  <div className="px-4 py-3 space-y-1">
                    <div className="flex justify-between text-gray-500 text-sm">
                      <span>Subtotal</span>
                      <span>${(bid.subtotal ?? 0).toFixed(2)}</span>
                    </div>
                    {(bid.taxRate ?? 0) > 0 && (
                      <div className="flex justify-between text-gray-500 text-sm">
                        <span>Tax ({bid.taxRate}%)</span>
                        <span>${(bid.taxAmount ?? 0).toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-gray-900 border-t border-gray-200 pt-2">
                      <span>Total</span>
                      <span className="text-orange-600">
                        ${(bid.totalAmount ?? bid.totalCost ?? 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                /* Legacy format */
                <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-1">
                  {(bid.itemizedCosts ?? []).map(
                    (item: { description: string; cost: number }, i: number) => (
                      <div key={i} className="flex justify-between py-0.5">
                        <span className="text-gray-600">{item.description}</span>
                        <span className="font-medium">
                          ${(Number(item.cost) || 0).toFixed(0)}
                        </span>
                      </div>
                    )
                  )}
                  <div className="flex justify-between font-bold border-t border-gray-200 pt-2">
                    <span>Total</span>
                    <span className="text-orange-600">
                      ${(Number(bid.totalCost) || 0).toFixed(0)}
                    </span>
                  </div>
                </div>
              )}

              {/* Timeline */}
              {bid.estimatedTimeline && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <HiClock size={16} className="text-gray-400" />
                  {bid.estimatedTimeline}
                </div>
              )}

              {/* Notes */}
              {bid.notes && (
                <p className="text-sm text-gray-500 italic border-l-2 border-orange-200 pl-3">
                  &quot;{bid.notes}&quot;
                </p>
              )}

              {/* Submitted date */}
              <p className="text-xs text-gray-400">
                Submitted {formatDate(bid.submittedAt)}
              </p>

              {/* View project link */}
              <div className="pt-2 border-t border-gray-100">
                <Link
                  href={`/dashboard/contractor/marketplace/${bid.projectId}`}
                  className="text-sm text-orange-600 hover:text-orange-700 font-medium transition-colors"
                >
                  View Project →
                </Link>
              </div>
            </div>
          ) : null}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
