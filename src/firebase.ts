import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDKDu4AN78N5JyfrGFd4Jd-QwO__lBvn48",
  authDomain: "mediatracker-bed81.firebaseapp.com",
  projectId: "mediatracker-bed81",
  storageBucket: "mediatracker-bed81.firebasestorage.app",
  messagingSenderId: "923528895458",
  appId: "1:923528895458:web:7fc6439cd75a89d79037bb",
  measurementId: "G-VZJMRPCYDW"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
