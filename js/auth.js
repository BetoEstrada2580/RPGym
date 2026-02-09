import { auth, provider, db } from "./firebase.js";

import {
    signInWithPopup,
    signOut,
    onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

import {
    doc,
    getDoc,
    setDoc,
    serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const loginBtn = document.getElementById("btnGoogleLogin");
const logoutBtn = document.getElementById("btnLogout");
const navbar = document.getElementById("app-navbar");

/* =====================
    LOGIN CON GOOGLE
===================== */
loginBtn?.addEventListener("click", async () => {
    try {
        await signInWithPopup(auth, provider);
    } catch (e) {
        console.error("Error login:", e);
        alert("Error al iniciar sesión");
    }
});

/* =====================
    LOGOUT
===================== */
logoutBtn?.addEventListener("click", async () => {
    await signOut(auth);
});

/* =====================
    SESIÓN PERSISTENTE
===================== */
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        navbar.classList.add("d-none");
        goTo("login");
        return;
    }

    try {
        const userRef = doc(db, "users", user.uid);
        const snap = await getDoc(userRef);

        if (!snap.exists()) {
            await setDoc(userRef, {
                uid: user.uid,
                name: user.displayName,
                email: user.email,
                photoURL: user.photoURL,
                level: 1,
                xpAsistencia: 0,
                xpFuerza: 0,
                xpPeso: 0,
                asistenciasTotales: 0,
                pesoInicial: null,
                pesoActual: null,
                createdAt: serverTimestamp(),
            });
        }

        navbar.classList.remove("d-none");
        goTo("dashboard");
        // await loadDashboard();
    } catch (error) {
        console.error("🔥 Error Firestore:", error);
        alert("Error conectando con la base de datos");
    }
});
