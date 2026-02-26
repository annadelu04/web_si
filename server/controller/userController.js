import jwt from 'jsonwebtoken';
import { userModel } from "../models/userModel.js";
import bcryptjs from 'bcryptjs';
import transporter from '../config/nodemailer.js';
import { PROFILE_UPDATE_TEMPLATE, DELETE_OTP_TEMPLATE, CHILD_ADDED_TEMPLATE, THERAPIST_ADDED_TEMPLATE } from '../config/emailTemplates.js';

/**
 * @desc    Recupera i dati completi dell'utente loggato.
 *          Verifica anche l'eventuale presenza di un cookie `childToken` per indicare se c'è
 *          una sessione attiva per un profilo bambino.
 * @route   GET /api/user/data
 * @access  Private
 * @param {Object} req - L'oggetto della richiesta, contenente l'ID utente in req.userId.
 * @param {Object} res - L'oggetto della risposta.
 * @returns {Object} JSON contenente `userData` (nome, cognome, email, avatar, etc.).
 */
export const getUserData = async (req, res) => {
    try {
        // --- MODIFICA IMPORTANTE QUI SOTTO ---
        // NON usare req.body. Il middleware ha messo l'ID direttamente in req.userId
        const userId = req.userId;
        // -------------------------------------

        const user = await userModel.findById(userId);

        if (!user) {
            return res.json({ success: false, message: 'User not found' });
        }

        const isChildActive = !!req.cookies.childToken;

        res.json({
            success: true,
            userData: {
                _id: user._id,
                name: user.anagrafica.nome,
                surname: user.anagrafica.cognome,
                email: user.anagrafica.email,
                isAccountVerified: user.isAccountVerified,
                tipo_utente: user.tipo_utente || "Non Definito",
                isChildActive: isChildActive,
                therapistInfo: user.therapistInfo
            }
        });

    } catch (error) {
        console.error("Errore getUserData:", error);
        res.json({ success: false, message: error.message });
    }
}

/**
 * @desc    Aggiorna il profilo utente (nome, cognome, email, password).
 *          Nel caso dei terapisti, aggiorna anche la specializzazione e il limite bambini seguibili.
 *          Invia un'email di notifica a seguito dell'aggiornamento.
 * @route   PUT /api/user/update
 * @access  Private
 * @param {Object} req - L'oggetto della richiesta, contenente i dati da aggiornare nel body.
 * @param {Object} res - L'oggetto della risposta.
 * @returns {Object} JSON con l'esito dell'operazione.
 */
export const updateProfile = async (req, res) => {
    try {
        const userId = req.userId;
        const { name, surname, email, password } = req.body;

        const user = await userModel.findById(userId);

        if (!user) {
            return res.status(404).json({ success: false, message: 'Utente non trovato.' });
        }

        // Aggiorniamo i campi del profilo
        user.anagrafica.nome = name;
        user.anagrafica.cognome = surname;
        user.anagrafica.email = email;

        if (password) {
            if (password.length < 6) {
                return res.status(400).json({ success: false, message: 'La password deve avere almeno 6 caratteri.' });
            }
            const hashedPassword = await bcryptjs.hash(password, 10);
            user.login.password = hashedPassword;
        }

        // Se è un terapista, aggiorniamo anche i campi specifici
        if (user.tipo_utente === 'terapeuta') {
            const { specialization, maxChildren } = req.body;
            if (specialization !== undefined) user.therapistInfo.specialization = specialization;
            if (maxChildren !== undefined) user.therapistInfo.maxChildren = maxChildren;
        }

        await user.save();

        // Inviare email di notifica
        try {
            const mailOption = {
                from: process.env.SENDER_EMAIL,
                to: user.anagrafica.email,
                subject: "Profilo Aggiornato",
                html: PROFILE_UPDATE_TEMPLATE
                    .replace("{{name}}", user.anagrafica.nome)
                    .replace("{{email}}", user.anagrafica.email)
            };
            await transporter.sendMail(mailOption);
        } catch (emailError) {
            console.log("Errore invio email (non bloccante):", emailError);
        }

        res.json({ success: true, message: 'Profilo aggiornato con successo' });

    } catch (error) {
        console.error("Errore updateProfile:", error);
        res.status(500).json({ success: false, message: error.message });
    }
}


