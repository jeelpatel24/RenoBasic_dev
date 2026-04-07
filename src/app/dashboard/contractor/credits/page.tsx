"use client";

import { useState, useEffect, Suspense } from "react";
import { collection, query, where, onSnapshot, doc, getDoc } from "firebase/firestore";
import { useRouter, useSearchParams } from "next/navigation";
import { db } from "@/lib/firebase";
import ProtectedRoute from "@/components/layout/ProtectedRoute";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import Button from "@/components/ui/Button";
import toast from "react-hot-toast";
import { ContractorUser, CreditPackage, CreditTransaction } from "@/types";
import { formatDate } from "@/lib/utils";
import {
  HiCreditCard,
  HiStar,
  HiShoppingCart,
  HiClock,
  HiArrowUp,
  HiArrowDown,
  HiRefresh,
  HiCheckCircle,
} from "react-icons/hi";

// ---------------------------------------------------------------------------
// Credit packages — prices and credit amounts match the Stripe products.
// Payment links are loaded from env vars (NEXT_PUBLIC_STRIPE_LINK_*).
// ---------------------------------------------------------------------------
const CREDIT_PACKAGES: CreditPackage[] = [
  {
    id: "starter",
    name: "Starter Pack",
    credits: 10,
    price: 59.0,
    pricePerCredit: 5.9,
  },
  {
    id: "standard",
    name: "Standard Pack",
    credits: 15,
    price: 79.0,
    pricePerCredit: 5.27,
  },
  {
    id: "pro",
    name: "Pro Pack",
    credits: 30,
    price: 149.99,
    pricePerCredit: 5.0,
  },
  {
    id: "enterprise",
    name: "Enterprise Pack",
    credits: 60,
    price: 279.99,
    pricePerCredit: 4.67,
  },
];

// Maps package id → Stripe Payment Link URL (from environment variables).
const PAYMENT_LINKS: Record<string, string> = {
  starter: process.env.NEXT_PUBLIC_STRIPE_LINK_STARTER ?? "",
  standard: process.env.NEXT_PUBLIC_STRIPE_LINK_STANDARD ?? "",
  pro: process.env.NEXT_PUBLIC_STRIPE_LINK_PRO ?? "",
  enterprise: process.env.NEXT_PUBLIC_STRIPE_LINK_ENTERPRISE ?? "",
};

