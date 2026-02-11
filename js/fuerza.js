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
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { checkRewards } from "./premios.js";

/* =====================================================
   CONFIGURACIÓN
===================================================== */
export const INCREMENTO_PESO = 2.5;
const KG_POR_NIVEL_PROGRESO = 5;
const XP_POR_INCREMENTO = 1;
const XP_PARA_SUBIR_NIVEL = 10;

/* =====================================================
   DOM
===================================================== */
const btnAddExercise = document.getElementById("btnAddExercise");
const btnSaveExercise = document.getElementById("btnSaveExercise");
const exerciseList = document.getElementById("exerciseList");
const exerciseSelect = document.getElementById("exerciseSelect");
const exerciseWeight = document.getElementById("exerciseWeight");

const modalExercise = new bootstrap.Modal(
    document.getElementById("modalExercise")
);

/* =====================================================
   EVENTOS
===================================================== */
btnAddExercise?.addEventListener("click", async () => {
    await loadExerciseCatalog();
    exerciseWeight.value = "";
    modalExercise.show();
});

btnSaveExercise?.addEventListener("click", async () => {
    await saveUserExercise();
});

/* =====================================================
   CATÁLOGO DE EJERCICIOS
===================================================== */
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
        if (!usados.has(docSnap.id)) {
            const opt = document.createElement("option");
            opt.value = docSnap.id;
            opt.textContent = docSnap.data().Nombre;
            exerciseSelect.appendChild(opt);
        }
    });
}

/* =====================================================
   GUARDAR EJERCICIO (SIN XP GLOBAL)
===================================================== */
async function saveUserExercise() {
    const user = auth.currentUser;
    if (!user) return;

    const ejercicioId = exerciseSelect.value;
    const peso = parseFloat(exerciseWeight.value);

    if (!ejercicioId || !peso || peso <= 0) {
        alert("Selecciona un ejercicio y un peso válido");
        return;
    }

    const ref = doc(db, "users", user.uid, "ejercicios", ejercicioId);

    const snap = await getDoc(ref);
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

    await setDoc(ref, {
        nombre: exerciseSelect.selectedOptions[0].text,
        pesoInicial: peso,
        pesoActual: peso,
        xp: xpRestante,
        nivel: nivelInicial,
        createdAt: serverTimestamp(),
    });

    modalExercise.hide();
    await loadUserExercises();
}

/* =====================================================
   CÁLCULO DE MÉTRICAS DE FUERZA
===================================================== */

// 🏋️ Nivel Base (fuerza actual)
export function calcularNivelBase(ejercicios) {
    if (!ejercicios.length) return 0;

    const suma = ejercicios.reduce((acc, e) => acc + e.pesoActual, 0);

    const promedio = suma / ejercicios.length;

    if (promedio < 25) return 1;
    if (promedio < 40) return 2;
    if (promedio < 60) return 3;
    if (promedio < 80) return 4;
    if (promedio < 100) return 5;

    return Math.floor(promedio / 20) + 2;
}

// 📈 Progreso (para premios)
function calcularNivelProgreso(ejercicios) {
    let progresoKg = 0;

    ejercicios.forEach((e) => {
        const diff = e.pesoActual - e.pesoInicial;
        if (diff > 0) progresoKg += diff;
    });

    return Math.floor(progresoKg / KG_POR_NIVEL_PROGRESO);
}

