import { initializeApp } from "firebase/app";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import {
  getDatabase,
  ref,
  get,
  set,
  remove,
  onValue,
  off,
  type DatabaseReference,
} from "firebase/database";
import { getStorage } from "firebase/storage";
import {
  getFunctions,
  httpsCallable,
  connectFunctionsEmulator,
} from "firebase/functions";

const firebaseConfig = {
  apiKey: "AIzaSyCWG9eoXnEkhN5srPvi4vtNzNkaonebjP8",
  authDomain: "lumeria-invoicing.firebaseapp.com",
  databaseURL: "https://lumeria-invoicing-default-rtdb.firebaseio.com",
  projectId: "lumeria-invoicing",
  storageBucket: "lumeria-invoicing.firebasestorage.app",
  messagingSenderId: "399679393435",
  appId: "1:399679393435:web:61ed75acf74203b512803e",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);
export const storage = getStorage(app);
export const functions = getFunctions(app, "us-central1");

// Wire the Functions SDK to the local emulator in dev so confirmations can be
// smoke-tested without burning through Resend quota. Controlled by a separate
// env flag so that `npm run dev` against the real backend is still possible.
if (
  import.meta.env.DEV &&
  import.meta.env.VITE_USE_FUNCTIONS_EMULATOR === "true"
) {
  connectFunctionsEmulator(functions, "127.0.0.1", 5001);
}

export {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  ref,
  get,
  set,
  remove,
  onValue,
  off,
  httpsCallable,
};
export type { User, DatabaseReference };
