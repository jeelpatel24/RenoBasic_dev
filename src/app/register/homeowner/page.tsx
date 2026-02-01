"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { registerHomeowner } from "@/lib/auth";
import {
  validateEmail,
  validatePassword,
  validatePhone,
  validateRequired,
  validateConfirmPassword,
} from "@/lib/validation";

export default function HomeownerRegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setErrors((prev) => ({ ...prev, [e.target.name]: "" }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    const nameResult = validateRequired(form.fullName, "Full name");
    if (!nameResult.valid) newErrors.fullName = nameResult.error!;

    const emailResult = validateEmail(form.email);
    if (!emailResult.valid) newErrors.email = emailResult.error!;

    const phoneResult = validatePhone(form.phone);
    if (!phoneResult.valid) newErrors.phone = phoneResult.error!;

    const passwordResult = validatePassword(form.password);
    if (!passwordResult.valid) newErrors.password = passwordResult.error!;

    const confirmResult = validateConfirmPassword(form.password, form.confirmPassword);
    if (!confirmResult.valid) newErrors.confirmPassword = confirmResult.error!;

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      await registerHomeowner(form.email, form.password, form.fullName, form.phone);
      toast.success("Account created! Please check your email for verification.");
      router.push("/dashboard/homeowner");
    } catch (error: unknown) {
      const firebaseError = error as { code?: string };
      if (firebaseError.code === "auth/email-already-in-use") {
        toast.error("An account with this email already exists.");
      } else {
        toast.error("Registration failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center bg-gray-50 py-12 px-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-gray-900">Homeowner Registration</h1>
              <p className="text-gray-500 mt-2">
                Create your free account to post renovation projects
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <Input
                label="Full Name"
                name="fullName"
                type="text"
                placeholder="John Doe"
                value={form.fullName}
                onChange={handleChange}
                error={errors.fullName}
              />

              <Input
                label="Email Address"
                name="email"
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={handleChange}
                error={errors.email}
              />

              <Input
                label="Phone Number"
                name="phone"
                type="tel"
                placeholder="(416) 555-0123"
                value={form.phone}
                onChange={handleChange}
                error={errors.phone}
              />

              <Input
                label="Password"
                name="password"
                type="password"
                placeholder="Min. 8 chars, 1 uppercase, 1 lowercase, 1 number"
                value={form.password}
                onChange={handleChange}
                error={errors.password}
              />

              <Input
                label="Confirm Password"
                name="confirmPassword"
                type="password"
                placeholder="Re-enter your password"
                value={form.confirmPassword}
                onChange={handleChange}
                error={errors.confirmPassword}
              />

              <Button type="submit" fullWidth loading={loading}>
                Create Homeowner Account
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-gray-500">
              Already have an account?{" "}
              <Link href="/login" className="text-orange-500 font-medium hover:text-orange-600">
                Sign in
              </Link>
            </div>

            <div className="mt-3 text-center text-sm text-gray-500">
              Are you a contractor?{" "}
              <Link href="/register/contractor" className="text-orange-500 font-medium hover:text-orange-600">
                Register as Contractor
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}


