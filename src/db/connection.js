const { initializeApp, getApps, applicationDefault } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

let db;

function getDb() {
  if (db) return db;
  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (!projectId) throw new Error('Falta configurar FIREBASE_PROJECT_ID');
  const options = { projectId };
  if (!process.env.FIRESTORE_EMULATOR_HOST) {
    options.credential = applicationDefault();
  }
  const app = getApps().find(item => item.name === 'biblioteca')
    || initializeApp(options, 'biblioteca');
  db = getFirestore(app);
  return db;
}

module.exports = { getDb };
