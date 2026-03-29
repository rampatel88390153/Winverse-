import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import config from './firebase-applet-config.json' assert { type: 'json' };

try {
  initializeApp({
    projectId: config.projectId
  });
  const db = getFirestore(config.firestoreDatabaseId);
  console.log('Firebase Admin initialized successfully');
  process.exit(0);
} catch (e) {
  console.error('Error:', e);
  process.exit(1);
}
