// models/activityModel.js
import mongoose from 'mongoose';

const activitySchema = new mongoose.Schema({
    titolo: { type: String, required: true },
    descrizione: { type: String },
    categoria: {
        type: String,
        enum: ['storia_sociale', 'gioco'], // Puoi aggiungere altre categorie
        required: true
    },
    livello_minimo: { type: Number, default: 1 },
    is_pubblica: { type: Boolean, default: false },
    configurazione: { // Per campi specifici di ogni categoria
        background_color: { type: String },
        usa_ai: { type: Boolean, default: false }
    },
    assets: [{ // Array di assets (immagini, audio...)
        tipo: { type: String, enum: ['immagine', 'audio', 'video'] },
        url: { type: String },
        tag: { type: String } // Es: "sfondo", "personaggio"
    }],
    approvato_da: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Riferimento all'utente (terapeuta) che approva
        default: null
    }
}, { timestamps: true });

export const Activity = mongoose.model('Activity', activitySchema);