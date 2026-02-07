"use client";

import { useState, useEffect } from "react";
import { ref, onValue } from "firebase/database";
import { db } from "@/lib/firebase";
import ProtectedRoute from "@/components/layout/ProtectedRoute";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { ContractorUser } from "@/types";
import {
  HiChartBar,
  HiCreditCard,
  HiCollection,
  HiCheckCircle,
  HiLockOpen,
} from "react-icons/hi";

export default function ContractorAnalyticsPage() {
  const { userProfile } = useAuth();
  const contractor = userProfile as ContractorUser | null;
  const [stats, setStats] = useState({
    totalBids: 0,
    acceptedBids: 0,
    unlockedProjects: 0,
    creditsSpent: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!contractor) return;
    const uid = contractor.uid;
    let loadedSections = 0;
    const checkLoaded = () => {
      loadedSections++;
      if (loadedSections >= 3) setLoading(false);
    };

    // Real-time bids listener
    const unsubBids = onValue(ref(db, "bids"), (snapshot) => {
      let totalBids = 0;
      let acceptedBids = 0;
      if (snapshot.exists()) {
        Object.values(snapshot.val() as Record<string, { contractorUid: string; status: string }>).forEach((b) => {
          if (b.contractorUid === uid) {
            totalBids++;
            if (b.status === "accepted") acceptedBids++;
          }
        });
      }
      setStats((prev) => ({ ...prev, totalBids, acceptedBids }));
      checkLoaded();
    });

    // Real-time unlocks listener
    const unsubUnlocks = onValue(ref(db, "unlocks"), (snapshot) => {
      let unlockedProjects = 0;
      if (snapshot.exists()) {
        Object.values(snapshot.val() as Record<string, { contractorUid: string }>).forEach((u) => {
          if (u.contractorUid === uid) unlockedProjects++;
        });
      }
      setStats((prev) => ({ ...prev, unlockedProjects }));
      checkLoaded();
    });

    // Real-time transactions listener
    const unsubTx = onValue(ref(db, "transactions"), (snapshot) => {
      let creditsSpent = 0;
      if (snapshot.exists()) {
        Object.values(snapshot.val() as Record<string, { uid?: string; contractorUid?: string; type: string; creditAmount?: number; amount?: number }>).forEach((t) => {
          if ((t.uid === uid || t.contractorUid === uid) && t.type === "unlock") {
            creditsSpent += Math.abs(t.creditAmount || t.amount || 0);
          }
        });
      }
      setStats((prev) => ({ ...prev, creditsSpent }));
      checkLoaded();
    });

    return () => {
      unsubBids();
      unsubUnlocks();
      unsubTx();
    };
  }, [contractor]);

  const statCards = [
    { label: "Credits Balance", value: contractor?.creditBalance ?? 0, icon: <HiCreditCard size={24} />, color: "bg-orange-500" },
    { label: "Projects Unlocked", value: stats.unlockedProjects, icon: <HiLockOpen size={24} />, color: "bg-blue-500" },
    { label: "Total Bids", value: stats.totalBids, icon: <HiCollection size={24} />, color: "bg-purple-500" },
    { label: "Accepted Bids", value: stats.acceptedBids, icon: <HiCheckCircle size={24} />, color: "bg-green-500" },
  ];

  return (
    <ProtectedRoute allowedRoles={["contractor"]}>
      <DashboardLayout role="contractor">
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
            <p className="text-gray-500 mt-1">Track your bidding activity and credit usage in real-time.</p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {statCards.map((card) => (
                  <div key={card.label} className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
                    <div className={`${card.color} text-white p-3 rounded-lg`}>{card.icon}</div>
                    <div>
                      <p className="text-sm text-gray-500">{card.label}</p>
                      <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                    </div>
                  </div>
                ))}
              </div>

              {stats.creditsSpent > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h2 className="text-lg font-bold text-gray-900 mb-3">Credit Usage Summary</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4 text-center">
                      <p className="text-sm text-gray-500">Credits Spent</p>
                      <p className="text-2xl font-bold text-orange-600">{stats.creditsSpent}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 text-center">
                      <p className="text-sm text-gray-500">Current Balance</p>
                      <p className="text-2xl font-bold text-green-600">{contractor?.creditBalance ?? 0}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 text-center">
                      <p className="text-sm text-gray-500">Bid Success Rate</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {stats.totalBids > 0 ? Math.round((stats.acceptedBids / stats.totalBids) * 100) : 0}%
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <HiChartBar size={24} className="text-orange-500" />
                  <h2 className="text-lg font-bold text-gray-900">Detailed Reports</h2>
                </div>
                <p className="text-gray-500 text-sm">
                  Revenue charts, bid success rates, and detailed reports coming in Iteration 2.
                </p>
              </div>
            </>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}

