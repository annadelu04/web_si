import express from 'express';
// Importiamo le funzioni "Controller"-- contengono la logica vera e propria
import { register, login, logOut, sendVerifyOtp, verifyOtp, isUserAuthenticate, sendResetOtp, verifyResetOtp, resetPassword } from '../controller/authController.js';

// Importiamo il Middleware di autenticazione--controlla se l'utente ha un Token valido.
import { userAuth } from '../middleware/userAuth.js';

// Creiamo un'istanza del Router di Express.
// Questo ci permette di definire un gruppo di rotte (es: /api/auth/...) in un file separato e pulito.
export const authRouter = express.Router();

// --- 1. ROTTE DI ACCESSO E USCITA (PUBBLICHE) ---
authRouter.post('/register', register); // Crea un nuovo utente nel DB
authRouter.post('/login', login);       // Verifica credenziali e genera il Cookie/Token
authRouter.post('/logout', logOut);     // Cancella il Cookie di sessione

// --- 2. ROTTE DI VERIFICA ACCOUNT (PROTETTE) ---
authRouter.post('/send-verify-otp', userAuth, sendVerifyOtp); // Invia email con codice OTP all'utente loggato
authRouter.post('/verify-account', userAuth, verifyOtp);      // Controlla se il codice inserito dall'utente è corretto

// --- 3. ROTTA DI CONTROLLO STATO (PROTETTA) ---
// Chiamata dal Frontend (App.jsx) appena si apre il sito per sapere: "Sono ancora loggato?"
authRouter.get('/is-auth', userAuth, isUserAuthenticate);

// --- 4. ROTTE RECUPERO PASSWORD (PUBBLICHE) ---
// pubbliche perché l'utente che ha perso la password non può loggarsi.
authRouter.post('/send-reset-otp', sendResetOtp);     // Step 1: L'utente inserisce l'email -> Server manda codice
authRouter.post('/verify-reset-otp', verifyResetOtp); // Step 2: L'utente inserisce il codice ricevuto
authRouter.post('/reset-password', resetPassword);    // Step 3: L'utente inserisce la NUOVA password