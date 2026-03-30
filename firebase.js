import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

//firebase config
const firebaseConfig = {
    apiKey: "AIzaSyDBbtlkqF_CkQGdcNU10senOniW3cgPmCs",
    authDomain: "image-gallery-2748a.firebaseapp.com",
    projectId: "image-gallery-2748a",
    storageBucket: "image-gallery-2748a.firebasestorage.app",
    messagingSenderId: "791757901948",
    appId: "1:791757901948:web:c37632e8577102d95039f9",
    measurementId: "G-VV38EKG4QK"
};

//initialized firebase  
const app = initializeApp(firebaseConfig)
const db = getFirestore(app)



export { db }