"use client";

import Link from "next/link";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { HiShieldCheck, HiLockClosed, HiCreditCard, HiChat, HiClipboardList, HiChartBar } from "react-icons/hi";

const CREDIT_PACKAGES = [
  { name: "Starter", credits: 10, price: 49, perCredit: "4.90" },
  { name: "Professional", credits: 25, price: 99, perCredit: "3.96", popular: true },
  { name: "Business", credits: 50, price: 179, perCredit: "3.58" },
  { name: "Enterprise", credits: 100, price: 299, perCredit: "2.99" },
];

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/30 rounded-full px-4 py-1.5 mb-6">
              <HiShieldCheck className="text-orange-500" />
              <span className="text-orange-400 text-sm font-medium">
                Verified Contractors Only
              </span>
            </div>
            <h1 className="text-4xl lg:text-6xl font-bold leading-tight mb-6">
              Find <span className="text-orange-500">Verified</span> Contractors
              for Your Renovation
            </h1>
            <p className="text-xl text-gray-300 mb-8 leading-relaxed">
              RenoBasics is a privacy-first renovation marketplace where every
              contractor is verified through Business Number and Ontario Business
              Registry credentials. Your project details stay locked until a
              contractor commits with credits.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/register/homeowner"
                className="px-8 py-4 bg-orange-500 text-white rounded-lg text-lg font-semibold hover:bg-orange-600 transition-colors text-center"
              >
                Post a Project — Free
              </Link>
              <Link
                href="/register/contractor"
                className="px-8 py-4 border-2 border-white/30 text-white rounded-lg text-lg font-semibold hover:bg-white/10 transition-colors text-center"
              >
                Join as Contractor
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-xl text-gray-500 max-w-2xl mx-auto">
              A simple, secure process that protects both homeowners and contractors
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
            {/* Homeowners */}
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-8 flex items-center gap-3">
                <span className="w-10 h-10 bg-orange-100 text-orange-500 rounded-lg flex items-center justify-center font-bold">
                  H
                </span>
                For Homeowners
              </h3>
              <div className="space-y-6">
                {[
                  { step: "1", title: "Post Your Project", desc: "Describe your renovation, set a budget range, timeline, and location. It's completely free." },
                  { step: "2", title: "Stay Protected", desc: "Your contact info and full details remain locked. Contractors can only see a summary." },
                  { step: "3", title: "Get Notified", desc: "When a verified contractor unlocks your project, you're instantly notified and can start chatting." },
                  { step: "4", title: "Compare & Choose", desc: "Review bids side-by-side with our comparison tools and choose the best contractor for you." },
                ].map((item) => (
                  <div key={item.step} className="flex gap-4">
                    <div className="w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center font-bold text-sm shrink-0">
                      {item.step}
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{item.title}</h4>
                      <p className="text-gray-500">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Contractors */}
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-8 flex items-center gap-3">
                <span className="w-10 h-10 bg-gray-800 text-white rounded-lg flex items-center justify-center font-bold">
                  C
                </span>
                For Contractors
              </h3>
              <div className="space-y-6">
                {[
                  { step: "1", title: "Register & Verify", desc: "Sign up with your Business Number and OBR credentials. Our admin team verifies your legitimacy." },
                  { step: "2", title: "Browse Projects", desc: "View locked project summaries in the marketplace — category, budget range, city, and timeline." },
                  { step: "3", title: "Unlock with Credits", desc: "Spend credits to unlock full project details, including homeowner contact info." },
                  { step: "4", title: "Message & Bid", desc: "Instantly message the homeowner and submit detailed, itemized bids to win the project." },
                ].map((item) => (
                  <div key={item.step} className="flex gap-4">
                    <div className="w-8 h-8 bg-gray-800 text-white rounded-full flex items-center justify-center font-bold text-sm shrink-0">
                      {item.step}
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{item.title}</h4>
                      <p className="text-gray-500">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Why Choose RenoBasics?
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: <HiShieldCheck size={32} />,
                title: "Mandatory Verification",
                desc: "Every contractor is verified through their Business Number (BN) and Ontario Business Registry (OBR) before they can access any projects.",
              },
              {
                icon: <HiLockClosed size={32} />,
                title: "Privacy-First",
                desc: "Your personal information stays locked until a verified contractor commits with credits. No spam calls, no exposed data.",
              },
              {
                icon: <HiCreditCard size={32} />,
                title: "Credit-Based System",
                desc: "Contractors purchase credits to unlock projects, ensuring only serious, committed contractors reach out to you.",
              },
              {
                icon: <HiChat size={32} />,
                title: "Real-Time Messaging",
                desc: "Instant in-app messaging with auto-generated responses. Communicate directly with contractors — no middleman.",
              },
              {
                icon: <HiClipboardList size={32} />,
                title: "Structured Bidding",
                desc: "Receive itemized bids with cost breakdowns and timelines. Compare bids side-by-side with our comparison tools.",
              },
              {
                icon: <HiChartBar size={32} />,
                title: "Analytics Dashboard",
                desc: "Track engagement, response rates, and project metrics. Make data-driven decisions about your renovation.",
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
              >
                <div className="text-orange-500 mb-4">{feature.icon}</div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-500">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Contractor Credit Packages
            </h2>
            <p className="text-xl text-gray-500 max-w-2xl mx-auto">
              Homeowners post projects for free. Contractors purchase credits to
              unlock project details.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {CREDIT_PACKAGES.map((pkg) => (
              <div
                key={pkg.name}
                className={`relative p-8 rounded-xl border-2 ${
                  pkg.popular
                    ? "border-orange-500 shadow-lg shadow-orange-500/10"
                    : "border-gray-200"
                }`}
              >
                {pkg.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                      POPULAR
                    </span>
                  </div>
                )}
                <h3 className="text-lg font-bold text-gray-900 mb-1">
                  {pkg.name}
                </h3>
                <div className="mb-4">
                  <span className="text-4xl font-bold text-gray-900">
                    ${pkg.price}
                  </span>
                  <span className="text-gray-500 ml-1">CAD</span>
                </div>
                <p className="text-orange-500 font-semibold mb-4">
                  {pkg.credits} credits
                </p>
                <p className="text-sm text-gray-500">
                  ${pkg.perCredit} per credit
                </p>
              </div>
            ))}
          </div>

          <div className="mt-12 bg-gray-50 rounded-xl p-8">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Project Unlock Costs
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {[
                { range: "Under $5K", credits: 2 },
                { range: "$5K–$15K", credits: 3 },
                { range: "$15K–$30K", credits: 5 },
                { range: "$30K–$50K", credits: 7 },
                { range: "Over $50K", credits: 10 },
              ].map((tier) => (
                <div
                  key={tier.range}
                  className="bg-white p-4 rounded-lg border border-gray-200 text-center"
                >
                  <p className="text-sm text-gray-500">{tier.range}</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {tier.credits}
                  </p>
                  <p className="text-xs text-gray-400">credits</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-r from-orange-500 to-orange-600 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold mb-6">
            Ready to Start Your Renovation?
          </h2>
          <p className="text-xl text-orange-100 mb-8">
            Join RenoBasics today and connect with verified contractors in Ontario.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register/homeowner"
              className="px-8 py-4 bg-white text-orange-600 rounded-lg text-lg font-semibold hover:bg-orange-50 transition-colors"
            >
              I&apos;m a Homeowner
            </Link>
            <Link
              href="/register/contractor"
              className="px-8 py-4 border-2 border-white text-white rounded-lg text-lg font-semibold hover:bg-white/10 transition-colors"
            >
              I&apos;m a Contractor
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

