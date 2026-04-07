import { db } from "@/lib/firebase";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  query,
  where,
  getDocs,
  onSnapshot,
  Unsubscribe,
  orderBy,
  limit,
} from "firebase/firestore";
import { Review } from "@/types";

/** Returns { count, average } rating summary for a contractor. */
export async function getContractorRatingSummary(
  contractorUid: string
): Promise<{ count: number; average: number }> {
  const q = query(
    collection(db, "reviews"),
    where("contractorUid", "==", contractorUid)
  );
  const snap = await getDocs(q);
  if (snap.empty) return { count: 0, average: 0 };
  const ratings = snap.docs.map((d) => (d.data().rating as number | undefined) ?? 0);
  const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
  return { count: ratings.length, average: avg };
}

/** Submit a new review. Returns the new document ID. */
export async function submitReview(data: Omit<Review, "id">): Promise<string> {
  const docRef = await addDoc(collection(db, "reviews"), data);
  return docRef.id;
}

/**
 * Returns a Set of bidIds that this homeowner has already reviewed.
 * Used to show "Reviewed ✓" instead of "Leave Review" on bids.
 */
export async function getHomeownerReviewedBidIds(
  homeownerUid: string
): Promise<Set<string>> {
  const q = query(
    collection(db, "reviews"),
    where("homeownerUid", "==", homeownerUid)
  );
  const snap = await getDocs(q);
  return new Set(
    snap.docs
      .map((d) => d.data().bidId as string | undefined)
      .filter((id): id is string => !!id)
  );
}

/** One-time fetch of a contractor's reviews (newest first). Used by admin. */
export async function getContractorReviewsOnce(
  contractorUid: string
): Promise<Review[]> {
  const q = query(
    collection(db, "reviews"),
    where("contractorUid", "==", contractorUid),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Review));
}

/** Delete a review by ID. Admin only. */
export async function deleteReview(reviewId: string): Promise<void> {
  await deleteDoc(doc(db, "reviews", reviewId));
}

/** Real-time subscription to a contractor's reviews (newest first). */
export function subscribeToContractorReviews(
  contractorUid: string,
  callback: (reviews: Review[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const q = query(
    collection(db, "reviews"),
    where("contractorUid", "==", contractorUid),
    orderBy("createdAt", "desc"),
    limit(50)
  );
  return onSnapshot(
    q,
    (snap) =>
      callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Review))),
    (error) => {
      console.error("Error fetching reviews:", error);
      onError?.(error);
    }
  );
}
