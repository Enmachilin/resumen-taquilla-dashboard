import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  setDoc,
  getDoc,
  query,
  where,
  getDocs,
  serverTimestamp,
  orderBy
} from "firebase/firestore";
import { RegistroDiario, Locacion } from "@/types";

const REGISTROS_COLLECTION = "registros_diarios";
const LOCACIONES_COLLECTION = "puntos_venta";

export const registroService = {
  async saveRegistro(registro: Omit<RegistroDiario, "createdAt">) {
    const docRef = doc(db, REGISTROS_COLLECTION, registro.id);
    await setDoc(docRef, {
      ...registro,
      createdAt: serverTimestamp(),
    });
  },

  async getRegistro(id: string) {
    const docRef = doc(db, REGISTROS_COLLECTION, id);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? (docSnap.data() as RegistroDiario) : null;
  },

  async getRegistrosByLocacion(locacionId: string) {
    const q = query(
      collection(db, REGISTROS_COLLECTION),
      where("locacionId", "==", locacionId)
    );
    const querySnapshot = await getDocs(q);
    const data = querySnapshot.docs.map(doc => doc.data() as RegistroDiario);

    // Sort in Javascript to avoid requiring a Firebase Composite Index
    return data.sort((a, b) => b.fecha.localeCompare(a.fecha));
  },

  async getRegistroAnterior(locacionId: string, fechaActual: string) {
    const date = new Date(fechaActual);
    const yearAnterior = date.getFullYear() - 1;
    const mes = String(date.getMonth() + 1).padStart(2, '0');
    const dia = String(date.getDate()).padStart(2, '0');
    const idAnterior = `${yearAnterior}-${mes}-${dia}_${locacionId}`;

    return this.getRegistro(idAnterior);
  },

  async getAllRegistros() {
    const q = query(
      collection(db, REGISTROS_COLLECTION),
      orderBy("fecha", "desc")
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data() as RegistroDiario);
  }
};

export const locacionService = {
  async getLocaciones() {
    const querySnapshot = await getDocs(collection(db, LOCACIONES_COLLECTION));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Locacion));
  },

  async addLocacion(locacion: Locacion) {
    const docRef = doc(db, LOCACIONES_COLLECTION, locacion.id);
    await setDoc(docRef, locacion);
  }
};