/**
 * @desc    Richiede l'invio di un OTP per avviare la procedura di cancellazione dell'account.
 *          Genera un OTP a 6 cifre valido per 15 minuti e lo invia via email.
 * @route   POST /api/user/request-delete-otp
 * @access  Private
 * @param {Object} req - L'oggetto della richiesta.
 * @param {Object} res - L'oggetto della risposta.
 * @returns {Object} JSON con l'esito dell'invio.
 */
export const requestDeleteOtp = async (req, res) => {
    try {
        const userId = req.userId;
        const user = await userModel.findById(userId);

        if (!user) {
            return res.json({ success: false, message: 'Utente non trovato.' });
        }

        // Genera OTP a 6 cifre
        const otp = String(Math.floor(100000 + Math.random() * 900000));
        user.deleteOtp = otp;
        user.deleteOtpExpireAt = Date.now() + 15 * 60 * 1000; // 15 minuti
        await user.save();

        // Invia email con OTP
        const mailOption = {
            from: process.env.SENDER_EMAIL,
            to: user.anagrafica.email,
            subject: "⚠️ Conferma Eliminazione Profilo",
            html: DELETE_OTP_TEMPLATE
                .replace("{{name}}", user.anagrafica.nome)
                .replace("{{otp}}", otp)
        };

        await transporter.sendMail(mailOption);

        res.json({ success: true, message: 'OTP inviato via email. Controlla la tua casella di posta.' });

    } catch (error) {
        console.error("Errore requestDeleteOtp:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Verifica l'OTP fornito ed elimina definitivamente l'account utente.
 *          Pulisce anche il cookie di autenticazione, terminando la sessione.
 * @route   POST /api/user/verify-delete
 * @access  Private
 * @param {Object} req - L'oggetto della richiesta, contenente l'OTP nel body.
 * @param {Object} res - L'oggetto della risposta.
 * @returns {Object} JSON con l'esito dell'eliminazione.
 */
export const verifyDeleteAndDelete = async (req, res) => {
    try {
        const userId = req.userId;
        const { otp } = req.body;

        if (!otp) {
            return res.json({ success: false, message: 'OTP mancante.' });
        }

        const user = await userModel.findById(userId);

        if (!user) {
            return res.json({ success: false, message: 'Utente non trovato.' });
        }

        // Verifica OTP
        if (user.deleteOtp === '' || user.deleteOtp !== otp) {
            return res.json({ success: false, message: 'OTP non valido.' });
        }

        if (user.deleteOtpExpireAt < Date.now()) {
            return res.json({ success: false, message: 'OTP scaduto. Richiedi un nuovo codice.' });
        }

        // Elimina il profilo
        await userModel.findByIdAndDelete(userId);

        // Pulisci il cookie
        res.clearCookie('token', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict'
        });

        res.json({ success: true, message: 'Profilo eliminato con successo.' });

    } catch (error) {
        console.error("Errore verifyDeleteAndDelete:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Aggiunge il profilo di un nuovo bambino associato all'account genitore.
 *          Consente l'upload di un'immagine avatar tramite form-data o la scelta di un'icona testuale.
 *          Al termine invia una mail al genitore.
 * @route   POST /api/user/children
 * @access  Private (solo Genitori)
 * @param {Object} req - L'oggetto della richiesta, contenente nome, pin e avatar. Gestisce anche l'upload di un file in req.file.
 * @param {Object} res - L'oggetto della risposta.
 * @returns {Object} JSON con l'esito e i dati del bambino creato.
 */
export const addChild = async (req, res) => {
    try {
        const userId = req.userId;
        const { name, pin } = req.body;

        let avatar = req.body.avatar || req.body.avatarIcon;
        if (req.file) {
            // Se c'è un file, costruiamo l'URL (aggiustare porta/host se necessario in produzione)
            // Meglio usare req.protocol e host dinamici
            const protocol = req.protocol;
            const host = req.get('host');
            avatar = `${protocol}://${host}/uploads/${req.file.filename}`;
        } else if (!avatar) {
            avatar = 'FaChild';
        }

        if (!name) {
            return res.json({ success: false, message: 'Nome bambino richiesto.' });
        }

        const user = await userModel.findById(userId);

        if (!user) {
            return res.json({ success: false, message: 'Utente non trovato.' });
        }

        // Aggiungi il bambino all'array
        user.children.push({
            name,
            avatar: avatar || 'FaChild',
            pin: pin || '',
            createdAt: new Date()
        });

        await user.save();

        // Invia email di notifica
        try {
            // Mappa avatar icon a emoji per email
            const avatarEmoji = {
                'FaChild': '👶',
                'FaRocket': '🚀',
                'FaCat': '🐱',
                'FaDog': '🐶',
                'FaHeart': '❤️',
                'FaStar': '⭐',
                'FaCar': '🚗',
                'FaTree': '🌳'
            };

            const mailOption = {
                from: process.env.SENDER_EMAIL,
                to: user.anagrafica.email,
                subject: "Nuovo Profilo Bambino Creato!",
                html: CHILD_ADDED_TEMPLATE
                    .replace("{{parentName}}", user.anagrafica.nome)
                    .replace("{{childName}}", name)
                    .replace("{{avatar}}", avatarEmoji[avatar] || '👶')
            };
            await transporter.sendMail(mailOption);
        } catch (emailError) {
            console.log("Errore invio email (non bloccante):", emailError);
        }

        res.json({ success: true, message: 'Profilo bambino aggiunto con successo!', child: user.children[user.children.length - 1] });

    } catch (error) {
        console.error("Errore addChild:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Recupera la lista di tutti i profili bambino associati all'utente (Genitore).
 * @route   GET /api/user/children
 * @access  Private
 * @param {Object} req - L'oggetto della richiesta.
 * @param {Object} res - L'oggetto della risposta.
 * @returns {Object} JSON contenente l'array dei bambini.
 */
export const getChildren = async (req, res) => {
    try {
        const userId = req.userId;
        const user = await userModel.findById(userId);

        if (!user) {
            return res.json({ success: false, message: 'Utente non trovato.' });
        }

        res.json({ success: true, children: user.children || [] });

    } catch (error) {
        console.error("Errore getChildren:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Permette a un genitore di passare al profilo di uno specifico bambino per accedere alla "Child Dashboard".
 *          Crea un cookie HTTP-Only 'childToken' separato per gestire questa sotto-sessione limitata.
 *          Verifica il PIN se è stato impostato sul profilo del bambino.
 * @route   POST /api/user/child/:childId/switch
 * @access  Private
 * @param {Object} req - L'oggetto della richiesta, contenente childId nei params e pin nel body.
 * @param {Object} res - L'oggetto della risposta, restituisce il token limitato al bambino tramite cookie.
 * @returns {Object} JSON con i dati base del bambino loggato.
 */
export const switchToChild = async (req, res) => {
    try {
        const userId = req.userId;
        const { childId } = req.params;
        const { pin } = req.body;

        const user = await userModel.findById(userId);

        if (!user) {
            return res.json({ success: false, message: 'Utente non trovato.' });
        }

        // Trova il bambino
        const child = user.children.id(childId);

        if (!child) {
            return res.json({ success: false, message: 'Profilo bambino non trovato.' });
        }

        // Verifica PIN se impostato
        if (child.pin && child.pin !== pin) {
            return res.json({ success: false, message: 'PIN non corretto.' });
        }

        // Crea un token limitato per il bambino (include parentId e childId)
        // ← RIMUOVI: const jwt = require('jsonwebtoken');
        const childToken = jwt.sign(
            {
                parentId: userId,
                childId: child._id,
                childName: child.name,
                isChild: true
            },
            process.env.JWT_SECRETE,
            { expiresIn: "7d" }
        );

        res.cookie('childToken', childToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        res.json({
            success: true,
            message: `Benvenuto ${child.name}!`,
            child: {
                id: child._id,
                name: child.name,
                avatar: child.avatar
            }
        });

    } catch (error) {
        console.error("Errore switchToChild:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ===== GESTIONE TERAPISTI =====

/**
 * @desc    Effettua il logout dalla dashboard bambino, permettendo al genitore di reinserire i PIN
 *          o di accedere ad altri profili figli. Rimuove il cookie `childToken`.
 * @route   POST /api/user/logout-child
 * @access  Private
 * @param {Object} req - L'oggetto della richiesta.
 * @param {Object} res - L'oggetto della risposta, utile per pulire il cookie.
 * @returns {Object} JSON indicante l'esito dell'operazione.
 */
export const logoutChild = async (req, res) => {
    try {
        // Pulisci il cookie childToken
        res.clearCookie('childToken', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict'
        });

        res.json({ success: true, message: 'Logout bambino effettuato con successo.' });

    } catch (error) {
        console.error("Errore logoutChild:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Permette al genitore di inviare una richiesta a un terapista (tramite la sua email).
 *          Controlla se il terapista esiste, se non ha superato il tetto massimo pazienti,
 *          quindi aggiunge la richiesta in stato "pending" nella lista del genitore.
 *          Infine, invia una email di notifica al terapista.
 * @route   POST /api/user/therapist
 * @access  Private (solo Genitori)
 * @param {Object} req - L'oggetto della richiesta, contenente l'email del terapista nel body.
 * @param {Object} res - L'oggetto della risposta.
 * @returns {Object} JSON con l'esito dell'operazione.
 */
export const addTherapist = async (req, res) => {
    try {
        const parentId = req.userId;
        const { therapistEmail } = req.body;

        if (!therapistEmail) {
            return res.json({ success: false, message: 'Email terapista richiesta.' });
        }

        const therapist = await userModel.findOne({ 'anagrafica.email': therapistEmail, tipo_utente: 'terapeuta' });

        if (!therapist) {
            return res.json({ success: false, message: 'Terapista non trovato.' });
        }

        // Check if therapist has reached max children
        if (therapist.therapistInfo.currentChildren >= therapist.therapistInfo.maxChildren) {
            return res.json({ success: false, message: 'Terapista ha raggiunto il limite massimo di bambini.' });
        }

        const parent = await userModel.findById(parentId);

        // Check if already added
        const alreadyAdded = parent.therapists.some(t => t.therapistId.toString() === therapist._id.toString());
        if (alreadyAdded) {
            return res.json({ success: false, message: 'Terapista già aggiunto.' });
        }

        // Add therapist as pending invitation
        parent.therapists.push({
            therapistId: therapist._id,
            addedAt: new Date(),
            status: 'pending' // New connections are always pending
        });
        await parent.save();

        // NOTE: We no longer increment therapist.therapistInfo.currentChildren here.
        // It will happen only when the therapist accepts the invitation.

        // Send email to therapist
        try {
            const mailOption = {
                from: process.env.SENDER_EMAIL,
                to: therapist.anagrafica.email,
                subject: "Nuovo Genitore Assegnato",
                html: THERAPIST_ADDED_TEMPLATE
                    .replace("{{therapistName}}", therapist.anagrafica.nome)
                    .replace("{{parentName}}", `${parent.anagrafica.nome} ${parent.anagrafica.cognome}`)
                    .replace("{{parentEmail}}", parent.anagrafica.email)
            };
            await transporter.sendMail(mailOption);
        } catch (emailError) {
            console.log("Errore invio email (non bloccante):", emailError);
        }

        res.json({ success: true, message: 'Terapista aggiunto con successo!' });

    } catch (error) {
        console.error("Errore addTherapist:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Recupera l'elenco dei terapisti associati a un genitore, mostrando lo stato (pendente/accettato).
 * @route   GET /api/user/therapists
 * @access  Private (solo Genitori)
 * @param {Object} req - L'oggetto della richiesta.
 * @param {Object} res - L'oggetto della risposta.
 * @returns {Object} JSON con l'elenco dei terapisti popolato coi rispettivi dati anagrafici.
 */
export const getTherapists = async (req, res) => {
    try {
        const parentId = req.userId;
        const parent = await userModel.findById(parentId).populate('therapists.therapistId');

        const therapists = parent.therapists.map(t => ({
            id: t.therapistId._id,
            name: `${t.therapistId.anagrafica.nome} ${t.therapistId.anagrafica.cognome}`,
            email: t.therapistId.anagrafica.email,
            specialization: t.therapistId.therapistInfo?.specialization || 'Generale',
            addedAt: t.addedAt,
            status: t.status // 'pending' or 'accepted'
        }));

        res.json({ success: true, therapists });

    } catch (error) {
        console.error("Errore getTherapists:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Rimuove la connessione tra un Genitore e un Terapista.
 *          Questa funzione può essere chiamata sia dal Genitore (per rimuovere un terapista suo)
 *          sia dal Terapista (per "dimettere" la famiglia di un genitore).
 *          Aggiorna conseguentemente i conteggi dei pazienti del terapista e manda le relative notifiche email.
 * @route   POST /api/user/remove-connection
 * @access  Private
 * @param {Object} req - L'oggetto della richiesta, contenente targetId (ID dell'altro lato della connessione) nel body.
 * @param {Object} res - L'oggetto della risposta.
 * @returns {Object} JSON con l'esito.
 */
export const removeConnection = async (req, res) => {
    try {
        const userId = req.userId;
        const { targetId } = req.body;

        const currentUser = await userModel.findById(userId);

        if (currentUser.tipo_utente === 'terapeuta') {
            const parent = await userModel.findById(targetId);
            if (!parent) return res.json({ success: false, message: "Genitore non trovato" });

            parent.therapists = parent.therapists.filter(t => t.therapistId.toString() !== userId);

            if (currentUser.therapistInfo.currentChildren > 0) {
                const childrenCount = parent.children.length;
                currentUser.therapistInfo.currentChildren = Math.max(0, currentUser.therapistInfo.currentChildren - childrenCount);
                await currentUser.save();
            }

            await parent.save();

            // Notifica via email al Genitore
            try {
                const mailOption = {
                    from: process.env.SENDER_EMAIL,
                    to: parent.anagrafica.email,
                    subject: "Interruzione collaborazione con Terapista",
                    html: `
                        <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                            <h2 style="color: #e53e3e;">Collaborazione Terminata</h2>
                            <p>Ciao ${parent.anagrafica.nome},</p>
                            <p>Il terapista <strong>${currentUser.anagrafica.nome} ${currentUser.anagrafica.cognome}</strong> ha rimosso il collegamento con il tuo profilo.</p>
                            <p>Non avrà più accesso ai dati dei tuoi bambini.</p>
                            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                            <p style="font-size: 12px; color: #888;">Se credi si tratti di un errore, contatta direttamente il professionista.</p>
                        </div>
                    `
                };
                await transporter.sendMail(mailOption);
            } catch (e) { console.error("Email error:", e); }

            res.json({ success: true, message: "Genitore rimosso dai pazienti e notificato." });

        } else {
            // È UN GENITORE CHE RIMUOVE UN TERAPISTA
            // 1. Rimuovo il terapista dalla lista del genitore
            currentUser.therapists = currentUser.therapists.filter(t => t.therapistId.toString() !== targetId);

            // 2. Aggiorno il contatore del terapista
            const therapist = await userModel.findById(targetId);
            if (therapist) {
                const childrenCount = currentUser.children.length;
                therapist.therapistInfo.currentChildren = Math.max(0, therapist.therapistInfo.currentChildren - childrenCount);
                await therapist.save();

                // Notifica via email al Terapista
                try {
                    const mailOption = {
                        from: process.env.SENDER_EMAIL,
                        to: therapist.anagrafica.email,
                        subject: "Un Genitore ha rimosso la connessione",
                        html: `
                            <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                                <h2 style="color: #e53e3e;">Collaborazione Terminata</h2>
                                <p>Ciao ${therapist.anagrafica.nome},</p>
                                <p>Il genitore <strong>${currentUser.anagrafica.nome} ${currentUser.anagrafica.cognome}</strong> ha rimosso il collegamento con il tuo profilo.</p>
                                <p>Il numero dei tuoi pazienti seguiti è stato aggiornato.</p>
                                <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                            </div>
                        `
                    };
                    await transporter.sendMail(mailOption);
                } catch (e) { console.error("Email error:", e); }
            }

            await currentUser.save();
            res.json({ success: true, message: "Terapista rimosso e notificato." });
        }

    } catch (error) {
        console.error("Errore removeConnection:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Effettua una ricerca restituendo la lista di tutti gli utenti di tipo 'terapeuta'.
 *          Nasconde informazioni sensibili restituendo solo email, nome e specializzazione.
 * @route   GET /api/user/search-therapists
 * @access  Private (solitamente per Genitori)
 * @param {Object} req - L'oggetto della richiesta.
 * @param {Object} res - L'oggetto della risposta.
 * @returns {Object} JSON contenente la lista formattata dei terapisti a sistema.
 */
export const searchTherapists = async (req, res) => {
    try {
        const therapists = await userModel.find({ tipo_utente: 'terapeuta' })
            .select('anagrafica.nome anagrafica.cognome anagrafica.email therapistInfo');

        const formatted = therapists.map(t => ({
            id: t._id,
            name: `${t.anagrafica.nome} ${t.anagrafica.cognome}`,
            email: t.anagrafica.email,
            specialization: t.therapistInfo?.specialization || 'Generale',
            maxChildren: t.therapistInfo?.maxChildren,
            currentChildren: t.therapistInfo?.currentChildren
        }));

        res.json({ success: true, therapists: formatted });

    } catch (error) {
        console.error("Errore searchTherapists:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Modifica i dati del profilo di un bambino (nome, pin o avatar).
 *          L'avatar può essere aggiornato sostituendo il file esistente.
 * @route   PUT /api/user/child/:childId
 * @access  Private (solo Genitori)
 * @param {Object} req - L'oggetto della richiesta, contenente l'ID bambino nei params e le nuove info nel body/files.
 * @param {Object} res - L'oggetto della risposta.
 * @returns {Object} JSON con i dati aggiornati del bambino.
 */
export const editChild = async (req, res) => {
    try {
        const parentId = req.userId;
        const { childId } = req.params;
        const { name, pin } = req.body;

        // Gestione avatar: file o stringa icona
        let avatar = req.body.avatar;
        if (req.file) {
            avatar = `http://localhost:4000/uploads/${req.file.filename}`;
        }

        const parent = await userModel.findById(parentId);
        const child = parent.children.id(childId);

        if (!child) {
            return res.json({ success: false, message: 'Profilo bambino non trovato.' });
        }

        if (name) child.name = name;
        // Aggiorna avatar solo se è stato passato qualcosa (file o stringa nuova)
        if (avatar) child.avatar = avatar;
        if (pin !== undefined) child.pin = pin;

        await parent.save();

        res.json({ success: true, message: 'Profilo bambino aggiornato!', child });

    } catch (error) {
        console.error("Errore editChild:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Elimina il profilo di un bambino dalla lista del genitore.
 * @route   DELETE /api/user/child/:childId
 * @access  Private (solo Genitori)
 * @param {Object} req - L'oggetto della richiesta, contenente l'esistenza di un parametro childId.
 * @param {Object} res - L'oggetto della risposta.
 * @returns {Object} JSON che informa sull'eliminazione.
 */
export const deleteChild = async (req, res) => {
    try {
        const parentId = req.userId;
        const { childId } = req.params;

        const parent = await userModel.findById(parentId);
        parent.children.pull(childId);
        await parent.save();

        res.json({ success: true, message: 'Profilo bambino eliminato.' });

    } catch (error) {
        console.error("Errore deleteChild:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};