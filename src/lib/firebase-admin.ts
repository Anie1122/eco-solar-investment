
// --- IMPORTANT ---
// This file contains server-only code and should ONLY be imported by server-side files
// (e.g., API routes, server actions). It must never be imported into client components.

import { initializeApp, getApps, App, cert, ServiceAccount } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getAuth, Auth } from 'firebase-admin/auth';

// --- SINGLETON INITIALIZATION ---
// This pattern ensures that the Firebase Admin SDK is initialized only ONCE
// per server instance.

let adminApp: App | null = null;
let firestoreDb: Firestore | null = null;
let adminAuth: Auth | null = null;

function initializeAdmin() {
  // If already initialized, do nothing.
  if (adminApp) {
    return;
  }

  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountKey) {
    // This specific error message will be caught by API routes.
    throw new Error(
      "Firebase Admin SDK not initialized: FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set."
    );
  }

  try {
    const serviceAccount: ServiceAccount = JSON.parse(serviceAccountKey);
    
    // Use getApps() to check for existing apps to prevent re-initialization in hot-reload environments.
    if (!getApps().length) {
       adminApp = initializeApp({
        credential: cert(serviceAccount),
      });
    } else {
      adminApp = getApps()[0];
    }
   
    if (adminApp) {
      firestoreDb = getFirestore(adminApp);
      adminAuth = getAuth(adminApp);
    }

  } catch (e: any) {
    // This catches JSON parsing errors or other cert-related issues.
    throw new Error(
      `Firebase Admin SDK initialization failed: ${e.message}. The service account key might be malformed.`
    );
  }
}

/**
 * Gets the initialized Firestore database instance for the admin app.
 * Throws an error if the Admin SDK has not been initialized, indicating a server configuration problem.
 * @returns {Firestore} The initialized Firestore instance.
 */
export const getDb = (): Firestore => {
  // Attempt to initialize on first call. Subsequent calls will be no-ops if already initialized.
  if (!firestoreDb) {
    initializeAdmin();
  }
  if (!firestoreDb) {
    // This line should theoretically not be reached if initializeAdmin throws, but it's a safeguard.
    throw new Error(
      "Firebase Admin SDK could not be initialized. Firestore is unavailable."
    );
  }
  return firestoreDb;
};

/**
 * Gets the initialized Auth instance for the admin app.
 * Throws an error if the Admin SDK has not been initialized.
 * @returns {Auth} The initialized Auth instance.
 */
export const getAdminAuth = (): Auth => {
    // Attempt to initialize on first call.
    if (!adminAuth) {
      initializeAdmin();
    }
    if (!adminAuth) {
      // Safeguard.
      throw new Error(
        "Firebase Admin SDK could not be initialized. Auth is unavailable."
      );
    }
    return adminAuth;
}
