import { initializeApp } from "firebase/app";
import {
  initializeFirestore,
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  writeBatch
} from "firebase/firestore";
import fs from "fs";
import path from "path";

// Define initial seed data
const initialSteelTypes = [
  { id: "st-1", name: "حديد تركي (إسكندرون)" },
  { id: "st-2", name: "حديد عراقي (أربيل)" },
  { id: "st-3", name: "حديد إماراتي (الإمارات)" },
  { id: "st-4", name: "حديد سابك (السعودية)" }
];

const initialProducts = [
  {
    id: "p-1",
    name: "شيش حديد تسليح قياس 12 ملم",
    typeId: "st-1",
    diameter: "12 ملم",
    price: 950000,
    quantity: 120,
    imageUrl: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "p-2",
    name: "شيش حديد تسليح قياس 16 ملم",
    typeId: "st-2",
    diameter: "16 ملم",
    price: 910000,
    quantity: 85,
    imageUrl: "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "p-3",
    name: "شيش حديد تسليح قياس 10 ملم",
    typeId: "st-3",
    diameter: "10 ملم",
    price: 980000,
    quantity: 60,
    imageUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "p-4",
    name: "حديد تسليح قياس 25 ملم ثقيل",
    typeId: "st-1",
    diameter: "25 ملم",
    price: 960000,
    quantity: 40,
    imageUrl: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "p-5",
    name: "لفات سلك ربط حديد ناعم",
    typeId: "st-2",
    diameter: "1.5 ملم",
    price: 1100000,
    quantity: 15,
    imageUrl: "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=600&q=80"
  }
];

const initialSuppliers = [
  { id: "sup-1", name: "مذخر حديد الرافدين", phone: "07701111111", pin: "100020" },
  { id: "sup-2", name: "شركة نينوى للتجهيزات الإنشائية", phone: "07702222222", pin: "100030" },
  { id: "sup-3", name: "مورد حديد الفرات الأوسط", phone: "07703333333", pin: "100040" }
];

// Load Firebase Config
let firebaseConfig: any = {};
const configPath = path.join(process.cwd(), "firebase-applet-config.json");
if (fs.existsSync(configPath)) {
  try {
    firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  } catch (err) {
    console.error("Error reading firebase-applet-config.json:", err);
  }
}

const app = initializeApp({
  apiKey: firebaseConfig.apiKey,
  authDomain: firebaseConfig.authDomain,
  projectId: firebaseConfig.projectId,
  storageBucket: firebaseConfig.storageBucket,
  messagingSenderId: firebaseConfig.messagingSenderId,
  appId: firebaseConfig.appId
});

export const db = initializeFirestore(app, {}, firebaseConfig.firestoreDatabaseId || "(default)");

// --- Helper Functions ---

// Fetch all documents as an array
export async function getAllDocs(collectionName: string): Promise<any[]> {
  try {
    const colRef = collection(db, collectionName);
    const snapshot = await getDocs(colRef);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error(`Error fetching docs for ${collectionName}:`, error);
    return [];
  }
}

// Get full state
export async function getFullDbState() {
  const [steelTypes, products, suppliers, orders, customers, sessions, notifications] = await Promise.all([
    getAllDocs("steelTypes"),
    getAllDocs("products"),
    getAllDocs("suppliers"),
    getAllDocs("orders"),
    getAllDocs("customers"),
    getAllDocs("sessions"),
    getAllDocs("notifications")
  ]);

  return {
    steelTypes,
    products,
    suppliers,
    orders,
    customers,
    sessions,
    notifications
  };
}

