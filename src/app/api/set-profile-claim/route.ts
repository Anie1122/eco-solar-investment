
'use server';
import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth } from '@/lib/firebase-admin';
import { headers } from 'next/headers';


export async function POST(req: NextRequest) {
  try {
    // Use the singleton instance of the auth service
    const auth = getAdminAuth();
    const authorization = headers().get('Authorization');
    if (!authorization?.startsWith('Bearer ')) {
      return NextResponse.json({ status: 'error', message: 'Unauthorized: No token provided.' }, { status: 401 });
    }
    
    const idToken = authorization.split('Bearer ')[1];
    if (!idToken) {
       return NextResponse.json({ status: 'error', message: 'Unauthorized: Invalid token format.' }, { status: 401 });
    }

    // Verify the ID token to get the user's UID
    const decodedToken = await auth.verifyIdToken(idToken);
    const uid = decodedToken.uid;

    // Set the custom claim
    await auth.setCustomUserClaims(uid, { profileComplete: true });

    return NextResponse.json({ status: 'success', message: 'Custom claim set successfully.' });

  } catch (error: any) {
    console.error('Error setting custom claim:', error);
    let message = 'An internal server error occurred.';
    if(error.code === 'auth/id-token-expired' || error.code === 'auth/argument-error') {
        message = 'Unauthorized: Invalid or expired token.';
        return NextResponse.json({ status: 'error', message }, { status: 401 });
    }
    if(error.message.includes('Firebase Admin SDK not initialized')) {
        return NextResponse.json({ status: 'error', message: 'Server configuration error.' }, { status: 500 });
    }
    return NextResponse.json({ status: 'error', message }, { status: 500 });
  }
}
