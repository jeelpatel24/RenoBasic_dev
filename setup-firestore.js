/**
 * RenoBasics – Firestore Seed & Migration Script
 * -----------------------------------------------
 * Run AFTER you have created the Firestore database in Firebase Console.
 *
 * Usage (Node 20+):
 *   node --env-file=.env.local setup-firestore.js
 *
 * Requires .env.local in the same directory (see .env.example).
 * Never hardcode credentials — always load from the environment file.
 *
 * What it does:
 *   1. Creates Firebase Auth accounts for test users (homeowner, contractor, admin)
 *   2. Writes their profiles to Firestore /users collection
 *   3. Seeds 3 sample projects in Firestore /projects collection
 *   4. Logs credentials so you can log in immediately
 */

const { initializeApp } = require("firebase/app");
const {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} = require("firebase/auth");
const {
  getFirestore,
  doc,
  setDoc,
  collection,
  addDoc,
  getDocs,
  query,
  where,
} = require("firebase/firestore");

// ─── Firebase Config (loaded from .env.local via --env-file flag) ────────────
const requiredVars = [
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
];

const missing = requiredVars.filter((v) => !process.env[v]);
if (missing.length > 0) {
  console.error(
    "\n❌ Missing environment variables:\n  " + missing.join("\n  ") +
    "\n\nRun with: node --env-file=.env.local setup-firestore.js\n"
  );
  process.exit(1);
}

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ─── Test Accounts ───────────────────────────────────────────────────────────
const TEST_USERS = [
  {
    email: "homeowner@renobasics.test",
    password: "Test1234!",
    profile: {
      fullName: "Sarah Thompson",
      phone: "416-555-0101",
      role: "homeowner",
    },
  },
  {
    email: "contractor@renobasics.test",
    password: "Test1234!",
    profile: {
      fullName: "Mike Chen",
      phone: "416-555-0202",
      role: "contractor",
      companyName: "Chen Renovations Inc.",
      contactName: "Mike Chen",
      businessNumber: "123456789",
      obrNumber: "OBR-987654",
      verificationStatus: "approved",
      creditBalance: 25,
    },
  },
  {
    email: "admin@renobasics.com",
    password: "AdminPass123!",
    profile: {
      fullName: "RenoBasics Admin",
      phone: "416-555-0000",
      role: "admin",
    },
  },
];

