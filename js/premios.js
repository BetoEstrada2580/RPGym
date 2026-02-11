// premios.js

import { auth, db } from "./firebase.js";
import {
    doc,
    getDoc,
    getDocs,
    collection,
    addDoc,
    serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

/* =====================================================
    CONFIGURACIÓN BASE
===================================================== */
const XP_PARA_SUBIR_NIVEL = 10;
const KG_POR_NIVEL_PROGRESO = 5;

/* =====================================================
    NAVBAR
===================================================== */
const navPremios = document.getElementById("navPremios");

/* =====================================================
    MODAL
===================================================== */
const rewardModalEl = document.getElementById("rewardModal");
const rewardModal = new bootstrap.Modal(rewardModalEl);

const rewardInfo = document.getElementById("rewardInfo");
const rewardNameInput = document.getElementById("rewardName");
const btnSaveReward = document.getElementById("btnSaveReward");

// Estado temporal del premio pendiente
let currentReward = null;

/* =====================================================
    FÓRMULAS DE PREMIOS
===================================================== */
function premioAsistencia(nivel) {
    if (nivel >= 8 && nivel % 8 === 0) return "grande";
    if (nivel === 4) return "mediano";
    if (nivel >= 1) return "pequeño";
    return null;
}

function premioFuerza(nivel) {
    if (nivel >= 10 && nivel % 10 === 0) return "grande";
    if (nivel === 5) return "mediano";
    if (nivel === 2) return "pequeño";
    return null;
}

function premioPeso(nivel) {
    if (nivel >= 4 && nivel % 4 === 0) return "grande";
    if (nivel === 2) return "mediano";
    if (nivel >= 1) return "pequeño";
    return null;
}

/* =====================================================
    UTILIDADES
===================================================== */
function calcularNivel(xp) {
    return Math.floor(xp / XP_PARA_SUBIR_NIVEL) + 1;
}

function getRewardByCategory(category, nivel) {
    switch (category) {
        case "asistencia":
            return premioAsistencia(nivel);
        case "fuerza":
            return premioFuerza(nivel);
        case "peso":
            return premioPeso(nivel);
        default:
            return null;
    }
}

function getNextReward(category, nivelActual) {
    for (let i = nivelActual + 1; i <= nivelActual + 30; i++) {
        const tipo = getRewardByCategory(category, i);
        if (tipo) {
            return `Nivel ${i} → ${tipo}`;
        }
    }
    return "—";
}

/* =====================================================
    NAVEGACIÓN A PREMIOS
===================================================== */
navPremios?.addEventListener("click", async (e) => {
    e.preventDefault();
    goTo("premios");
    await loadPremiosView();
});

/* =====================================================
    CARGAR VISTA DE PREMIOS
===================================================== */
async function loadPremiosView() {
    const user = auth.currentUser;
    if (!user) return;

    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) return;

    const data = userSnap.data();

    // -----------------------------
    // ASISTENCIA (sigue por XP)
    // -----------------------------
    const xpAsistencia = data.xpAsistencia ?? 0;
    const nivelAsistencia = calcularNivel(xpAsistencia);

    // -----------------------------
    // PESO CORPORAL (sigue por XP)
    // -----------------------------
    const xpPeso = data.xpPeso ?? 0;
    const nivelPeso = calcularNivel(xpPeso);

    // -----------------------------
    // FUERZA (ahora por progreso real en kg)
    // -----------------------------
    const nivelFuerza = data.fuerzaNivelProgreso ?? 0;
    const progresoKg = data.fuerzaProgresoKg ?? 0;

    // -----------------------------
    // MOSTRAR NIVELES
    // -----------------------------
    document.getElementById("nivelAsistencia").textContent = nivelAsistencia;
    document.getElementById("nivelFuerza").textContent = nivelFuerza;
    document.getElementById("nivelPeso").textContent = nivelPeso;

    // -----------------------------
    // MOSTRAR PRÓXIMOS PREMIOS
    // -----------------------------
    document.getElementById("nextRewardAsistencia").textContent = getNextReward(
        "asistencia",
        nivelAsistencia
    );

    document.getElementById("nextRewardFuerza").textContent = getNextReward(
        "fuerza",
        nivelFuerza
    );

    document.getElementById("nextRewardPeso").textContent = getNextReward(
        "peso",
        nivelPeso
    );

    // -----------------------------
    // OPCIONAL: Mostrar progreso en kg
    // -----------------------------
    const kgPorNivel = KG_POR_NIVEL_PROGRESO; // asegúrate que esté definido
    const kgParaSiguienteNivel = kgPorNivel * (nivelFuerza + 1);
    const faltante = Math.max(0, kgParaSiguienteNivel - progresoKg);

    const progresoInfo = document.getElementById("infoFuerzaKg");
    if (progresoInfo) {
        progresoInfo.textContent =
            `Progreso acumulado: ${progresoKg} kg | ` +
            `Faltan ${faltante} kg para el siguiente nivel`;
    }

    await loadRewardHistory();
}

