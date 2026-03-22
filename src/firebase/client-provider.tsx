'use client';

import React, { useMemo, type ReactNode, useState, useEffect } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  getFirestore,
  enableMultiTabIndexedDbPersistence,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

let firebaseServices: {
  firebaseApp: FirebaseApp;
  auth: ReturnType<typeof getAuth>;
  firestore: ReturnType<typeof getFirestore>;
} | null = null;

function initializeFirebase() {
  if (firebaseServices) return firebaseServices;

  const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  const auth = getAuth(app);

  // ✅ Use the new Firestore cache (recommended) + multi-tab support.
  // This reduces "offline" / stuck issues compared to enableIndexedDbPersistence.
  const firestore =
    typeof window !== 'undefined'
      ? initializeFirestore(app, {
          localCache: persistentLocalCache({
            tabManager: persistentMultipleTabManager(),
          }),
        })
      : getFirestore(app);

  // ✅ Backward safety: if initializeFirestore config fails for any reason,
  // fall back to normal Firestore without caching.
  // (This prevents app crashes)
  const safeFirestore = (() => {
    try {
      return firestore;
    } catch {
      return getFirestore(app);
    }
  })();

  // Optional: keep multi-tab persistence enabled
  if (typeof window !== 'undefined') {
    enableMultiTabIndexedDbPersistence(safeFirestore).catch(() => {
      // Don't block app if persistence fails
    });
  }

  firebaseServices = { firebaseApp: app, auth, firestore: safeFirestore };
  return firebaseServices;
}

export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  const [isInitialized, setIsInitialized] = useState(false);

  const services = useMemo(() => {
    if (typeof window !== 'undefined') return initializeFirebase();
    return null;
  }, []);

  useEffect(() => {
    if (services) setIsInitialized(true);
  }, [services]);

  if (!isInitialized || !services) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <FirebaseProvider
      firebaseApp={services.firebaseApp}
      auth={services.auth}
      firestore={services.firestore}
    >
      {children}
    </FirebaseProvider>
  );
}
