export type UserRole = "homeowner" | "contractor" | "admin";

export type VerificationStatus = "pending" | "approved" | "rejected";

export interface UserBase {
  uid: string;
  email: string;
  fullName: string;
  phone: string;
  role: UserRole;
  profilePicture?: string;
  createdAt: string;
  updatedAt: string;
}

export interface HomeownerUser extends UserBase {
  role: "homeowner";
}

export interface ContractorUser extends UserBase {
  role: "contractor";
  companyName: string;
  contactName: string;
  businessNumber: string;
  obrNumber: string;
  verificationStatus: VerificationStatus;
  verifiedDate?: string;
  adminNotes?: string;
  creditBalance: number;
}

export interface AdminUser extends UserBase {
  role: "admin";
}

export type AppUser = HomeownerUser | ContractorUser | AdminUser;

// ── Project Categories (professional renovation services) ──────────
export type ProjectCategory =
  | "kitchen"
  | "bathroom"
  | "basement"
  | "roofing"
  | "flooring"
  | "painting"
  | "plumbing"
  | "electrical"
  | "landscaping"
  | "general"
  | "addition"
  | "deck_patio"
  | "windows_doors"
  | "hvac"
  | "home_extension"
  | "adu"
  | "garage_conversion"
  | "full_renovation"
  | "commercial"
  | "other";

export const CATEGORY_LABELS: Record<ProjectCategory, string> = {
  kitchen: "Kitchen Renovation",
  bathroom: "Bathroom Renovation",
  basement: "Basement Finishing",
  roofing: "Roofing",
  flooring: "Flooring",
  painting: "Painting",
  plumbing: "Plumbing",
  electrical: "Electrical",
  landscaping: "Landscaping",
  general: "General Renovation",
  addition: "Home Addition",
  deck_patio: "Deck / Patio",
  windows_doors: "Windows & Doors",
  hvac: "HVAC",
  home_extension: "Home Extension",
  adu: "ADU (Accessory Dwelling Unit)",
  garage_conversion: "Garage Conversion",
  full_renovation: "Full House Renovation",
  commercial: "Commercial Renovation",
  other: "Other",
};

// ── Budget Ranges (including large-scale contracts) ────────────────
export type BudgetRange =
  | "under_5000"
  | "5000_15000"
  | "15000_30000"
  | "30000_50000"
  | "50000_100000"
  | "100000_250000"
  | "over_250000";

export const BUDGET_LABELS: Record<BudgetRange, string> = {
  under_5000: "Under $5,000",
  "5000_15000": "$5,000 – $15,000",
  "15000_30000": "$15,000 – $30,000",
  "30000_50000": "$30,000 – $50,000",
  "50000_100000": "$50,000 – $100,000",
  "100000_250000": "$100,000 – $250,000",
  over_250000: "Over $250,000",
};

export const CREDIT_COST_MAP: Record<BudgetRange, number> = {
  under_5000: 2,
  "5000_15000": 3,
  "15000_30000": 5,
  "30000_50000": 7,
  "50000_100000": 10,
  "100000_250000": 15,
  over_250000: 20,
};

// ── Property & Start Date Options ─────────────────────────────────
export type PropertyType = "house" | "condo" | "townhouse" | "commercial" | "other";
export type OwnershipStatus = "own" | "rent" | "property_manager";
export type PreferredStartDate = "immediately" | "within_2_weeks" | "within_month" | "within_3_months" | "flexible";

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  house: "House",
  condo: "Condo / Apartment",
  townhouse: "Townhouse",
  commercial: "Commercial",
  other: "Other",
};

export const OWNERSHIP_STATUS_LABELS: Record<OwnershipStatus, string> = {
  own: "I own this property",
  rent: "I'm renting",
  property_manager: "I'm a property manager",
};

export const START_DATE_LABELS: Record<PreferredStartDate, string> = {
  immediately: "Immediately",
  within_2_weeks: "Within 2 Weeks",
  within_month: "Within a Month",
  within_3_months: "Within 3 Months",
  flexible: "Flexible",
};

export const SCOPE_OF_WORK_OPTIONS = [
  "Demolition",
  "Framing",
  "Drywall",
  "Electrical",
  "Plumbing",
  "Painting",
  "Flooring",
  "Fixture Installation",
  "Cleanup / Disposal",
] as const;

export const PROVINCE_OPTIONS = [
  "Alberta",
  "British Columbia",
  "Manitoba",
  "New Brunswick",
  "Newfoundland and Labrador",
  "Northwest Territories",
  "Nova Scotia",
  "Nunavut",
  "Ontario",
  "Prince Edward Island",
  "Quebec",
  "Saskatchewan",
  "Yukon",
] as const;

// ── Project (public + private split for privacy) ───────────────────
export type ProjectStatus = "open" | "in_progress" | "completed" | "closed";

export interface ProjectPrivateDetails {
  homeownerName: string;
  homeownerEmail: string;
  homeownerPhone: string;
  fullDescription: string;
  streetAddress: string;
  unit: string;
  province: string;
  postalCode: string;
  scopeOfWork: string[];
  hasDrawings: string;
  hasPermits: string;
  materialsProvider: string;
  deadline: string;
  contactPreference: string;
  parkingAvailable: string;
  buildingRestrictions: string;
  photos: string[];
}

export interface Project {
  id: string;
  homeownerUid: string;
  projectTitle: string;
  category: ProjectCategory;
  categoryName: string;
  propertyType: string;
  ownershipStatus: string;
  budgetRange: BudgetRange;
  budgetLabel: string;
  preferredStartDate: string;
  city: string;
  creditCost: number;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
  privateDetails?: ProjectPrivateDetails; // only present when unlocked
}

// ── Project Unlock ─────────────────────────────────────────────────
export interface ProjectUnlock {
  id: string;
  contractorUid: string;
  projectId: string;
  homeownerUid: string;
  creditCost: number;
  unlockedAt: string;
}

// ── Credits ────────────────────────────────────────────────────────
export interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price: number;
  pricePerCredit: number;
}

export interface CreditTransaction {
  id: string;
  contractorUid: string;
  creditAmount: number;
  cost: number;
  stripeTransactionId?: string;
  type: "purchase" | "unlock" | "refund";
  relatedProjectId?: string;
  timestamp: string;
}

// ── Messaging ──────────────────────────────────────────────────────
export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: string;
  read: boolean;
}

export interface Conversation {
  id: string;
  homeownerUid: string;
  contractorUid: string;
  projectId: string;
  homeownerName: string;
  contractorName: string;
  projectCategory: string;
  lastMessage: string;
  lastMessageTimestamp: string;
  messageCount: number;
  createdAt: string;
}

// ── Bidding ────────────────────────────────────────────────────────
export interface Bid {
  id: string;
  contractorUid: string;
  homeownerUid: string;
  projectId: string;
  contractorName: string;
  projectCategory: string;
  itemizedCosts: BidItem[];
  totalCost: number;
  estimatedTimeline: string;
  notes: string;
  status: "submitted" | "accepted" | "rejected";
  submittedAt: string;
}

export interface BidItem {
  description: string;
  cost: number;
}

