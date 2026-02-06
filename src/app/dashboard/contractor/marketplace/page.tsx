"use client";

import { useState, useEffect } from "react";
import { ref, onValue, query, orderByChild } from "firebase/database";
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
import toast from "react-hot-toast";
import {
  HiClipboardList,
  HiLocationMarker,
  HiCurrencyDollar,
  HiCreditCard,
  HiLockOpen,
  HiFilter,
  HiShieldCheck,
  HiExclamation,
  HiEye,
  HiCalendar,
  HiHome,
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
  const [confirmUnlock, setConfirmUnlock] = useState<Project | null>(null);

  // Fetch unlocked project IDs
  useEffect(() => {
    if (!contractor) return;
    getContractorUnlocks(contractor.uid).then(setUnlockedIds).catch(console.error);
  }, [contractor]);

  // Fetch all projects
  useEffect(() => {
    const projectsRef = query(ref(db, "projects"), orderByChild("createdAt"));
    const unsubscribe = onValue(projectsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const allProjects: Project[] = Object.entries(data).map(
          ([id, value]) => ({ ...(value as Omit<Project, "id">), id })
        );
        allProjects.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setProjects(allProjects);
      } else {
        setProjects([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredProjects =
    categoryFilter === "all"
      ? projects
      : projects.filter((p) => p.category === categoryFilter);

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

          {/* Filter */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <HiFilter size={20} className="text-gray-400" />
              <label htmlFor="categoryFilter" className="text-sm font-medium text-gray-700">
                Filter by Category:
              </label>
              <select
                id="categoryFilter"
                value={categoryFilter}
                onChange={(e) =>
                  setCategoryFilter(e.target.value as ProjectCategory | "all")
                }
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
              >
                <option value="all">All Categories</option>
                {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <span className="text-sm text-gray-500 ml-auto">
                {filteredProjects.length} project{filteredProjects.length !== 1 ? "s" : ""} found
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
                        {new Date(project.createdAt).toLocaleDateString("en-CA", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
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


