// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
    getAuth,
    GoogleAuthProvider,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
    getFirestore,
    enableNetwork,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyDBsPg0voe6kXZ8iRAF2HTeuaIeSfEXmho",
    authDomain: "rpgym-5428a.firebaseapp.com",
    projectId: "rpgym-5428a",
    storageBucket: "rpgym-5428a.firebasestorage.app",
    messagingSenderId: "119362722802",
    appId: "1:119362722802:web:b93a3153e58b077c4ca96b",
    measurementId: "G-MSLMEBEN8H",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const db = getFirestore(app, "rpgym-db");

/* 🔧 SOLO PARA DEBUG */
enableNetwork(db).catch(console.error);
