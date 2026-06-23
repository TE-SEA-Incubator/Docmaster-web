import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const serviceAccountPath =
  process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
  resolve(process.cwd(), 'docmaster-ad853-firebase-adminsdk-fbsvc-04896cd379.json');

try {
  const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
  });
  console.log('✓ Firebase Admin initialized');
} catch (err) {
  console.error('✗ Firebase Admin initialization failed:', err);
}

export default admin;
