import { auth, provider } from "./firebase.js";

import {
    signInWithPopup,
    signOut,
    onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const loginBtn = document.getElementById("btnGoogleLogin");
const logoutBtn = document.getElementById("btnLogout");

loginBtn?.addEventListener("click", async () => {
    try {
        await signInWithPopup(auth, provider);
    } catch (e) {
        console.error(e);
        alert("Error al iniciar sesión");
    }
});

logoutBtn?.addEventListener("click", () => {
    signOut(auth);
});

onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log("Login OK:", user.email);
        goTo("dashboard");
    } else {
        console.log("No tienes sesión iniciada");
        console.log(auth);
        goTo("login");
    }
});
