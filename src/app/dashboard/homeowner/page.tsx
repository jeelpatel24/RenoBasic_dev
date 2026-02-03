"use client";

import { useEffect, useState } from "react";
import { ref, onValue } from "firebase/database";
import { db } from "@/lib/firebase";
import Link from "next/link";
import ProtectedRoute from "@/components/layout/ProtectedRoute";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { HiClipboardList, HiChat, HiEye, HiCollection } from "react-icons/hi";

export default function HomeownerDashboard() {
  const { userProfile } = useAuth();
  const [stats, setStats] = useState({ projects: 0, conversations: 0, unlocks: 0, bids: 0 });

  useEffect(() => {
    if (!userProfile) return;
    const uid = userProfile.uid;

    // Real-time listener for projects
    const unsubProjects = onValue(ref(db, "projects"), (snapshot) => {
      let projects = 0;
      if (snapshot.exists()) {
        Object.values(snapshot.val() as Record<string, { homeownerUid: string }>).forEach((p) => {
          if (p.homeownerUid === uid) projects++;
        });
      }
      setStats((prev) => ({ ...prev, projects }));
    });

    // Real-time listener for conversations
    const unsubConvs = onValue(ref(db, "conversations"), (snapshot) => {
      let conversations = 0;
      if (snapshot.exists()) {
        Object.values(snapshot.val() as Record<string, { homeownerUid: string }>).forEach((c) => {
          if (c.homeownerUid === uid) conversations++;
        });
      }
      setStats((prev) => ({ ...prev, conversations }));
    });

    // Real-time listener for unlocks
    const unsubUnlocks = onValue(ref(db, "unlocks"), (snapshot) => {
      let unlocks = 0;
      if (snapshot.exists()) {
        Object.values(snapshot.val() as Record<string, { homeownerUid?: string }>).forEach((u) => {
          if (u.homeownerUid === uid) unlocks++;
        });
      }
      setStats((prev) => ({ ...prev, unlocks }));
    });

    // Real-time listener for bids
    const unsubBids = onValue(ref(db, "bids"), (snapshot) => {
      let bids = 0;
      if (snapshot.exists()) {
        Object.values(snapshot.val() as Record<string, { homeownerUid: string }>).forEach((b) => {
          if (b.homeownerUid === uid) bids++;
        });
      }
      setStats((prev) => ({ ...prev, bids }));
    });

    return () => {
      unsubProjects();
      unsubConvs();
      unsubUnlocks();
      unsubBids();
    };
  }, [userProfile]);

  return (
    <ProtectedRoute allowedRoles={["homeowner"]}>
      <DashboardLayout role="homeowner">
        <div className="space-y-8">
          {/* Welcome */}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Welcome back, {userProfile?.fullName?.split(" ")[0]}!
            </h1>
            <p className="text-gray-500 mt-1">
              Manage your renovation projects and connect with verified contractors.
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { label: "Active Projects", value: stats.projects.toString(), icon: <HiClipboardList size={24} />, color: "bg-orange-500", href: "/dashboard/homeowner/projects" },
              { label: "Messages", value: stats.conversations.toString(), icon: <HiChat size={24} />, color: "bg-blue-500", href: "/dashboard/homeowner/messages" },
              { label: "Project Views", value: stats.unlocks.toString(), icon: <HiEye size={24} />, color: "bg-green-500", href: "/dashboard/homeowner/projects" },
              { label: "Bids Received", value: stats.bids.toString(), icon: <HiCollection size={24} />, color: "bg-purple-500", href: "/dashboard/homeowner/bids" },
            ].map((stat) => (
              <Link key={stat.label} href={stat.href} className="bg-white rounded-xl border border-gray-200 p-6 hover:border-orange-200 hover:shadow-sm transition-all">
                <div className="flex items-center justify-between mb-4">
                  <div className={`${stat.color} text-white p-3 rounded-lg`}>
                    {stat.icon}
                  </div>
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
              <Link href="/dashboard/homeowner/projects" className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:border-orange-300 hover:bg-orange-50 transition-colors text-left">
                <div className="bg-orange-100 text-orange-500 p-2 rounded-lg">
                  <HiClipboardList size={20} />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Post a New Project</p>
                  <p className="text-sm text-gray-500">Create a renovation project listing</p>
                </div>
              </Link>
              <Link href="/dashboard/homeowner/messages" className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:border-orange-300 hover:bg-orange-50 transition-colors text-left">
                <div className="bg-blue-100 text-blue-500 p-2 rounded-lg">
                  <HiChat size={20} />
                </div>
                <div>
                  <p className="font-medium text-gray-900">View Messages</p>
                  <p className="text-sm text-gray-500">Check your contractor conversations</p>
                </div>
              </Link>
              <Link href="/dashboard/homeowner/bids" className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:border-orange-300 hover:bg-orange-50 transition-colors text-left">
                <div className="bg-purple-100 text-purple-500 p-2 rounded-lg">
                  <HiCollection size={20} />
                </div>
                <div>
                  <p className="font-medium text-gray-900">View Bids</p>
                  <p className="text-sm text-gray-500">Review bids from contractors</p>
                </div>
              </Link>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Recent Activity</h2>
            {stats.projects === 0 && stats.bids === 0 && stats.conversations === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <HiClipboardList size={48} className="mx-auto mb-4 opacity-50" />
                <p className="font-medium">No activity yet</p>
                <p className="text-sm mt-1">Post your first project to get started!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {stats.projects > 0 && (
                  <Link href="/dashboard/homeowner/projects" className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="bg-orange-100 text-orange-500 p-2 rounded-lg">
                      <HiClipboardList size={18} />
                    </div>
                    <p className="text-sm text-gray-700">You have <span className="font-semibold">{stats.projects}</span> project{stats.projects !== 1 ? "s" : ""} posted</p>
                  </Link>
                )}
                {stats.bids > 0 && (
                  <Link href="/dashboard/homeowner/bids" className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="bg-purple-100 text-purple-500 p-2 rounded-lg">
                      <HiCollection size={18} />
                    </div>
                    <p className="text-sm text-gray-700">You have <span className="font-semibold">{stats.bids}</span> bid{stats.bids !== 1 ? "s" : ""} to review</p>
                  </Link>
                )}
                {stats.conversations > 0 && (
                  <Link href="/dashboard/homeowner/messages" className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="bg-blue-100 text-blue-500 p-2 rounded-lg">
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
// Dhruv - homeowner dashboard component
