# Book Tracker

Book Tracker is a reading log that lets you manage your personal library while integrating AI, allowing you to generate new book recommendations. The React/Vite client communicates with an Express/MongoDB API that requires Firebase-authenticated requests.

- Track books with ratings, **we should add book progress or notes**.
- Filter, search, paginate, and sort entries.
- Toggle light/dark themes.
- Request new book recommendations generated through Google Gemini.
- Secure all API access behind Firebase Authentication with email verification.

## Live Hosting
- Front end (Vercel): https://book-tracker-project.vercel.app/
- Back end (Render): https://certifi-test-app.onrender.com/

> Render free instances sleep after inactivity. If the UI shows API errors, open the backend URL above in a browser tab to wake the service and try again.

## Tech
- React 19 + Vite + Axios
- Firebase Authentication (client) & Firebase Admin SDK (server)
- Express 5, Mongoose 8, MongoDB Atlas
- Google Gemini API for AI recommendations
- Vercel (frontend hosting) + Render (backend hosting)

## Hosting Locally

### Prerequisites
- Node.js 18+ (developed with Node 20)
- npm 9+
- MongoDB connection string
- Firebase service account credentials for the same project used by the client
- Google AI Studio API key

### Clone and Install
```bash
git clone https://github.com/SAW-Certifi/Certifi-Test-App
cd Certifi-Test-App
```

Install dependencies for each workspace:
```bash
cd server
npm install
cd ../client
npm install
```

### Environment Variables
Create `server/.env` with the following keys:

```bash
PORT=5000                   # optional, defaults to 5000
MONGO_URI=                   # MongoDB connection string

# Firebase Admin service account (all data in json file provided from Firebase)
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_PRIVATE_KEY_ID=
FIREBASE_CLIENT_ID=
FIREBASE_AUTH_URI=
FIREBASE_TOKEN_URI=
FIREBASE_AUTH_PROVIDER_X509_CERT_URL=
FIREBASE_CLIENT_X509_CERT_URL=
FIREBASE_UNIVERSE_DOMAIN=googleapis.com
FIREBASE_TYPE=service_account

# Google Gemini API
AI_API_KEY=
```

Create `client/.env` if you want the frontend to point somewhere other than `http://localhost:5000`:
```bash
VITE_API_URL=http://localhost:5000
```

### Run the App
Start the backend (from `server/`):
```bash
npm run dev
```

Start the frontend (from `client/`):
```bash
npm run dev
```

Vite will print a local URL (ie. `http://localhost:5173`). The client proxies API requests to `VITE_API_URL` (or `http://localhost:5000` by default).

## Troubleshooting
- **401/403 errors** - Make sure you are signed in, your email is verified, and the backend has the correct Firebase Admin credentials.
- **AI recommendation errors** - Verify `AI_API_KEY` has access to Gemini and the backend can reach the API.
- **Timeouts** - Wake the Render backend by visiting https://certifi-test-app.onrender.com/ before trying the hosted frontend.
- **MongoDB connection failures** - Make sure `MONGO_URI` is reachable from your machine or hosting environment.

## Project Structure
```
client/   # React/Vite application
server/   # Express API + MongoDB + Firebase Admin + Gemini integration
```