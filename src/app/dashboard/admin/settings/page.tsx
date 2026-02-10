"use client";

import ProtectedRoute from "@/components/layout/ProtectedRoute";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { HiCog } from "react-icons/hi";

export default function AdminSettingsPage() {
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <DashboardLayout role="admin">
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Admin Settings</h1>
            <p className="text-gray-500 mt-1">Configure platform settings.</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <HiCog size={24} className="text-orange-500" />
              <h2 className="text-lg font-bold text-gray-900">Platform Configuration</h2>
            </div>
            <div className="space-y-4 text-sm text-gray-600">
              <div className="flex justify-between items-center py-3 border-b border-gray-100">
                <span>Credit Package Pricing</span>
                <span className="text-gray-400">Coming in Iteration 2</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-gray-100">
                <span>Email Notifications</span>
                <span className="text-gray-400">Coming in Iteration 2</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-gray-100">
                <span>Platform Maintenance Mode</span>
                <span className="text-gray-400">Coming in Iteration 2</span>
              </div>
              <div className="flex justify-between items-center py-3">
                <span>API Rate Limits</span>
                <span className="text-gray-400">Coming in Iteration 2</span>
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}

