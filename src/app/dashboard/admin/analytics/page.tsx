"use client";

import { useState, useEffect } from "react";
import { ref, onValue } from "firebase/database";
import { db } from "@/lib/firebase";
import ProtectedRoute from "@/components/layout/ProtectedRoute";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { HiChartBar, HiUsers, HiClipboardList, HiCreditCard, HiChat, HiCollection, HiShieldCheck, HiLockOpen } from "react-icons/hi";

export default function AdminAnalyticsPage() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    homeowners: 0,
    contractors: 0,
    admins: 0,
    verifiedContractors: 0,
    pendingContractors: 0,
    projects: 0,
    bids: 0,
    acceptedBids: 0,
    conversations: 0,
    transactions: 0,
    totalCreditsInCirculation: 0,
    totalUnlocks: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let loadedSections = 0;
    const checkLoaded = () => {
      loadedSections++;
      if (loadedSections >= 5) setLoading(false);
    };

    // Real-time users
    const unsubUsers = onValue(ref(db, "users"), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val() as Record<string, Record<string, unknown>>;
        let homeowners = 0;
        let contractors = 0;
        let admins = 0;
        let verified = 0;
        let pending = 0;
        let totalCredits = 0;

        Object.values(data).forEach((u) => {
          if (u.role === "homeowner") homeowners++;
          else if (u.role === "contractor") {
            contractors++;
            if (u.verificationStatus === "approved") verified++;
            else if (u.verificationStatus === "pending") pending++;
            totalCredits += (u.creditBalance as number) || 0;
          } else if (u.role === "admin") admins++;
        });

        setStats((prev) => ({
          ...prev,
          homeowners,
          contractors,
          admins,
          totalUsers: homeowners + contractors + admins,
          verifiedContractors: verified,
          pendingContractors: pending,
          totalCreditsInCirculation: totalCredits,
        }));
      }
      checkLoaded();
    });

    // Real-time projects
    const unsubProjects = onValue(ref(db, "projects"), (snapshot) => {
      setStats((prev) => ({
        ...prev,
        projects: snapshot.exists() ? Object.keys(snapshot.val() as object).length : 0,
      }));
      checkLoaded();
    });

    // Real-time bids
    const unsubBids = onValue(ref(db, "bids"), (snapshot) => {
      let total = 0;
      let accepted = 0;
      if (snapshot.exists()) {
        const data = snapshot.val() as Record<string, { status?: string }>;
        Object.values(data).forEach((b) => {
          total++;
          if (b.status === "accepted") accepted++;
        });
      }
      setStats((prev) => ({ ...prev, bids: total, acceptedBids: accepted }));
      checkLoaded();
    });

    // Real-time conversations
    const unsubConvs = onValue(ref(db, "conversations"), (snapshot) => {
      setStats((prev) => ({
        ...prev,
        conversations: snapshot.exists() ? Object.keys(snapshot.val() as object).length : 0,
      }));
      checkLoaded();
    });

    // Real-time unlocks & transactions
    const unsubUnlocks = onValue(ref(db, "unlocks"), (snapshot) => {
      setStats((prev) => ({
        ...prev,
        totalUnlocks: snapshot.exists() ? Object.keys(snapshot.val() as object).length : 0,
      }));
      checkLoaded();
    });

    return () => {
      unsubUsers();
      unsubProjects();
      unsubBids();
      unsubConvs();
      unsubUnlocks();
    };
  }, []);

  const userCards = [
    { label: "Total Users", value: stats.totalUsers, icon: <HiUsers size={24} />, color: "bg-blue-500" },
    { label: "Homeowners", value: stats.homeowners, icon: <HiUsers size={24} />, color: "bg-green-500" },
    { label: "Contractors", value: stats.contractors, icon: <HiShieldCheck size={24} />, color: "bg-orange-500" },
    { label: "Admins", value: stats.admins, icon: <HiUsers size={24} />, color: "bg-purple-500" },
    { label: "Verified Contractors", value: stats.verifiedContractors, icon: <HiShieldCheck size={24} />, color: "bg-emerald-500" },
    { label: "Pending Verifications", value: stats.pendingContractors, icon: <HiShieldCheck size={24} />, color: "bg-amber-500" },
  ];

  const activityCards = [
    { label: "Total Projects", value: stats.projects, icon: <HiClipboardList size={24} />, color: "bg-purple-500" },
    { label: "Total Bids", value: stats.bids, icon: <HiCollection size={24} />, color: "bg-pink-500" },
    { label: "Accepted Bids", value: stats.acceptedBids, icon: <HiCollection size={24} />, color: "bg-green-500" },
    { label: "Conversations", value: stats.conversations, icon: <HiChat size={24} />, color: "bg-teal-500" },
    { label: "Project Unlocks", value: stats.totalUnlocks, icon: <HiLockOpen size={24} />, color: "bg-indigo-500" },
    { label: "Credits in Circulation", value: stats.totalCreditsInCirculation, icon: <HiCreditCard size={24} />, color: "bg-orange-500" },
  ];

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <DashboardLayout role="admin">
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Platform Analytics</h1>
            <p className="text-gray-500 mt-1">Real-time overview of platform activity and metrics.</p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* User Metrics */}
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-4">User Metrics</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {userCards.map((card) => (
                    <div key={card.label} className="bg-white rounded-xl border border-gray-200 p-6 flex items-center gap-4">
                      <div className={`${card.color} text-white p-3 rounded-lg`}>{card.icon}</div>
                      <div>
                        <p className="text-sm text-gray-500">{card.label}</p>
                        <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Activity Metrics */}
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-4">Activity Metrics</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {activityCards.map((card) => (
                    <div key={card.label} className="bg-white rounded-xl border border-gray-200 p-6 flex items-center gap-4">
                      <div className={`${card.color} text-white p-3 rounded-lg`}>{card.icon}</div>
                      <div>
                        <p className="text-sm text-gray-500">{card.label}</p>
                        <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <HiChartBar size={24} className="text-orange-500" />
                  <h2 className="text-lg font-bold text-gray-900">Detailed Analytics</h2>
                </div>
                <p className="text-gray-500 text-sm">
                  Advanced charts and detailed analytics will be available in Iteration 2.
                </p>
              </div>
            </>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}