/* =====================================================
    HISTORIAL DE PREMIOS
===================================================== */
async function loadRewardHistory() {
    const user = auth.currentUser;
    if (!user) return;

    const container = document.getElementById("rewardHistory");
    container.innerHTML = "";

    const snap = await getDocs(collection(db, "users", user.uid, "premios"));

    if (snap.empty) {
        container.innerHTML = `
        <p class="text-muted mb-0">
            Aún no has registrado ningún premio.
        </p>
        `;
        return;
    }

    snap.forEach((docSnap) => {
        const p = docSnap.data();
        const fecha = p.fecha?.toDate().toLocaleDateString() ?? "";

        container.innerHTML += `
        <div class="border-bottom pb-2 mb-2">
            <strong>[${p.categoria}]</strong>
            Nivel ${p.nivel} – ${p.nombre}
            <div class="text-muted small">
            ${p.tipo} • ${fecha}
            </div>
        </div>
    `;
    });
}

/* =====================================================
    DETECCIÓN AUTOMÁTICA DE PREMIOS
===================================================== */
export async function checkRewards(category) {
    const user = auth.currentUser;
    if (!user) return;

    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) return;

    const data = userSnap.data();

    let nivel = 0;
    let xpReferencia = 0;

    // -----------------------------
    // DETERMINAR NIVEL SEGÚN CATEGORÍA
    // -----------------------------
    if (category === "asistencia") {
        xpReferencia = data.xpAsistencia ?? 0;
        nivel = calcularNivel(xpReferencia);
    }

    if (category === "peso") {
        xpReferencia = data.xpPeso ?? 0;
        nivel = calcularNivel(xpReferencia);
    }

    if (category === "fuerza") {
        // 🔥 YA NO DEPENDE DE XP
        nivel = data.fuerzaNivelProgreso ?? 0;
        xpReferencia = data.fuerzaProgresoKg ?? 0; // solo informativo
    }

    if (nivel <= 0) return;

    const tipoPremio = getRewardByCategory(category, nivel);
    if (!tipoPremio) return;

    // -----------------------------
    // VERIFICAR SI YA EXISTE
    // -----------------------------
    const snap = await getDocs(collection(db, "users", user.uid, "premios"));

    const yaExiste = snap.docs.some(
        (d) => d.data().categoria === category && d.data().nivel === nivel
    );

    if (yaExiste) return;

    // -----------------------------
    // PREPARAR MODAL
    // -----------------------------
    currentReward = {
        categoria: category,
        nivel,
        tipo: tipoPremio,
        referencia: xpReferencia, // xp o kg según categoría
        createdAt: serverTimestamp(),
    };

    rewardInfo.innerHTML = `
        <strong>Categoría:</strong> ${category}<br>
        <strong>Nivel alcanzado:</strong> ${nivel}<br>
        <strong>Tipo de premio:</strong> ${tipoPremio}
    `;

    rewardNameInput.value = "";
    rewardModal.show();
}

/* =====================================================
    GUARDAR PREMIO
===================================================== */
btnSaveReward?.addEventListener("click", async () => {
    if (!currentReward) return;

    const nombre = rewardNameInput.value.trim();
    if (!nombre) {
        alert("Escribe el nombre de tu recompensa");
        return;
    }

    const user = auth.currentUser;
    if (!user) return;

    await addDoc(collection(db, "users", user.uid, "premios"), {
        ...currentReward,
        nombre,
        fecha: serverTimestamp(),
    });

    currentReward = null;
    rewardModal.hide();
});
