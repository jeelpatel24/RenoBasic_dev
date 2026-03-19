"use client";

import { useState } from "react";
import { HiStar } from "react-icons/hi";

interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  readonly?: boolean;
  size?: number;
}

const LABELS = ["", "Poor", "Fair", "Good", "Very Good", "Excellent"];

export function StarRating({
  value,
  onChange,
  readonly = false,
  size = 20,
}: StarRatingProps) {
  const [hovered, setHovered] = useState(0);
  const displayed = readonly ? value : hovered || value;

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(star)}
          onMouseEnter={() => !readonly && setHovered(star)}
          onMouseLeave={() => !readonly && setHovered(0)}
          className={readonly ? "cursor-default" : "cursor-pointer focus:outline-none"}
          aria-label={`${star} star${star !== 1 ? "s" : ""}`}
        >
          <HiStar
            size={size}
            className={displayed >= star ? "text-amber-400" : "text-gray-300"}
          />
        </button>
      ))}
      {!readonly && value > 0 && (
        <span className="ml-2 text-sm text-orange-600 font-medium">
          {LABELS[value]}
        </span>
      )}
    </div>
  );
}
