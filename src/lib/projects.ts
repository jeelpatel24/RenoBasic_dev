import { db } from "@/lib/firebase";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  runTransaction,
} from "firebase/firestore";
import { ProjectUnlock, ProjectPrivateDetails } from "@/types";

/**
 * Unlock a project for a contractor. Performs an atomic transaction:
 * - Validates the contractor hasn't already unlocked this project
 * - Validates the contractor has sufficient credit balance
 * - Deducts credits from the contractor's balance
 * - Creates an unlock record
 * - Creates a credit transaction record
 */
export async function unlockProject(
  contractorUid: string,
  projectId: string,
  creditCost: number
): Promise<void> {
  const unlockDocId = `${contractorUid}_${projectId}`;

  return runTransaction(db, async (transaction) => {
    // Check if already unlocked
    const unlockRef = doc(db, "unlocks", unlockDocId);
    const unlockSnap = await transaction.get(unlockRef);
    if (unlockSnap.exists()) {
      throw new Error("You have already unlocked this project.");
    }

    // Get current credit balance
    const userRef = doc(db, "users", contractorUid);
    const userSnap = await transaction.get(userRef);
    if (!userSnap.exists()) {
      throw new Error("User not found.");
    }
    const currentBalance = (userSnap.data().creditBalance ?? 0) as number;

    if (currentBalance < creditCost) {
      throw new Error(
        `Insufficient credits. You need ${creditCost} credits but have ${currentBalance}.`
      );
    }

    // Get homeownerUid from project
    const projectRef = doc(db, "projects", projectId);
    const projectSnap = await transaction.get(projectRef);
    if (!projectSnap.exists()) {
      throw new Error("Project not found.");
    }
    const homeownerUid = projectSnap.data().homeownerUid as string;

    const now = new Date().toISOString();

    const unlockRecord: ProjectUnlock = {
      id: unlockDocId,
      contractorUid,
      projectId,
      homeownerUid,
      creditCost,
      unlockedAt: now,
    };

    // Update user credit balance
    transaction.update(userRef, {
      creditBalance: currentBalance - creditCost,
    });

    // Create unlock record
    transaction.set(unlockRef, unlockRecord);

    // Create transaction record
    const transactionRef = doc(collection(db, "transactions"));
    transaction.set(transactionRef, {
      id: transactionRef.id,
      contractorUid,
      creditAmount: creditCost,
      cost: 0,
      type: "unlock",
      relatedProjectId: projectId,
      timestamp: now,
    });
  });
}

/**
 * Update the status of a project (homeowner only).
 * Valid statuses: "open" | "in_progress" | "completed" | "closed"
 */
export async function updateProjectStatus(
  projectId: string,
  status: "open" | "in_progress" | "completed" | "closed"
): Promise<void> {
  const projectRef = doc(db, "projects", projectId);
  await updateDoc(projectRef, {
    status,
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Get all project IDs that a contractor has unlocked.
 */
export async function getContractorUnlocks(
  contractorUid: string
): Promise<string[]> {
  const q = query(
    collection(db, "unlocks"),
    where("contractorUid", "==", contractorUid)
  );
  const snapshot = await getDocs(q);

  const projectIds: string[] = [];
  snapshot.forEach((doc) => {
    projectIds.push(doc.data().projectId);
  });

  return projectIds;
}

/**
 * Get the private details for a project (only call after verifying unlock).
 */
export async function getProjectPrivateDetails(
  projectId: string
): Promise<ProjectPrivateDetails | null> {
  const projectRef = doc(db, "projects", projectId);
  const snapshot = await getDoc(projectRef);

  if (!snapshot.exists()) return null;

  return snapshot.data().privateDetails as ProjectPrivateDetails;
}

