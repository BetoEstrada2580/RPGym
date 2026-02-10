import { auth, provider, db } from "./firebase.js";
import { loadDashboard } from "./base.js";

import {
    signInWithPopup,
    signOut,
    onAuthStateChanged,
    FacebookAuthProvider,
    signInWithRedirect,
    getRedirectResult,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

import {
    doc,
    getDoc,
    setDoc,
    serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const loginBtn = document.getElementById("btnGoogleLogin");
const btnFacebookLogin = document.getElementById("btnFacebookLogin");
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
    LOGIN CON FACEBOOK
===================== */
btnFacebookLogin?.addEventListener("click", async () => {
    try {
        const provider = new FacebookAuthProvider();
        provider.addScope("email");

        await signInWithRedirect(auth, provider);
    } catch (error) {
        console.error("Facebook redirect error:", error);
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
getRedirectResult(auth)
    .then((result) => {
        if (result?.user) {
            console.log("Login Facebook OK:", result.user.email);
        }
    })
    .catch((error) => {
        console.error("Facebook redirect result error:", error);
    });

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        navbar.classList.add("d-none");
        goTo("login");
        return;
    }

    try {
        navbar.classList.remove("d-none");
        await ensureUserInFirestore(user);
        goTo("dashboard");
        await loadDashboard();
    } catch (error) {
        alert("Error conectando con la base de datos");
        console.error("🔥 Error Firestore:", error);
    }
});

// -----------------------------
// CREAR USUARIO EN FIRESTORE SI NO EXISTE
// -----------------------------
async function ensureUserInFirestore(user) {
    const userRef = doc(db, "users", user.uid);
    const snap = await getDoc(userRef);

    if (snap.exists()) return;

    await setDoc(userRef, {
        uid: user.uid,
        name: user.displayName ?? "Usuario",
        email: user.email ?? "",
        photoURL: user.photoURL ?? "",
        xp: {
            asistencia: 0,
            fuerza: 0,
            peso: 0,
        },
        asistenciaActual: false,
        asistenciasTotales: 0,
        pesoInicial: null,
        pesoActual: null,
        pesoObjetivo: null,
        createdAt: serverTimestamp(),
    });
}
