import { auth, db } from "./firebase.js";
import { checkRewards } from "./premios.js";
import {
    doc,
    getDoc,
    setDoc,
    getDocs,
    query,
    updateDoc,
    orderBy,
    serverTimestamp,
    increment,
    collection,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const navAsistencia = document.getElementById("navAsistencia");

navAsistencia.addEventListener("click", async () => {
    goTo("asistencia");
    await checkTodayAttendance();
    await updateAttendanceProgress();
    await loadAttendanceHistory();
});

function getTodayKey() {
    const now = new Date();

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
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

    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) return;

    const userData = userSnap.data();

    const asistenciasTotales = (userData.asistenciasTotales || 0) + 1;
    const nivelActual = userData.nivelAsistencia || 1;

    // Nivel sin 0
    const nivelCorrecto = Math.max(1, Math.floor(asistenciasTotales / 5) + 1);

    const updates = {
        asistenciasTotales: increment(1),
        xpAsistencia: increment(1),
    };

    let subioNivel = false;

    if (nivelCorrecto > nivelActual) {
        updates.nivelAsistencia = nivelCorrecto;
        subioNivel = true;
    }

    await updateDoc(userRef, updates);

    // 🎁 Revisar premios SOLO si subió nivel
    if (subioNivel) {
        await checkRewards("asistencia");
    }

    await updateAttendanceProgress();
    await checkTodayAttendance();
    await loadAttendanceHistory();
});

async function updateAttendanceProgress() {
    try {
        const user = auth.currentUser;
        if (!user) return;

        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) return;

        const userData = userSnap.data();

        const nivel = userData.nivelAsistencia || 1;
        const total = userData.asistenciasTotales || 0;

        // 🔹 Mostrar nivel en el h5
        const nivelSpan = document.getElementById("nivel_asistencia");
        nivelSpan.textContent = nivel;

        // 🔹 Progreso hacia siguiente nivel
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
            bar.textContent = "🎉 Nivel completado";
        } else {
            bar.classList.add("bg-success");
        }
    } catch (error) {
        console.log(error);
    }
}

async function loadAttendanceHistory() {
    const user = auth.currentUser;
    if (!user) return;

    const q = query(
        collection(db, "users", user.uid, "asistencias"),
        orderBy("date", "desc")
    );

    const snap = await getDocs(q);

    const dates = [];
    const logContainer = document.getElementById("historialLog");
    logContainer.innerHTML = "";

    snap.forEach((docSnap) => {
        const data = docSnap.data();
        dates.push(data.date);

        // 🔹 Historial tipo log RPG
        logContainer.innerHTML += `
            <div class="card mb-2 shadow-sm border-0">
                <div class="card-body py-2 d-flex justify-content-between align-items-center">
                    <span>✔ ${data.date}</span>
                    <span class="badge bg-success">+1 XP</span>
                </div>
            </div>
        `;
    });

    generateMonthlyHeatmap(dates);
}

function generateMonthlyHeatmap(attendanceDates) {
    const container = document.getElementById("heatmapContainer");
    container.innerHTML = "";

    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startingDay = firstDayOfMonth.getDay(); // 0 = Domingo

    // 🔹 Crear tabla
    const table = document.createElement("table");
    table.className =
        "table table-bordered text-center align-middle heatmap-table";

    // 🔹 Header con días
    const daysHeader = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");

    daysHeader.forEach((day) => {
        const th = document.createElement("th");
        th.textContent = day;
        th.className = "small text-muted";
        headerRow.appendChild(th);
    });

    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");
    let row = document.createElement("tr");

    // 🔹 Espacios vacíos antes del día 1
    for (let i = 0; i < startingDay; i++) {
        const emptyCell = document.createElement("td");
        row.appendChild(emptyCell);
    }

    // 🔹 Rellenar días del mes
    for (let day = 1; day <= daysInMonth; day++) {
        const dateObj = new Date(year, month, day);
        const key = dateObj.toISOString().split("T")[0];

        const attended = attendanceDates.includes(key);

        const cell = document.createElement("td");
        cell.innerHTML = `
            <div 
                class="heatmap-day ${attended ? "attended" : ""}" 
                title="${key}">
            </div>
        `;

        row.appendChild(cell);

        if ((startingDay + day) % 7 === 0) {
            tbody.appendChild(row);
            row = document.createElement("tr");
        }
    }

    // 🔹 Agregar última fila si quedó incompleta
    if (row.children.length > 0) {
        while (row.children.length < 7) {
            const emptyCell = document.createElement("td");
            row.appendChild(emptyCell);
        }
        tbody.appendChild(row);
    }

    table.appendChild(tbody);
    container.appendChild(table);
}
