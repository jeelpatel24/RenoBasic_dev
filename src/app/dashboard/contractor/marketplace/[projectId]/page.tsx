"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ref, get } from "firebase/database";
import { db } from "@/lib/firebase";
import ProtectedRoute from "@/components/layout/ProtectedRoute";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import Button from "@/components/ui/Button";
import Link from "next/link";
import {
  Project,
  ContractorUser,
  CATEGORY_LABELS,
  BUDGET_LABELS,
  PROPERTY_TYPE_LABELS,
  START_DATE_LABELS,
  ProjectPrivateDetails,
  PropertyType,
  PreferredStartDate,
} from "@/types";
import { getProjectPrivateDetails } from "@/lib/projects";
import { getOrCreateConversation } from "@/lib/messages";
import { submitBid } from "@/lib/bids";
import toast from "react-hot-toast";
import {
  HiArrowLeft,
  HiLocationMarker,
  HiCurrencyDollar,
  HiMail,
  HiPhone,
  HiUser,
  HiChat,
  HiDocumentText,
  HiPlus,
  HiTrash,
  HiCalendar,
  HiHome,
  HiClipboardCheck,
  HiShieldCheck,
  HiTruck,
} from "react-icons/hi";

export default function ContractorProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;
  const { userProfile } = useAuth();
  const contractor = userProfile as ContractorUser | null;

  const [project, setProject] = useState<Project | null>(null);
  const [privateDetails, setPrivateDetails] = useState<ProjectPrivateDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [showBidForm, setShowBidForm] = useState(false);
  const [bidLoading, setBidLoading] = useState(false);
  const [bidItems, setBidItems] = useState([{ description: "", cost: 0 }]);
  const [bidTimeline, setBidTimeline] = useState("");
  const [bidNotes, setBidNotes] = useState("");

  useEffect(() => {
    if (!projectId) return;
    const fetchProject = async () => {
      try {
        const snap = await get(ref(db, `projects/${projectId}`));
        if (snap.exists()) {
          const data = snap.val() as Project;
          setProject({ ...data, id: projectId });
          const details = await getProjectPrivateDetails(projectId);
          setPrivateDetails(details);
        }
      } catch (error) {
        console.error("Error fetching project:", error);
        toast.error("Failed to load project details.");
      } finally {
        setLoading(false);
      }
    };
    fetchProject();
  }, [projectId]);

  const handleStartConversation = async () => {
    if (!contractor || !project || !privateDetails) return;
    try {
      const convId = await getOrCreateConversation(
        contractor.uid,
        project.id,
        project.homeownerUid,
        privateDetails.homeownerName,
        contractor.fullName,
        project.categoryName || CATEGORY_LABELS[project.category]
      );
      router.push(`/dashboard/contractor/messages?conversation=${convId}`);
    } catch {
      toast.error("Failed to start conversation.");
    }
  };

  const addBidItem = () => setBidItems([...bidItems, { description: "", cost: 0 }]);
  const removeBidItem = (index: number) => {
    if (bidItems.length > 1) setBidItems(bidItems.filter((_, i) => i !== index));
  };
  const updateBidItem = (index: number, field: "description" | "cost", value: string | number) => {
    const updated = [...bidItems];
    if (field === "cost") updated[index].cost = Number(value);
    else updated[index].description = value as string;
    setBidItems(updated);
  };

  const totalCost = bidItems.reduce((sum, item) => sum + item.cost, 0);

  const handleSubmitBid = async () => {
    if (!contractor || !project) return;
    if (bidItems.some((item) => !item.description.trim() || item.cost <= 0)) {
      toast.error("Please fill in all bid items with valid costs.");
      return;
    }
    if (!bidTimeline.trim()) {
      toast.error("Please provide an estimated timeline.");
      return;
    }
    setBidLoading(true);
    try {
      await submitBid({
        contractorUid: contractor.uid,
        homeownerUid: project.homeownerUid,
        projectId: project.id,
        contractorName: contractor.fullName,
        projectCategory: project.categoryName || CATEGORY_LABELS[project.category],
        itemizedCosts: bidItems,
        totalCost,
        estimatedTimeline: bidTimeline,
        notes: bidNotes,
      });
      toast.success("Bid submitted successfully!");
      setShowBidForm(false);
      setBidItems([{ description: "", cost: 0 }]);
      setBidTimeline("");
      setBidNotes("");
    } catch {
      toast.error("Failed to submit bid.");
    } finally {
      setBidLoading(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={["contractor"]}>
        <DashboardLayout role="contractor">
          <div className="flex items-center justify-center py-16">
            <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  if (!project) {
    return (
      <ProtectedRoute allowedRoles={["contractor"]}>
        <DashboardLayout role="contractor">
          <div className="text-center py-16">
            <p className="text-gray-500">Project not found.</p>
            <Link href="/dashboard/contractor/marketplace">
              <Button variant="outline" className="mt-4">Back to Marketplace</Button>
            </Link>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={["contractor"]}>
      <DashboardLayout role="contractor">
        <div className="space-y-6 max-w-4xl">
          {/* Back Button */}
          <Link
            href="/dashboard/contractor/marketplace"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-orange-600 transition-colors text-sm"
          >
            <HiArrowLeft size={16} />
            Back to Marketplace
          </Link>

          {/* Project Header */}
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
              <span className="bg-green-100 text-green-700 text-sm font-medium px-3 py-1 rounded-full">
                {project.status === "open" ? "Open" : project.status}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <HiLocationMarker size={16} className="text-gray-400" />
                <span>{project.city}</span>
              </div>
              {project.preferredStartDate && (
                <div className="flex items-center gap-2">
                  <HiCalendar size={16} className="text-gray-400" />
                  <span>Start: {START_DATE_LABELS[project.preferredStartDate as PreferredStartDate] || project.preferredStartDate}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <HiCurrencyDollar size={16} className="text-orange-400" />
                <span className="font-medium text-orange-600">{project.creditCost} credits</span>
              </div>
            </div>
          </div>

          {/* Private Details (Unlocked) */}
          {privateDetails ? (
            <>
              {/* Full Description */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <HiDocumentText size={20} className="text-orange-500" />
                  Full Project Description
                </h2>
                <p className="text-gray-700 whitespace-pre-wrap">{privateDetails.fullDescription}</p>
              </div>

              {/* Scope of Work */}
              {privateDetails.scopeOfWork && privateDetails.scopeOfWork.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <HiClipboardCheck size={20} className="text-orange-500" />
                    Scope of Work
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {privateDetails.scopeOfWork.map((item) => (
                      <span key={item} className="bg-orange-50 text-orange-700 text-sm font-medium px-3 py-1.5 rounded-full border border-orange-200">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Full Address */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <HiHome size={20} className="text-orange-500" />
                  Location Details
                </h2>
                <div className="space-y-2 text-sm">
                  {privateDetails.streetAddress && (
                    <div className="flex items-center gap-3">
                      <HiLocationMarker size={18} className="text-gray-400" />
                      <span className="text-gray-700">
                        {privateDetails.streetAddress}
                        {privateDetails.unit ? `, Unit ${privateDetails.unit}` : ""}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <HiLocationMarker size={18} className="text-gray-400" />
                    <span className="text-gray-700">
                      {project.city}
                      {privateDetails.province ? `, ${privateDetails.province}` : ""}
                      {privateDetails.postalCode ? ` ${privateDetails.postalCode}` : ""}
                    </span>
                  </div>
                  {privateDetails.parkingAvailable && (
                    <div className="flex items-center gap-3">
                      <HiTruck size={18} className="text-gray-400" />
                      <span className="text-gray-700">Parking: <span className="capitalize">{privateDetails.parkingAvailable.replace("_", " ")}</span></span>
                    </div>
                  )}
                  {privateDetails.buildingRestrictions && (
                    <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
                      <p className="text-sm text-amber-700">
                        <strong>Building Restrictions:</strong> {privateDetails.buildingRestrictions}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Project Specifications */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <HiShieldCheck size={20} className="text-orange-500" />
                  Project Specifications
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  {privateDetails.hasDrawings && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-gray-500 text-xs mb-1">Drawings / Plans</p>
                      <p className="text-gray-900 font-medium capitalize">{privateDetails.hasDrawings}</p>
                    </div>
                  )}
                  {privateDetails.hasPermits && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-gray-500 text-xs mb-1">Permits Obtained</p>
                      <p className="text-gray-900 font-medium capitalize">{privateDetails.hasPermits.replace("_", " ")}</p>
                    </div>
                  )}
                  {privateDetails.materialsProvider && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-gray-500 text-xs mb-1">Materials Provider</p>
                      <p className="text-gray-900 font-medium capitalize">{privateDetails.materialsProvider}</p>
                    </div>
                  )}
                  {privateDetails.deadline && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-gray-500 text-xs mb-1">Hard Deadline</p>
                      <p className="text-gray-900 font-medium">{privateDetails.deadline}</p>
                    </div>
                  )}
                  {privateDetails.contactPreference && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-gray-500 text-xs mb-1">Preferred Contact</p>
                      <p className="text-gray-900 font-medium capitalize">{privateDetails.contactPreference.replace("_", " ")}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Homeowner Contact */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Homeowner Contact</h2>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-3">
                    <HiUser size={18} className="text-gray-400" />
                    <span className="text-gray-700">{privateDetails.homeownerName}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <HiMail size={18} className="text-gray-400" />
                    <span className="text-gray-700">{privateDetails.homeownerEmail}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <HiPhone size={18} className="text-gray-400" />
                    <span className="text-gray-700">{privateDetails.homeownerPhone}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button onClick={handleStartConversation} className="flex-1">
                  <HiChat size={18} className="mr-2" />
                  Message Homeowner
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowBidForm(!showBidForm)}
                  className="flex-1"
                >
                  <HiDocumentText size={18} className="mr-2" />
                  {showBidForm ? "Cancel Bid" : "Submit a Bid"}
                </Button>
              </div>

              {/* Bid Form */}
              {showBidForm && (
                <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
                  <h2 className="text-lg font-bold text-gray-900">Submit Your Bid</h2>

                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-gray-700">Itemized Costs</label>
                    {bidItems.map((item, index) => (
                      <div key={index} className="flex gap-3 items-center">
                        <input
                          type="text"
                          placeholder="Description"
                          value={item.description}
                          onChange={(e) => updateBidItem(index, "description", e.target.value)}
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                        <input
                          type="number"
                          placeholder="Cost"
                          value={item.cost || ""}
                          onChange={(e) => updateBidItem(index, "cost", e.target.value)}
                          className="w-32 px-4 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                        <button
                          onClick={() => removeBidItem(index)}
                          className="text-red-400 hover:text-red-600 p-1"
                        >
                          <HiTrash size={18} />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={addBidItem}
                      className="text-sm text-orange-600 hover:text-orange-700 flex items-center gap-1"
                    >
                      <HiPlus size={16} /> Add Item
                    </button>
                  </div>

                  <div className="bg-orange-50 rounded-lg p-3">
                    <p className="text-sm font-medium text-orange-700">
                      Total: ${totalCost.toLocaleString()}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Estimated Timeline
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., 3–4 weeks"
                      value={bidTimeline}
                      onChange={(e) => setBidTimeline(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                    <textarea
                      rows={3}
                      placeholder="Any additional notes..."
                      value={bidNotes}
                      onChange={(e) => setBidNotes(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                    />
                  </div>

                  <Button fullWidth loading={bidLoading} onClick={handleSubmitBid}>
                    Submit Bid (${totalCost.toLocaleString()})
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
              <p className="text-amber-700">
                You need to unlock this project to see full details.
              </p>
              <Link href="/dashboard/contractor/marketplace">
                <Button variant="outline" className="mt-4">Back to Marketplace</Button>
              </Link>
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