// Seed helper
export async function seedIfNeeded() {
  try {
    const steelTypesCol = collection(db, "steelTypes");
    const snapshot = await getDocs(steelTypesCol);
    if (snapshot.empty) {
      console.log("🌱 Seeding initial steel types to Firestore...");
      const batch = writeBatch(db);
      initialSteelTypes.forEach(t => {
        const docRef = doc(db, "steelTypes", t.id);
        batch.set(docRef, t);
      });
      await batch.commit();
    }

    const productsCol = collection(db, "products");
    const productsSnapshot = await getDocs(productsCol);
    if (productsSnapshot.empty) {
      console.log("🌱 Seeding initial products to Firestore...");
      const batch = writeBatch(db);
      initialProducts.forEach(p => {
        const docRef = doc(db, "products", p.id);
        batch.set(docRef, p);
      });
      await batch.commit();
    }

    const suppliersCol = collection(db, "suppliers");
    const suppliersSnapshot = await getDocs(suppliersCol);
    if (suppliersSnapshot.empty) {
      console.log("🌱 Seeding initial suppliers to Firestore...");
      const batch = writeBatch(db);
      initialSuppliers.forEach(s => {
        const docRef = doc(db, "suppliers", s.id);
        batch.set(docRef, { ...s, status: "active" });
      });
      await batch.commit();
    }
    console.log("✅ Firestore database seeding check complete!");
  } catch (err) {
    console.error("❌ Seeding Firestore failed:", err);
  }
}

// Write/Set Document
export async function setDocument(collectionName: string, id: string, data: any) {
  const docRef = doc(db, collectionName, id);
  await setDoc(docRef, data);
}

// Update Document
export async function updateDocument(collectionName: string, id: string, data: any) {
  const docRef = doc(db, collectionName, id);
  await updateDoc(docRef, data);
}

// Delete Document
export async function deleteDocument(collectionName: string, id: string) {
  const docRef = doc(db, collectionName, id);
  await deleteDoc(docRef);
}

// Get Customer by Phone
export async function getCustomerByPhone(phone: string): Promise<any> {
  const colRef = collection(db, "customers");
  const q = query(colRef, where("phone", "==", phone));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  const d = snapshot.docs[0];
  return { id: d.id, ...d.data() };
}

// Get Supplier by Phone
export async function getSupplierByPhone(phone: string): Promise<any> {
  const colRef = collection(db, "suppliers");
  const q = query(colRef, where("phone", "==", phone));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  const d = snapshot.docs[0];
  return { id: d.id, ...d.data() };
}

// Clean Expired Sessions
export async function cleanExpiredSessions() {
  try {
    const sessionsCol = collection(db, "sessions");
    const snapshot = await getDocs(sessionsCol);
    const now = Date.now();
    const batch = writeBatch(db);
    let count = 0;
    snapshot.docs.forEach(docSnap => {
      const data = docSnap.data();
      if (new Date(data.expiresAt).getTime() <= now) {
        batch.delete(docSnap.ref);
        count++;
      }
    });
    if (count > 0) {
      await batch.commit();
    }
  } catch (err) {
    console.error("Error cleaning expired sessions:", err);
  }
}

// Clean Supplier Sessions
export async function cleanSupplierSessions(supplierId: string) {
  try {
    const sessionsCol = collection(db, "sessions");
    const q = query(sessionsCol, where("role", "==", "supplier"), where("userId", "==", supplierId));
    const snapshot = await getDocs(q);
    const batch = writeBatch(db);
    let count = 0;
    snapshot.docs.forEach(docSnap => {
      batch.delete(docSnap.ref);
      count++;
    });
    if (count > 0) {
      await batch.commit();
    }
  } catch (err) {
    console.error("Error cleaning supplier sessions:", err);
  }
}

// Read All Notifications
export async function readAllNotifications() {
  try {
    const notificationsCol = collection(db, "notifications");
    const snapshot = await getDocs(notificationsCol);
    const batch = writeBatch(db);
    let count = 0;
    snapshot.docs.forEach(docSnap => {
      const data = docSnap.data();
      if (!data.read) {
        batch.update(docSnap.ref, { read: true });
        count++;
      }
    });
    if (count > 0) {
      await batch.commit();
    }
  } catch (err) {
    console.error("Error reading all notifications:", err);
  }
}

// Get single document by ID
export async function getDocById(collectionName: string, id: string): Promise<any> {
  try {
    const docRef = doc(db, collectionName, id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return null;
    return { id: docSnap.id, ...docSnap.data() };
  } catch (error) {
    console.error(`Error getting doc ${id} from ${collectionName}:`, error);
    return null;
  }
}
