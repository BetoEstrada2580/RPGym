import { auth, provider, db } from "./firebase.js";
import { loadDashboard } from "./base.js";

import {
    signInWithPopup,
    signOut,
    onAuthStateChanged,
    FacebookAuthProvider,
    signInWithRedirect,
    getRedirectResult,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
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

///*

/* =====================
    LOGIN CON EMAIL
===================== */
let isRegisterMode = false;

const authCard = document.getElementById("authCard");
const authTitle = document.getElementById("authTitle");
const btnPrimary = document.getElementById("btnPrimary");
const btnToggleMode = document.getElementById("btnToggleMode");
const passwordConfirm = document.getElementById("passwordConfirm");

btnToggleMode.addEventListener("click", () => {
    isRegisterMode = !isRegisterMode;

    if (isRegisterMode) {
        authCard.classList.add("register-mode");
        authTitle.textContent = "Crear cuenta";
        btnPrimary.textContent = "Registrarme";
        btnToggleMode.textContent = "¿Ya tienes cuenta? Iniciar sesión";
        passwordConfirm.classList.remove("d-none");
    } else {
        authCard.classList.remove("register-mode");
        authTitle.textContent = "Iniciar sesión";
        btnPrimary.textContent = "Iniciar sesión";
        btnToggleMode.textContent = "¿No tienes cuenta? Crear una";
        passwordConfirm.classList.add("d-none");
    }
});

btnPrimary.addEventListener("click", async () => {
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const confirm = passwordConfirm.value;

    if (!email || !password) {
        alert("Completa todos los campos");
        return;
    }

    try {
        if (isRegisterMode) {
            if (password.length < 6) {
                alert("La contraseña debe tener al menos 6 caracteres");
                return;
            }

            if (password !== confirm) {
                alert("Las contraseñas no coinciden");
                return;
            }

            await createUserWithEmailAndPassword(auth, email, password);
        } else {
            await signInWithEmailAndPassword(auth, email, password);
        }
    } catch (error) {
        console.error(error);

        if (error.code === "auth/email-already-in-use") {
            alert("Ese correo ya está registrado");
        } else if (error.code === "auth/wrong-password") {
            alert("Contraseña incorrecta");
        } else {
            alert("Error de autenticación");
        }
    }
});

///*

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
        xpAsistencia: 0,
        xpFuerza: 0,
        xpPeso: 0,
        asistenciasTotales: 0,
        pesoInicial: null,
        pesoActual: null,
        pesoObjetivo: null,
        createdAt: serverTimestamp(),
    });
}
