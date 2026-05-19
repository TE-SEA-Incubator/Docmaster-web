// ===== Configuration Firebase pour Docmaster =====
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";

// Configuration Firebase — les clés sont lues depuis .env
// ⚠️ Nécessite un bundler (Vite) pour que import.meta.env fonctionne
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Initialisation
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Configuration de l'authentification
export const auth = getAuth(app);

// Configuration de la persistance locale
setPersistence(auth, browserLocalPersistence).catch(err => {
  console.warn('Erreur de persistance Firebase:', err);
});

// Provider Google
export const googleProvider = new GoogleAuthProvider();
// Configure Google Login pour demander email et profil
googleProvider.setCustomParameters({
  'prompt': 'select_account'
});

// Exportation des services pour les utiliser ailleurs
export const db = getFirestore(app);
export { app, analytics };