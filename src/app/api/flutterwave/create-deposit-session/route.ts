'use server';

import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Accept payload and normalize/trim strings
    const amountRaw = body?.amount;
    const currencyRaw = body?.currency;
    const userIdRaw = body?.userId;
    const emailRaw = body?.email;
    const fullNameRaw = body?.fullName;
    const phoneNumberRaw = body?.phoneNumber;

    const amount = typeof amountRaw === 'string' ? Number(amountRaw) : Number(amountRaw);
    const currency = (currencyRaw ?? 'NGN').toString().trim().toUpperCase(); // default NGN
    const userId = (userIdRaw ?? '').toString().trim();
    const email = (emailRaw ?? '').toString().trim();
    const fullName = (fullNameRaw ?? '').toString().trim();
    const phoneNumber = (phoneNumberRaw ?? '').toString().trim();

    // REQUIRED (do NOT block deposits because of missing name/phone)
    if (!amount || Number.isNaN(amount) || amount < 1 || !userId || !email) {
      return NextResponse.json(
        { message: 'Missing required deposit information. Please try again.' },
        { status: 400 }
      );
    }

    // Optional fields: provide safe fallbacks
    const safeFullName = fullName || 'Customer';
    const safePhoneNumber = phoneNumber || '00000000000';

    // Ensure Secret Key is in your environment variables
    const FLUTTERWAVE_SECRET_KEY = process.env.FLUTTERWAVE_SECRET_KEY;
    if (!FLUTTERWAVE_SECRET_KEY) {
      console.error('FATAL: Flutterwave secret key is not set in server environment variables.');
      return NextResponse.json(
        { message: 'Server configuration error: Payment provider not configured.' },
        { status: 500 }
      );
    }

    // APP URL for redirect (MUST exist)
    const APP_URL = process.env.NEXT_PUBLIC_APP_URL?.toString().trim();
    if (!APP_URL) {
      console.error('FATAL: NEXT_PUBLIC_APP_URL is not set.');
      return NextResponse.json(
        { message: 'Server configuration error: App URL not configured.' },
        { status: 500 }
      );
    }

    // Generate a unique, trackable transaction reference
    const tx_ref = `${userId}_${Date.now()}`;

    // Call Flutterwave server-side to create a payment link
    const flutterwaveApiUrl = 'https://api.flutterwave.com/v3/payments';

    const payload = {
      tx_ref,
      amount: amount.toString(), // Flutterwave accepts string well
      currency,
      redirect_url: `${APP_URL.replace(/\/$/, '')}/payment-status?tx_ref=${encodeURIComponent(
        tx_ref
      )}`,
      customer: {
        email,
        phonenumber: safePhoneNumber,
        name: safeFullName,
      },

      // ✅ IMPORTANT: META so webhook can credit correct user
      meta: {
        user_id: userId,
        app_user_id: userId, // extra backup key
      },

      customizations: {
        title: 'Eco Solar Investment Deposit',
        description: 'Fund your EcoSolar wallet',
        logo: 'https://firebasestorage.googleapis.com/v0/b/eco-solar-investments.appspot.com/o/ecosolar_logo.png?alt=media&token=e9d9a046-1c39-4d64-ba46-17634e06c117',
      },
    };

    // Debug logs (safe — doesn’t print secret key)
    console.log('CreateDepositSession payload:', {
      tx_ref,
      amount: payload.amount,
      currency: payload.currency,
      redirect_url: payload.redirect_url,
      email,
      hasFullName: Boolean(fullName),
      hasPhoneNumber: Boolean(phoneNumber),
      meta: payload.meta,
    });

    const apiResponse = await fetch(flutterwaveApiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const responseData = await apiResponse.json();

    console.log('Flutterwave response:', responseData);

    if (responseData?.status !== 'success' || !responseData?.data?.link) {
      console.error('Flutterwave API error:', responseData);
      return NextResponse.json(
        { message: responseData?.message || 'Could not create payment link.' },
        { status: 500 }
      );
    }

    // Return the checkout URL to the frontend for immediate redirect
    return NextResponse.json({ checkout_url: responseData.data.link });
  } catch (error: any) {
    console.error('Create Deposit Session Error:', error);
    return NextResponse.json({ message: 'An internal server error occurred.' }, { status: 500 });
  }
}
