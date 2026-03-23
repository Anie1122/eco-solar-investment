import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Firestore } from 'firebase/firestore';

const DEFAULT_USER_DATA = {
  fullName: '',
  phoneNumber: '',
  country: 'Nigeria',
  countryCode: 'NG',
  currency: 'USDT',
  walletBalance: 0,
  bonusBalance: 1.5,
  hasInvested: false,
  profileCompleted: false,
  createdAt: serverTimestamp(),
};

export async function ensureUserDoc(
  firestore: Firestore,
  uid: string,
  email?: string
) {
  const ref = doc(firestore, 'users', uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    await setDoc(ref, {
      ...DEFAULT_USER_DATA,
      email: email ?? '',
    });
    return;
  }

  const data = snap.data();
  const updates: any = {};

  for (const key in DEFAULT_USER_DATA) {
    if (data[key] === undefined) {
      updates[key] = DEFAULT_USER_DATA[key];
    }
  }

  if (Object.keys(updates).length > 0) {
    await updateDoc(ref, updates);
  }
}
