"use client";

import { useEffect, useState } from "react";
import { ref, onValue } from "firebase/database";
import { db } from "@/lib/firebase";
import Link from "next/link";
import ProtectedRoute from "@/components/layout/ProtectedRoute";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { ContractorUser } from "@/types";
import { HiClipboardList, HiChat, HiCreditCard, HiChartBar, HiShieldCheck, HiClock, HiExclamation, HiCollection, HiLockOpen } from "react-icons/hi";

function VerificationBanner({ status }: { status: string }) {
  if (status === "approved") return null;

  if (status === "pending") {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 flex items-start gap-4">
        <div className="bg-amber-100 text-amber-600 p-2 rounded-lg shrink-0">
          <HiClock size={24} />
        </div>
        <div>
          <h3 className="font-semibold text-amber-800">Verification Pending</h3>
          <p className="text-sm text-amber-700 mt-1">
            Your Business Number and OBR credentials are being reviewed by our admin team.
            You&apos;ll receive an email once your account is verified. In the meantime, you can
            explore the platform but cannot unlock projects.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-6 flex items-start gap-4">
      <div className="bg-red-100 text-red-600 p-2 rounded-lg shrink-0">
        <HiExclamation size={24} />
      </div>
      <div>
        <h3 className="font-semibold text-red-800">Verification Rejected</h3>
        <p className="text-sm text-red-700 mt-1">
          Your verification was not approved. Please contact support for more details.
        </p>
      </div>
    </div>
  );
}

