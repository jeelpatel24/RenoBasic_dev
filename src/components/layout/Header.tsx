"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { logoutUser, getDashboardRoute } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { HiMenu, HiX } from "react-icons/hi";

export default function Header() {
  const { firebaseUser, userProfile, loading } = useAuth();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logoutUser();
    router.push("/");
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">R</span>
            </div>
            <span className="text-xl font-bold text-gray-900">
              Reno<span className="text-orange-500">Basics</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/" className="text-gray-600 hover:text-orange-500 transition-colors font-medium">
              Home
            </Link>
            <Link href="/#how-it-works" className="text-gray-600 hover:text-orange-500 transition-colors font-medium">
              How It Works
            </Link>
            <Link href="/#pricing" className="text-gray-600 hover:text-orange-500 transition-colors font-medium">
              Pricing
            </Link>

            {!loading && (
              <>
                {firebaseUser && userProfile ? (
                  <div className="flex items-center gap-4">
                    <Link
                      href={getDashboardRoute(userProfile.role)}
                      className="text-gray-600 hover:text-orange-500 transition-colors font-medium"
                    >
                      Dashboard
                    </Link>
                    <span className="text-sm text-gray-500">
                      {userProfile.fullName}
                    </span>
                    <button
                      onClick={handleLogout}
                      className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Logout
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <Link
                      href="/login"
                      className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-orange-500 transition-colors"
                    >
                      Log In
                    </Link>
                    <Link
                      href="/register/homeowner"
                      className="px-4 py-2 text-sm font-medium text-white bg-orange-500 rounded-lg hover:bg-orange-600 transition-colors"
                    >
                      Get Started
                    </Link>
                  </div>
                )}
              </>
            )}
          </nav>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 text-gray-600"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <HiX size={24} /> : <HiMenu size={24} />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden pb-4 border-t border-gray-100 mt-2 pt-4">
            <div className="flex flex-col gap-3">
              <Link href="/" className="text-gray-600 hover:text-orange-500 font-medium py-2" onClick={() => setMobileMenuOpen(false)}>
                Home
              </Link>
              <Link href="/#how-it-works" className="text-gray-600 hover:text-orange-500 font-medium py-2" onClick={() => setMobileMenuOpen(false)}>
                How It Works
              </Link>
              <Link href="/#pricing" className="text-gray-600 hover:text-orange-500 font-medium py-2" onClick={() => setMobileMenuOpen(false)}>
                Pricing
              </Link>
              {!loading && (
                <>
                  {firebaseUser && userProfile ? (
                    <>
                      <Link
                        href={getDashboardRoute(userProfile.role)}
                        className="text-gray-600 hover:text-orange-500 font-medium py-2"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Dashboard
                      </Link>
                      <button
                        onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                        className="text-left text-gray-600 hover:text-orange-500 font-medium py-2"
                      >
                        Logout
                      </button>
                    </>
                  ) : (
                    <>
                      <Link href="/login" className="text-gray-600 hover:text-orange-500 font-medium py-2" onClick={() => setMobileMenuOpen(false)}>
                        Log In
                      </Link>
                      <Link
                        href="/register/homeowner"
                        className="px-4 py-2 text-sm font-medium text-white bg-orange-500 rounded-lg hover:bg-orange-600 transition-colors text-center"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Get Started
                      </Link>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

