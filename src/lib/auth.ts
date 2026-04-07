import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  User,
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, db } from "./firebase";
import { UserRole, AppUser, ContractorUser, HomeownerUser } from "@/types";

export async function registerHomeowner(
  email: string,
  password: string,
  fullName: string,
  phone: string
): Promise<User> {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;

  const userData: HomeownerUser = {
    uid: user.uid,
    email,
    fullName,
    phone,
    role: "homeowner",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await setDoc(doc(db, "users", user.uid), userData);
  await sendEmailVerification(user);

  return user;
}

export async function registerContractor(
  email: string,
  password: string,
  companyName: string,
  contactName: string,
  phone: string,
  businessNumber: string,
  obrNumber: string
): Promise<User> {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;

  const userData: ContractorUser = {
    uid: user.uid,
    email,
    fullName: contactName,
    phone,
    role: "contractor",
    companyName,
    contactName,
    businessNumber,
    obrNumber,
    verificationStatus: "pending",
    creditBalance: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await setDoc(doc(db, "users", user.uid), userData);
  await sendEmailVerification(user);

  return user;
}

export async function loginUser(email: string, password: string): Promise<AppUser> {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;

  const docSnapshot = await getDoc(doc(db, "users", user.uid));
  if (!docSnapshot.exists()) {
    throw new Error("User profile not found in database.");
  }

  const userProfile = docSnapshot.data() as AppUser;

  // Enforce email verification for all non-admin users.
  // Admin accounts are created directly in Firebase and bypass this requirement.
  // The Firebase session remains active so the /verify-email page can resend the link.
  if (userProfile.role !== "admin" && !user.emailVerified) {
    throw { code: "email-not-verified", message: "Please verify your email address before signing in." };
  }

  return userProfile;
}

export async function logoutUser(): Promise<void> {
  await signOut(auth);
}

export async function resetPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email);
}

export async function getUserProfile(uid: string): Promise<AppUser | null> {
  const docSnapshot = await getDoc(doc(db, "users", uid));
  if (!docSnapshot.exists()) return null;
  return docSnapshot.data() as AppUser;
}

export function getDashboardRoute(role: UserRole): string {
  switch (role) {
    case "homeowner":
      return "/dashboard/homeowner";
    case "contractor":
      return "/dashboard/contractor";
    case "admin":
      return "/dashboard/admin";
    default:
      return "/login";
  }
}

