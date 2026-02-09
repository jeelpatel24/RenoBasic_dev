"use client";

import { useState, useEffect } from "react";
import { ref, onValue } from "firebase/database";
import { db } from "@/lib/firebase";
import ProtectedRoute from "@/components/layout/ProtectedRoute";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { AppUser } from "@/types";
import { HiUsers, HiMail, HiPhone, HiSearch, HiX } from "react-icons/hi";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState<"all" | "homeowner" | "contractor" | "admin">("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const usersRef = ref(db, "users");
    const unsub = onValue(usersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const allUsers: AppUser[] = Object.entries(data).map(
          ([uid, value]) => ({ ...(value as Record<string, unknown>), uid } as unknown as AppUser)
        );
        setUsers(allUsers);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Filter by role
  const roleFiltered = roleFilter === "all" ? users : users.filter((u) => u.role === roleFilter);

  // Filter by search query (name, email, phone)
  const filteredUsers = searchQuery.trim()
    ? roleFiltered.filter((u) => {
        const q = searchQuery.toLowerCase();
        return (
          (u.fullName && u.fullName.toLowerCase().includes(q)) ||
          (u.email && u.email.toLowerCase().includes(q)) ||
          (u.phone && u.phone.toLowerCase().includes(q))
        );
      })
    : roleFiltered;

  // Count by role for filter badges
  const roleCounts = {
    all: users.length,
    homeowner: users.filter((u) => u.role === "homeowner").length,
    contractor: users.filter((u) => u.role === "contractor").length,
    admin: users.filter((u) => u.role === "admin").length,
  };

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <DashboardLayout role="admin">
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
              <p className="text-gray-500 mt-1">
                {filteredUsers.length} user{filteredUsers.length !== 1 ? "s" : ""}{" "}
                {roleFilter !== "all" ? `(${roleFilter}s)` : "total"}
                {searchQuery.trim() ? ` matching "${searchQuery.trim()}"` : ""}
              </p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <HiSearch size={20} className="text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search by name, email, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-10 py-3 border border-gray-200 rounded-xl bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all text-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
              >
                <HiX size={18} />
              </button>
            )}
          </div>

          {/* Role Filters */}
          <div className="flex flex-wrap gap-2">
            {(["all", "homeowner", "contractor", "admin"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setRoleFilter(f)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                  roleFilter === f
                    ? "bg-orange-500 text-white"
                    : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}s
                <span
                  className={`text-xs px-1.5 py-0.5 rounded-full ${
                    roleFilter === f
                      ? "bg-orange-600 text-orange-100"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {roleCounts[f]}
                </span>
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-6 text-center py-16">
              <HiUsers size={48} className="mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500 font-medium">
                {searchQuery.trim()
                  ? `No users found matching "${searchQuery.trim()}"`
                  : `No ${roleFilter === "all" ? "" : roleFilter + " "}users found`}
              </p>
              {searchQuery.trim() && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="mt-3 text-sm text-orange-500 hover:text-orange-600 font-medium"
                >
                  Clear search
                </button>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-gray-600 font-medium">Name</th>
                    <th className="text-left px-4 py-3 text-gray-600 font-medium">Email</th>
                    <th className="text-left px-4 py-3 text-gray-600 font-medium">Phone</th>
                    <th className="text-left px-4 py-3 text-gray-600 font-medium">Role</th>
                    <th className="text-left px-4 py-3 text-gray-600 font-medium">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.uid} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                              user.role === "contractor"
                                ? "bg-blue-500"
                                : user.role === "admin"
                                ? "bg-purple-500"
                                : "bg-green-500"
                            }`}
                          >
                            {user.fullName?.charAt(0)?.toUpperCase() || "?"}
                          </div>
                          {user.fullName}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        <div className="flex items-center gap-1">
                          <HiMail size={14} className="text-gray-400" />
                          {user.email}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        <div className="flex items-center gap-1">
                          <HiPhone size={14} className="text-gray-400" />
                          {user.phone}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs font-medium px-2 py-1 rounded-full ${
                            user.role === "contractor"
                              ? "bg-blue-100 text-blue-700"
                              : user.role === "admin"
                              ? "bg-purple-100 text-purple-700"
                              : "bg-green-100 text-green-700"
                          }`}
                        >
                          {user.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {new Date(user.createdAt).toLocaleDateString("en-CA")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}

