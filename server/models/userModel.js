import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    // --- TIPO DI UTENTE ---
    // Definiamo se l'utente è un genitore (adulto), un terapeuta o un bambino (account principale)
    tipo_utente: {
        type: String,
        required: true,
        default: 'adulto', // Default: Genitore
        enum: ['bambino', 'adulto', 'terapeuta']
    },

    // --- RELAZIONI GERARCHICHE ---
    // Se l'utente è un 'bambino', questo campo indica chi lo gestisce (genitore o terapeuta)
    seguito_da: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],

    // --- DATI PERSONALI ---
    anagrafica: {
        nome: { type: String, required: true },
        cognome: { type: String, required: true },
        // 'sparse: true' permette a più utenti di avere codice_fiscale NULL senza violare l'unicità
        codice_fiscale: { type: String, unique: true, sparse: true },
        eta: { type: Number },
        telefono: { type: String },
        email: { type: String, required: true, unique: true }
    },

    // --- CREDENZIALI DI ACCESSO ---
    login: {
        password: { type: String, required: true },
        nuovo_utente: { type: Boolean, default: true } // Flag per eventuale onboarding
    },

    // --- GAMIFICATION (LIVENLLO E PUNTI) ---
    profilo: {
        livello: { type: Number, default: 1 },
        punti_totali: { type: Number, default: 0 },
        avatar: { type: String, default: "" }
    },

    // --- SICUREZZA E VERIFICA ---
    isAccountVerified: { type: Boolean, default: false }, // L'account è stato verificato via email?
    verifyOtp: { type: String, default: '' },             // OTP per verifica email
    verifyOtpExpireAt: { type: Number, default: 0 },
    resetOtp: { type: String, default: '' },              // OTP per reset password
    resetOtpExpireAt: { type: Number, default: 0 },
    deleteOtp: { type: String, default: '' },             // OTP per cancellazione account
    deleteOtpExpireAt: { type: Number, default: 0 },

    // --- PROFILI BAMBINI (SOTTOPROFILI) ---
    // Un genitore può avere più profili 'bambino' per passare da un contesto all'altro (stile Netflix)
    children: [{
        name: { type: String, required: true },
        avatar: { type: String, default: 'FaChild' }, // Icona react-icons
        pin: { type: String, default: '' },           // PIN opzionale di protezione
        createdAt: { type: Date, default: Date.now }
    }],

    // --- DATI SPECIFICI TERAPEUTA ---
    therapistInfo: {
        specialization: { type: String, default: '' }, // Es: Logopedista
        maxChildren: { type: Number, default: 10 },    // Limite pazienti gestibili
        currentChildren: { type: Number, default: 0 }
    },

    // --- TERAPISTI COLLEGATI (LATO GENITORE) ---
    // Un genitore può collegare il proprio account a uno o più terapisti
    therapists: [{
        therapistId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        addedAt: { type: Date, default: Date.now },
        status: { type: String, enum: ['pending', 'accepted'], default: 'pending' } // Stato della richiesta
    }]

}, { timestamps: true });

export const userModel = mongoose.model("User", userSchema);