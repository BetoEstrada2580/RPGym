import { auth, db } from "./firebase.js";
import {
    doc,
    getDoc,
    collection,
    getDocs,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { INCREMENTO_PESO, calcularNivelBase } from "./fuerza.js";

const navDashboard = document.getElementById("navDashboard");

navDashboard.addEventListener("click", async () => {
    goTo("dashboard");
    console.log("goto dashboard");
    await loadDashboard();
});

export async function loadDashboard() {
    const user = auth.currentUser;
    if (!user) return;

    // 🔹 Datos del usuario
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
        const d = userSnap.data();
        const xpAsistencia = d.xpAsistencia ?? 0;
        const fuerzaProgresoKg = d.fuerzaProgresoKg ?? 0;
        const xpPeso = d.xpPeso ?? 0;

        document.getElementById("xpAsistencia").textContent = xpAsistencia ?? 0;

        const xpFuerzaVisual = Math.floor(fuerzaProgresoKg / INCREMENTO_PESO);

        document.getElementById("xpFuerza").textContent = xpFuerzaVisual;

        document.getElementById("xpPeso").textContent = xpPeso ?? 0;

        document.getElementById("dashXP").textContent =
            (xpAsistencia ?? 0) +
            (parseInt(fuerzaProgresoKg) ?? 0) +
            (parseInt(xpPeso) ?? 0);

        //* Nivel fuerza
        const snap = await getDocs(
            collection(db, "users", user.uid, "ejercicios")
        );

        const ejercicios = [];

        snap.forEach((docSnap) => {
            ejercicios.push({
                id: docSnap.id,
                ...docSnap.data(),
            });
        });

        if (!ejercicios.length) {
            document.getElementById("dashNivelFuerza").textContent = 0;
        } else {
            const nivelBase = calcularNivelBase(ejercicios);
            document.getElementById("dashNivelFuerza").textContent = nivelBase;
        }

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
