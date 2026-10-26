import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID
};

const requiredConfig = {
  REACT_APP_FIREBASE_API_KEY: firebaseConfig.apiKey,
  REACT_APP_FIREBASE_AUTH_DOMAIN: firebaseConfig.authDomain,
  REACT_APP_FIREBASE_PROJECT_ID: firebaseConfig.projectId,
  REACT_APP_FIREBASE_APP_ID: firebaseConfig.appId
};

const missingConfig = Object.entries(requiredConfig)
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missingConfig.length > 0) {
  throw new Error(
    `Missing Firebase configuration: ${missingConfig.join(", ")}. ` +
    "Add these values to a .env file in the project root and restart the development server."
  );
}

// Initialize Firebase
let app;
let auth;
let db;
let analytics;

const initializeFirebase = () => {
  if (!app) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    
    // Only initialize analytics in production
    if (process.env.NODE_ENV === 'production') {
      analytics = getAnalytics(app);
    }
  }
  return { app, auth, db, analytics };
};

// Initialize Firebase and export the instances
const { app: firebaseApp, auth: firebaseAuth, db: firebaseDb, analytics: firebaseAnalytics } = initializeFirebase();

export { firebaseApp as app, firebaseAuth as auth, firebaseDb as db, firebaseAnalytics as analytics }; 