import { db } from "@/lib/firebase";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  query,
  where,
  getDocs,
  orderBy,
  writeBatch,
  limit,
} from "firebase/firestore";
import { Bid, BidItem, InvoiceLineItem } from "@/types";

/**
 * Returns an existing bid from this contractor on this project, or null.
 */
export async function getExistingBid(
  contractorUid: string,
  projectId: string
): Promise<Bid | null> {
  const q = query(
    collection(db, "bids"),
    where("contractorUid", "==", contractorUid),
    where("projectId", "==", projectId),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() } as Bid;
}

/**
 * Submit a new bid for a project (invoice format).
 */
export async function submitBid(bidData: {
  contractorUid: string;
  homeownerUid: string;
  projectId: string;
  contractorName: string;
  projectCategory: string;
  // Invoice fields
  companyName?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  lineItems?: InvoiceLineItem[];
  subtotal?: number;
  taxRate?: number;
  taxAmount?: number;
  totalAmount?: number;
  // Legacy / backward-compat fields
  itemizedCosts: BidItem[];
  totalCost: number;
  estimatedTimeline: string;
  notes: string;
}): Promise<string> {
  const bid: Omit<Bid, "id"> = {
    ...bidData,
    status: "submitted",
    submittedAt: new Date().toISOString(),
  };

  const docRef = await addDoc(collection(db, "bids"), bid);
  return docRef.id;
}

/**
 * Update the status of a single bid (use for simple rejection).
 * For accepting a bid, use acceptBid() instead.
 */
export async function updateBidStatus(
  bidId: string,
  status: "submitted" | "accepted" | "rejected"
): Promise<void> {
  const bidRef = doc(db, "bids", bidId);
  await updateDoc(bidRef, { status, updatedAt: new Date().toISOString() });
}

/**
 * Accept a bid in a single atomic batch:
 *  1. Marks this bid as accepted.
 *  2. Rejects all other submitted bids on the same project.
 *  3. Sets the project status to in_progress.
 *
 * Returns an array of auto-rejected contractor info so the caller can
 * send rejection notifications without extra Firestore reads.
 */
export async function acceptBid(
  bidId: string,
  projectId: string
): Promise<Array<{ contractorUid: string; contractorName: string; projectCategory: string }>> {
  const now = new Date().toISOString();

  // Fetch sibling submitted bids before opening the batch.
  const siblingsSnap = await getDocs(
    query(
      collection(db, "bids"),
      where("projectId", "==", projectId),
      where("status", "==", "submitted")
    )
  );

  const batch = writeBatch(db);

  // Accept the chosen bid.
  batch.update(doc(db, "bids", bidId), { status: "accepted", updatedAt: now });

  // Reject every other submitted bid on this project.
  const rejected: Array<{ contractorUid: string; contractorName: string; projectCategory: string }> = [];
  siblingsSnap.forEach((d) => {
    if (d.id === bidId) return;
    batch.update(d.ref, { status: "rejected", updatedAt: now });
    const data = d.data();
    rejected.push({
      contractorUid: data.contractorUid,
      contractorName: data.contractorName,
      projectCategory: data.projectCategory,
    });
  });

  // Move the project to in_progress.
  batch.update(doc(db, "projects", projectId), {
    status: "in_progress",
    updatedAt: now,
  });

  await batch.commit();
  return rejected;
}

/**
 * Withdraw (delete) a bid. Throws if the bid is not in "submitted" status
 * so a race condition between accept and withdraw cannot corrupt project state.
 */
export async function withdrawBid(bidId: string): Promise<void> {
  const bidRef = doc(db, "bids", bidId);
  const snap = await getDoc(bidRef);
  if (!snap.exists()) throw new Error("Bid not found.");
  const status = snap.data()?.status as string | undefined;
  if (status !== "submitted") {
    throw new Error(
      `This bid has already been ${status} and cannot be withdrawn.`
    );
  }
  await deleteDoc(bidRef);
}

/**
 * Get all bids for a specific project.
 */
export async function getBidsForProject(projectId: string): Promise<Bid[]> {
  const q = query(
    collection(db, "bids"),
    where("projectId", "==", projectId),
    orderBy("submittedAt", "desc")
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  } as Bid));
}

/**
 * Get all bids submitted by a contractor.
 */
export async function getContractorBids(contractorUid: string): Promise<Bid[]> {
  const q = query(
    collection(db, "bids"),
    where("contractorUid", "==", contractorUid),
    orderBy("submittedAt", "desc")
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  } as Bid));
}

/**
 * Get all bids for a homeowner's projects.
 */
export async function getHomeownerBids(homeownerUid: string): Promise<Bid[]> {
  const q = query(
    collection(db, "bids"),
    where("homeownerUid", "==", homeownerUid),
    orderBy("submittedAt", "desc")
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  } as Bid));
}

