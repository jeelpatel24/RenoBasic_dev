// ---------------------------------------------------------------------------
// Firebase Admin SDK — server-side only.
// Used exclusively in Next.js API routes (e.g. the Stripe webhook) where
// the Firebase client SDK cannot authenticate via a user token.
// Never import this file from client components.
//
// Initialization is intentionally lazy (only runs on first call to
// getAdminDb()) so that Next.js can build the project even when
// FIREBASE_SERVICE_ACCOUNT is not yet configured.
// ---------------------------------------------------------------------------

import admin from "firebase-admin";

function initAdmin() {
  if (admin.apps.length > 0) return admin.app();

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) {
    throw new Error(
      "[firebase-admin] FIREBASE_SERVICE_ACCOUNT env var is not set. " +
      "Download a service account key from Firebase Console → Project Settings → Service Accounts."
    );
  }

  const serviceAccount = JSON.parse(raw) as admin.ServiceAccount;

  return admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

/**
 * Returns the Admin Firestore instance.
 * Initializes Firebase Admin on the first call (lazy init).
 * Throws if FIREBASE_SERVICE_ACCOUNT is not configured.
 */
export function getAdminDb(): admin.firestore.Firestore {
  initAdmin();
  return admin.firestore();
}

export default admin;
