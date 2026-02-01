import { db } from "@/lib/firebase";
import { ref, get, update, push } from "firebase/database";
import { ProjectUnlock, ProjectPrivateDetails } from "@/types";

/**
 * Unlock a project for a contractor. Performs an atomic multi-path update:
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
  const unlockKey = `${contractorUid}_${projectId}`;

  // Check if already unlocked
  const unlockRef = ref(db, `unlocks/${unlockKey}`);
  const unlockSnap = await get(unlockRef);
  if (unlockSnap.exists()) {
    throw new Error("You have already unlocked this project.");
  }

  // Get current credit balance
  const balanceRef = ref(db, `users/${contractorUid}/creditBalance`);
  const balanceSnap = await get(balanceRef);
  const currentBalance = (balanceSnap.val() as number) ?? 0;

  if (currentBalance < creditCost) {
    throw new Error(
      `Insufficient credits. You need ${creditCost} credits but have ${currentBalance}.`
    );
  }

  // Get homeownerUid from project
  const homeownerRef = ref(db, `projects/${projectId}/homeownerUid`);
  const homeownerSnap = await get(homeownerRef);
  const homeownerUid = homeownerSnap.val() as string;

  if (!homeownerUid) {
    throw new Error("Project not found.");
  }

  const now = new Date().toISOString();
  const transactionId = push(ref(db, "transactions")).key!;

  const unlockRecord: ProjectUnlock = {
    id: unlockKey,
    contractorUid,
    projectId,
    homeownerUid,
    creditCost,
    unlockedAt: now,
  };

  // Atomic multi-path update
  const updates: Record<string, unknown> = {
    [`users/${contractorUid}/creditBalance`]: currentBalance - creditCost,
    [`unlocks/${unlockKey}`]: unlockRecord,
    [`transactions/${transactionId}`]: {
      id: transactionId,
      contractorUid,
      creditAmount: creditCost,
      cost: 0,
      type: "unlock",
      relatedProjectId: projectId,
      timestamp: now,
    },
  };

  await update(ref(db), updates);
}

/**
 * Get all project IDs that a contractor has unlocked.
 */
export async function getContractorUnlocks(
  contractorUid: string
): Promise<string[]> {
  const unlocksRef = ref(db, "unlocks");
  const snapshot = await get(unlocksRef);

  if (!snapshot.exists()) return [];

  const data = snapshot.val() as Record<string, ProjectUnlock>;
  const projectIds: string[] = [];

  Object.values(data).forEach((unlock) => {
    if (unlock.contractorUid === contractorUid) {
      projectIds.push(unlock.projectId);
    }
  });

  return projectIds;
}

/**
 * Get the private details for a project (only call after verifying unlock).
 */
export async function getProjectPrivateDetails(
  projectId: string
): Promise<ProjectPrivateDetails | null> {
  const detailsRef = ref(db, `projects/${projectId}/privateDetails`);
  const snapshot = await get(detailsRef);

  if (!snapshot.exists()) return null;

  return snapshot.val() as ProjectPrivateDetails;
}