export default function ContractorDashboard() {
  const { userProfile } = useAuth();
  const contractor = userProfile as ContractorUser | null;
  const [stats, setStats] = useState({ unlocked: 0, conversations: 0, bids: 0, acceptedBids: 0 });

  useEffect(() => {
    if (!contractor) return;
    const uid = contractor.uid;

    // Real-time listener for unlocks
    const unsubUnlocks = onValue(ref(db, "unlocks"), (snapshot) => {
      let unlocked = 0;
      if (snapshot.exists()) {
        Object.values(snapshot.val() as Record<string, { contractorUid: string }>).forEach((u) => {
          if (u.contractorUid === uid) unlocked++;
        });
      }
      setStats((prev) => ({ ...prev, unlocked }));
    });

    // Real-time listener for conversations
    const unsubConvs = onValue(ref(db, "conversations"), (snapshot) => {
      let conversations = 0;
      if (snapshot.exists()) {
        Object.values(snapshot.val() as Record<string, { contractorUid: string }>).forEach((c) => {
          if (c.contractorUid === uid) conversations++;
        });
      }
      setStats((prev) => ({ ...prev, conversations }));
    });

    // Real-time listener for bids
    const unsubBids = onValue(ref(db, "bids"), (snapshot) => {
      let bids = 0;
      let acceptedBids = 0;
      if (snapshot.exists()) {
        Object.values(snapshot.val() as Record<string, { contractorUid: string; status: string }>).forEach((b) => {
          if (b.contractorUid === uid) {
            bids++;
            if (b.status === "accepted") acceptedBids++;
          }
        });
      }
      setStats((prev) => ({ ...prev, bids, acceptedBids }));
    });

    return () => {
      unsubUnlocks();
      unsubConvs();
      unsubBids();
    };
  }, [contractor]);

  return (
    <ProtectedRoute allowedRoles={["contractor"]}>
      <DashboardLayout role="contractor">
        <div className="space-y-8">
          {/* Welcome */}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Welcome back, {contractor?.contactName?.split(" ")[0]}!
            </h1>
            <p className="text-gray-500 mt-1">
              {contractor?.companyName} &mdash; Manage your leads, bids, and credits.
            </p>
          </div>

          {/* Verification Banner */}
          {contractor && <VerificationBanner status={contractor.verificationStatus} />}

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { label: "Credit Balance", value: contractor?.creditBalance?.toString() || "0", icon: <HiCreditCard size={24} />, color: "bg-orange-500", href: "/dashboard/contractor/credits" },
              { label: "Projects Unlocked", value: stats.unlocked.toString(), icon: <HiLockOpen size={24} />, color: "bg-blue-500", href: "/dashboard/contractor/marketplace" },
              { label: "Messages", value: stats.conversations.toString(), icon: <HiChat size={24} />, color: "bg-green-500", href: "/dashboard/contractor/messages" },
              { label: "Bids Submitted", value: stats.bids.toString(), icon: <HiCollection size={24} />, color: "bg-purple-500", href: "/dashboard/contractor/bids" },
            ].map((stat) => (
              <Link key={stat.label} href={stat.href} className="bg-white rounded-xl border border-gray-200 p-6 hover:border-orange-200 hover:shadow-sm transition-all">
                <div className="flex items-center justify-between mb-4">
                  <div className={`${stat.color} text-white p-3 rounded-lg`}>
                    {stat.icon}
                  </div>
                  {stat.label === "Credit Balance" && (
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                      contractor?.verificationStatus === "approved"
                        ? "bg-green-100 text-green-700"
                        : "bg-amber-100 text-amber-700"
                    }`}>
                      {contractor?.verificationStatus === "approved" ? "Verified" : "Pending"}
                    </span>
                  )}
                </div>
                <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
              </Link>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Link href="/dashboard/contractor/marketplace" className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:border-orange-300 hover:bg-orange-50 transition-colors text-left">
                <div className="bg-orange-100 text-orange-500 p-2 rounded-lg">
                  <HiClipboardList size={20} />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Browse Marketplace</p>
                  <p className="text-sm text-gray-500">Find new renovation projects</p>
                </div>
              </Link>
              <Link href="/dashboard/contractor/credits" className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:border-orange-300 hover:bg-orange-50 transition-colors text-left">
                <div className="bg-green-100 text-green-500 p-2 rounded-lg">
                  <HiCreditCard size={20} />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Buy Credits</p>
                  <p className="text-sm text-gray-500">Purchase credits to unlock projects</p>
                </div>
              </Link>
              <Link href="/dashboard/contractor/messages" className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:border-orange-300 hover:bg-orange-50 transition-colors text-left">
                <div className="bg-blue-100 text-blue-500 p-2 rounded-lg">
                  <HiChat size={20} />
                </div>
                <div>
                  <p className="font-medium text-gray-900">View Messages</p>
                  <p className="text-sm text-gray-500">Check homeowner conversations</p>
                </div>
              </Link>
            </div>
          </div>

          {/* Verification Info */}
          {contractor?.verificationStatus === "approved" && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-6 flex items-start gap-4">
              <div className="bg-green-100 text-green-600 p-2 rounded-lg shrink-0">
                <HiShieldCheck size={24} />
              </div>
              <div>
                <h3 className="font-semibold text-green-800">Verified Contractor</h3>
                <p className="text-sm text-green-700 mt-1">
                  Your business credentials have been verified. You have full access to the marketplace.
                </p>
              </div>
            </div>
          )}

          {/* Recent Activity */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Recent Activity</h2>
            {stats.unlocked === 0 && stats.bids === 0 && stats.conversations === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <HiChartBar size={48} className="mx-auto mb-4 opacity-50" />
                <p className="font-medium">No activity yet</p>
                <p className="text-sm mt-1">Browse the marketplace to find projects!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {stats.unlocked > 0 && (
                  <Link href="/dashboard/contractor/marketplace" className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="bg-blue-100 text-blue-500 p-2 rounded-lg">
                      <HiLockOpen size={18} />
                    </div>
                    <p className="text-sm text-gray-700">You have unlocked <span className="font-semibold">{stats.unlocked}</span> project{stats.unlocked !== 1 ? "s" : ""}</p>
                  </Link>
                )}
                {stats.bids > 0 && (
                  <Link href="/dashboard/contractor/bids" className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="bg-purple-100 text-purple-500 p-2 rounded-lg">
                      <HiCollection size={18} />
                    </div>
                    <p className="text-sm text-gray-700">You have submitted <span className="font-semibold">{stats.bids}</span> bid{stats.bids !== 1 ? "s" : ""}{stats.acceptedBids > 0 ? ` (${stats.acceptedBids} accepted)` : ""}</p>
                  </Link>
                )}
                {stats.conversations > 0 && (
                  <Link href="/dashboard/contractor/messages" className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="bg-green-100 text-green-500 p-2 rounded-lg">
                      <HiChat size={18} />
                    </div>
                    <p className="text-sm text-gray-700">You have <span className="font-semibold">{stats.conversations}</span> active conversation{stats.conversations !== 1 ? "s" : ""}</p>
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}

