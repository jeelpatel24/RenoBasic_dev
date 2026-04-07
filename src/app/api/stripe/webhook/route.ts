// ---------------------------------------------------------------------------
// Stripe Webhook — POST /api/stripe/webhook
// ---------------------------------------------------------------------------
// Listens for `checkout.session.completed` events and atomically adds
// purchased credits to the contractor's Firestore account.
//
// Security:
//   - Every request is verified against the Stripe webhook signing secret
//     before any database write occurs.
//   - Uses Firebase Admin SDK so Firestore security rules do not apply
//     (admin bypasses rules, which is safe for trusted server code).
//
// Required env vars:
//   STRIPE_SECRET_KEY           — Stripe secret key (sk_test_... / sk_live_...)
//   STRIPE_WEBHOOK_SECRET       — Signing secret from the webhook endpoint (whsec_...)
//   STRIPE_PRICE_STARTER        — price_... for 10-credit pack
//   STRIPE_PRICE_STANDARD       — price_... for 15-credit pack
//   STRIPE_PRICE_PRO            — price_... for 30-credit pack
//   STRIPE_PRICE_ENTERPRISE     — price_... for 60-credit pack
//   FIREBASE_SERVICE_ACCOUNT    — Service account JSON (single-line string)
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getAdminDb } from "@/lib/firebase-admin";

// Prevent Next.js from statically pre-rendering this route.
export const dynamic = "force-dynamic";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// Maps each Stripe Price ID → credits to award.
// Built inside the handler so env vars are guaranteed available at request time.
function buildPriceMap(): Record<string, number> {
  const map: Record<string, number> = {};
  const entries: [string | undefined, number][] = [
    [process.env.STRIPE_PRICE_STARTER,    10],
    [process.env.STRIPE_PRICE_STANDARD,   15],
    [process.env.STRIPE_PRICE_PRO,        30],
    [process.env.STRIPE_PRICE_ENTERPRISE, 60],
  ];
  for (const [priceId, credits] of entries) {
    if (priceId) map[priceId] = credits;
  }
  return map;
}

export async function POST(request: NextRequest) {
  // ── 1. Read raw body (required for signature verification) ──────────────
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  // ── 2. Verify Stripe signature ──────────────────────────────────────────
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch {
    // Invalid signature — reject immediately (do not process)
    return NextResponse.json(
      { error: "Webhook signature verification failed" },
      { status: 400 }
    );
  }

  // ── 3. Handle checkout.session.completed ────────────────────────────────
  const PRICE_CREDITS = buildPriceMap();

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    // client_reference_id is set to the contractor's Firebase UID by the
    // buy-credits page when constructing the Payment Link URL.
    const uid = session.client_reference_id;
    if (!uid) {
      console.error("[Stripe Webhook] No client_reference_id in session:", session.id);
      // Return 200 so Stripe doesn't retry — this session has no user context.
      return NextResponse.json({ received: true });
    }

    // Fetch the purchased price ID from the session line items.
    const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
      limit: 1,
    });
    const priceId = lineItems.data[0]?.price?.id;

    if (!priceId || PRICE_CREDITS[priceId] === undefined) {
      console.error("[Stripe Webhook] Unknown price ID:", priceId, "Session:", session.id);
      return NextResponse.json({ received: true });
    }

    const creditsToAdd = PRICE_CREDITS[priceId];
    const amountPaid = (session.amount_total ?? 0) / 100; // pence/cents → dollars

    // ── 4. Atomically credit the user's account ──────────────────────────
    try {
      const db = getAdminDb();
      const userRef = db.collection("users").doc(uid);
      const txRef = db.collection("transactions").doc();

      await db.runTransaction(async (tx) => {
        const userDoc = await tx.get(userRef);
        if (!userDoc.exists) {
          throw new Error(`User document not found for uid: ${uid}`);
        }

        const currentBalance = (userDoc.data()?.creditBalance as number) ?? 0;

        tx.update(userRef, {
          creditBalance: currentBalance + creditsToAdd,
          updatedAt: new Date().toISOString(),
        });

        tx.set(txRef, {
          contractorUid: uid,
          creditAmount: creditsToAdd,
          cost: amountPaid,
          type: "purchase",
          stripeSessionId: session.id,
          stripePriceId: priceId,
          timestamp: new Date().toISOString(),
        });
      });

      console.log(
        `[Stripe Webhook] +${creditsToAdd} credits → uid:${uid} | session:${session.id}`
      );
    } catch (err) {
      console.error("[Stripe Webhook] Firestore transaction failed:", err);
      // Return 500 so Stripe retries the webhook.
      return NextResponse.json(
        { error: "Database update failed" },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ received: true });
}
