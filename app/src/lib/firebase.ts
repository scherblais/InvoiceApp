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
};
export type { User, DatabaseReference };
