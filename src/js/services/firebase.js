import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

// TODO: Lock Firebase Security Rules before going live — currently open to all reads/writes
// TODO: Move Firebase config values to .env file using Vite's import.meta.env — config is currently hardcoded and visible in source
const firebaseConfig = {
  apiKey: "AIzaSyDBbtlkqF_CkQGdcNU10senOniW3cgPmCs",
  authDomain: "image-gallery-2748a.firebaseapp.com",
  projectId: "image-gallery-2748a",
  storageBucket: "image-gallery-2748a.firebasestorage.app",
  messagingSenderId: "791757901948",
  appId: "1:791757901948:web:c37632e8577102d95039f9",
  measurementId: "G-VV38EKG4QK",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { auth, db };