// ─── Sample Projects ─────────────────────────────────────────────────────────
const SAMPLE_PROJECTS = (homeownerUid, homeownerProfile) => [
  {
    homeownerUid,
    projectTitle: "Full Kitchen Renovation",
    category: "kitchen",
    categoryName: "Kitchen Renovation",
    propertyType: "detached",
    ownershipStatus: "own",
    budgetRange: "15000_30000",
    budgetLabel: "$15,000 – $30,000",
    preferredStartDate: "within_1_month",
    city: "Toronto",
    creditCost: 5,
    status: "open",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    privateDetails: {
      homeownerName: homeownerProfile.fullName,
      homeownerEmail: homeownerProfile.email,
      homeownerPhone: homeownerProfile.phone,
      fullDescription:
        "Complete kitchen gut renovation including new cabinets, countertops, flooring, and appliances. The kitchen is approximately 200 sq ft.",
      streetAddress: "123 Maple Street",
      unit: "",
      province: "Ontario",
      postalCode: "M5V 2T6",
      scopeOfWork: ["Demolition", "Cabinetry", "Countertops", "Flooring"],
      hasDrawings: "partial",
      hasPermits: "not_sure",
      materialsProvider: "contractor",
      deadline: "Before the holidays (Dec 2026)",
      contactPreference: "in_app",
      parkingAvailable: "yes",
      buildingRestrictions: "",
      photos: [],
    },
  },
  {
    homeownerUid,
    projectTitle: "Master Bathroom Remodel",
    category: "bathroom",
    categoryName: "Bathroom Renovation",
    propertyType: "detached",
    ownershipStatus: "own",
    budgetRange: "5000_15000",
    budgetLabel: "$5,000 – $15,000",
    preferredStartDate: "within_3_months",
    city: "Mississauga",
    creditCost: 3,
    status: "open",
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
    privateDetails: {
      homeownerName: homeownerProfile.fullName,
      homeownerEmail: homeownerProfile.email,
      homeownerPhone: homeownerProfile.phone,
      fullDescription:
        "Updating master bathroom. New tile, vanity, shower fixtures, and toilet. Roughly 80 sq ft.",
      streetAddress: "45 Oak Avenue",
      unit: "Unit 2",
      province: "Ontario",
      postalCode: "L5B 2C9",
      scopeOfWork: ["Tile", "Plumbing Fixtures", "Vanity"],
      hasDrawings: "no",
      hasPermits: "not_sure",
      materialsProvider: "either",
      deadline: "",
      contactPreference: "in_app",
      parkingAvailable: "street",
      buildingRestrictions: "",
      photos: [],
    },
  },
  {
    homeownerUid,
    projectTitle: "Basement Finishing",
    category: "basement",
    categoryName: "Basement Finishing",
    propertyType: "detached",
    ownershipStatus: "own",
    budgetRange: "30000_50000",
    budgetLabel: "$30,000 – $50,000",
    preferredStartDate: "within_6_months",
    city: "Hamilton",
    creditCost: 7,
    status: "open",
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    updatedAt: new Date(Date.now() - 172800000).toISOString(),
    privateDetails: {
      homeownerName: homeownerProfile.fullName,
      homeownerEmail: homeownerProfile.email,
      homeownerPhone: homeownerProfile.phone,
      fullDescription:
        "Finishing an unfinished 1,100 sq ft basement. Need framing, insulation, drywall, electrical, flooring, and a 3-piece bathroom.",
      streetAddress: "789 Pine Road",
      unit: "",
      province: "Ontario",
      postalCode: "L8P 1A1",
      scopeOfWork: ["Framing", "Electrical", "Drywall", "Flooring", "Bathroom"],
      hasDrawings: "yes",
      hasPermits: "yes",
      materialsProvider: "contractor",
      deadline: "September 2026",
      contactPreference: "in_app",
      parkingAvailable: "yes",
      buildingRestrictions: "",
      photos: [],
    },
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
async function createOrGetUser(email, password, profileData) {
  let uid;
  let isNew = false;

  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    uid = cred.user.uid;
    isNew = true;
    console.log(`  ✓ Created Auth account: ${email}`);
  } catch (err) {
    if (err.code === "auth/email-already-in-use") {
      // Sign in to get the UID
      try {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        uid = cred.user.uid;
        console.log(`  ℹ Auth account already exists: ${email}`);
      } catch (signInErr) {
        console.error(`  ✗ Cannot sign in as ${email}: ${signInErr.message}`);
        return null;
      }
    } else {
      console.error(`  ✗ Failed to create ${email}: ${err.message}`);
      return null;
    }
  }

  // Check if Firestore profile already exists
  const userRef = doc(db, "users", uid);
  const now = new Date().toISOString();

  const firestoreData = {
    uid,
    email,
    createdAt: now,
    updatedAt: now,
    ...profileData,
  };

  await setDoc(userRef, firestoreData, { merge: true });

  if (isNew) {
    console.log(`  ✓ Created Firestore profile for: ${email}`);
  } else {
    console.log(`  ✓ Upserted Firestore profile for: ${email}`);
  }

  return { uid, email, ...firestoreData };
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log("\n🔥 RenoBasics – Firestore Setup\n");
  console.log("━".repeat(50));

  // Step 1: Create test users
  console.log("\n📋 Step 1: Creating test accounts...\n");
  const createdUsers = {};

  for (const user of TEST_USERS) {
    const result = await createOrGetUser(
      user.email,
      user.password,
      user.profile
    );
    if (result) {
      createdUsers[user.profile.role] = result;
    }
  }

  // Step 2: Seed sample projects (only if homeowner exists)
  const homeowner = createdUsers["homeowner"];
  if (homeowner) {
    console.log("\n\n🏠 Step 2: Seeding sample projects...\n");

    // Check if projects already exist
    const existingQ = query(
      collection(db, "projects"),
      where("homeownerUid", "==", homeowner.uid)
    );
    const existingSnap = await getDocs(existingQ);

    if (existingSnap.size > 0) {
      console.log(
        `  ℹ ${existingSnap.size} projects already exist for this homeowner. Skipping seed.`
      );
    } else {
      const projects = SAMPLE_PROJECTS(homeowner.uid, homeowner);
      for (const project of projects) {
        await addDoc(collection(db, "projects"), project);
        console.log(`  ✓ Created project: "${project.projectTitle}"`);
      }
    }
  }

  // Step 3: Print summary
  console.log("\n\n" + "━".repeat(50));
  console.log("✅ Setup complete!\n");
  console.log("📧 Test Account Credentials:\n");

  for (const user of TEST_USERS) {
    const role = user.profile.role.toUpperCase().padEnd(12);
    console.log(`  ${role} ${user.email}`);
    console.log(`  ${"".padEnd(12)} Password: ${user.password}\n`);
  }

  console.log("━".repeat(50));
  console.log(
    "\n💡 Tip: The contractor account is pre-approved and has 25 credits."
  );
  console.log(
    "         Log in as contractor to browse and unlock the seeded projects.\n"
  );

  process.exit(0);
}

main().catch((err) => {
  console.error("\n❌ Setup failed:", err.message);
  if (err.message.includes("offline") || err.message.includes("UNAVAILABLE")) {
    console.error(
      "\n⚠️  Could not connect to Firestore. Make sure you have:"
    );
    console.error(
      "   1. Created the Firestore database in Firebase Console"
    );
    console.error(
      "   2. An active internet connection\n"
    );
  }
  process.exit(1);
});
