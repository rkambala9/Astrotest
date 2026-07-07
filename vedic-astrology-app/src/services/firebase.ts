import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getFunctions, Functions } from 'firebase/functions';

/**
 * SECURITY NOTE: these values come from environment config (app.config.ts / EAS secrets),
 * never hardcoded. Firebase web config is not itself a secret (it's safe to ship in a
 * client), but real access control is enforced by Firestore Security Rules and
 * Cloud Functions — never by hiding this config.
 */
function getRequiredEnvVar(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing required env var ${name}. Check your .env / EAS secrets.`);
  }
  return value;
}

const firebaseConfig = {
  apiKey: getRequiredEnvVar(
    'EXPO_PUBLIC_FIREBASE_API_KEY',
    process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  ),
  authDomain: getRequiredEnvVar(
    'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
    process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  ),
  projectId: getRequiredEnvVar(
    'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
    process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  ),
  storageBucket: getRequiredEnvVar(
    'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET',
    process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  ),
  messagingSenderId: getRequiredEnvVar(
    'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
    process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  ),
  appId: getRequiredEnvVar('EXPO_PUBLIC_FIREBASE_APP_ID', process.env.EXPO_PUBLIC_FIREBASE_APP_ID),
};

const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);
export const functions: Functions = getFunctions(app);

export default app;
