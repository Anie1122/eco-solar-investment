import { NextResponse } from "next/server";
import { getFirestore } from "firebase-admin/firestore";
import { initializeApp, getApps, cert } from "firebase-admin/app";

function getAdminDb() {
  if (!getApps().length) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

    // IMPORTANT: don’t throw during build; throw only when actually called
    if (!projectId || !clientEmail || !privateKey) {
      throw new Error("Missing Firebase Admin env vars");
    }

    initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
    });
  }

  return getFirestore();
}

export async function POST(req: Request) {
  try {
    const adminKey = req.headers.get("x-admin-key");
    if (!adminKey || adminKey !== process.env.ADMIN_KEY) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const userId = String(body.userId || "");
    const amount = Number(body.amount || 0);

    if (!userId || !Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const db = getAdminDb();
    const userRef = db.collection("users").doc(userId);

    await db.runTransaction(async (tx) => {
      const snap = await tx.get(userRef);
      if (!snap.exists) throw new Error("User not found");

      const currentBalance = Number(snap.data()?.walletBalance || 0);

      tx.update(userRef, {
        walletBalance: currentBalance + amount,
      });
    });

    await userRef.collection("transactions").add({
      amount,
      currency: "NGN",
      transactionType: "admin_credit",
      status: "approved",
      description: "Manual credit by admin",
      transactionDate: new Date(),
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Server error" },
      { status: 500 }
    );
  }
}
