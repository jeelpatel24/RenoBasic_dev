"use client";

import { useState } from "react";
import { HiX } from "react-icons/hi";
import { StarRating } from "./StarRating";
import { submitReview } from "@/lib/reviews";
import { createNotification } from "@/lib/notifications";
import { Review } from "@/types";
import toast from "react-hot-toast";

interface ReviewModalProps {
  bid: {
    id: string;
    contractorUid: string;
    contractorName: string;
    projectId: string;
    projectCategory: string;
  };
  homeownerUid: string;
  homeownerName: string;
  onClose: () => void;
  onSubmitted: () => void;
}

export function ReviewModal({
  bid,
  homeownerUid,
  homeownerName,
  onClose,
  onSubmitted,
}: ReviewModalProps) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error("Please select a star rating.");
      return;
    }
    setLoading(true);
    try {
      const review: Omit<Review, "id"> = {
        contractorUid: bid.contractorUid,
        homeownerUid,
        homeownerName,
        projectId: bid.projectId,
        bidId: bid.id,
        rating,
        comment: comment.trim(),
        projectCategory: bid.projectCategory,
        contractorName: bid.contractorName,
        createdAt: new Date().toISOString(),
      };
      await submitReview(review);
      // Notify the contractor they received a new review
      await createNotification({
        recipientUid: bid.contractorUid,
        type: "new_review",
        title: "New Review Received!",
        message: `${homeownerName} rated you ${rating} star${rating !== 1 ? "s" : ""} for ${bid.projectCategory}.`,
        relatedId: bid.projectId,
        read: false,
        createdAt: new Date().toISOString(),
      });
      toast.success("Review submitted!");
      onSubmitted();
      onClose();
    } catch {
      toast.error("Failed to submit review. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Rate Your Contractor</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <HiX size={20} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Contractor info */}
          <div className="bg-orange-50 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-0.5">Contractor</p>
            <p className="font-semibold text-gray-900">{bid.contractorName}</p>
            <p className="text-xs text-orange-600 mt-0.5">{bid.projectCategory}</p>
          </div>

          {/* Star rating */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-3">
              Your Rating <span className="text-red-500">*</span>
            </p>
            <StarRating value={rating} onChange={setRating} size={36} />
          </div>

          {/* Comment */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">
              Comment{" "}
              <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Share your experience with this contractor..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
            />
            <p className="text-xs text-gray-400 text-right mt-1">
              {comment.length}/500
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 px-6 pb-6">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || rating === 0}
            className="flex-1 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Submitting..." : "Submit Review"}
          </button>
        </div>
      </div>
    </div>
  );
}