// ---------------------------------------------------------------------------
// Inner page component (uses useSearchParams — must be inside Suspense)
// ---------------------------------------------------------------------------
function CreditsPageContent() {
  const { userProfile, refreshProfile } = useAuth();
  const contractor = userProfile as ContractorUser | null;
  const router = useRouter();
  const searchParams = useSearchParams();

  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(true);
  const [creditPackages, setCreditPackages] = useState<CreditPackage[]>(CREDIT_PACKAGES);

  const creditBalance = contractor?.creditBalance ?? 0;

  // Show success banner when Stripe redirects back with ?status=success
  useEffect(() => {
    if (searchParams.get("status") === "success") {
      toast.success(
        "Payment received! Your credits will appear in a few seconds.",
        { duration: 5000 }
      );
      // Refresh profile to pick up new credit balance from Firestore.
      refreshProfile();
      // Clean the URL so the toast doesn't re-fire on manual refresh.
      router.replace("/dashboard/contractor/credits");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load admin-configurable packages (falls back to CREDIT_PACKAGES silently).
  useEffect(() => {
    const fetchPackages = async () => {
      try {
        const snap = await getDoc(doc(db, "settings", "creditPackages"));
        if (snap.exists()) {
          const data = snap.data();
          const pkgs = (
            data.packages as Array<{
              id: string;
              label: string;
              credits: number;
              price: number;
            }>
          ).map((p) => ({
            id: p.id,
            name: p.label,
            credits: p.credits,
            price: p.price,
            pricePerCredit: p.credits > 0 ? p.price / p.credits : 0,
          }));
          if (pkgs.length > 0) setCreditPackages(pkgs);
        }
      } catch {
        // Fall back to CREDIT_PACKAGES silently.
      }
    };
    fetchPackages();
  }, []);

  // Real-time transaction history listener.
  useEffect(() => {
    if (!userProfile) return;

    const q = query(
      collection(db, "transactions"),
      where("contractorUid", "==", userProfile.uid)
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const userTransactions = snapshot.docs
          .map((d) => ({ id: d.id, ...d.data() } as CreditTransaction))
          .sort(
            (a, b) =>
              new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );
        setTransactions(userTransactions);
        setTransactionsLoading(false);
      },
      () => setTransactionsLoading(false)
    );

    return () => unsubscribe();
  }, [userProfile]);

  // Redirect to the Stripe Payment Link for the chosen package.
  // client_reference_id links the payment to the contractor's Firebase UID
  // so the webhook can credit the right account.
  const handleBuyCredits = (pkg: CreditPackage) => {
    if (!contractor?.uid) return;

    const baseUrl = PAYMENT_LINKS[pkg.id];
    if (!baseUrl) {
      toast.error("Payment link not configured. Contact support.");
      return;
    }

    const params = new URLSearchParams({
      client_reference_id: contractor.uid,
      prefilled_email: contractor.email ?? "",
    });

    window.location.href = `${baseUrl}?${params.toString()}`;
  };

  const getTransactionIcon = (type: CreditTransaction["type"]) => {
    switch (type) {
      case "purchase":
        return <HiArrowUp size={16} className="text-green-500" />;
      case "unlock":
        return <HiArrowDown size={16} className="text-orange-500" />;
      case "refund":
        return <HiRefresh size={16} className="text-blue-500" />;
    }
  };

  const getTransactionLabel = (type: CreditTransaction["type"]) => {
    switch (type) {
      case "purchase":
        return "Credit Purchase";
      case "unlock":
        return "Project Unlock";
      case "refund":
        return "Credit Refund";
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Buy Credits</h1>
        <p className="text-gray-500 mt-1">
          Purchase credits to unlock homeowner renovation projects.
        </p>
      </div>

      {/* Current Balance */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 flex items-center gap-4">
        <div className="bg-orange-500 text-white p-4 rounded-lg">
          <HiCreditCard size={32} />
        </div>
        <div>
          <p className="text-sm text-gray-500">Current Credit Balance</p>
          <p className="text-4xl font-bold text-gray-900">{creditBalance}</p>
          <p className="text-xs text-gray-400 mt-1">
            Credits are used to unlock project details and contact information.
          </p>
        </div>
      </div>

      {/* How it works */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
        <HiCheckCircle size={20} className="text-blue-500 shrink-0 mt-0.5" />
        <p className="text-sm text-blue-700">
          Clicking <strong>Buy Now</strong> takes you to a secure Stripe checkout.
          After payment, credits are added to your account automatically within seconds.
        </p>
      </div>

      {/* Credit Packages */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-4">
          Choose a Credit Package
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {creditPackages.map((pkg, idx) => {
            const isPopular = idx === 1;
            return (
              <div
                key={pkg.id}
                className={`bg-white rounded-xl border-2 p-6 flex flex-col relative transition-all duration-200 hover:shadow-md ${
                  isPopular
                    ? "border-orange-500 shadow-sm"
                    : "border-gray-200 hover:border-orange-200"
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                      <HiStar size={12} />
                      POPULAR
                    </span>
                  </div>
                )}

                <div className="text-center flex-1">
                  <h3 className="text-lg font-bold text-gray-900 mt-2">
                    {pkg.name}
                  </h3>
                  <div className="mt-4">
                    <span className="text-4xl font-bold text-gray-900">
                      CA${pkg.price.toFixed(2)}
                    </span>
                  </div>
                  <div className="mt-2 space-y-1">
                    <p className="text-orange-600 font-semibold text-lg">
                      {pkg.credits} Credits
                    </p>
                    <p className="text-sm text-gray-500">
                      ${pkg.pricePerCredit.toFixed(2)}/credit
                    </p>
                  </div>
                </div>

                <div className="mt-6">
                  <Button
                    fullWidth
                    variant={isPopular ? "primary" : "outline"}
                    onClick={() => handleBuyCredits(pkg)}
                  >
                    <HiShoppingCart size={16} className="mr-1.5" />
                    Buy Now
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Transaction History */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">
          Transaction History
        </h2>

        {transactionsLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <HiClock size={48} className="mx-auto mb-4 opacity-50" />
            <p className="font-medium">No transactions yet</p>
            <p className="text-sm mt-1">
              Your credit purchase and usage history will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Type</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Credits</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Amount</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Date</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr
                    key={tx.id}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {getTransactionIcon(tx.type)}
                        <span className="text-gray-900">
                          {getTransactionLabel(tx.type)}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`font-medium ${
                          tx.type === "purchase" || tx.type === "refund"
                            ? "text-green-600"
                            : "text-orange-600"
                        }`}
                      >
                        {tx.type === "purchase" || tx.type === "refund" ? "+" : "-"}
                        {tx.creditAmount}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {tx.cost > 0 ? `CA$${tx.cost.toFixed(2)}` : "--"}
                    </td>
                    <td className="py-3 px-4 text-gray-500">
                      {formatDate(tx.timestamp)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page export — wraps content in Suspense (required by useSearchParams)
// ---------------------------------------------------------------------------
export default function ContractorCreditsPage() {
  return (
    <ProtectedRoute allowedRoles={["contractor"]}>
      <DashboardLayout role="contractor">
        <Suspense
          fallback={
            <div className="flex items-center justify-center min-h-[60vh]">
              <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
            </div>
          }
        >
          <CreditsPageContent />
        </Suspense>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
