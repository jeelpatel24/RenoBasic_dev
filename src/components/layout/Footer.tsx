"use client";

import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">R</span>
              </div>
              <span className="text-xl font-bold text-white">
                Reno<span className="text-orange-500">Basics</span>
              </span>
            </div>
            <p className="text-gray-400 max-w-md">
              The verified renovation marketplace connecting homeowners with
              legitimate, pre-verified contractors in Ontario, Canada.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/#how-it-works" className="hover:text-orange-500 transition-colors">
                  How It Works
                </Link>
              </li>
              <li>
                <Link href="/#pricing" className="hover:text-orange-500 transition-colors">
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="/register/homeowner" className="hover:text-orange-500 transition-colors">
                  Homeowner Sign Up
                </Link>
              </li>
              <li>
                <Link href="/register/contractor" className="hover:text-orange-500 transition-colors">
                  Contractor Sign Up
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-white font-semibold mb-4">Contact</h3>
            <ul className="space-y-2">
              <li className="text-gray-400">support@renobasics.ca</li>
              <li className="text-gray-400">Ontario, Canada</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-500 text-sm">
          &copy; {new Date().getFullYear()} RenoBasics. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

