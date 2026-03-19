"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import ProtectedRoute from "@/components/layout/ProtectedRoute";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Button from "@/components/ui/Button";
import Link from "next/link";
import {
  Project,
  Bid,
  CATEGORY_LABELS,
  BUDGET_LABELS,
  START_DATE_LABELS,
  PROPERTY_TYPE_LABELS,
  PreferredStartDate,
  PropertyType,
} from "@/types";
import { getBidsForProject, updateBidStatus } from "@/lib/bids";
import { createNotification } from "@/lib/notifications";
import toast from "react-hot-toast";
// import { formatDate } from "@/lib/utils";
import {
  HiArrowLeft,
  HiLocationMarker,
  HiClock,
  HiCheckCircle,
  HiXCircle,
  HiUser,
  HiDocumentText,
  HiHome,
  HiCalendar,
} from "react-icons/hi";

export default function HomeownerProjectDetailPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const [project, setProject] = useState<Project | null>(null);
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [showBidComparison, setShowBidComparison] = useState(false);

  useEffect(() => {
    if (!projectId) return;
    const fetchData = async () => {
      try {
        const snap = await getDoc(doc(db, "projects", projectId));
        if (snap.exists()) {
          setProject({ ...snap.data(), id: projectId } as Project);
        }
        const projectBids = await getBidsForProject(projectId);
        setBids(projectBids);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [projectId]);

  const handleBidStatus = async (bid: Bid, status: "accepted" | "rejected") => {
    setActionLoading(bid.id);
    try {
      await updateBidStatus(bid.id, status);
      await createNotification({
        recipientUid: bid.contractorUid,
        type: status === "accepted" ? "bid_accepted" : "bid_rejected",
        title: status === "accepted" ? "Bid Accepted!" : "Bid Rejected",
        message: `Your bid for "${bid.projectCategory}" has been ${status}.`,
        read: false,
        createdAt: new Date().toISOString(),
        relatedId: projectId,
      });
      toast.success(`Bid ${status}!`);
      const updated = await getBidsForProject(projectId);
      setBids(updated);
    } catch {
      toast.error("Failed to update bid.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleStatusChange = async (newStatus: "in_progress" | "completed" | "closed") => {
    if (!project) return;
    setStatusLoading(true);
    try {
      const projectRef = doc(db, "projects", projectId);
      await updateDoc(projectRef, {
        status: newStatus,
        updatedAt: new Date().toISOString(),
      });
      setProject({ ...project, status: newStatus, updatedAt: new Date().toISOString() });
      toast.success(`Project status updated to ${newStatus}`);
    } catch (error) {
      console.error(error);
      toast.error("Failed to update project status");
    } finally {
      setStatusLoading(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={["homeowner"]}>
        <DashboardLayout role="homeowner">
          <div className="flex items-center justify-center py-16">
            <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  if (!project) {
    return (
      <ProtectedRoute allowedRoles={["homeowner"]}>
        <DashboardLayout role="homeowner">
          <div className="text-center py-16">
            <p className="text-gray-500">Project not found.</p>
            <Link href="/dashboard/homeowner/projects">
              <Button variant="outline" className="mt-4">Back to Projects</Button>
            </Link>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={["homeowner"]}>
      <DashboardLayout role="homeowner">
        <div className="space-y-6 max-w-4xl">
          <Link
            href="/dashboard/homeowner/projects"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-orange-600 transition-colors text-sm"
          >
            <HiArrowLeft size={16} /> Back to Projects
          </Link>

          {/* Project Info */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            {/* Project Title */}
            {project.projectTitle && (
              <h2 className="text-xl font-bold text-gray-900 mb-3">{project.projectTitle}</h2>
            )}

            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="bg-orange-100 text-orange-700 text-sm font-medium px-3 py-1 rounded-full">
                {project.categoryName || CATEGORY_LABELS[project.category]}
              </span>
              <span className="bg-blue-100 text-blue-700 text-sm font-medium px-3 py-1 rounded-full">
                {project.budgetLabel || BUDGET_LABELS[project.budgetRange]}
              </span>
              {project.propertyType && (
                <span className="bg-purple-100 text-purple-700 text-sm font-medium px-3 py-1 rounded-full">
                  {PROPERTY_TYPE_LABELS[project.propertyType as PropertyType] || project.propertyType}
                </span>
              )}
              <span
                className={`text-sm font-medium px-3 py-1 rounded-full ${
                  project.status === "open" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                }`}
              >
                {project.status === "open" ? "Open" : project.status.replace("_", " ")}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-gray-600 mb-4">
              <span className="flex items-center gap-2">
                <HiLocationMarker size={16} className="text-gray-400" /> {project.city}
              </span>
              {project.preferredStartDate && (
                <span className="flex items-center gap-2">
                  <HiCalendar size={16} className="text-gray-400" />
                  Start: {START_DATE_LABELS[project.preferredStartDate as PreferredStartDate] || project.preferredStartDate}
                </span>
              )}
            </div>

            {project.privateDetails && (
              <>
                <div className="bg-gray-50 rounded-lg p-4 mt-4">
                  <h3 className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-2">
                    <HiDocumentText size={16} /> Full Description
                  </h3>
                  <p className="text-gray-700 text-sm whitespace-pre-wrap">
                    {project.privateDetails.fullDescription}
                  </p>
                </div>

                {/* Scope of Work */}
                {project.privateDetails.scopeOfWork && project.privateDetails.scopeOfWork.length > 0 && (
                  <div className="mt-4">
                    <h3 className="text-sm font-medium text-gray-900 mb-2">Scope of Work</h3>
                    <div className="flex flex-wrap gap-2">
                      {project.privateDetails.scopeOfWork.map((item) => (
                        <span key={item} className="bg-gray-100 text-gray-700 text-xs font-medium px-2.5 py-1 rounded-full">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Location Details */}
                {project.privateDetails.streetAddress && (
                  <div className="mt-4">
                    <h3 className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-2">
                      <HiHome size={16} /> Full Address
                    </h3>
                    <p className="text-gray-700 text-sm">
                      {project.privateDetails.streetAddress}
                      {project.privateDetails.unit ? `, Unit ${project.privateDetails.unit}` : ""}
                      {project.privateDetails.province ? `, ${project.privateDetails.province}` : ""}
                      {project.privateDetails.postalCode ? ` ${project.privateDetails.postalCode}` : ""}
                    </p>
                  </div>
                )}

                {/* Additional Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 text-sm">
                  {project.privateDetails.hasDrawings && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">Drawings/Plans:</span>
                      <span className="text-gray-700 capitalize">{project.privateDetails.hasDrawings}</span>
                    </div>
                  )}
                  {project.privateDetails.hasPermits && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">Permits:</span>
                      <span className="text-gray-700 capitalize">{project.privateDetails.hasPermits.replace("_", " ")}</span>
                    </div>
                  )}
                  {project.privateDetails.materialsProvider && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">Materials:</span>
                      <span className="text-gray-700 capitalize">{project.privateDetails.materialsProvider}</span>
                    </div>
                  )}
                  {project.privateDetails.parkingAvailable && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">Parking:</span>
                      <span className="text-gray-700 capitalize">{project.privateDetails.parkingAvailable}</span>
                    </div>
                  )}
                  {project.privateDetails.deadline && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">Deadline:</span>
                      <span className="text-gray-700">{project.privateDetails.deadline}</span>
                    </div>
                  )}
                  {project.privateDetails.contactPreference && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">Contact Preference:</span>
                      <span className="text-gray-700 capitalize">{project.privateDetails.contactPreference.replace("_", " ")}</span>
                    </div>
                  )}
                </div>

                {project.privateDetails.buildingRestrictions && (
                  <div className="mt-4">
                    <h3 className="text-sm font-medium text-gray-900 mb-1">Building Restrictions</h3>
                    <p className="text-gray-700 text-sm">{project.privateDetails.buildingRestrictions}</p>
                  </div>
                )}

                {/* Project Photos */}
                {project.privateDetails.photos && project.privateDetails.photos.length > 0 && (
                  <div className="mt-4">
                    <h3 className="text-sm font-medium text-gray-900 mb-2">Project Photos</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {project.privateDetails.photos.map((url, idx) => (
                        <a key={idx} href={url} target="_blank" rel="noopener noreferrer">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={url}
                            alt={`Project photo ${idx + 1}`}
                            className="w-full h-32 object-cover rounded-lg border border-gray-200 hover:opacity-90 transition-opacity"
                          />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Project Status Pipeline */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Project Status</h2>
            <div className="space-y-4">
              {/* Status Progress Bar */}
              <div className="flex items-center justify-between">
                {["open", "in_progress", "completed", "closed"].map((status, idx) => (
                  <div key={status} className="flex-1">
                    <div
                      className={`h-2 rounded-full transition-colors ${
                        ["open", "in_progress", "completed", "closed"].indexOf(project?.status || "open") >= idx
                          ? "bg-orange-500"
                          : "bg-gray-200"
                      }`}
                    />
                    <p className="text-xs text-gray-600 mt-1 capitalize text-center">{status.replace("_", " ")}</p>
                  </div>
                ))}
              </div>

              {/* Status Actions */}
              <div className="flex flex-wrap gap-3 items-center">
                {project?.status === "open" && (
                  <Button
                    size="sm"
                    onClick={() => handleStatusChange("in_progress")}
                    loading={statusLoading}
                  >
                    Start Work
                  </Button>
                )}
                {project?.status === "in_progress" && (
                  <Button
                    size="sm"
                    onClick={() => handleStatusChange("completed")}
                    loading={statusLoading}
                  >
                    Mark Complete
                  </Button>
                )}
                {project?.status !== "closed" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleStatusChange("closed")}
                    loading={statusLoading}
                    className="border-red-200 text-red-600 hover:bg-red-50"
                  >
                    Close Project
                  </Button>
                )}
                {project?.status === "closed" && (
                  <span className="text-sm text-red-600 font-medium flex items-center gap-1">
                    This project is closed.
                  </span>
                )}
                {project?.status !== "closed" && (
                  <p className="text-xs text-gray-500 flex items-center">
                    Current: {project?.status.replace("_", " ")}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Bids Section */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">
                Bids Received ({bids.length})
              </h2>
              {bids.filter((b) => b.status === "submitted").length >= 2 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowBidComparison(!showBidComparison)}
                >
                  {showBidComparison ? "Hide Comparison" : "Compare Bids"}
                </Button>
              )}
            </div>

            {showBidComparison && bids.filter((b) => b.status === "submitted").length >= 2 && (
              <div className="mb-6 overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="px-4 py-3 text-left font-semibold text-gray-900">Contractor</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900">Total Cost</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900">Timeline</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900">Line Items</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bids
                      .filter((b) => b.status === "submitted")
                      .map((bid) => (
                        <tr key={bid.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900">{bid.contractorName}</td>
                          <td className="px-4 py-3 font-bold text-orange-600">${bid.totalCost.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</td>
                          <td className="px-4 py-3 text-gray-600">{bid.estimatedTimeline}</td>
                          <td className="px-4 py-3 text-gray-600">
                            {bid.itemizedCosts.map((item) => item.description).join(", ")}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}

            {bids.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <HiDocumentText size={40} className="mx-auto mb-3 opacity-50" />
                <p className="text-sm">No bids received yet</p>
                <p className="text-xs mt-1">Contractors will submit bids after unlocking your project.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {bids.map((bid) => (
                  <div key={bid.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <HiUser size={18} className="text-gray-400" />
                        <span className="font-medium text-gray-900">{bid.contractorName}</span>
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            bid.status === "submitted"
                              ? "bg-amber-100 text-amber-700"
                              : bid.status === "accepted"
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {bid.status}
                        </span>
                      </div>
                      <p className="text-xl font-bold text-orange-600">${bid.totalCost.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</p>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-3 text-sm mb-3">
                      {bid.itemizedCosts.map((item, i) => (
                        <div key={i} className="flex justify-between py-1">
                          <span className="text-gray-600">{item.description}</span>
                          <span className="text-gray-900">${item.cost.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</span>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-4 text-sm text-gray-500 mb-3">
                      <span className="flex items-center gap-1">
                        <HiClock size={14} /> {bid.estimatedTimeline}
                      </span>
                    </div>

                    {bid.notes && <p className="text-sm text-gray-500 italic mb-3">&quot;{bid.notes}&quot;</p>}

                    {bid.status === "submitted" && (
                      <div className="flex gap-3">
                        <Button
                          size="sm"
                          onClick={() => handleBidStatus(bid, "accepted")}
                          loading={actionLoading === bid.id}
                          className="!bg-green-600 hover:!bg-green-700"
                        >
                          <HiCheckCircle size={16} className="mr-1" /> Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => handleBidStatus(bid, "rejected")}
                          loading={actionLoading === bid.id}
                        >
                          <HiXCircle size={16} className="mr-1" /> Reject
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
