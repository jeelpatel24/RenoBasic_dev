"use client";

import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import ProtectedRoute from "@/components/layout/ProtectedRoute";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import Button from "@/components/ui/Button";
import Link from "next/link";
import {
  Project,
  ProjectCategory,
  ContractorUser,
  CATEGORY_LABELS,
  BUDGET_LABELS,
  PROPERTY_TYPE_LABELS,
  START_DATE_LABELS,
  PropertyType,
  PreferredStartDate,
} from "@/types";
import { unlockProject, getContractorUnlocks } from "@/lib/projects";
import { createNotification } from "@/lib/notifications";
import toast from "react-hot-toast";
import { formatDate } from "@/lib/utils";
import {
  HiClipboardList,
  HiLocationMarker,
  HiCreditCard,
  HiLockOpen,
  HiFilter,
  HiShieldCheck,
  HiExclamation,
  HiEye,
  HiCalendar,
  HiLockClosed,
} from "react-icons/hi";

export default function ContractorMarketplacePage() {
  const { userProfile, refreshProfile } = useAuth();
  const contractor = userProfile as ContractorUser | null;
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [unlockedIds, setUnlockedIds] = useState<string[]>([]);
  const [unlocking, setUnlocking] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<ProjectCategory | "all">("all");
  const [budgetFilter, setBudgetFilter] = useState<string[]>([]);
  const [cityFilter, setCityFilter] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "budget_high" | "budget_low">("newest");
  const [confirmUnlock, setConfirmUnlock] = useState<Project | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Fetch unlocked project IDs
  useEffect(() => {
    if (!contractor) return;
    getContractorUnlocks(contractor.uid).then(setUnlockedIds).catch(console.error);
  }, [contractor]);

  // Fetch all projects
  useEffect(() => {
    if (!contractor) return;
    setLoading(true);
    setError(null);
    const projectsRef = query(
      collection(db, "projects"),
      where("status", "==", "open"),
      orderBy("createdAt", "desc")
    );
    const unsubscribe = onSnapshot(
      projectsRef,
      (snapshot) => {
        const allProjects = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        } as Project));
        setProjects(allProjects);
        setError(null);
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching projects:", err);
        setError("Failed to load projects. Please try again.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [retryCount, contractor?.uid]);

  const applyFilters = () => {
    let filtered = [...projects];

    // Category filter
    if (categoryFilter !== "all") {
      filtered = filtered.filter((p) => p.category === categoryFilter);
    }

    // Budget filter
    if (budgetFilter.length > 0) {
      filtered = filtered.filter((p) => budgetFilter.includes(p.budgetRange));
    }

    // City filter (client-side)
    if (cityFilter.trim()) {
      filtered = filtered.filter((p) =>
        p.city.toLowerCase().includes(cityFilter.toLowerCase())
      );
    }

    // Sorting
    if (sortBy === "oldest") {
      filtered.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    } else if (sortBy === "budget_high") {
      const budgetOrder: Record<string, number> = {
        under_5000: 0, "5000_15000": 1, "15000_30000": 2,
        "30000_50000": 3, "50000_100000": 4, "100000_250000": 5, over_250000: 6,
      };
      filtered.sort((a, b) => (budgetOrder[b.budgetRange] ?? 0) - (budgetOrder[a.budgetRange] ?? 0));
    } else if (sortBy === "budget_low") {
      const budgetOrder: Record<string, number> = {
        under_5000: 0, "5000_15000": 1, "15000_30000": 2,
        "30000_50000": 3, "50000_100000": 4, "100000_250000": 5, over_250000: 6,
      };
      filtered.sort((a, b) => (budgetOrder[a.budgetRange] ?? 0) - (budgetOrder[b.budgetRange] ?? 0));
    }

    return filtered;
  };

  const filteredProjects = applyFilters();

  const budgetRanges = [
    { value: "under_5000", label: "Under $5,000" },
    { value: "5000_15000", label: "$5,000 – $15,000" },
    { value: "15000_30000", label: "$15,000 – $30,000" },
    { value: "30000_50000", label: "$30,000 – $50,000" },
    { value: "50000_100000", label: "$50,000 – $100,000" },
    { value: "100000_250000", label: "$100,000 – $250,000" },
    { value: "over_250000", label: "Over $250,000" },
  ];

  const isVerified = contractor?.verificationStatus === "approved";
  const creditBalance = contractor?.creditBalance ?? 0;

  const handleUnlock = async (project: Project) => {
    if (!isVerified) {
      toast.error("Your account must be verified to unlock projects.");
      return;
    }
    if (creditBalance < project.creditCost) {
      toast.error(
        `Insufficient credits. You need ${project.creditCost} credits but have ${creditBalance}.`
      );
      return;
    }
    setConfirmUnlock(project);
  };

  const confirmUnlockProject = async () => {
    if (!confirmUnlock || !contractor) return;
    setUnlocking(confirmUnlock.id);
    try {
      await unlockProject(contractor.uid, confirmUnlock.id, confirmUnlock.creditCost);
      await createNotification({
        recipientUid: confirmUnlock.homeownerUid,
        type: "project_unlocked",
        title: "Your Project Was Viewed",
        message: `A contractor unlocked your ${confirmUnlock.categoryName || CATEGORY_LABELS[confirmUnlock.category]} project in ${confirmUnlock.city}.`,
        read: false,
        createdAt: new Date().toISOString(),
        relatedId: confirmUnlock.id,
      });
      await refreshProfile();
      setUnlockedIds((prev) => [...prev, confirmUnlock.id]);
      toast.success("Project unlocked! You can now view full details.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to unlock project."
      );
    } finally {
      setUnlocking(null);
      setConfirmUnlock(null);
    }
  };

  return (
    <ProtectedRoute allowedRoles={["contractor"]}>
      <DashboardLayout role="contractor">
        <div className="space-y-8">
          {/* Page Header */}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Project Marketplace</h1>
            <p className="text-gray-500 mt-1">
              Browse and unlock renovation projects posted by homeowners.
            </p>
          </div>

          {/* Credit Balance & Verification Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
              <div className="bg-orange-500 text-white p-3 rounded-lg">
                <HiCreditCard size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-500">Credit Balance</p>
                <p className="text-2xl font-bold text-gray-900">{creditBalance}</p>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
              <div
                className={`${
                  isVerified ? "bg-green-500" : "bg-amber-500"
                } text-white p-3 rounded-lg`}
              >
                {isVerified ? <HiShieldCheck size={24} /> : <HiExclamation size={24} />}
              </div>
              <div>
                <p className="text-sm text-gray-500">Verification Status</p>
                <p
                  className={`text-lg font-bold ${
                    isVerified ? "text-green-700" : "text-amber-700"
                  }`}
                >
                  {isVerified ? "Verified" : "Pending Verification"}
                </p>
              </div>
            </div>
          </div>

          {/* Not verified warning */}
          {!isVerified && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
              <HiExclamation className="text-amber-500 shrink-0 mt-0.5" size={20} />
              <p className="text-sm text-amber-700">
                Your account is pending verification. You can browse projects but cannot
                unlock them until your credentials are approved.
              </p>
            </div>
          )}

          {/* Advanced Filters */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HiFilter size={20} className="text-gray-400" />
                <h3 className="font-semibold text-gray-900">Advanced Filters</h3>
              </div>
              {(categoryFilter !== "all" || budgetFilter.length > 0 || cityFilter) && (
                <button
                  onClick={() => {
                    setCategoryFilter("all");
                    setBudgetFilter([]);
                    setCityFilter("");
                  }}
                  className="text-sm text-orange-600 hover:text-orange-700 font-medium"
                >
                  Clear all
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Category Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  value={categoryFilter}
                  onChange={(e) =>
                    setCategoryFilter(e.target.value as ProjectCategory | "all")
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="all">All Categories</option>
                  {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Budget Range Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Budget Range
                </label>
                <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2">
                  {budgetRanges.map((range) => (
                    <label key={range.value} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                      <input
                        type="checkbox"
                        checked={budgetFilter.includes(range.value)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setBudgetFilter([...budgetFilter, range.value]);
                          } else {
                            setBudgetFilter(budgetFilter.filter((b) => b !== range.value));
                          }
                        }}
                        className="w-4 h-4 accent-orange-500"
                      />
                      <span className="text-sm text-gray-700">{range.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* City Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  City
                </label>
                <input
                  type="text"
                  value={cityFilter}
                  onChange={(e) => setCityFilter(e.target.value)}
                  placeholder="e.g., Toronto"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              {/* Sort Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sort By
                </label>
                <select
                  value={sortBy}
                  onChange={(e) =>
                    setSortBy(e.target.value as "newest" | "oldest" | "budget_high" | "budget_low")
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="budget_high">Budget: High to Low</option>
                  <option value="budget_low">Budget: Low to High</option>
                </select>
              </div>
            </div>

            {/* Results Count */}
            <div className="flex justify-end">
              <span className="text-sm text-gray-600">
                <span className="font-semibold text-gray-900">{filteredProjects.length}</span> project
                {filteredProjects.length !== 1 ? "s" : ""} found
              </span>
            </div>
          </div>

          {/* Unlock Confirmation Dialog */}
          {confirmUnlock && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl p-6 max-w-md w-full space-y-4">
                <h3 className="text-lg font-bold text-gray-900">Confirm Unlock</h3>
                <p className="text-gray-600">
                  Unlock{" "}
                  <span className="font-semibold">
                    {confirmUnlock.projectTitle || (confirmUnlock.categoryName || CATEGORY_LABELS[confirmUnlock.category])}
                  </span>{" "}
                  for{" "}
                  <span className="font-bold text-orange-600">
                    {confirmUnlock.creditCost} credits
                  </span>
                  ? This cannot be undone.
                </p>
                <p className="text-sm text-gray-500">
                  You&apos;ll get access to: full description, complete address, scope of work,
                  homeowner contact info, and the ability to message &amp; bid.
                </p>
                <p className="text-sm text-gray-500">
                  Remaining balance after unlock:{" "}
                  <span className="font-semibold">
                    {creditBalance - confirmUnlock.creditCost} credits
                  </span>
                </p>
                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    fullWidth
                    onClick={() => setConfirmUnlock(null)}
                    disabled={unlocking !== null}
                  >
                    Cancel
                  </Button>
                  <Button
                    fullWidth
                    onClick={confirmUnlockProject}
                    loading={unlocking !== null}
                  >
                    Unlock Project
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Projects Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : error ? (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="text-center py-12">
                <HiExclamation size={48} className="mx-auto mb-4 text-red-300" />
                <p className="font-medium text-gray-700">{error}</p>
                <button
                  onClick={() => setRetryCount((c) => c + 1)}
                  className="mt-4 px-5 py-2 rounded-lg bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="text-center py-12 text-gray-400">
                <HiClipboardList size={48} className="mx-auto mb-4 opacity-50" />
                <p className="font-medium">No projects available</p>
                <p className="text-sm mt-1">
                  {categoryFilter !== "all"
                    ? "Try selecting a different category."
                    : "Check back later for new renovation projects."}
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredProjects.map((project) => {
                const isUnlocked = unlockedIds.includes(project.id);
                return (
                  <div
                    key={project.id}
                    className="bg-white rounded-xl border border-gray-200 hover:border-orange-200 hover:shadow-md transition-all duration-200 flex flex-col"
                  >
                    <div className="p-5 flex-1">
                      {/* Project Title */}
                      {project.projectTitle && (
                        <h3 className="text-base font-bold text-gray-900 mb-2 line-clamp-1">
                          {project.projectTitle}
                        </h3>
                      )}

                      {/* Tags: Category, Budget, Property Type */}
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <span className="bg-orange-100 text-orange-700 text-xs font-medium px-2.5 py-1 rounded-full">
                          {project.categoryName || CATEGORY_LABELS[project.category]}
                        </span>
                        <span className="bg-blue-100 text-blue-700 text-xs font-medium px-2.5 py-1 rounded-full">
                          {project.budgetLabel || BUDGET_LABELS[project.budgetRange]}
                        </span>
                        {project.propertyType && (
                          <span className="bg-purple-100 text-purple-700 text-xs font-medium px-2.5 py-1 rounded-full">
                            {PROPERTY_TYPE_LABELS[project.propertyType as PropertyType] || project.propertyType}
                          </span>
                        )}
                        {isUnlocked && (
                          <span className="bg-green-100 text-green-700 text-xs font-medium px-2.5 py-1 rounded-full">
                            Unlocked
                          </span>
                        )}
                      </div>

                      {/* Public Meta Info: City + Start Date only */}
                      <div className="space-y-2 text-sm text-gray-500">
                        <div className="flex items-center gap-2">
                          <HiLocationMarker size={16} className="text-gray-400" />
                          <span>{project.city}</span>
                        </div>
                        {project.preferredStartDate && (
                          <div className="flex items-center gap-2">
                            <HiCalendar size={16} className="text-gray-400" />
                            <span>
                              Start: {START_DATE_LABELS[project.preferredStartDate as PreferredStartDate] || project.preferredStartDate}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Privacy notice for locked projects */}
                      {!isUnlocked && (
                        <div className="mt-3 bg-gray-50 rounded-lg p-3 flex items-start gap-2">
                          <HiLockClosed size={16} className="text-gray-400 shrink-0 mt-0.5" />
                          <p className="text-xs text-gray-500">
                            Unlock to view full description, address, scope of work, and contact details.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Card Footer */}
                    <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between">
                      <span className="text-xs text-gray-400">
                        {formatDate(project.createdAt)}
                      </span>
                      {isUnlocked ? (
                        <Link href={`/dashboard/contractor/marketplace/${project.id}`}>
                          <Button size="sm" variant="primary" className="!bg-green-600 hover:!bg-green-700">
                            <HiEye size={16} className="mr-1.5" />
                            View Details
                          </Button>
                        </Link>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleUnlock(project)}
                          disabled={!isVerified || creditBalance < project.creditCost}
                        >
                          <HiLockOpen size={16} className="mr-1.5" />
                          Unlock for {project.creditCost} Credits
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}


