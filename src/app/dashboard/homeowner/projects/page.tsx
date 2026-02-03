"use client";

import { useState, useEffect } from "react";
import { ref, push, set, onValue, query, orderByChild } from "firebase/database";
import { db } from "@/lib/firebase";
import ProtectedRoute from "@/components/layout/ProtectedRoute";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Link from "next/link";
import {
  Project,
  ProjectCategory,
  BudgetRange,
  PropertyType,
  OwnershipStatus,
  PreferredStartDate,
  CATEGORY_LABELS,
  BUDGET_LABELS,
  CREDIT_COST_MAP,
  PROPERTY_TYPE_LABELS,
  OWNERSHIP_STATUS_LABELS,
  START_DATE_LABELS,
  SCOPE_OF_WORK_OPTIONS,
  PROVINCE_OPTIONS,
} from "@/types";
import toast from "react-hot-toast";
import {
  HiClipboardList,
  HiPlusCircle,
  HiLocationMarker,
  HiClock,
  HiArrowRight,
  HiPhotograph,
  HiDocumentText,
  HiHome,
  HiChat,
  HiCalendar,
  HiCheckCircle,
} from "react-icons/hi";

/* ------------------------------------------------------------------ */
/*  Section Header Component                                          */
/* ------------------------------------------------------------------ */
function SectionHeader({
  number,
  title,
  subtitle,
}: {
  number: number;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-orange-500 text-white text-sm font-bold shrink-0">
        {number}
      </div>
      <div>
        <h3 className="text-base font-bold text-gray-900">{title}</h3>
        <p className="text-sm text-gray-500">{subtitle}</p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                         */
/* ------------------------------------------------------------------ */
export default function HomeownerProjectsPage() {
  const { userProfile } = useAuth();

  /* ── form state ─────────────────────────────────────────────────── */
  const [form, setForm] = useState({
    projectTitle: "",
    category: "" as ProjectCategory | "",
    propertyType: "" as PropertyType | "",
    ownershipStatus: "own" as OwnershipStatus,
    streetAddress: "",
    unit: "",
    city: "",
    province: "",
    postalCode: "",
    parkingAvailable: "yes",
    buildingRestrictions: "",
    description: "",
    scopeOfWork: [] as string[],
    hasDrawings: "no",
    hasPermits: "not_sure",
    materialsProvider: "contractor",
    budgetRange: "" as BudgetRange | "",
    preferredStartDate: "" as PreferredStartDate | "",
    deadline: "",
    contactPreference: "in_app",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState("");

  /* ── fetch user's existing projects ─────────────────────────────── */
  useEffect(() => {
    if (!userProfile) return;

    const projectsRef = query(ref(db, "projects"), orderByChild("homeownerUid"));
    const unsubscribe = onValue(projectsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const allProjects: Project[] = Object.entries(data).map(
          ([id, value]) => ({ ...(value as Omit<Project, "id">), id })
        );
        const userProjects = allProjects
          .filter((p) => p.homeownerUid === userProfile.uid)
          .sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        setProjects(userProjects);
      } else {
        setProjects([]);
      }
      setProjectsLoading(false);
    });

    return () => unsubscribe();
  }, [userProfile]);

  /* ── generic change handlers ────────────────────────────────────── */
  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setErrors((prev) => ({ ...prev, [e.target.name]: "" }));
  };

  const handleCheckbox = (option: string) => {
    setForm((prev) => {
      const current = prev.scopeOfWork;
      return {
        ...prev,
        scopeOfWork: current.includes(option)
          ? current.filter((o) => o !== option)
          : [...current, option],
      };
    });
    setErrors((prev) => ({ ...prev, scopeOfWork: "" }));
  };

  /* ── submit ─────────────────────────────────────────────────────── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    // Section 1
    if (!form.projectTitle.trim())
      newErrors.projectTitle = "Project title is required.";
    if (!form.category) newErrors.category = "Please select a project type.";
    if (!form.propertyType)
      newErrors.propertyType = "Please select a property type.";

    // Section 2
    if (!form.streetAddress.trim())
      newErrors.streetAddress = "Street address is required.";
    if (!form.city.trim()) newErrors.city = "City is required.";
    if (!form.province) newErrors.province = "Please select a province.";
    if (!form.postalCode.trim())
      newErrors.postalCode = "Postal code is required.";

    // Section 3
    if (!form.description.trim())
      newErrors.description = "Description is required.";
    else if (form.description.trim().length < 20)
      newErrors.description = "Description must be at least 20 characters.";

    // Section 4
    if (!form.budgetRange)
      newErrors.budgetRange = "Please select a budget range.";
    if (!form.preferredStartDate)
      newErrors.preferredStartDate = "Please select a preferred start date.";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      // Scroll to first error
      const firstErrorKey = Object.keys(newErrors)[0];
      const el = document.querySelector(`[name="${firstErrorKey}"]`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setLoading(true);
    try {
      const projectsRef = ref(db, "projects");
      const newProjectRef = push(projectsRef);
      const projectId = newProjectRef.key!;
      const now = new Date().toISOString();
      const category = form.category as ProjectCategory;
      const budgetRange = form.budgetRange as BudgetRange;

      const projectData = {
        id: projectId,
        homeownerUid: userProfile!.uid,
        projectTitle: form.projectTitle.trim(),
        category,
        categoryName: CATEGORY_LABELS[category],
        propertyType: form.propertyType,
        ownershipStatus: form.ownershipStatus,
        budgetRange,
        budgetLabel: BUDGET_LABELS[budgetRange],
        preferredStartDate: form.preferredStartDate,
        city: form.city.trim(),
        creditCost: CREDIT_COST_MAP[budgetRange],
        status: "open" as const,
        createdAt: now,
        updatedAt: now,
        privateDetails: {
          homeownerName: userProfile!.fullName,
          homeownerEmail: userProfile!.email,
          homeownerPhone: userProfile!.phone,
          fullDescription: form.description.trim(),
          streetAddress: form.streetAddress.trim(),
          unit: form.unit.trim(),
          province: form.province,
          postalCode: form.postalCode.trim(),
          scopeOfWork: form.scopeOfWork,
          hasDrawings: form.hasDrawings,
          hasPermits: form.hasPermits,
          materialsProvider: form.materialsProvider,
          deadline: form.deadline.trim(),
          contactPreference: form.contactPreference,
          parkingAvailable: form.parkingAvailable,
          buildingRestrictions: form.buildingRestrictions.trim(),
          photos: [],
        },
      };

      await set(newProjectRef, projectData);

      toast.success("Project posted successfully!");
      setSuccessMessage(
        "Your project has been posted and is now visible to contractors."
      );
      setForm({
        projectTitle: "",
        category: "",
        propertyType: "",
        ownershipStatus: "own",
        streetAddress: "",
        unit: "",
        city: "",
        province: "",
        postalCode: "",
        parkingAvailable: "yes",
        buildingRestrictions: "",
        description: "",
        scopeOfWork: [],
        hasDrawings: "no",
        hasPermits: "not_sure",
        materialsProvider: "contractor",
        budgetRange: "",
        preferredStartDate: "",
        deadline: "",
        contactPreference: "in_app",
      });

      setTimeout(() => setSuccessMessage(""), 5000);
    } catch (error) {
      console.error("Error posting project:", error);
      toast.error("Failed to post project. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  /* ── shared Tailwind classes ────────────────────────────────────── */
  const selectClass = (hasError: boolean) =>
    `w-full px-4 py-3 border rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200 ${
      hasError ? "border-red-500 focus:ring-red-500" : "border-gray-300"
    }`;

  const textareaClass = (hasError: boolean) =>
    `w-full px-4 py-3 border rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200 resize-none ${
      hasError ? "border-red-500 focus:ring-red-500" : "border-gray-300"
    }`;

  const radioGroupClass =
    "flex flex-wrap gap-3";

  const radioLabelClass = (selected: boolean) =>
    `flex items-center gap-2 px-4 py-2.5 border rounded-lg cursor-pointer transition-all duration-200 text-sm ${
      selected
        ? "border-orange-500 bg-orange-50 text-orange-700 ring-2 ring-orange-500"
        : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
    }`;

  /* ================================================================ */
  /*  RENDER                                                          */
  /* ================================================================ */
  return (
    <ProtectedRoute allowedRoles={["homeowner"]}>
      <DashboardLayout role="homeowner">
        <div className="space-y-8">
          {/* Page Header */}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Projects</h1>
            <p className="text-gray-500 mt-1">
              Post new renovation projects and manage your existing listings.
            </p>
          </div>

          {/* Success Message */}
          {successMessage && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
              <HiCheckCircle className="text-green-500 shrink-0" size={20} />
              <p className="text-sm text-green-700">{successMessage}</p>
            </div>
          )}

          {/* ====================================================== */}
          {/*  POST NEW PROJECT FORM                                  */}
          {/* ====================================================== */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-orange-100 text-orange-500 p-2 rounded-lg">
                <HiPlusCircle size={24} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  Post a New Project
                </h2>
                <p className="text-sm text-gray-500">
                  Describe your renovation project to connect with verified
                  contractors.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* -------------------------------------------------- */}
              {/*  SECTION 1 — Basic Project Information              */}
              {/* -------------------------------------------------- */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <SectionHeader
                  number={1}
                  title="Basic Project Information"
                  subtitle="Tell us what type of project you need help with."
                />

                <div className="space-y-5">
                  {/* Project Title */}
                  <Input
                    label="Project Title"
                    name="projectTitle"
                    type="text"
                    placeholder="e.g., Kitchen Renovation in Downtown Toronto"
                    value={form.projectTitle}
                    onChange={handleChange}
                    error={errors.projectTitle}
                  />

                  {/* Category */}
                  <div className="w-full">
                    <label
                      htmlFor="category"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Project Type
                    </label>
                    <select
                      id="category"
                      name="category"
                      value={form.category}
                      onChange={handleChange}
                      className={selectClass(!!errors.category)}
                    >
                      <option value="">Select a project type</option>
                      {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                    {errors.category && (
                      <p className="mt-1 text-sm text-red-500">
                        {errors.category}
                      </p>
                    )}
                  </div>

                  {/* Property Type */}
                  <div className="w-full">
                    <label
                      htmlFor="propertyType"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Property Type
                    </label>
                    <select
                      id="propertyType"
                      name="propertyType"
                      value={form.propertyType}
                      onChange={handleChange}
                      className={selectClass(!!errors.propertyType)}
                    >
                      <option value="">Select property type</option>
                      {Object.entries(PROPERTY_TYPE_LABELS).map(
                        ([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        )
                      )}
                    </select>
                    {errors.propertyType && (
                      <p className="mt-1 text-sm text-red-500">
                        {errors.propertyType}
                      </p>
                    )}
                  </div>

                  {/* Ownership Status */}
                  <div className="w-full">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ownership Status
                    </label>
                    <div className={radioGroupClass}>
                      {Object.entries(OWNERSHIP_STATUS_LABELS).map(
                        ([value, label]) => (
                          <label
                            key={value}
                            className={radioLabelClass(
                              form.ownershipStatus === value
                            )}
                          >
                            <input
                              type="radio"
                              name="ownershipStatus"
                              value={value}
                              checked={form.ownershipStatus === value}
                              onChange={handleChange}
                              className="sr-only"
                            />
                            <HiHome size={16} />
                            {label}
                          </label>
                        )
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* -------------------------------------------------- */}
              {/*  SECTION 2 — Location Details                       */}
              {/* -------------------------------------------------- */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <SectionHeader
                  number={2}
                  title="Location Details"
                  subtitle="Where is the project located?"
                />

                <div className="space-y-5">
                  {/* Street Address */}
                  <Input
                    label="Street Address"
                    name="streetAddress"
                    type="text"
                    placeholder="e.g., 123 Main Street"
                    value={form.streetAddress}
                    onChange={handleChange}
                    error={errors.streetAddress}
                  />

                  {/* Unit / Suite */}
                  <Input
                    label="Unit / Suite (optional)"
                    name="unit"
                    type="text"
                    placeholder="e.g., Unit 4B"
                    value={form.unit}
                    onChange={handleChange}
                  />

                  {/* City */}
                  <Input
                    label="City"
                    name="city"
                    type="text"
                    placeholder="e.g., Toronto, Ottawa, Hamilton"
                    value={form.city}
                    onChange={handleChange}
                    error={errors.city}
                  />

                  {/* Province */}
                  <div className="w-full">
                    <label
                      htmlFor="province"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Province / Territory
                    </label>
                    <select
                      id="province"
                      name="province"
                      value={form.province}
                      onChange={handleChange}
                      className={selectClass(!!errors.province)}
                    >
                      <option value="">Select province</option>
                      {PROVINCE_OPTIONS.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                    {errors.province && (
                      <p className="mt-1 text-sm text-red-500">
                        {errors.province}
                      </p>
                    )}
                  </div>

                  {/* Postal Code */}
                  <Input
                    label="Postal Code"
                    name="postalCode"
                    type="text"
                    placeholder="e.g., M5V 2T6"
                    value={form.postalCode}
                    onChange={handleChange}
                    error={errors.postalCode}
                  />

                  {/* Parking Available */}
                  <div className="w-full">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Parking Available?
                    </label>
                    <div className={radioGroupClass}>
                      {[
                        { value: "yes", label: "Yes" },
                        { value: "no", label: "No" },
                        { value: "street", label: "Street parking only" },
                      ].map((opt) => (
                        <label
                          key={opt.value}
                          className={radioLabelClass(
                            form.parkingAvailable === opt.value
                          )}
                        >
                          <input
                            type="radio"
                            name="parkingAvailable"
                            value={opt.value}
                            checked={form.parkingAvailable === opt.value}
                            onChange={handleChange}
                            className="sr-only"
                          />
                          {opt.label}
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Building Restrictions */}
                  <div className="w-full">
                    <label
                      htmlFor="buildingRestrictions"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Building Restrictions (optional)
                    </label>
                    <textarea
                      id="buildingRestrictions"
                      name="buildingRestrictions"
                      rows={3}
                      placeholder="e.g., HOA rules, noise restrictions, work hour limitations"
                      value={form.buildingRestrictions}
                      onChange={handleChange}
                      className={textareaClass(false)}
                    />
                  </div>
                </div>
              </div>

              {/* -------------------------------------------------- */}
              {/*  SECTION 3 — Project Details                        */}
              {/* -------------------------------------------------- */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <SectionHeader
                  number={3}
                  title="Project Details"
                  subtitle="Describe the work you need done."
                />

                <div className="space-y-5">
                  {/* Description */}
                  <div className="w-full">
                    <label
                      htmlFor="description"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Description
                    </label>
                    <textarea
                      id="description"
                      name="description"
                      rows={5}
                      placeholder="Describe your renovation project in detail. Include the scope of work, any specific requirements, materials preferences, etc. (minimum 20 characters)"
                      value={form.description}
                      onChange={handleChange}
                      className={textareaClass(!!errors.description)}
                    />
                    <div className="flex justify-between mt-1">
                      {errors.description ? (
                        <p className="text-sm text-red-500">
                          {errors.description}
                        </p>
                      ) : (
                        <span />
                      )}
                      <p className="text-xs text-gray-400">
                        {form.description.trim().length} / 20 min
                      </p>
                    </div>
                  </div>

                  {/* Scope of Work */}
                  <div className="w-full">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Scope of Work
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {SCOPE_OF_WORK_OPTIONS.map((option) => {
                        const checked = form.scopeOfWork.includes(option);
                        return (
                          <label
                            key={option}
                            className={`flex items-center gap-2 px-3 py-2.5 border rounded-lg cursor-pointer transition-all duration-200 text-sm ${
                              checked
                                ? "border-orange-500 bg-orange-50 text-orange-700"
                                : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => handleCheckbox(option)}
                              className="accent-orange-500 w-4 h-4"
                            />
                            {option}
                          </label>
                        );
                      })}
                    </div>
                    {errors.scopeOfWork && (
                      <p className="mt-1 text-sm text-red-500">
                        {errors.scopeOfWork}
                      </p>
                    )}
                  </div>

                  {/* Has Drawings / Plans */}
                  <div className="w-full">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Do you have drawings or plans?
                    </label>
                    <div className={radioGroupClass}>
                      {[
                        { value: "yes", label: "Yes" },
                        { value: "no", label: "No" },
                        { value: "partial", label: "Partial" },
                      ].map((opt) => (
                        <label
                          key={opt.value}
                          className={radioLabelClass(
                            form.hasDrawings === opt.value
                          )}
                        >
                          <input
                            type="radio"
                            name="hasDrawings"
                            value={opt.value}
                            checked={form.hasDrawings === opt.value}
                            onChange={handleChange}
                            className="sr-only"
                          />
                          {opt.label}
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Has Permits */}
                  <div className="w-full">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Have permits been obtained?
                    </label>
                    <div className={radioGroupClass}>
                      {[
                        { value: "yes", label: "Yes" },
                        { value: "no", label: "No" },
                        { value: "not_sure", label: "Not Sure" },
                      ].map((opt) => (
                        <label
                          key={opt.value}
                          className={radioLabelClass(
                            form.hasPermits === opt.value
                          )}
                        >
                          <input
                            type="radio"
                            name="hasPermits"
                            value={opt.value}
                            checked={form.hasPermits === opt.value}
                            onChange={handleChange}
                            className="sr-only"
                          />
                          {opt.label}
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Materials Provider */}
                  <div className="w-full">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Who provides materials?
                    </label>
                    <div className={radioGroupClass}>
                      {[
                        { value: "homeowner", label: "I will provide" },
                        { value: "contractor", label: "Contractor provides" },
                        { value: "either", label: "Either" },
                      ].map((opt) => (
                        <label
                          key={opt.value}
                          className={radioLabelClass(
                            form.materialsProvider === opt.value
                          )}
                        >
                          <input
                            type="radio"
                            name="materialsProvider"
                            value={opt.value}
                            checked={form.materialsProvider === opt.value}
                            onChange={handleChange}
                            className="sr-only"
                          />
                          {opt.label}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* -------------------------------------------------- */}
              {/*  SECTION 4 — Budget & Timeline                      */}
              {/* -------------------------------------------------- */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <SectionHeader
                  number={4}
                  title="Budget & Timeline"
                  subtitle="Set your estimated budget and preferred schedule."
                />

                <div className="space-y-5">
                  {/* Budget Range */}
                  <div className="w-full">
                    <label
                      htmlFor="budgetRange"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Estimated Budget
                    </label>
                    <select
                      id="budgetRange"
                      name="budgetRange"
                      value={form.budgetRange}
                      onChange={handleChange}
                      className={selectClass(!!errors.budgetRange)}
                    >
                      <option value="">Select budget range</option>
                      {Object.entries(BUDGET_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                    {errors.budgetRange && (
                      <p className="mt-1 text-sm text-red-500">
                        {errors.budgetRange}
                      </p>
                    )}
                  </div>

                  {/* Preferred Start Date */}
                  <div className="w-full">
                    <label
                      htmlFor="preferredStartDate"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Preferred Start Date
                    </label>
                    <select
                      id="preferredStartDate"
                      name="preferredStartDate"
                      value={form.preferredStartDate}
                      onChange={handleChange}
                      className={selectClass(!!errors.preferredStartDate)}
                    >
                      <option value="">Select start date preference</option>
                      {Object.entries(START_DATE_LABELS).map(
                        ([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        )
                      )}
                    </select>
                    {errors.preferredStartDate && (
                      <p className="mt-1 text-sm text-red-500">
                        {errors.preferredStartDate}
                      </p>
                    )}
                  </div>

                  {/* Hard Deadline */}
                  <Input
                    label="Hard Deadline (optional)"
                    name="deadline"
                    type="text"
                    placeholder="e.g., Must be done by Dec 2026"
                    value={form.deadline}
                    onChange={handleChange}
                  />
                </div>
              </div>

              {/* -------------------------------------------------- */}
              {/*  SECTION 5 — Communication Preferences               */}
              {/* -------------------------------------------------- */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <SectionHeader
                  number={5}
                  title="Communication Preferences"
                  subtitle="How would you like contractors to reach you?"
                />

                <div className="w-full">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Preferred Contact Method
                  </label>
                  <div className={radioGroupClass}>
                    {[
                      { value: "in_app", label: "In-App Messaging", icon: HiChat },
                      { value: "email", label: "Email", icon: HiDocumentText },
                      { value: "phone", label: "Phone", icon: HiCalendar },
                    ].map((opt) => (
                      <label
                        key={opt.value}
                        className={radioLabelClass(
                          form.contactPreference === opt.value
                        )}
                      >
                        <input
                          type="radio"
                          name="contactPreference"
                          value={opt.value}
                          checked={form.contactPreference === opt.value}
                          onChange={handleChange}
                          className="sr-only"
                        />
                        <opt.icon size={16} />
                        {opt.label}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* -------------------------------------------------- */}
              {/*  SECTION 6 — File Uploads (Placeholder)              */}
              {/* -------------------------------------------------- */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <SectionHeader
                  number={6}
                  title="File Uploads"
                  subtitle="Attach photos, plans, or documents related to your project."
                />

                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <HiPhotograph
                    size={48}
                    className="mx-auto mb-3 text-gray-300"
                  />
                  <p className="text-sm font-medium text-gray-500">
                    File uploads coming in Iteration 2
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    You will be able to attach photos, blueprints, and documents
                    here.
                  </p>
                </div>
              </div>

              {/* -------------------------------------------------- */}
              {/*  SECTION 7 — Review & Submit                         */}
              {/* -------------------------------------------------- */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <SectionHeader
                  number={7}
                  title="Review & Submit"
                  subtitle="Make sure everything looks good before posting."
                />

                <Button type="submit" fullWidth loading={loading}>
                  Post Project
                </Button>
              </div>
            </form>
          </div>

          {/* ====================================================== */}
          {/*  EXISTING PROJECTS LIST                                 */}
          {/* ====================================================== */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              Your Projects
            </h2>

            {projectsLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : projects.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <HiClipboardList size={48} className="mx-auto mb-4 opacity-50" />
                <p className="font-medium">No projects yet</p>
                <p className="text-sm mt-1">
                  Post your first project above to get started!
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {projects.map((project) => (
                  <Link
                    key={project.id}
                    href={`/dashboard/homeowner/projects/${project.id}`}
                    className="block border border-gray-200 rounded-lg p-5 hover:border-orange-200 hover:shadow-sm transition-all"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div className="flex-1">
                        <h3 className="text-sm font-semibold text-gray-900 mb-1">
                          {project.projectTitle}
                        </h3>
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className="bg-orange-100 text-orange-700 text-xs font-medium px-2.5 py-1 rounded-full">
                            {project.categoryName ||
                              CATEGORY_LABELS[project.category]}
                          </span>
                          <span className="bg-gray-100 text-gray-600 text-xs font-medium px-2.5 py-1 rounded-full">
                            {project.budgetLabel ||
                              BUDGET_LABELS[project.budgetRange]}
                          </span>
                          <span
                            className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                              project.status === "open"
                                ? "bg-green-100 text-green-700"
                                : project.status === "in_progress"
                                ? "bg-blue-100 text-blue-700"
                                : project.status === "completed"
                                ? "bg-gray-100 text-gray-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {project.status === "open"
                              ? "Open"
                              : project.status === "in_progress"
                              ? "In Progress"
                              : project.status === "completed"
                              ? "Completed"
                              : "Closed"}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <HiLocationMarker size={14} />
                            {project.city}
                          </span>
                          <span className="flex items-center gap-1">
                            <HiClock size={14} />
                            {project.preferredStartDate
                              ? START_DATE_LABELS[
                                  project.preferredStartDate as PreferredStartDate
                                ] || project.preferredStartDate
                              : "Flexible"}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-gray-400">
                          {new Date(project.createdAt).toLocaleDateString(
                            "en-CA",
                            {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            }
                          )}
                        </span>
                        <HiArrowRight size={16} className="text-gray-400" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}