/* =====================================================
   MOSTRAR EJERCICIOS + MÉTRICAS
===================================================== */
async function loadUserExercises() {
    const user = auth.currentUser;
    if (!user) return;

    exerciseList.innerHTML = "";

    const snap = await getDocs(collection(db, "users", user.uid, "ejercicios"));

    const ejercicios = [];

    snap.forEach((docSnap) => {
        ejercicios.push({
            id: docSnap.id,
            ...docSnap.data(),
        });
    });

    // -----------------------------
    // SIN EJERCICIOS
    // -----------------------------
    if (!ejercicios.length) {
        exerciseList.innerHTML =
            "<p class='text-muted'>Agrega ejercicios para comenzar</p>";

        const elBase = document.getElementById("nivelFuerzaBase");
        const elProgreso = document.getElementById("nivelFuerzaProgreso");

        if (elBase) elBase.textContent = "0";
        if (elProgreso) elProgreso.textContent = "0";

        return;
    }

    // -----------------------------
    // MÉTRICAS GLOBALES
    // -----------------------------
    const nivelBase = calcularNivelBase(ejercicios);
    const nivelProgreso = calcularNivelProgreso(ejercicios);

    const elBase = document.getElementById("nivelFuerzaBase");
    const elProgreso = document.getElementById("nivelFuerzaProgreso");

    if (elBase) elBase.textContent = nivelBase;
    if (elProgreso) elProgreso.textContent = nivelProgreso;

    // -----------------------------
    // RENDER EJERCICIOS (RPG)
    // -----------------------------
    ejercicios.forEach((e) => {
        const xpActual = e.xp ?? 0;
        const nivel = e.nivel ?? 1;

        const xpPercent = Math.min((xpActual / XP_PARA_SUBIR_NIVEL) * 100, 100);

        exerciseList.innerHTML += `
            <div class="col-md-6">
                <div class="card p-3 h-100">

                    <h6 class="mb-1">${e.nombre}</h6>

                    <p class="mb-1">
                        Peso inicial: ${e.pesoInicial} kg<br>
                        Peso actual: <strong>${e.pesoActual} kg</strong>
                    </p>

                    <p class="mb-1">
                        Nivel: <strong>${nivel}</strong>
                    </p>

                    <!-- BARRA XP RPG -->
                    <div class="progress mb-2">
                        <div
                            class="progress-bar bg-success"
                            style="width:${xpPercent}%"
                        >
                            ${xpActual} / ${XP_PARA_SUBIR_NIVEL}
                        </div>
                    </div>

                    <button
                        class="btn btn-sm btn-outline-success w-100"
                        onclick="increaseWeight('${e.id}')"
                    >
                        + ${INCREMENTO_PESO} kg
                    </button>

                </div>
            </div>
        `;
    });
}

/* =====================================================
   INCREMENTAR PESO (PROGRESO REAL)
===================================================== */
window.increaseWeight = async function (ejercicioId) {
    const user = auth.currentUser;
    if (!user) return;

    const exerciseRef = doc(db, "users", user.uid, "ejercicios", ejercicioId);

    const userRef = doc(db, "users", user.uid);

    // -----------------------------
    // OBTENER DATOS ACTUALES
    // -----------------------------
    const exerciseSnap = await getDoc(exerciseRef);
    const userSnap = await getDoc(userRef);

    if (!exerciseSnap.exists() || !userSnap.exists()) return;

    const exercise = exerciseSnap.data();
    const userData = userSnap.data();

    // -----------------------------
    // NUEVO PESO
    // -----------------------------
    const nuevoPeso = exercise.pesoActual + INCREMENTO_PESO;

    // -----------------------------
    // RPG INDIVIDUAL (EJERCICIO)
    // -----------------------------
    let xp = exercise.xp ?? 0;
    let nivel = exercise.nivel ?? 1;

    xp += XP_POR_INCREMENTO;

    if (xp >= XP_PARA_SUBIR_NIVEL) {
        xp = xp % XP_PARA_SUBIR_NIVEL;
        nivel++;
    }

    // -----------------------------
    // PROGRESO GLOBAL DE FUERZA
    // -----------------------------
    const progresoAnteriorKg = userData.fuerzaProgresoKg ?? 0;
    const progresoNuevoKg = progresoAnteriorKg + INCREMENTO_PESO;

    const nivelProgresoAnterior = userData.fuerzaNivelProgreso ?? 0;

    const nivelProgresoNuevo = Math.floor(
        progresoNuevoKg / KG_POR_NIVEL_PROGRESO
    );

    // -----------------------------
    // ACTUALIZAR EJERCICIO
    // -----------------------------
    await updateDoc(exerciseRef, {
        pesoActual: nuevoPeso,
        xp: xp,
        nivel: nivel,
    });

    // -----------------------------
    // ACTUALIZAR USUARIO (PROGRESO)
    // -----------------------------
    await updateDoc(userRef, {
        fuerzaProgresoKg: progresoNuevoKg,
        fuerzaNivelProgreso: nivelProgresoNuevo,
    });

    // -----------------------------
    // HISTÓRICO
    // -----------------------------
    await addDoc(
        collection(
            db,
            "users",
            user.uid,
            "ejercicios",
            ejercicioId,
            "historial"
        ),
        {
            pesoAnterior: exercise.pesoActual,
            pesoNuevo: nuevoPeso,
            incremento: INCREMENTO_PESO,
            fecha: serverTimestamp(),
        }
    );

    // -----------------------------
    // PREMIOS (SOLO SI SUBIÓ NIVEL)
    // -----------------------------
    if (nivelProgresoNuevo > nivelProgresoAnterior) {
        // aquí llamas a premios.js
        checkRewards("fuerza");
    }

    await loadUserExercises();
};

const navFuerza = document.getElementById("navFuerza");

navFuerza?.addEventListener("click", async (e) => {
    e.preventDefault();
    goTo("fuerza");
    await loadUserExercises();
});
