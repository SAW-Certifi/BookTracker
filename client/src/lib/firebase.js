import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: 'AIzaSyC2-nT7jQfnmyhblwRKMdCEEXpo0Y52oUY',
  authDomain: 'booktracker-d4013.firebaseapp.com',
  projectId: 'booktracker-d4013',
  storageBucket: 'booktracker-d4013.firebasestorage.app',
  messagingSenderId: '31240619381',
  appId: '1:31240619381:web:3caf6b3149d3dbcb913f3c',
  measurementId: 'G-6EXWFCXN4D'
}

export const firebaseApp = initializeApp(firebaseConfig)
export const auth = getAuth(firebaseApp)
