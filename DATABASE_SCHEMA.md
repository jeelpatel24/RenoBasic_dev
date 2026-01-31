# RenoBasics - Firebase Realtime Database Schema

## Collections Overview

### 1. users/{uid}
Stores all user profiles (homeowners, contractors, admins).

```json
{
  "uid": "string - Firebase Auth UID",
  "email": "string - User email",
  "fullName": "string - Full name",
  "phone": "string - Phone number",
  "role": "string - 'homeowner' | 'contractor' | 'admin'",
  "profilePicture": "string (optional) - Firebase Storage URL",
  "createdAt": "string - ISO 8601 timestamp",
  "updatedAt": "string - ISO 8601 timestamp",

  // Contractor-specific fields:
  "companyName": "string - Business name",
  "contactName": "string - Primary contact",
  "businessNumber": "string - CRA Business Number (BN)",
  "obrNumber": "string - Ontario Business Registry number",
  "verificationStatus": "string - 'pending' | 'approved' | 'rejected'",
  "verifiedDate": "string (optional) - ISO 8601 timestamp",
  "adminNotes": "string (optional) - Admin review notes",
  "creditBalance": "number - Current credit balance"
}
```

### 2. projects/{projectId}
Renovation project listings created by homeowners.

```json
{
  "id": "string - Auto-generated project ID",
  "homeownerUid": "string - UID of homeowner who created it",
  "category": "string - 'kitchen' | 'bathroom' | 'basement' | 'roofing' | 'flooring' | 'painting' | 'plumbing' | 'electrical' | 'landscaping' | 'general' | 'addition' | 'deck_patio' | 'windows_doors' | 'hvac' | 'other'",
  "budgetRange": "string - 'under_5000' | '5000_15000' | '15000_30000' | '30000_50000' | 'over_50000'",
  "timeline": "string - Expected project timeline",
  "city": "string - City-level location only",
  "description": "string - Detailed project description",
  "photos": ["string - Firebase Storage URLs"],
  "creditCost": "number - Credits required to unlock (2-10 based on budget)",
  "viewCount": "number - Number of contractor views",
  "createdAt": "string - ISO 8601 timestamp",
  "updatedAt": "string - ISO 8601 timestamp"
}
```

### 3. transactions/{transactionId}
Credit purchase and usage transactions.

```json
{
  "id": "string - Auto-generated transaction ID",
  "contractorUid": "string - Contractor UID",
  "creditAmount": "number - Credits involved",
  "cost": "number - Dollar amount (for purchases)",
  "stripeTransactionId": "string (optional) - Stripe payment ID",
  "type": "string - 'purchase' | 'unlock' | 'refund'",
  "relatedProjectId": "string (optional) - Project ID for unlocks",
  "timestamp": "string - ISO 8601 timestamp"
}
```

### 4. conversations/{conversationId}
Messaging conversations between homeowners and contractors.

```json
{
  "id": "string - Auto-generated conversation ID",
  "homeownerUid": "string - Homeowner UID",
  "contractorUid": "string - Contractor UID",
  "projectId": "string - Related project ID",
  "messages": {
    "{messageId}": {
      "id": "string - Message ID",
      "senderId": "string - UID of sender",
      "content": "string - Message text",
      "timestamp": "string - ISO 8601 timestamp",
      "read": "boolean - Read status"
    }
  },
  "lastMessageTimestamp": "string - ISO 8601 timestamp",
  "messageCount": "number - Total messages",
  "createdAt": "string - ISO 8601 timestamp"
}
```

### 5. bids/{bidId}
Formal bids submitted by contractors for projects.

```json
{
  "id": "string - Auto-generated bid ID",
  "contractorUid": "string - Contractor UID",
  "projectId": "string - Project ID",
  "itemizedCosts": [
    {
      "description": "string - Line item description",
      "cost": "number - Cost for this item"
    }
  ],
  "totalCost": "number - Sum of all itemized costs",
  "timeline": "string - Proposed timeline",
  "notes": "string - Additional notes",
  "status": "string - 'submitted' | 'accepted' | 'rejected'",
  "submittedAt": "string - ISO 8601 timestamp"
}
```

### 6. unlocks/{unlockId}
Records of project unlocks by contractors.

```json
{
  "id": "string - Unlock record ID",
  "contractorUid": "string - Contractor who unlocked",
  "projectId": "string - Project that was unlocked",
  "creditsSpent": "number - Credits used",
  "timestamp": "string - ISO 8601 timestamp"
}
```

## Security Rules Summary

- **Users**: Can only read/write their own profile. Admins can read/write all.
- **Projects**: Authenticated users can read. Only the homeowner or admin can write.
- **Transactions**: Only the contractor or admin can read. Authenticated users can write.
- **Conversations**: Only participants (homeowner + contractor) or admin can read/write.
- **Bids**: Authenticated users can read/write.
- **Unlocks**: Authenticated users can read/write.

## Index Rules (for efficient querying)

- `projects` indexed on: `homeownerUid`, `category`, `budgetRange`, `createdAt`
- `transactions` indexed on: `contractorUid`, `timestamp`
- `conversations` indexed on: `homeownerUid`, `contractorUid`, `lastMessageTimestamp`
- `bids` indexed on: `contractorUid`, `projectId`, `status`
