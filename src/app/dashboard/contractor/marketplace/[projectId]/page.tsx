"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, collection, query, where, limit, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import ProtectedRoute from "@/components/layout/ProtectedRoute";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import Button from "@/components/ui/Button";
import Link from "next/link";
import {
  Project,
  ContractorUser,
  Bid,
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
import { submitBid, getExistingBid } from "@/lib/bids";
import { createNotification } from "@/lib/notifications";
import toast from "react-hot-toast";
// import { formatDate } from "@/lib/utils";
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
  HiCheckCircle,
  HiXCircle,
  HiClock,
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
  const [existingBid, setExistingBid] = useState<Bid | null | undefined>(undefined);

  // ── Invoice state ──────────────────────────────────────────────────────────
  const [bidCompanyName, setBidCompanyName] = useState("");
  const [bidContactName, setBidContactName] = useState("");
  const [bidContactEmail, setBidContactEmail] = useState("");
  const [bidContactPhone, setBidContactPhone] = useState("");
  const [lineItems, setLineItems] = useState([{ description: "", qty: 1, unitPrice: 0 }]);
  const [taxRate, setTaxRate] = useState(0);
  const [bidTimeline, setBidTimeline] = useState("");
  const [bidNotes, setBidNotes] = useState("");

  // Computed totals
  const subtotal = lineItems.reduce((sum, item) => sum + item.qty * item.unitPrice, 0);
  const taxAmount = subtotal * taxRate / 100;
  const totalAmount = subtotal + taxAmount;

  useEffect(() => {
    if (!projectId || !contractor) return;
    const fetchProject = async () => {
      try {
        const snap = await getDoc(doc(db, "projects", projectId));
        if (snap.exists()) {
          const data = snap.data() as Project;
          setProject({ ...data, id: projectId });
          // Only load private details if contractor has unlocked this project
          const unlockSnap = await getDoc(doc(db, "unlocks", `${contractor.uid}_${projectId}`));
          if (unlockSnap.exists()) {
            const details = await getProjectPrivateDetails(projectId);
            setPrivateDetails(details);
            // existingBid is kept live by the onSnapshot subscription below.
          } else {
            setExistingBid(null);
          }
        }
      } catch (error) {
        console.error("Error fetching project:", error);
        toast.error("Failed to load project details.");
      } finally {
        setLoading(false);
      }
    };
    fetchProject();
  }, [projectId, contractor]);

  // Pre-fill contractor details from profile
  useEffect(() => {
    if (contractor) {
      setBidCompanyName(contractor.companyName || "");
      setBidContactName(contractor.contactName || contractor.fullName || "");
      setBidContactEmail(contractor.email || "");
      setBidContactPhone(contractor.phone || "");
    }
  }, [contractor]);

  // Real-time bid status — keeps the status banner in sync when the
  // homeowner accepts or rejects while this page is open.
  // Only runs after privateDetails is set (i.e., project is unlocked).
  useEffect(() => {
    if (!contractor || !projectId || !privateDetails) return;
    const q = query(
      collection(db, "bids"),
      where("contractorUid", "==", contractor.uid),
      where("projectId", "==", projectId),
      limit(1)
    );
    const unsub = onSnapshot(q, (snap) => {
      if (snap.empty) {
        setExistingBid(null);
      } else {
        const d = snap.docs[0];
        setExistingBid({ id: d.id, ...d.data() } as Bid);
      }
    }, (err) => {
      console.error("Bid status subscription error:", err);
    });
    return () => unsub();
  }, [contractor, projectId, privateDetails]);

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

  // ── Line item helpers ──────────────────────────────────────────────────────
  const addLineItem = () => setLineItems([...lineItems, { description: "", qty: 1, unitPrice: 0 }]);
  const removeLineItem = (index: number) => {
    if (lineItems.length > 1) setLineItems(lineItems.filter((_, i) => i !== index));
  };
  const updateLineItem = (index: number, field: "description" | "qty" | "unitPrice", value: string | number) => {
    const updated = [...lineItems];
    if (field === "description") updated[index].description = value as string;
    else if (field === "qty") updated[index].qty = Math.max(1, Number(value) || 1);
    else updated[index].unitPrice = Number(value) || 0;
    setLineItems(updated);
  };

  const handleSubmitBid = async () => {
    if (!contractor || !project) return;

    if (lineItems.some((item) => !item.description.trim() || item.unitPrice <= 0 || item.qty <= 0)) {
      toast.error("Please fill in all line items with valid quantities and prices.");
      return;
    }
    if (!bidTimeline.trim()) {
      toast.error("Please provide an estimated timeline.");
      return;
    }

    setBidLoading(true);
    try {
      // Server-side guard: prevent duplicate bids even if the UI check was bypassed
      const existing = await getExistingBid(contractor.uid, project.id);
      if (existing) {
        toast.error("You've already submitted a bid for this project.");
        setExistingBid(existing);
        setShowBidForm(false);
        return;
      }

      const invoiceLineItems = lineItems.map((item) => ({
        description: item.description,
        qty: item.qty,
        unitPrice: item.unitPrice,
        subtotal: item.qty * item.unitPrice,
      }));

      // Legacy itemizedCosts for backward compat
      const legacyCosts = invoiceLineItems.map((item) => ({
        description: item.description,
        cost: item.subtotal,
      }));

      await submitBid({
        contractorUid: contractor.uid,
        homeownerUid: project.homeownerUid,
        projectId: project.id,
        contractorName: contractor.fullName,
        projectCategory: project.categoryName || CATEGORY_LABELS[project.category],
        companyName: bidCompanyName,
        contactName: bidContactName,
        contactEmail: bidContactEmail,
        contactPhone: bidContactPhone,
        lineItems: invoiceLineItems,
        subtotal,
        taxRate,
        taxAmount,
        totalAmount,
        itemizedCosts: legacyCosts,
        totalCost: totalAmount,
        estimatedTimeline: bidTimeline,
        notes: bidNotes,
      });

      await createNotification({
        recipientUid: project.homeownerUid,
        type: "bid_received",
        title: "New Bid Received",
        message: `${contractor.fullName} submitted a bid of $${totalAmount.toFixed(2)} for your ${project.categoryName || CATEGORY_LABELS[project.category]} project.`,
        read: false,
        createdAt: new Date().toISOString(),
        relatedId: project.id,
      });

      toast.success("Bid submitted successfully!");
      setShowBidForm(false);
      setLineItems([{ description: "", qty: 1, unitPrice: 0 }]);
      setTaxRate(0);
      setBidTimeline("");
      setBidNotes("");
      // existingBid is updated automatically by the onSnapshot subscription.
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

              {/* Project Photos */}
              {privateDetails.photos && privateDetails.photos.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h2 className="text-lg font-bold text-gray-900 mb-4">Project Photos</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {privateDetails.photos.map((url, idx) => (
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
                {existingBid ? (
                  <div className={`flex-1 flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium ${
                    existingBid.status === "accepted"
                      ? "bg-green-50 border-green-200 text-green-700"
                      : existingBid.status === "rejected"
                      ? "bg-red-50 border-red-200 text-red-600"
                      : "bg-amber-50 border-amber-200 text-amber-700"
                  }`}>
                    {existingBid.status === "accepted" ? (
                      <HiCheckCircle size={18} />
                    ) : existingBid.status === "rejected" ? (
                      <HiXCircle size={18} />
                    ) : (
                      <HiClock size={18} />
                    )}
                    {existingBid.status === "accepted"
                      ? "Your bid was accepted"
                      : existingBid.status === "rejected"
                      ? "Your bid was not selected"
                      : "Bid submitted — awaiting response"}
                  </div>
                ) : existingBid === null ? (
                  <Button
                    variant="outline"
                    onClick={() => setShowBidForm(!showBidForm)}
                    className="flex-1"
                  >
                    <HiDocumentText size={18} className="mr-2" />
                    {showBidForm ? "Cancel Bid" : "Submit a Bid"}
                  </Button>
                ) : null}
              </div>

              {/* Invoice Bid Form */}
              {showBidForm && !existingBid && (
                <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
                  <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <HiDocumentText size={20} className="text-orange-500" />
                    Submit Invoice Bid
                  </h2>

                  {/* Section 1 — Contractor Details */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b border-gray-100">
                      Contractor Details
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {[
                        { label: "Company Name", value: bidCompanyName, onChange: setBidCompanyName, placeholder: "Your company name" },
                        { label: "Contact Name", value: bidContactName, onChange: setBidContactName, placeholder: "Contact person" },
                        { label: "Email", value: bidContactEmail, onChange: setBidContactEmail, placeholder: "contact@company.com" },
                        { label: "Phone", value: bidContactPhone, onChange: setBidContactPhone, placeholder: "(416) 555-0100" },
                      ].map(({ label, value, onChange, placeholder }) => (
                        <div key={label}>
                          <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                          <input
                            type="text"
                            value={value}
                            onChange={(e) => onChange(e.target.value)}
                            placeholder={placeholder}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Section 2 — Line Items */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b border-gray-100">
                      Line Items
                    </h3>
                    {/* Column headers */}
                    <div className="hidden sm:grid grid-cols-[1fr_60px_100px_80px_32px] gap-2 text-xs font-semibold text-gray-500 mb-2 px-1">
                      <span>Description</span>
                      <span className="text-center">Qty</span>
                      <span className="text-right">Unit Price ($)</span>
                      <span className="text-right">Subtotal</span>
                      <span />
                    </div>

                    {lineItems.map((item, index) => (
                      <div key={index} className="grid grid-cols-[1fr_60px_100px_80px_32px] gap-2 mb-2 items-center">
                        <input
                          type="text"
                          placeholder="Description"
                          value={item.description}
                          onChange={(e) => updateLineItem(index, "description", e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                        <input
                          type="number"
                          min="1"
                          placeholder="1"
                          value={item.qty || ""}
                          onChange={(e) => updateLineItem(index, "qty", e.target.value)}
                          className="px-2 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm text-center focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          value={item.unitPrice || ""}
                          onChange={(e) => updateLineItem(index, "unitPrice", e.target.value)}
                          className="px-2 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm text-right focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                        <div className="text-right text-sm font-medium text-gray-700 pr-1">
                          ${(item.qty * item.unitPrice).toFixed(2)}
                        </div>
                        <button onClick={() => removeLineItem(index)} className="text-red-400 hover:text-red-600 flex items-center justify-center">
                          <HiTrash size={17} />
                        </button>
                      </div>
                    ))}

                    <button
                      onClick={addLineItem}
                      className="text-sm text-orange-600 hover:text-orange-700 flex items-center gap-1 mt-1"
                    >
                      <HiPlus size={16} /> Add Line Item
                    </button>
                  </div>

                  {/* Section 3 — Invoice Summary */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b border-gray-100">
                      Invoice Summary
                    </h3>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>Subtotal</span>
                        <span>${subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm text-gray-600">
                        <span>Tax</span>
                        <select
                          value={taxRate}
                          onChange={(e) => setTaxRate(Number(e.target.value))}
                          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-400"
                        >
                          <option value={0}>No Tax (0%)</option>
                          <option value={5}>GST (5%)</option>
                          <option value={13}>HST (13%)</option>
                          <option value={15}>HST (15%)</option>
                        </select>
                      </div>
                      {taxRate > 0 && (
                        <div className="flex justify-between text-sm text-gray-600">
                          <span>Tax Amount ({taxRate}%)</span>
                          <span>${taxAmount.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between items-center font-bold text-orange-600 border-t border-orange-100 pt-2 mt-2">
                        <span className="text-base text-gray-900">Total</span>
                        <span className="text-xl">${totalAmount.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Section 4 — Timeline & Notes */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Estimated Timeline <span className="text-red-500">*</span>
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
                      <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                      <textarea
                        rows={2}
                        placeholder="Any additional notes..."
                        value={bidNotes}
                        onChange={(e) => setBidNotes(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                      />
                    </div>
                  </div>

                  <Button fullWidth loading={bidLoading} onClick={handleSubmitBid}>
                    Submit Invoice Bid (${totalAmount.toFixed(2)})
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
