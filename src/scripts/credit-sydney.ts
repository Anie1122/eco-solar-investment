import { config } from 'dotenv';
config({ path: '.env' });

import { getDb } from '../lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

const TARGET_EMAIL = "sydney.sweeney.1997.2025@gmail.com";
const AMOUNT_TO_CREDIT = 100000;
const CURRENCY_TO_CHECK = "KES";

const creditUser = async () => {
  console.log("--- Starting Admin Credit Script ---");
  try {
    // This will initialize the admin SDK using the .env variable
    const db = getDb();
    console.log("Firebase Admin SDK initialized successfully.");

    console.log(`Searching for user with email: ${TARGET_EMAIL}...`);
    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('email', '==', TARGET_EMAIL).limit(1).get();

    if (snapshot.empty) {
      console.error(`\nERROR: No user found with email "${TARGET_EMAIL}". Aborting.\n`);
      return;
    }

    const userDoc = snapshot.docs[0];
    const userRef = userDoc.ref;
    const userData = userDoc.data();

    console.log(`User found: ${userData.fullName} (ID: ${userDoc.id})`);
    
    if (userData.currency !== CURRENCY_TO_CHECK) {
        console.warn(`\nWARNING: User's currency is "${userData.currency}", but you are about to credit an amount assuming it's ${CURRENCY_TO_CHECK}.`);
    }

    console.log(`Current wallet balance: ${userData.walletBalance} ${userData.currency}`);
    console.log(`Attempting to credit ${AMOUNT_TO_CREDIT}...`);

    await userRef.update({
      walletBalance: FieldValue.increment(AMOUNT_TO_CREDIT)
    });

    const updatedDoc = await userRef.get();
    const updatedUserData = updatedDoc.data();

    console.log("\n--- SUCCESS! ---");
    console.log(`Successfully credited ${AMOUNT_TO_CREDIT} to user ${TARGET_EMAIL}.`);
    console.log(`Previous balance: ${userData.walletBalance}`);
    console.log(`New wallet balance: ${updatedUserData?.walletBalance}`);
    console.log("------------------\n");

  } catch (error) {
    console.error("\n--- SCRIPT FAILED ---");
    console.error("An error occurred during the credit operation:", error);
    console.error("Please check your FIREBASE_SERVICE_ACCOUNT_KEY in the .env file and ensure it is valid.");
    console.log("---------------------\n");
  }
};

creditUser().then(() => {
    console.log("Script execution finished.");
}).catch((e) => {
    console.error("A critical error occurred while trying to run the script:", e);
});
