"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { sendEmailVerification } from "firebase/auth";
import { useAuth } from "@/contexts/AuthContext";
import { auth } from "@/lib/firebase";
import { getDashboardRoute, logoutUser } from "@/lib/auth";
import { HiMail, HiCheckCircle, HiRefresh } from "react-icons/hi";

export default function VerifyEmailPage() {
  const { firebaseUser, userProfile, loading } = useAuth();
  const router = useRouter();
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");

  // Guard: redirect away from this page if auth state is resolved.
  useEffect(() => {
    if (loading) return;
    if (!firebaseUser) {
      router.replace("/login");
      return;
    }
    // Already verified on mount (e.g. page refresh) — go straight to dashboard.
    if (firebaseUser.emailVerified) {
      const role = userProfile?.role ?? "homeowner";
      router.replace(getDashboardRoute(role));
    }
  }, [firebaseUser, userProfile, loading, router]);

  // Auto-poll every 5 s so the page advances the moment the user clicks the
  // link in their inbox — without requiring them to press the manual button.
  useEffect(() => {
    if (loading || !firebaseUser || firebaseUser.emailVerified) return;

    const interval = setInterval(async () => {
      try {
        await firebaseUser.reload();
        const refreshed = auth.currentUser;
        if (refreshed?.emailVerified) {
          clearInterval(interval);
          const role = userProfile?.role ?? "homeowner";
          router.replace(getDashboardRoute(role));
        }
      } catch {
        // Network error — polling will retry on the next tick.
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [firebaseUser, userProfile, loading, router]);

  const handleResend = async () => {
    if (!firebaseUser || resending) return;
    setResending(true);
    setError("");
    try {
      await sendEmailVerification(firebaseUser);
      setResent(true);
    } catch {
      setError("Could not resend email. Please wait a moment and try again.");
    } finally {
      setResending(false);
    }
  };

  const handleCheckVerified = async () => {
    if (!firebaseUser || checking) return;
    setChecking(true);
    setError("");
    try {
      await firebaseUser.reload();
      const refreshed = auth.currentUser;
      if (refreshed?.emailVerified) {
        const role = userProfile?.role ?? "homeowner";
        router.replace(getDashboardRoute(role));
      } else {
        setError("Email not yet verified. Please check your inbox and click the link.");
      }
    } catch {
      setError("Could not refresh status. Please try again.");
    } finally {
      setChecking(false);
    }
  };

  const handleLogout = async () => {
    await logoutUser();
    router.replace("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!firebaseUser) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
              <HiMail size={32} className="text-orange-500" />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">Verify Your Email</h1>
          <p className="text-gray-500 mb-1">We sent a verification link to:</p>
          <p className="text-gray-900 font-semibold mb-6 break-all">
            {firebaseUser.email}
          </p>

          <p className="text-sm text-gray-500 mb-6">
            Click the link in your email to verify your account, then come back and press the button below.
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          {resent && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 flex items-center gap-2">
              <HiCheckCircle size={16} />
              Verification email sent! Check your inbox.
            </div>
          )}

          <div className="space-y-3">
            <button
              onClick={handleCheckVerified}
              disabled={checking}
              className="w-full py-3 px-4 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {checking ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <HiCheckCircle size={18} />
                  I&apos;ve Verified — Continue
                </>
              )}
            </button>

            <button
              onClick={handleResend}
              disabled={resending || resent}
              className="w-full py-3 px-4 border border-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              <HiRefresh size={16} />
              {resent ? "Email Sent!" : resending ? "Sending..." : "Resend Email"}
            </button>

            <button
              onClick={handleLogout}
              className="w-full py-2 text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              Log out and use a different account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
