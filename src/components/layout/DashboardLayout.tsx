"use client";

import { ReactNode, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { logoutUser } from "@/lib/auth";
import { HiMenu, HiX, HiHome, HiClipboardList, HiChat, HiCreditCard, HiChartBar, HiCog, HiLogout, HiUsers, HiShieldCheck, HiCollection } from "react-icons/hi";
import { UserRole } from "@/types";

interface NavItem {
  label: string;
  href: string;
  icon: ReactNode;
}

function getNavItems(role: UserRole): NavItem[] {
  switch (role) {
    case "homeowner":
      return [
        { label: "Dashboard", href: "/dashboard/homeowner", icon: <HiHome size={20} /> },
        { label: "My Projects", href: "/dashboard/homeowner/projects", icon: <HiClipboardList size={20} /> },
        { label: "Messages", href: "/dashboard/homeowner/messages", icon: <HiChat size={20} /> },
        { label: "Bids", href: "/dashboard/homeowner/bids", icon: <HiCollection size={20} /> },
        { label: "Settings", href: "/dashboard/homeowner/settings", icon: <HiCog size={20} /> },
      ];
    case "contractor":
      return [
        { label: "Dashboard", href: "/dashboard/contractor", icon: <HiHome size={20} /> },
        { label: "Marketplace", href: "/dashboard/contractor/marketplace", icon: <HiClipboardList size={20} /> },
        { label: "Messages", href: "/dashboard/contractor/messages", icon: <HiChat size={20} /> },
        { label: "My Bids", href: "/dashboard/contractor/bids", icon: <HiCollection size={20} /> },
        { label: "Credits", href: "/dashboard/contractor/credits", icon: <HiCreditCard size={20} /> },
        { label: "Analytics", href: "/dashboard/contractor/analytics", icon: <HiChartBar size={20} /> },
        { label: "Settings", href: "/dashboard/contractor/settings", icon: <HiCog size={20} /> },
      ];
    case "admin":
      return [
        { label: "Dashboard", href: "/dashboard/admin", icon: <HiHome size={20} /> },
        { label: "Verifications", href: "/dashboard/admin/verifications", icon: <HiShieldCheck size={20} /> },
        { label: "Users", href: "/dashboard/admin/users", icon: <HiUsers size={20} /> },
        { label: "Analytics", href: "/dashboard/admin/analytics", icon: <HiChartBar size={20} /> },
        { label: "Settings", href: "/dashboard/admin/settings", icon: <HiCog size={20} /> },
      ];
  }
}

export default function DashboardLayout({ children, role }: { children: ReactNode; role: UserRole }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { userProfile } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const navItems = getNavItems(role);

  const handleLogout = async () => {
    await logoutUser();
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 bg-white border-r border-gray-200">
        <div className="p-6 border-b border-gray-100">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">R</span>
            </div>
            <span className="text-xl font-bold text-gray-900">
              Reno<span className="text-orange-500">Basics</span>
            </span>
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-orange-50 text-orange-600"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <div className="px-4 py-2 mb-2">
            <p className="text-sm font-medium text-gray-900">{userProfile?.fullName}</p>
            <p className="text-xs text-gray-500 capitalize">{userProfile?.role}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-red-500 transition-colors w-full"
          >
            <HiLogout size={20} />
            Logout
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <div className="relative w-64 bg-white flex flex-col z-10">
            <div className="p-4 flex justify-between items-center border-b border-gray-100">
              <span className="text-xl font-bold text-gray-900">
                Reno<span className="text-orange-500">Basics</span>
              </span>
              <button onClick={() => setSidebarOpen(false)} className="p-2">
                <HiX size={24} />
              </button>
            </div>
            <nav className="flex-1 p-4 space-y-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-orange-50 text-orange-600"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                  >
                    {item.icon}
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className="p-4 border-t border-gray-100">
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-red-500 transition-colors w-full"
              >
                <HiLogout size={20} />
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top Bar (Mobile) */}
        <header className="lg:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-4">
          <button onClick={() => setSidebarOpen(true)} className="p-2 text-gray-600">
            <HiMenu size={24} />
          </button>
          <span className="text-lg font-bold text-gray-900">
            Reno<span className="text-orange-500">Basics</span>
          </span>
        </header>

        <main className="flex-1 p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}


