import { db } from "./src/lib/firebase";
import { collection, getDocs } from "firebase/firestore";

async function debugFirestore() {
  console.log("Checking Registros...");
  const regSnap = await getDocs(collection(db, "registros_diarios"));
  console.log(`Found ${regSnap.size} registros:`);
  regSnap.forEach(doc => {
    console.log(doc.id, "=>", doc.data());
  });

  console.log("\nChecking Locaciones...");
  const locSnap = await getDocs(collection(db, "puntos_venta"));
  console.log(`Found ${locSnap.size} locaciones:`);
  locSnap.forEach(doc => {
    console.log(doc.id, "=>", doc.data());
  });
}

// Call this if needed or run via a separate method
// For now I'll just write it to inspect it.
