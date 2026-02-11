import { auth } from "./firebase.js";
import {
    doc,
    getDoc,
    getDocs,
    updateDoc,
    collection,
    addDoc,
    deleteDoc,
    serverTimestamp,
    query,
    orderBy,
    onSnapshot,
    limit,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { db } from "./firebase.js";

const btn = document.getElementById("btnRegistrarPeso");
const navPeso = document.getElementById("navPeso");
const table = document.getElementById("weightTable");

const objetivoInput = document.getElementById("pesoObjetivoInput");
const btnGuardarObjetivo = document.getElementById("btnGuardarPesoObjetivo");

navPeso.addEventListener("click", async () => {
    goTo("peso");
    await loadWeightHistory(); // historial
    await loadUserWeightData(); // objetivo + barra
});

btn.addEventListener("click", async () => {
    try {
        const peso = parseFloat(prompt("Ingresa tu peso actual (kg):"));

        if (!peso || peso <= 0) return;

        const user = auth.currentUser;
        if (!user) return;

        const userRef = doc(db, "users", user.uid);
        const snap = await getDoc(userRef);

        const data = snap.data();

        // 🧠 si es el primer registro
        const pesoInicial = data.pesoInicial ?? peso;

        // actualizar user
        await updateDoc(userRef, {
            pesoInicial,
            pesoActual: peso,
        });

        // guardar historial
        await addDoc(collection(db, "users", user.uid, "weightLogs"), {
            peso,
            fecha: serverTimestamp(),
        });
        await loadWeightHistory();
    } catch (error) {
        console.log(`Error:${error}`);
    }
});

async function loadWeightHistory() {
    try {
        const user = auth.currentUser;
        if (!user) return;

        table.innerHTML = `<tr><td colspan="3">Cargando...</td></tr>`;

        const logsRef = collection(db, "users", user.uid, "weightLogs");
        const q = query(logsRef, orderBy("fecha", "desc"));
        const snap = await getDocs(q);

        table.innerHTML = "";

        let isFirst = true; // 👈 último registro

        snap.forEach((docu) => {
            const d = docu.data();
            const fecha = d.fecha?.toDate().toLocaleDateString() ?? "-";

            table.innerHTML += `
            <tr>
                <td>${fecha}</td>
                <td>${d.peso} kg</td>
                <td class="text-end">

                ${
                    isFirst
                        ? `
                        <button
                            class="btn btn-sm btn-outline-secondary me-1"
                            onclick="editWeight('${docu.id}', ${d.peso})"
                        >
                            <i class="fa-solid fa-pen"></i>
                        </button>
                        <button
                            class="btn btn-sm btn-outline-danger"
                            onclick="deleteLastWeight('${docu.id}')"
                        >
                            <i class="fa-solid fa-trash"></i>
                        </button>`
                        : ``
                }
                </td>
            </tr>
            `;

            isFirst = false;
        });

        await refreshWeightBar();
    } catch (error) {
        console.log(`Error:${error}`);
    }
}

async function loadUserWeightData() {
    const user = auth.currentUser;
    if (!user) return;

    const userRef = doc(db, "users", user.uid);
    const snap = await getDoc(userRef);

    if (!snap.exists()) return;

    const data = snap.data();

    // 🟢 Pintar peso objetivo en el input
    const objetivoInput = document.getElementById("pesoObjetivoInput");
    if (data.pesoObjetivo && objetivoInput) {
        objetivoInput.value = data.pesoObjetivo;
    }

    // 🟢 Actualizar barra RPG
    updateWeightBar(data);
}

function updateWeightBar(data) {
    if (!data?.pesoInicial || !data?.pesoActual) return;

    const inicial = data.pesoInicial;
    const actual = data.pesoActual;
    const objetivo = data.pesoObjetivo;

    let percent = 0;

    // Si hay peso objetivo definido
    if (objetivo && inicial !== objetivo) {
        percent = ((inicial - actual) / (inicial - objetivo)) * 100;
    } else {
        // fallback: progreso desde peso inicial
        percent = ((inicial - actual) / inicial) * 100;
    }

    // límites seguros
    percent = Math.max(0, Math.min(percent, 100));

    const bar = document.getElementById("weightBar");
    bar.style.width = `${percent}%`;
    bar.textContent = `${actual} kg`;

    // Visual RPG
    bar.classList.remove("bg-success", "bg-primary", "bg-danger", "bg-warning");

    if (objetivo && actual <= objetivo) {
        bar.classList.add("bg-success");
        bar.textContent += " 🎉";
    } else if (actual < inicial) {
        bar.classList.add("bg-primary");
    } else if (actual === inicial) {
        bar.classList.add("bg-warning");
    } else {
        bar.classList.add("bg-danger");
    }
}

window.editWeight = async (logId, currentPeso) => {
    const nuevoPeso = parseFloat(prompt("Editar peso (kg):", currentPeso));

    if (!nuevoPeso || nuevoPeso <= 0) return;

    const user = auth.currentUser;
    if (!user) return;

    const logRef = doc(db, "users", user.uid, "weightLogs", logId);

    await updateDoc(logRef, {
        peso: nuevoPeso,
    });

    await refreshPesoActual();
    await loadWeightHistory();
};

window.deleteLastWeight = async (logId) => {
    if (!confirm("¿Eliminar el último registro de peso?")) return;

    const user = auth.currentUser;
    if (!user) return;

    const logRef = doc(db, "users", user.uid, "weightLogs", logId);
    await deleteDoc(logRef);

    await refreshPesoActual();
    await loadWeightHistory();
};

async function refreshPesoActual() {
    const user = auth.currentUser;
    if (!user) return;

    const logsRef = collection(db, "users", user.uid, "weightLogs");
    const q = query(logsRef, orderBy("fecha", "desc"), limit(1));
    const snap = await getDocs(q);

    if (snap.empty) return;

    const lastPeso = snap.docs[0].data().peso;

    const userRef = doc(db, "users", user.uid);
    await updateDoc(userRef, {
        pesoActual: lastPeso,
    });
}

async function refreshWeightBar() {
    const user = auth.currentUser;
    if (!user) return;

    const userRef = doc(db, "users", user.uid);
    const snap = await getDoc(userRef);

    updateWeightBar(snap.data());
}

//Botón peso ideal
btnGuardarObjetivo.addEventListener("click", async () => {
    const objetivo = parseFloat(objetivoInput.value);
    if (!objetivo || objetivo <= 0) return;

    const user = auth.currentUser;
    if (!user) return;

    const userRef = doc(db, "users", user.uid);

    await updateDoc(userRef, {
        pesoObjetivo: objetivo,
    });

    alert("🎯 Peso objetivo guardado");
    await refreshWeightBar(); // recalcula barra
});
