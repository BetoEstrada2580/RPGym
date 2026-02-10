import { auth, db } from "./firebase.js";
import {
    doc,
    getDoc,
    setDoc,
    getDocs,
    updateDoc,
    collection,
    serverTimestamp,
    increment,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const navAsistencia = document.getElementById("navAsistencia");

navAsistencia.addEventListener("click", async () => {
    goTo("asistencia");
    await checkTodayAttendance();
    await updateAttendanceProgress();
});

function getTodayKey() {
    return new Date().toISOString().split("T")[0];
}

async function checkTodayAttendance() {
    try {
        const user = auth.currentUser;
        if (!user) return;

        const today = getTodayKey();
        const ref = doc(db, "users", user.uid, "asistencias", today);
        const snap = await getDoc(ref);

        const btn = document.getElementById("btnRegistrarAsistencia");
        const msg = document.getElementById("asistenciaYaRegistrada");

        if (snap.exists()) {
            btn.classList.add("d-none");
            msg.classList.remove("d-none");
        } else {
            btn.classList.remove("d-none");
            msg.classList.add("d-none");
        }
    } catch (error) {
        btn.classList.add("d-none");
        console.log(error);
    }
}

btnRegistrarAsistencia.addEventListener("click", async () => {
    const user = auth.currentUser;
    if (!user) return;

    const today = getTodayKey();

    // 1️⃣ Guardar asistencia del día
    const asistenciaRef = doc(db, "users", user.uid, "asistencias", today);
    await setDoc(asistenciaRef, {
        date: today,
        createdAt: serverTimestamp(),
    });

    // 2️⃣ Actualizar estado del usuario
    const userRef = doc(db, "users", user.uid);
    await updateDoc(userRef, {
        asistenciasTotales: increment(1),
        xpAsistencia: increment(1),
    });

    // 3️⃣ Refrescar UI
    await updateAttendanceProgress();
    await checkTodayAttendance();
});

async function updateAttendanceProgress() {
    try {
        const user = auth.currentUser;
        if (!user) return;

        const ref = collection(db, "users", user.uid, "asistencias");
        const snap = await getDocs(ref);
        const total = snap.size;

        let count = total % 5;
        if (count === 0 && total !== 0) {
            count = 5;
        }

        const percent = (count / 5) * 100;
        const text = document.getElementById("asistenciaTexto");
        const bar = document.getElementById("asistenciaBar");

        text.textContent = `${count} / 5`;
        bar.style.width = `${percent}%`;
        bar.textContent = `${total} XP`;

        bar.classList.remove("bg-success", "bg-warning");

        if (count === 5) {
            bar.classList.add("bg-warning");
            bar.textContent = "🎉 Misión completada";
        } else {
            bar.classList.add("bg-success");
        }
    } catch (error) {
        console.log(error);
    }
}
