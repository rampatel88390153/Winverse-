import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import config from '../firebase-applet-config.json';

const app = !getApps().length ? initializeApp(config) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app, config.firestoreDatabaseId);
