const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

function loadServiceAccountFromPath() {
  const keyPath = process.env.FIREBASE_SERVICE_ACCOUNT_KEY_PATH;
  if (!keyPath) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_KEY_PATH is not set. Put your JSON at server/firebaseServiceAccount.json and set FIREBASE_SERVICE_ACCOUNT_KEY_PATH=server/firebaseServiceAccount.json"
    );
  }
  // Resolve relative to project root (process.cwd())
  const resolved = path.resolve(process.cwd(), keyPath);
  const raw = fs.readFileSync(resolved, "utf8");
  return JSON.parse(raw);
}

let initialized = false;

function getAdmin() {
  if (!initialized) {
    const creds = loadServiceAccountFromPath();
    admin.initializeApp({
      credential: admin.credential.cert(creds),
    });
    initialized = true;
  }
  return admin;
}

module.exports = getAdmin();
