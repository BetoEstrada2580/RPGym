// fuerza.js

import { auth, db } from "./firebase.js";

import {
    collection,
    getDocs,
    getDoc,
    doc,
    setDoc,
    updateDoc,
    addDoc,
    serverTimestamp,
    increment,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// -----------------------------
// DOM
// -----------------------------
const btnAddExercise = document.getElementById("btnAddExercise");
const btnSaveExercise = document.getElementById("btnSaveExercise");
const exerciseList = document.getElementById("exerciseList");
const exerciseSelect = document.getElementById("exerciseSelect");
const exerciseWeight = document.getElementById("exerciseWeight");

// -----------------------------
// MODAL
// -----------------------------
const modalExercise = new bootstrap.Modal(
    document.getElementById("modalExercise")
);

// -----------------------------
// CONFIG RPG
// -----------------------------
const INCREMENTO_PESO = 2.5;
const XP_POR_INCREMENTO = 1;
const XP_PARA_SUBIR_NIVEL = 10;

// -----------------------------
// EVENTOS
// -----------------------------
btnAddExercise?.addEventListener("click", async () => {
    await loadExerciseCatalog();
    exerciseWeight.value = "";
    modalExercise.show();
});

btnSaveExercise?.addEventListener("click", async () => {
    await saveUserExercise();
});

// -----------------------------
// CARGAR CATÁLOGO SIN REPETIR
// -----------------------------
async function loadExerciseCatalog() {
    const user = auth.currentUser;
    if (!user) return;

    const catSnap = await getDocs(collection(db, "cat_ejercicios"));
    const userSnap = await getDocs(
        collection(db, "users", user.uid, "ejercicios")
    );

    const usados = new Set(userSnap.docs.map((d) => d.id));

    exerciseSelect.innerHTML = "";

    catSnap.forEach((docSnap) => {
        console.log(docSnap);
        if (!usados.has(docSnap.id)) {
            const opt = document.createElement("option");
            opt.value = docSnap.id;
            opt.textContent = docSnap.data().Nombre;
            exerciseSelect.appendChild(opt);
        }
    });

    if (!exerciseSelect.children.length) {
        const opt = document.createElement("option");
        opt.textContent = "No hay ejercicios disponibles";
        opt.disabled = true;
        exerciseSelect.appendChild(opt);
    }
}

// -----------------------------
// GUARDAR EJERCICIO DEL USUARIO
// -----------------------------
async function saveUserExercise() {
    const user = auth.currentUser;
    if (!user) return;

    const ejercicioId = exerciseSelect.value;
    const peso = parseFloat(exerciseWeight.value);

    if (!ejercicioId || !peso || peso <= 0) {
        alert("Selecciona un ejercicio y un peso válido");
        return;
    }

    const exerciseRef = doc(db, "users", user.uid, "ejercicios", ejercicioId);

    // Evitar duplicados
    const snap = await getDoc(exerciseRef);
    if (snap.exists()) {
        alert("Este ejercicio ya fue agregado");
        return;
    }

    // -----------------------------
    // CÁLCULO RPG DEL PESO INICIAL
    // -----------------------------
    const incrementos = Math.floor(peso / INCREMENTO_PESO);
    const xpInicialTotal = incrementos * XP_POR_INCREMENTO;

    const nivelInicial = Math.floor(xpInicialTotal / XP_PARA_SUBIR_NIVEL) + 1;

    const xpRestante = xpInicialTotal % XP_PARA_SUBIR_NIVEL;

    // -----------------------------
    // GUARDAR EJERCICIO
    // -----------------------------
    await setDoc(exerciseRef, {
        nombre: exerciseSelect.selectedOptions[0].text,
        pesoInicial: peso,
        pesoActual: peso,
        xp: xpRestante,
        nivel: nivelInicial,
        createdAt: serverTimestamp(),
    });

    // -----------------------------
    // SUMAR XP GLOBAL DE FUERZA
    // -----------------------------
    const userRef = doc(db, "users", user.uid);

    await updateDoc(userRef, {
        xpFuerza: increment(xpInicialTotal),
    });

    modalExercise.hide();
    await loadUserExercises();
}

// -----------------------------
// CARGAR EJERCICIOS DEL USUARIO
// -----------------------------
export async function loadUserExercises() {
    const user = auth.currentUser;
    if (!user) return;

    exerciseList.innerHTML = "";

    const snap = await getDocs(collection(db, "users", user.uid, "ejercicios"));

    if (snap.empty) {
        exerciseList.innerHTML = `
        <div class="text-muted text-center">
            Agrega tu primer ejercicio 💪
        </div>
    `;
        return;
    }

    snap.forEach((docSnap) => {
        const e = docSnap.data();
        const xpPercent = Math.min((e.xp / XP_PARA_SUBIR_NIVEL) * 100, 100);

        exerciseList.innerHTML += `
        <div class="col-md-6">
            <div class="card p-3 h-100">
            <h6 class="mb-1">${e.nombre}</h6>

            <p class="mb-1">
                🏋️ ${e.pesoActual} kg
            </p>
            <p>
                Nivel ${e.nivel}
            </p>

            <div class="progress mb-2">
                <div
                class="progress-bar bg-success"
                style="width:${xpPercent}%"
                >
                    ${e.xp} XP
                </div>
            </div>

            <div class="d-flex gap-2">
                <button
                class="btn btn-sm btn-outline-success w-100"
                onclick="increaseWeight('${docSnap.id}')"
                >
                + ${INCREMENTO_PESO} kg
                </button>

                <button
                class="btn btn-sm btn-outline-secondary w-100"
                onclick="viewExerciseHistory('${docSnap.id}')"
                >
                Historial
                </button>
            </div>
            </div>
        </div>
    `;
    });
}

// -----------------------------
// INCREMENTAR PESO + HISTÓRICO
// -----------------------------
window.increaseWeight = async function (ejercicioId) {
    const user = auth.currentUser;
    if (!user) return;

    // Referencia al ejercicio
    const exerciseRef = doc(db, "users", user.uid, "ejercicios", ejercicioId);

    const snap = await getDoc(exerciseRef);
    if (!snap.exists()) return;

    const data = snap.data();

    // -----------------------------
    // CÁLCULO DEL NUEVO PESO
    // -----------------------------
    const nuevoPeso = data.pesoActual + INCREMENTO_PESO;

    // -----------------------------
    // CÁLCULO RPG DE XP / NIVEL
    // -----------------------------
    let xp = data.xp + XP_POR_INCREMENTO;
    let nivel = data.nivel;

    if (xp >= XP_PARA_SUBIR_NIVEL) {
        xp = xp % XP_PARA_SUBIR_NIVEL;
        nivel++;
    }

    // -----------------------------
    // ACTUALIZAR EJERCICIO
    // -----------------------------
    await updateDoc(exerciseRef, {
        pesoActual: nuevoPeso,
        xp,
        nivel,
    });

    // -----------------------------
    // GUARDAR HISTÓRICO
    // -----------------------------
    const histRef = collection(
        db,
        "users",
        user.uid,
        "ejercicios",
        ejercicioId,
        "historial"
    );

    await addDoc(histRef, {
        pesoAnterior: data.pesoActual,
        pesoNuevo: nuevoPeso,
        incremento: INCREMENTO_PESO,
        fecha: serverTimestamp(),
    });

    // -----------------------------
    // SUMAR XP GLOBAL DE FUERZA
    // -----------------------------
    const userRef = doc(db, "users", user.uid);

    await updateDoc(userRef, {
        xpFuerza: increment(XP_POR_INCREMENTO),
    });

    // -----------------------------
    // REFRESCAR UI
    // -----------------------------
    await loadUserExercises();
};

// -----------------------------
// VER HISTORIAL DEL EJERCICIO
// -----------------------------
window.viewExerciseHistory = async function (ejercicioId) {
    const user = auth.currentUser;
    if (!user) return;

    const snap = await getDocs(
        collection(
            db,
            "users",
            user.uid,
            "ejercicios",
            ejercicioId,
            "historial"
        )
    );

    if (snap.empty) {
        alert("Este ejercicio aún no tiene historial");
        return;
    }

    let texto = "Historial de cambios:\n\n";

    snap.forEach((d) => {
        const h = d.data();
        const fecha = h.fecha?.toDate().toLocaleDateString() ?? "";
        texto += `📅 ${fecha}: ${h.pesoAnterior} → ${h.pesoNuevo} kg\n`;
    });

    alert(texto);
};

const navFuerza = document.getElementById("navFuerza");

navFuerza.addEventListener("click", async () => {
    await loadUserExercises();
    goTo("fuerza");
});
