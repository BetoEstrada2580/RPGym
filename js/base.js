import { auth, db } from "./firebase.js";
import {
    doc,
    getDoc,
    collection,
    getDocs,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const navDashboard = document.getElementById("navDashboard");

navDashboard.addEventListener("click", async () => {
    goTo("dashboard");
    console.log("goto dashboard");
    await loadDashboard();
});

async function loadDashboard() {
    const user = auth.currentUser;
    console.log(auth.currentUser);
    if (!user) return;

    // 🔹 Datos del usuario
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
        const d = userSnap.data();

        console.log(d);

        const { xpAsistencia, xpFuerza, xpPeso } = d || {};

        document.getElementById("xpAsistencia").textContent = xpAsistencia ?? 0;

        document.getElementById("xpFuerza").textContent = xpFuerza ?? 0;

        document.getElementById("xpPeso").textContent = xpPeso ?? 0;

        document.getElementById("dashXP").textContent =
            (xpAsistencia ?? 0) +
            (parseInt(xpFuerza) ?? 0) +
            (parseInt(xpPeso) ?? 0);

        document.getElementById("dashPesoInicial").textContent = d.pesoInicial
            ? `${d.pesoInicial} kg`
            : "-";

        document.getElementById("dashPesoActual").textContent = d.pesoActual
            ? `${d.pesoActual} kg`
            : "-";
    }

    // 🔹 Total asistencias
    const asistRef = collection(db, "users", user.uid, "asistencias");
    const asistSnap = await getDocs(asistRef);

    document.getElementById("dashAsistencias").textContent = asistSnap.size;
}

window.goTo = function (view) {
    document
        .querySelectorAll('[id^="view-"]')
        .forEach((v) => v.classList.add("d-none"));
    document.getElementById(`view-${view}`).classList.remove("d-none");
};
