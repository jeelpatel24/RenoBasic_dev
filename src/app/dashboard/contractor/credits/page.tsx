"use client";

import { useState, useEffect } from "react";
import { ref, onValue, query, orderByChild, push, update, get } from "firebase/database";
import { db } from "@/lib/firebase";
import ProtectedRoute from "@/components/layout/ProtectedRoute";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import Button from "@/components/ui/Button";
import toast from "react-hot-toast";
import { ContractorUser, CreditPackage, CreditTransaction } from "@/types";
import {
  HiCreditCard,
  HiStar,
  HiShoppingCart,
  HiClock,
  HiArrowUp,
  HiArrowDown,
  HiRefresh,
} from "react-icons/hi";

const CREDIT_PACKAGES: CreditPackage[] = [
  {
    id: "starter",
    name: "Starter",
    credits: 10,
    price: 49,
    pricePerCredit: 4.9,
  },
  {
    id: "professional",
    name: "Professional",
    credits: 25,
    price: 99,
    pricePerCredit: 3.96,
  },
  {
    id: "business",
    name: "Business",
    credits: 50,
    price: 179,
    pricePerCredit: 3.58,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    credits: 100,
    price: 299,
    pricePerCredit: 2.99,
  },
];

export default function ContractorCreditsPage() {
  const { userProfile, refreshProfile } = useAuth();
  const contractor = userProfile as ContractorUser | null;
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(true);

  const creditBalance = contractor?.creditBalance ?? 0;

  // Fetch transaction history
  useEffect(() => {
    if (!userProfile) return;

    const transactionsRef = query(
      ref(db, "transactions"),
      orderByChild("contractorUid")
    );
    const unsubscribe = onValue(transactionsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const allTransactions: CreditTransaction[] = Object.entries(data).map(
          ([id, value]) => ({
            ...(value as Omit<CreditTransaction, "id">),
            id,
          })
        );
        const userTransactions = allTransactions
          .filter((t) => t.contractorUid === userProfile.uid)
          .sort(
            (a, b) =>
              new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );
        setTransactions(userTransactions);
      } else {
        setTransactions([]);
      }
      setTransactionsLoading(false);
    });

    return () => unsubscribe();
  }, [userProfile]);

  const [buyingId, setBuyingId] = useState<string | null>(null);

  const handleBuyCredits = async (pkg: CreditPackage) => {
    if (!contractor) return;
    setBuyingId(pkg.id);
    try {
      const balanceSnap = await get(ref(db, `users/${contractor.uid}/creditBalance`));
      const currentBalance = (balanceSnap.val() as number) ?? 0;
      const transactionRef = push(ref(db, "transactions"));
      const now = new Date().toISOString();

      const updates: Record<string, unknown> = {
        [`users/${contractor.uid}/creditBalance`]: currentBalance + pkg.credits,
        [`transactions/${transactionRef.key}`]: {
          id: transactionRef.key,
          contractorUid: contractor.uid,
          creditAmount: pkg.credits,
          cost: pkg.price,
          type: "purchase",
          timestamp: now,
        },
      };

      await update(ref(db), updates);
      await refreshProfile();
      toast.success(`${pkg.credits} credits added! (Simulated — Stripe in Iteration 2)`);
    } catch {
      toast.error("Failed to purchase credits.");
    } finally {
      setBuyingId(null);
    }
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
    <ProtectedRoute allowedRoles={["contractor"]}>
      <DashboardLayout role="contractor">
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

          {/* Credit Packages */}
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              Choose a Credit Package
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {CREDIT_PACKAGES.map((pkg) => {
                const isPopular = pkg.id === "professional";
                return (
                  <div
                    key={pkg.id}
                    className={`bg-white rounded-xl border-2 p-6 flex flex-col relative transition-all duration-200 hover:shadow-md ${
                      isPopular
                        ? "border-orange-500 shadow-sm"
                        : "border-gray-200 hover:border-orange-200"
                    }`}
                  >
                    {/* Popular Badge */}
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
                          ${pkg.price}
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
                        loading={buyingId === pkg.id}
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
                      <th className="text-left py-3 px-4 font-medium text-gray-500">
                        Type
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-gray-500">
                        Credits
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-gray-500">
                        Amount
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-gray-500">
                        Date
                      </th>
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
                            {tx.type === "purchase" || tx.type === "refund"
                              ? "+"
                              : "-"}
                            {tx.creditAmount}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-600">
                          {tx.cost > 0 ? `$${tx.cost.toFixed(2)}` : "--"}
                        </td>
                        <td className="py-3 px-4 text-gray-500">
                          {new Date(tx.timestamp).toLocaleDateString("en-CA", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}

