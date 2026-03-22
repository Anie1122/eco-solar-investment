import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Firestore } from 'firebase/firestore';
import { getSignupBonusUsdtToday } from '@/lib/bonus';

async function buildDefaultUserData() {
  const bonusUsdt = await getSignupBonusUsdtToday();
  return {
    fullName: '',
    phoneNumber: '',
    country: 'Nigeria',
    countryCode: 'NG',
    currency: 'USDT',
    walletBalance: 0,
    bonusBalance: bonusUsdt,
    hasInvested: false,
    profileCompleted: false,
    createdAt: serverTimestamp(),
  };
}

export async function ensureUserDoc(
  firestore: Firestore,
  uid: string,
  email?: string
) {
  const ref = doc(firestore, 'users', uid);
  const snap = await getDoc(ref);
  const defaultData = await buildDefaultUserData();

  if (!snap.exists()) {
    await setDoc(ref, {
      ...defaultData,
      email: email ?? '',
    });
    return;
  }

  const data = snap.data();
  const updates: any = {};

  for (const key in defaultData) {
    if (data[key] === undefined) {
      updates[key] = defaultData[key as keyof typeof defaultData];
    }
  }

  if (Object.keys(updates).length > 0) {
    await updateDoc(ref, updates);
  }
}
