import { db } from "@/lib/firebase";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  getDocs,
  orderBy,
} from "firebase/firestore";
import { Bid, BidItem } from "@/types";

/**
 * Submit a new bid for a project.
 */
export async function submitBid(bidData: {
  contractorUid: string;
  homeownerUid: string;
  projectId: string;
  contractorName: string;
  projectCategory: string;
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
 * Update the status of a bid.
 */
export async function updateBidStatus(
  bidId: string,
  status: "submitted" | "accepted" | "rejected"
): Promise<void> {
  const bidRef = doc(db, "bids", bidId);
  await updateDoc(bidRef, { status });
}

/**
 * Withdraw (delete) a submitted bid. Only allowed when status is "submitted".
 */
export async function withdrawBid(bidId: string): Promise<void> {
  await deleteDoc(doc(db, "bids", bidId));
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

