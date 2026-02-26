// IMPORTAZIONI PRINCIPALI
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv/config';
import cookieParser from 'cookie-parser';
import path from 'path';

// IMPORTAZIONI DAI FILE DI PROGETTO (Configurazioni e Rotte)
import { connectDB } from './config/mongoDbConnection.js';
import { authRouter } from './routes/authRoutes.js'
import userRouter from './routes/userRoute.js';
import storyRouter from './routes/storyRoute.js';
import approvalRouter from './routes/approvalRoute.js';

const app = express();
const PORT = process.env.PORT || 4000;

// Connessione al Database MongoDB
connectDB().then(async () => {
  // FIX AUTOMATICO INDICI: Rimuove il vecchio indice email_1 che può causare conflitti durante lo sviluppo
  try {
    const mongoose = await import('mongoose');
    await mongoose.connection.collection('users').dropIndex('email_1');
    console.log("✅ Vecchio indice 'email_1' rimosso con successo.");
  } catch (e) {
    // Ignoriamo l'errore se l'indice non esiste già
    console.log("ℹ️ Nessun indice 'email_1' da rimuovere o errore:", e.message);
  }
});

// MIDDLEWARES (Funzioni che processano le richieste prima delle rotte)
app.use(express.json()); // Permette di ricevere dati in formato JSON nel corpo delle richieste
app.use(cookieParser()); // Permette al server di leggere i cookie inviati dal browser

// Configurazione CORS (Permette al frontend di comunicare col backend)
app.use(cors({
  origin: function (origin, callback) {
    // Permette richieste senza origine (es. strumenti di test come Postman)
    if (!origin) return callback(null, true);

    // Permette tutte le richieste provenienti da localhost (ambiente di sviluppo)
    if (origin && origin.startsWith('http://localhost:')) {
      return callback(null, true);
    }

    // Elenco degli URL di produzione autorizzati
    const allowedOrigins = [
      process.env.FRONTEND_URL,
      'https://mern-authentication-system-jw.vercel.app',
      'https://mern-authentication-system-using-jwt-and.vercel.app'
    ];

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true // Necessario per permettere l'invio dei cookie (JWT)
}));

// Rendiamo pubblica la cartella 'uploads' così il frontend può visualizzare immagini e video
app.use('/uploads', express.static('uploads'));

// API ENDPOINTS (Punti di ingresso per le diverse funzionalità)
app.get('/', (req, res) => {
  res.send('<h1>Benvenuto sul Backend di Storie Amiche! 🌈</h1>');
})

app.use('/api/auth', authRouter);       // Rotte per Autenticazione (Login, Register)
app.use('/api/user', userRouter);       // Rotte per Profilo e Utenti
app.use('/api/story', storyRouter);     // Rotte per le Storie Terapeutiche
app.use('/api/approval', approvalRouter); // Rotte per la Revisione delle Storie (Terapisti)

// Avvio del server
app.listen(PORT, () => {
  console.log(`🚀 Server in esecuzione su: http://localhost:${PORT}`);
}
)