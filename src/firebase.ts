// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDuaeG8lAp28KfLP85KNnMGRcUUTdb_Dbc",
  authDomain: "wildguard-95639.firebaseapp.com",
  projectId: "wildguard-95639",
  storageBucket: "wildguard-95639.firebasestorage.app",
  messagingSenderId: "1047643389054",
  appId: "1:1047643389054:web:b693304b112ba4e341ac2f",
  measurementId: "G-VGM9L738L0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);
export const auth = getAuth(app);
