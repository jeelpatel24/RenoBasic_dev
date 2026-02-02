"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { registerContractor } from "@/lib/auth";
import {
  validateEmail,
  validatePassword,
  validatePhone,
  validateRequired,
  validateConfirmPassword,
  validateBusinessNumber,
  validateOBR,
} from "@/lib/validation";

export default function ContractorRegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    companyName: "",
    contactName: "",
    email: "",
    phone: "",
    businessNumber: "",
    obrNumber: "",
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

    const companyResult = validateRequired(form.companyName, "Company name");
    if (!companyResult.valid) newErrors.companyName = companyResult.error!;

    const contactResult = validateRequired(form.contactName, "Contact name");
    if (!contactResult.valid) newErrors.contactName = contactResult.error!;

    const emailResult = validateEmail(form.email);
    if (!emailResult.valid) newErrors.email = emailResult.error!;

    const phoneResult = validatePhone(form.phone);
    if (!phoneResult.valid) newErrors.phone = phoneResult.error!;

    const bnResult = validateBusinessNumber(form.businessNumber);
    if (!bnResult.valid) newErrors.businessNumber = bnResult.error!;

    const obrResult = validateOBR(form.obrNumber);
    if (!obrResult.valid) newErrors.obrNumber = obrResult.error!;

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
      await registerContractor(
        form.email,
        form.password,
        form.companyName,
        form.contactName,
        form.phone,
        form.businessNumber,
        form.obrNumber
      );
      toast.success("Account created! Your verification is pending admin review.");
      router.push("/dashboard/contractor");
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
              <h1 className="text-2xl font-bold text-gray-900">Contractor Registration</h1>
              <p className="text-gray-500 mt-2">
                Register your business and get verified to access projects
              </p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-amber-800">
                <strong>Verification Required:</strong> Your Business Number (BN) and Ontario
                Business Registry (OBR) credentials will be reviewed by our admin team before
                you can access the marketplace.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <Input
                label="Company Name"
                name="companyName"
                type="text"
                placeholder="Your Business Inc."
                value={form.companyName}
                onChange={handleChange}
                error={errors.companyName}
              />

              <Input
                label="Contact Name"
                name="contactName"
                type="text"
                placeholder="John Doe"
                value={form.contactName}
                onChange={handleChange}
                error={errors.contactName}
              />

              <Input
                label="Email Address"
                name="email"
                type="email"
                placeholder="contact@company.com"
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
                label="Business Number (BN)"
                name="businessNumber"
                type="text"
                placeholder="123456789"
                value={form.businessNumber}
                onChange={handleChange}
                error={errors.businessNumber}
              />

              <Input
                label="Ontario Business Registry (OBR) Number"
                name="obrNumber"
                type="text"
                placeholder="OBR-12345"
                value={form.obrNumber}
                onChange={handleChange}
                error={errors.obrNumber}
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
                Create Contractor Account
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-gray-500">
              Already have an account?{" "}
              <Link href="/login" className="text-orange-500 font-medium hover:text-orange-600">
                Sign in
              </Link>
            </div>

            <div className="mt-3 text-center text-sm text-gray-500">
              Are you a homeowner?{" "}
              <Link href="/register/homeowner" className="text-orange-500 font-medium hover:text-orange-600">
                Register as Homeowner
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

