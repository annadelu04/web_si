// MODELLO SESSIONE
// Rappresenta una singola partecipazione di un bambino a un'attività
// (es. quante risposte esatte ha dato in una determinata giocata).

import mongoose from 'mongoose';

// Schema per la collezione "sessions"
const sessionSchema = new mongoose.Schema({

    // Riferimento al bambino che esegue l'attività
    id_utente: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    // Riferimento all'attività giocata o letta
    id_attivita: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Activity',
        required: true
    },

    // Timestamp di inizio sessione
    data_inizio: { type: Date, required: true },

    // Timestamp di fine (se la sessione è ancora in corso, resta vuoto)
    data_fine: { type: Date },

    // Stato di avanzamento dell'attività
    stato: {
        type: String,
        enum: ['in_corso', 'completata', 'annullata'],
        default: 'in_corso'
    },

    // Nota di testo opzionale sulle reazioni del bambino
    feedback_emotivo: { type: String },

    // Risultato dell'attività (punti ed errori accumulati)
    risultato: {
        punteggio: { type: Number, default: 0 },
        errori: { type: Number, default: 0 }
    }

}, {
    // Opzione globale: aggiunge in automatico createdAt e updatedAt per il file DB
    timestamps: true
});

// Esporta il modello per interagire con la collection "sessions"
export const Session = mongoose.model('Session', sessionSchema);
