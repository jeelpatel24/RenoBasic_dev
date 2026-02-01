import { db } from "@/lib/firebase";
import { ref, get, push, set, update } from "firebase/database";
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
  const bidsRef = ref(db, "bids");
  const newBidRef = push(bidsRef);
  const bidId = newBidRef.key!;

  const bid: Bid = {
    id: bidId,
    ...bidData,
    status: "submitted",
    submittedAt: new Date().toISOString(),
  };

  await set(newBidRef, bid);
  return bidId;
}

/**
 * Update the status of a bid.
 */
export async function updateBidStatus(
  bidId: string,
  status: "submitted" | "accepted" | "rejected"
): Promise<void> {
  const bidRef = ref(db, `bids/${bidId}`);
  await update(bidRef, { status });
}

/**
 * Get all bids for a specific project.
 */
export async function getBidsForProject(projectId: string): Promise<Bid[]> {
  const bidsRef = ref(db, "bids");
  const snapshot = await get(bidsRef);

  if (!snapshot.exists()) return [];

  const data = snapshot.val() as Record<string, Bid>;
  return Object.values(data).filter((bid) => bid.projectId === projectId);
}

/**
 * Get all bids submitted by a contractor.
 */
export async function getContractorBids(contractorUid: string): Promise<Bid[]> {
  const bidsRef = ref(db, "bids");
  const snapshot = await get(bidsRef);

  if (!snapshot.exists()) return [];

  const data = snapshot.val() as Record<string, Bid>;
  return Object.values(data)
    .filter((bid) => bid.contractorUid === contractorUid)
    .sort(
      (a, b) =>
        new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
    );
}

/**
 * Get all bids for a homeowner's projects.
 */
export async function getHomeownerBids(homeownerUid: string): Promise<Bid[]> {
  const bidsRef = ref(db, "bids");
  const snapshot = await get(bidsRef);

  if (!snapshot.exists()) return [];

  const data = snapshot.val() as Record<string, Bid>;
  return Object.values(data)
    .filter((bid) => bid.homeownerUid === homeownerUid)
    .sort(
      (a, b) =>
        new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
    );
}

