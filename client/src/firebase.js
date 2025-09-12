// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, RecaptchaVerifier, connectAuthEmulator } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyD0suzIHgWykfivLAxfqb0qmL5LKrakdzQ",
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "crisprai-3be18.firebaseapp.com",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "crisprai-3be18",
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "crisprai-3be18.firebasestorage.app",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "486222253640",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:486222253640:web:bb674225703e86a3e8127d"
};

let app;
let auth;

try {
  // Initialize Firebase
  app = initializeApp(firebaseConfig);
  
  // Initialize Firebase Authentication and get a reference to the service
  auth = getAuth(app);
  
  // Only connect to emulator in development if needed
  // Uncomment the line below if you're using Firebase Auth emulator in development
  // if (process.env.NODE_ENV === 'development') {
  //   connectAuthEmulator(auth, "http://localhost:9099");
  // }
  
  console.log('Firebase initialized successfully');
} catch (error) {
  console.error('Firebase initialization error:', error);
  // Re-throw the error so the app can handle it appropriately
  throw new Error(`Firebase initialization failed: ${error.message}`);
}

// Export auth instance
export { auth };

// Initialize reCAPTCHA verifier with better error handling
export const initializeRecaptcha = (elementId = 'recaptcha-container') => {
  try {
    if (!auth) {
      throw new Error('Firebase Auth not initialized');
    }
    
    // Clear any existing reCAPTCHA
    const container = document.getElementById(elementId);
    if (container) {
      container.innerHTML = '';
    }
    
    return new RecaptchaVerifier(auth, elementId, {
      size: 'normal', // Changed from 'invisible' to 'normal' for better compatibility
      callback: (response) => {
        console.log('reCAPTCHA solved successfully');
      },
      'expired-callback': () => {
        console.warn('reCAPTCHA expired - please refresh');
      },
      'error-callback': (error) => {
        console.error('reCAPTCHA error:', error);
      }
    });
  } catch (error) {
    console.error('Failed to initialize reCAPTCHA:', error);
    throw error;
  }
};

// Helper function to check if Firebase is ready
export const isFirebaseReady = () => {
  return app && auth;
};

// Helper function to get Firebase app config (for debugging)
export const getFirebaseConfig = () => {
  return {
    projectId: firebaseConfig.projectId,
    authDomain: firebaseConfig.authDomain,
    isReady: isFirebaseReady()
  };
};

export default app;
