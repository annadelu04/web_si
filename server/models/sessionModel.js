import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema({
    id_utente: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Riferimento all'utente (bambino)
        required: true
    },
    id_attivita: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Activity', // Riferimento all'attività
        required: true
    },
    data_inizio: { type: Date, required: true },
    data_fine: { type: Date }, // Se presente, la sessione è finita
    stato: {
        type: String,
        enum: ['in_corso', 'completata', 'annullata'],
        default: 'in_corso'
    },
    feedback_emotivo: { type: String },
    risultato: {
        punteggio: { type: Number, default: 0 },
        errori: { type: Number, default: 0 }
    }
}, { timestamps: true });

export const Session = mongoose.model('Session', sessionSchema);