import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCRzlxHctEOsqUfHfOd1dNMVp-NCMlvLyU",
  authDomain: "renobasics-d33a1.firebaseapp.com",
  projectId: "renobasics-d33a1",
  storageBucket: "renobasics-d33a1.firebasestorage.app",
  messagingSenderId: "785918978262",
  appId: "1:785918978262:web:2d8a45e412f15d35d08177",
  measurementId: "G-C2YBL90K57",
  databaseURL: "https://renobasics-d33a1-default-rtdb.firebaseio.com",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);
export const db = getDatabase(app);
export const storage = getStorage(app);
export default app;
