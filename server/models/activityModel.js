// MODELLO ATTIVITÀ
// Definisce lo schema Mongoose per le attività (storie sociali o giochi) 
// nel database MongoDB.

import mongoose from 'mongoose';

// Schema per la collezione "activities"
const activitySchema = new mongoose.Schema({

    // Titolo dell'attività (campo di testo obbligatorio)
    titolo: { type: String, required: true },

    // Descrizione opzionale
    descrizione: { type: String },

    // Categoria: limitata ai valori dell'enum
    categoria: {
        type: String,
        enum: ['storia_sociale', 'gioco'],
        required: true
    },

    // Livello di difficoltà minimo (default 1 se non specificato)
    livello_minimo: { type: Number, default: 1 },

    // Visibilità dell'attività (pubblica o misurata, di default privata)
    is_pubblica: { type: Boolean, default: false },

    // Sotto-documento per le impostazioni e personalizzazioni dell'attività
    configurazione: {
        background_color: { type: String }, // Colore di sfondo
        usa_ai: { type: Boolean, default: false } // Flag utilizzo AI
    },

    // Array di oggetti per gli asset multimediali (immagini, audio, ecc.)
    assets: [{
        tipo: { type: String, enum: ['immagine', 'audio', 'video'] },
        url: { type: String },
        tag: { type: String } // Es: "sfondo", "personaggio"
    }],

    // Riferimento (chiave esterna) al Terapista che ha approvato l'attività
    approvato_da: {
        type: mongoose.Schema.Types.ObjectId, // ID univoco di un altro documento
        ref: 'User', // Punta alla collection User
        default: null
    }

}, {
    // Opzione globale: aggiunge in automatico createdAt e updatedAt
    timestamps: true
});

// Esporta il modello per interagire con la collection "activities"
export const Activity = mongoose.model('Activity', activitySchema);
