"use client";

import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import ProtectedRoute from "@/components/layout/ProtectedRoute";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { ContractorUser, Review } from "@/types";
import { subscribeToContractorReviews } from "@/lib/reviews";
import { StarRating } from "@/components/ui/StarRating";
import { formatRelativeTime } from "@/lib/utils";
import {
  PieChart, Pie, Cell, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
} from "recharts";
import {
  HiChartBar,
  HiCreditCard,
  HiCollection,
  HiCheckCircle,
  HiLockOpen,
  HiStar,
} from "react-icons/hi";

export default function ContractorAnalyticsPage() {
  const { userProfile } = useAuth();
  const contractor = userProfile as ContractorUser | null;
  const [stats, setStats] = useState({
    totalBids: 0,
    acceptedBids: 0,
    rejectedBids: 0,
    unlockedProjects: 0,
    creditsSpent: 0,
  });
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<Review[]>([]);

  useEffect(() => {
    if (!contractor) return;
    const uid = contractor.uid;
    let loadedSections = 0;
    const checkLoaded = () => {
      loadedSections++;
      if (loadedSections >= 3) setLoading(false);
    };

    const unsubBids = onSnapshot(
      query(collection(db, "bids"), where("contractorUid", "==", uid)),
      (snapshot) => {
        let accepted = 0;
        let rejected = 0;
        snapshot.forEach((doc) => {
          const s = doc.data().status;
          if (s === "accepted") accepted++;
          else if (s === "rejected") rejected++;
        });
        setStats((prev) => ({
          ...prev,
          totalBids: snapshot.size,
          acceptedBids: accepted,
          rejectedBids: rejected,
        }));
        checkLoaded();
      },
      (error) => { console.error("Error loading bids:", error); checkLoaded(); }
    );

    const unsubUnlocks = onSnapshot(
      query(collection(db, "unlocks"), where("contractorUid", "==", uid)),
      (snapshot) => {
        setStats((prev) => ({ ...prev, unlockedProjects: snapshot.size }));
        checkLoaded();
      },
      (error) => { console.error("Error loading unlocks:", error); checkLoaded(); }
    );

    const unsubTx = onSnapshot(
      query(collection(db, "transactions"), where("contractorUid", "==", uid)),
      (snapshot) => {
        let creditsSpent = 0;
        snapshot.forEach((doc) => {
          if (doc.data().type === "unlock") {
            creditsSpent += Math.abs(doc.data().creditAmount || 0);
          }
        });
        setStats((prev) => ({ ...prev, creditsSpent }));
        checkLoaded();
      },
      (error) => { console.error("Error loading transactions:", error); checkLoaded(); }
    );

    const unsubReviews = subscribeToContractorReviews(uid, setReviews);

    return () => {
      unsubBids();
      unsubUnlocks();
      unsubTx();
      unsubReviews();
    };
  }, [contractor]);

  const avgRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

  const statCards = [
    { label: "Credits Balance", value: contractor?.creditBalance ?? 0, icon: <HiCreditCard size={24} />, color: "bg-orange-500" },
    { label: "Projects Unlocked", value: stats.unlockedProjects, icon: <HiLockOpen size={24} />, color: "bg-blue-500" },
    { label: "Total Bids", value: stats.totalBids, icon: <HiCollection size={24} />, color: "bg-purple-500" },
    { label: "Accepted Bids", value: stats.acceptedBids, icon: <HiCheckCircle size={24} />, color: "bg-green-500" },
    {
      label: "Avg Rating",
      value: reviews.length > 0 ? avgRating.toFixed(1) : "—",
      icon: <HiStar size={24} />,
      color: "bg-amber-500",
    },
  ];

  return (
    <ProtectedRoute allowedRoles={["contractor"]}>
      <DashboardLayout role="contractor">
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
            <p className="text-gray-500 mt-1">
              Track your bidding activity, credit usage, and reviews in real-time.
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* Stat cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {statCards.map((card) => (
                  <div
                    key={card.label}
                    className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4"
                  >
                    <div className={`${card.color} text-white p-3 rounded-lg shrink-0`}>
                      {card.icon}
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">{card.label}</p>
                      <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                    </div>
                  </div>
                ))}
              </div>

              {stats.creditsSpent > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h2 className="text-lg font-bold text-gray-900 mb-3">
                    Credit Usage Summary
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4 text-center">
                      <p className="text-sm text-gray-500">Credits Spent</p>
                      <p className="text-2xl font-bold text-orange-600">
                        {stats.creditsSpent}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 text-center">
                      <p className="text-sm text-gray-500">Current Balance</p>
                      <p className="text-2xl font-bold text-green-600">
                        {contractor?.creditBalance ?? 0}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 text-center">
                      <p className="text-sm text-gray-500">Bid Success Rate</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {stats.totalBids > 0
                          ? Math.round((stats.acceptedBids / stats.totalBids) * 100)
                          : 0}
                        %
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Charts */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-6">
                  <HiChartBar size={24} className="text-orange-500" />
                  <h2 className="text-lg font-bold text-gray-900">Detailed Reports</h2>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Bid Outcome Pie Chart */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-4 text-center">
                      Bid Outcomes
                    </h3>
                    {stats.totalBids > 0 ? (() => {
                      const pending = Math.max(
                        0,
                        stats.totalBids - stats.acceptedBids - stats.rejectedBids
                      );
                      const data = [
                        { name: "Accepted", value: stats.acceptedBids, color: "#22c55e" },
                        { name: "Pending", value: pending, color: "#f97316" },
                        { name: "Rejected", value: stats.rejectedBids, color: "#ef4444" },
                      ].filter((d) => d.value > 0);
                      return (
                        <ResponsiveContainer width="100%" height={240}>
                          <PieChart>
                            <Pie
                              data={data}
                              cx="50%"
                              cy="50%"
                              innerRadius={55}
                              outerRadius={90}
                              paddingAngle={3}
                              dataKey="value"
                            >
                              {data.map((entry, idx) => (
                                <Cell key={idx} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip
                              formatter={(v) => [
                                `${v} bid${Number(v) !== 1 ? "s" : ""}`,
                                "",
                              ]}
                            />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      );
                    })() : (
                      <div className="flex items-center justify-center h-60 text-gray-400 text-sm">
                        No bid data yet
                      </div>
                    )}
                  </div>

                  {/* Credits Overview Bar Chart */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-4 text-center">
                      Credits Overview
                    </h3>
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart
                        data={[
                          { name: "Spent", value: stats.creditsSpent, fill: "#f97316" },
                          {
                            name: "Balance",
                            value: contractor?.creditBalance ?? 0,
                            fill: "#22c55e",
                          },
                        ]}
                        margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="name" tick={{ fontSize: 13 }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                        <Tooltip formatter={(v) => [`${v} credits`, ""]} />
                        <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                          {[{ fill: "#f97316" }, { fill: "#22c55e" }].map((e, idx) => (
                            <Cell key={idx} fill={e.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Reviews section */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-5">
                  <HiStar size={24} className="text-amber-500" />
                  <h2 className="text-lg font-bold text-gray-900">My Reviews</h2>
                  {reviews.length > 0 && (
                    <span className="ml-auto text-sm text-gray-500">
                      {reviews.length} review{reviews.length !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>

                {reviews.length === 0 ? (
                  <div className="text-center py-10 text-gray-400">
                    <HiStar size={40} className="mx-auto mb-3 opacity-30" />
                    <p className="text-sm font-medium">No reviews yet</p>
                    <p className="text-xs mt-1">
                      Reviews appear here after homeowners rate your work.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Summary bar */}
                    <div className="flex items-center gap-4 p-4 bg-amber-50 rounded-xl mb-5">
                      <p className="text-4xl font-bold text-amber-600">
                        {avgRating.toFixed(1)}
                      </p>
                      <div>
                        <StarRating value={Math.round(avgRating)} readonly size={22} />
                        <p className="text-xs text-gray-500 mt-1">
                          Based on {reviews.length} review
                          {reviews.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>

                    {/* Review list */}
                    <div className="space-y-4">
                      {reviews.map((review) => (
                        <div
                          key={review.id}
                          className="border border-gray-100 rounded-xl p-4"
                        >
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div>
                              <p className="text-sm font-semibold text-gray-900">
                                {review.homeownerName}
                              </p>
                              <span className="inline-block mt-0.5 text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                                {review.projectCategory}
                              </span>
                            </div>
                            <div className="shrink-0 text-right">
                              <StarRating value={review.rating} readonly size={16} />
                              <p className="text-xs text-gray-400 mt-1">
                                {formatRelativeTime(review.createdAt)}
                              </p>
                            </div>
                          </div>
                          {review.comment && (
                            <p className="text-sm text-gray-600 italic">
                              &quot;{review.comment}&quot;
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
