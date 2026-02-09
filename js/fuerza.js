import { auth, db } from "./firebase.js";
import {
    doc,
    getDoc,
    setDoc,
    getDocs,
    collection,
    serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const navFuerza = document.getElementById("navFuerza");

navFuerza.addEventListener("click", async () => {
    goTo("fuerza");
});
