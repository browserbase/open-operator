import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
   apiKey: "AIzaSyCH14TadxaW2dyaCL4jCn0Ng1XgkUjGOVk",
  authDomain: "dfcs-webtools.firebaseapp.com",
  projectId: "dfcs-webtools",
  storageBucket: "dfcs-webtools.firebasestorage.app",
  messagingSenderId: "85424081578",
  appId: "1:85424081578:web:c2c5817df3394b11555ed3",
  measurementId: "G-CJVW7YYDFV"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth };
