"use client";

import { useState, useEffect } from "react";
import { collection, onSnapshot, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import ProtectedRoute from "@/components/layout/ProtectedRoute";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { AppUser, Review } from "@/types";
import { formatDate, formatRelativeTime } from "@/lib/utils";
import { getContractorReviewsOnce, deleteReview } from "@/lib/reviews";
import { StarRating } from "@/components/ui/StarRating";
import toast from "react-hot-toast";
import { HiUsers, HiMail, HiPhone, HiSearch, HiX, HiStar, HiTrash, HiExclamation } from "react-icons/hi";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState<"all" | "homeowner" | "contractor" | "admin">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Review modal state
  const [reviewsModalUser, setReviewsModalUser] = useState<AppUser | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteReviewId, setConfirmDeleteReviewId] = useState<string | null>(null);

  // Delete user state
  const [confirmDeleteUser, setConfirmDeleteUser] = useState<AppUser | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "users"),
      (snapshot) => {
        const allUsers = snapshot.docs.map((doc) => ({
          ...doc.data(),
          uid: doc.id,
        } as AppUser));
        setUsers(allUsers);
        setLoading(false);
      },
      (error) => { console.error("Error loading users:", error); setLoading(false); }
    );
    return () => unsub();
  }, []);

  const openReviews = async (user: AppUser) => {
    setReviewsModalUser(user);
    setReviews([]);
    setReviewsLoading(true);
    try {
      const data = await getContractorReviewsOnce(user.uid);
      setReviews(data);
    } catch {
      toast.error("Failed to load reviews.");
    } finally {
      setReviewsLoading(false);
    }
  };

  const handleDeleteReview = async () => {
    if (!confirmDeleteReviewId) return;
    const reviewId = confirmDeleteReviewId;
    setConfirmDeleteReviewId(null);
    setDeletingId(reviewId);
    try {
      await deleteReview(reviewId);
      setReviews((prev) => prev.filter((r) => r.id !== reviewId));
      toast.success("Review deleted.");
    } catch {
      toast.error("Failed to delete review.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteUser = async () => {
    if (!confirmDeleteUser) return;
    const user = confirmDeleteUser;
    setConfirmDeleteUser(null);
    setDeletingUserId(user.uid);
    try {
      // Close reviews modal if this user's reviews were open
      if (reviewsModalUser?.uid === user.uid) setReviewsModalUser(null);
      await deleteDoc(doc(db, "users", user.uid));
      // onSnapshot will automatically remove them from the users list
      toast.success(`${user.fullName}'s account has been deleted.`);
    } catch {
      toast.error("Failed to delete user account.");
    } finally {
      setDeletingUserId(null);
    }
  };

  const roleFiltered = roleFilter === "all" ? users : users.filter((u) => u.role === roleFilter);
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

  const roleCounts = {
    all: users.length,
    homeowner: users.filter((u) => u.role === "homeowner").length,
    contractor: users.filter((u) => u.role === "contractor").length,
    admin: users.filter((u) => u.role === "admin").length,
  };

  const avgRating =
    reviews.length > 0
      ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
      : 0;

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
                    <th className="text-left px-4 py-3 text-gray-600 font-medium">Actions</th>
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
                        {formatDate(user.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {user.role === "contractor" && (
                            <button
                              onClick={() => openReviews(user)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors"
                            >
                              <HiStar size={13} className="text-amber-500" />
                              Reviews
                            </button>
                          )}
                          <button
                            onClick={() => setConfirmDeleteUser(user)}
                            disabled={deletingUserId === user.uid}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
                            title="Delete user account"
                          >
                            {deletingUserId === user.uid ? (
                              <div className="w-3 h-3 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <HiTrash size={13} />
                            )}
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Reviews Modal */}
        {reviewsModalUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    Reviews — {reviewsModalUser.fullName}
                  </h2>
                  {reviews.length > 0 && (
                    <p className="text-sm text-gray-500 mt-0.5">
                      {reviews.length} review{reviews.length !== 1 ? "s" : ""} · avg{" "}
                      <span className="text-amber-600 font-medium">
                        {avgRating.toFixed(1)}
                      </span>
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setReviewsModalUser(null)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <HiX size={20} />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto px-6 py-4">
                {reviewsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : reviews.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <HiStar size={40} className="mx-auto mb-3 opacity-30" />
                    <p className="text-sm font-medium">No reviews yet</p>
                    <p className="text-xs mt-1">This contractor has not received any reviews.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {reviews.map((review) => (
                      <div
                        key={review.id}
                        className="border border-gray-100 rounded-xl p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-semibold text-gray-900">
                                {review.homeownerName}
                              </p>
                              <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                                {review.projectCategory}
                              </span>
                            </div>
                            <div className="mt-1.5 flex items-center gap-3">
                              <StarRating value={review.rating} readonly size={14} />
                              <span className="text-xs text-gray-400">
                                {formatRelativeTime(review.createdAt)}
                              </span>
                            </div>
                            {review.comment && (
                              <p className="mt-2 text-sm text-gray-600 italic">
                                &quot;{review.comment}&quot;
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => setConfirmDeleteReviewId(review.id)}
                            disabled={deletingId === review.id}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 flex-shrink-0"
                            title="Delete review"
                          >
                            {deletingId === review.id ? (
                              <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <HiTrash size={16} />
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-gray-100 flex-shrink-0">
                <button
                  onClick={() => setReviewsModalUser(null)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Delete Review Confirmation Modal */}
        {confirmDeleteReviewId && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                  <HiExclamation size={20} className="text-red-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Delete Review</h3>
                  <p className="text-sm text-gray-500">This action cannot be undone.</p>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-6">
                Are you sure you want to permanently delete this review?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDeleteReviewId(null)}
                  className="flex-1 px-4 py-2 rounded-xl border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteReview}
                  className="flex-1 px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors"
                >
                  Delete Review
                </button>
              </div>
            </div>
          </div>
        )}
      </DashboardLayout>

      {/* Delete User Confirmation Modal */}
      {confirmDeleteUser && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <HiExclamation size={20} className="text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Delete User Account?</h3>
                <p className="text-sm text-gray-500">This cannot be undone.</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-2">
              This will permanently delete{" "}
              <span className="font-semibold">{confirmDeleteUser.fullName}</span>
              &apos;s Firestore profile.
            </p>
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-6">
              Note: Their Firebase login credentials remain until removed from the Firebase Console.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDeleteUser(null)}
                className="flex-1 px-4 py-2 rounded-xl border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteUser}
                className="flex-1 px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}
    </ProtectedRoute>
  );
}
