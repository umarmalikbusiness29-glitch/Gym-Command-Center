import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCTKYHUYAZ85CWW2Rv0Pe6WIJgxzL0MuwA",
  authDomain: "gymnewmaka.firebaseapp.com",
  projectId: "gymnewmaka",
  storageBucket: "gymnewmaka.firebasestorage.app",
  messagingSenderId: "163052903592",
  appId: "1:163052903592:web:5924c288a32e04cea3369d"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);
export default app;
