import storyModel from "../models/storyModel.js";
import { userModel } from "../models/userModel.js";
import transporter from '../config/nodemailer.js';
import {
    STORY_PENDING_TEMPLATE,
    STORY_APPROVED_TEMPLATE,
    STORY_REJECTED_TEMPLATE,
    INVITATION_ACCEPTED_TEMPLATE,
    INVITATION_REJECTED_TEMPLATE
} from '../config/emailTemplates.js';

/**
 * Recupera tutte le storie in attesa di approvazione ('PENDING') inviate dai genitori associati al terapista.
 * @param {Object} req - L'oggetto della richiesta, contenente l'ID del terapista (req.userId).
 * @param {Object} res - L'oggetto della risposta, utilizzato per restituire le storie trovate con le rispettive info del genitore.
 * @returns {Object} JSON con { success: true, stories: [...] } in caso di successo.
 */
export const getPendingStories = async (req, res) => {
    try {
        const therapistId = req.userId;

        // Trova tutti i genitori che hanno questo terapista con stato 'accepted'
        const parents = await userModel.find({
            therapists: {
                $elemMatch: {
                    therapistId: therapistId,
                    status: 'accepted'
                }
            }
        });

        const parentIds = parents.map(p => p._id.toString());

        // Trova tutte le storie PENDING di questi genitori
        const pendingStories = await storyModel.find({
            userId: { $in: parentIds },
            status: 'PENDING'
        }).sort({ createdAt: -1 });

        // Popola con info genitore
        const storiesWithParent = await Promise.all(
            pendingStories.map(async (story) => {
                const parent = await userModel.findById(story.userId);
                return {
                    ...story.toObject(),
                    parentName: parent ? `${parent.anagrafica.nome} ${parent.anagrafica.cognome}` : 'Sconosciuto',
                    parentEmail: parent ? parent.anagrafica.email : ''
                };
            })
        );

        res.json({ success: true, stories: storiesWithParent });

    } catch (error) {
        console.error("Errore getPendingStories:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Approva una storia specifica.
 * Cambia lo stato della storia in 'APPROVED', segna l'ID del terapista che l'ha revisionata
 * e invia un'email di notifica al genitore dell'avvenuta approvazione.
 * @param {Object} req - L'oggetto della richiesta, contenente req.params.storyId e l'ID del terapista (req.userId).
 * @param {Object} res - L'oggetto della risposta, restituisce un messaggio di conferma.
 * @returns {Object} JSON con { success: true, message: '...' } in caso di successo.
 */
export const approveStory = async (req, res) => {
    try {
        const therapistId = req.userId;
        const { storyId } = req.params;

        const story = await storyModel.findById(storyId);

        if (!story) {
            return res.json({ success: false, message: 'Storia non trovata.' });
        }

        // Aggiorna status
        story.status = 'APPROVED';
        story.reviewedBy = therapistId;
        story.reviewedAt = new Date();
        await story.save();

        // Invia email al genitore
        try {
            const parent = await userModel.findById(story.userId);
            const therapist = await userModel.findById(therapistId);

            if (parent && therapist) {
                const mailOption = {
                    from: process.env.SENDER_EMAIL,
                    to: parent.anagrafica.email,
                    subject: "Storia Approvata!",
                    html: STORY_APPROVED_TEMPLATE
                        .replace("{{parentName}}", parent.anagrafica.nome)
                        .replace("{{storyTitle}}", story.title)
                };
                await transporter.sendMail(mailOption);
            }
        } catch (emailError) {
            console.log("Errore invio email (non bloccante):", emailError);
        }

        res.json({ success: true, message: 'Storia approvata con successo!' });

    } catch (error) {
        console.error("Errore approveStory:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Rifiuta una storia specifica fornendo una motivazione obbligatoria.
 * Cambia lo stato della storia in 'REJECTED', salva il motivo del rifiuto inviato dal terapista
 * e invia un'email di notifica al genitore con i dettagli della motivazione.
 * @param {Object} req - L'oggetto della richiesta, contenente req.params.storyId, req.body.reason (motivazione) e req.userId.
 * @param {Object} res - L'oggetto della risposta, restituisce l'esito dell'operazione.
 * @returns {Object} JSON con l'esito dell'operazione.
 */
export const rejectStory = async (req, res) => {
    try {
        const therapistId = req.userId;
        const { storyId } = req.params;
        const { reason } = req.body;

        if (!reason) {
            return res.json({ success: false, message: 'Motivazione richiesta.' });
        }

        const story = await storyModel.findById(storyId);

        if (!story) {
            return res.json({ success: false, message: 'Storia non trovata.' });
        }

        // Aggiorna status
        story.status = 'REJECTED';
        story.rejectionReason = reason;
        story.reviewedBy = therapistId;
        story.reviewedAt = new Date();
        await story.save();

        // Invia email al genitore
        try {
            const parent = await userModel.findById(story.userId);
            const therapist = await userModel.findById(therapistId);

            if (parent && therapist) {
                const mailOption = {
                    from: process.env.SENDER_EMAIL,
                    to: parent.anagrafica.email,
                    subject: "Storia Non Approvata",
                    html: STORY_REJECTED_TEMPLATE
                        .replace("{{parentName}}", parent.anagrafica.nome)
                        .replace("{{storyTitle}}", story.title)
                        .replace("{{rejectionReason}}", reason)
                };
                await transporter.sendMail(mailOption);
            }
        } catch (emailError) {
            console.log("Errore invio email (non bloccante):", emailError);
        }

        res.json({ success: true, message: 'Storia rifiutata.' });

    } catch (error) {
        console.error("Errore rejectStory:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Ottiene la lista dei bambini che sono in carico al terapista, raggruppati per famiglia (genitore).
 * Cerca tra i genitori quelli che hanno legami accettati con il terapista e formatta
 * la risposta aggregando i dati dei genitori con i figli a loro associati.
 * @param {Object} req - L'oggetto della richiesta, contenente l'ID del terapista (req.userId).
 * @param {Object} res - L'oggetto della risposta, restituisce l'elenco delle famiglie con i relativi bambini.
 * @returns {Object} JSON con { success: true, families: [...] }.
 */
export const getAssignedChildren = async (req, res) => {
    try {
        const therapistId = req.userId;

        // Trova tutti i genitori che hanno questo terapista con stato 'accepted'
        const parents = await userModel.find({
            therapists: {
                $elemMatch: {
                    therapistId: therapistId,
                    status: 'accepted'
                }
            }
        });

        // Raggruppa per Famiglia (Genitore -> Figli)
        const families = parents.map(parent => ({
            parentId: parent._id,
            parentName: `${parent.anagrafica.nome} ${parent.anagrafica.cognome}`,
            parentEmail: parent.anagrafica.email,
            avatar: parent.profilo.avatar, // Opzionale se volessimo mostrare avatar genitore
            children: parent.children.map(child => ({
                _id: child._id,
                name: child.name,
                avatar: child.avatar,
                pin: child.pin
            }))
        }));

        res.json({ success: true, families }); // Change 'children' to 'families'

    } catch (error) {
        console.error("Errore getAssignedChildren:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Recupera tutti gli inviti in attesa ('pending') inviati dai genitori e diretti al terapista corrente.
 * Controlla nell'array dei terapisti nei documenti dei genitori e ne estrae le informazioni assieme alla data di richiesta.
 * @param {Object} req - L'oggetto della richiesta, contenente l'ID del terapista (req.userId).
 * @param {Object} res - L'oggetto della risposta, restituisce l'elenco degli inviti.
 * @returns {Object} JSON con { success: true, invitations: [...] }.
 */
export const getPendingInvitations = async (req, res) => {
    try {
        const therapistId = req.userId;

        // Trova tutti i genitori che hanno inviato un invito pendente a questo terapista
        const parents = await userModel.find({
            therapists: {
                $elemMatch: {
                    therapistId: therapistId,
                    status: 'pending'
                }
            }
        });

        const invitations = parents.map(parent => ({
            parentId: parent._id,
            parentName: `${parent.anagrafica.nome} ${parent.anagrafica.cognome}`,
            parentEmail: parent.anagrafica.email,
            invitedAt: parent.therapists.find(t => t.therapistId.toString() === therapistId).addedAt
        }));

        res.json({ success: true, invitations });

    } catch (error) {
        console.error("Errore getPendingInvitations:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Permette al terapista di gestire (accettare o rifiutare) l'invito inviato da un genitore.
 * Se l'azione è 'accept', controlla i limiti massimi di pazienti e, se c'è spazio, aggiorna lo stato a 'accepted'
 * incrementando i conteggi e invia una mail al genitore.
 * Se l'azione è 'reject', rimuove direttamente la richiesta dalla lista del genitore e lo notifica.
 * @param {Object} req - L'oggetto della richiesta, contenente req.body.parentId, req.body.action ('accept'|'reject') e req.userId.
 * @param {Object} res - L'oggetto della risposta, restituisce l'esito dell'operazione.
 * @returns {Object} JSON con un messaggio di successo o o di errore.
 */
export const respondToInvitation = async (req, res) => {
    try {
        const therapistId = req.userId;
        const { parentId, action } = req.body; // action: 'accept' or 'reject'

        if (!['accept', 'reject'].includes(action)) {
            return res.json({ success: false, message: "Azione non valida." });
        }

        const parent = await userModel.findById(parentId);
        if (!parent) {
            return res.json({ success: false, message: "Genitore non trovato." });
        }

        const therapist = await userModel.findById(therapistId);
        const therapistIndex = parent.therapists.findIndex(t => t.therapistId.toString() === therapistId);

        if (therapistIndex === -1) {
            return res.json({ success: false, message: "Invito non trovato." });
        }

        if (action === 'accept') {
            // Verifica limite massimo bambini
            if (therapist.therapistInfo.currentChildren + parent.children.length > therapist.therapistInfo.maxChildren) {
                return res.json({ success: false, message: "Hai raggiunto il limite massimo di pazienti." });
            }

            parent.therapists[therapistIndex].status = 'accepted';
            await parent.save();

            therapist.therapistInfo.currentChildren += parent.children.length;
            await therapist.save();

            // Notify parent
            try {
                const mailOption = {
                    from: process.env.SENDER_EMAIL,
                    to: parent.anagrafica.email,
                    subject: "Invito Accettato dal Terapista!",
                    html: INVITATION_ACCEPTED_TEMPLATE
                        .replace("{{parentName}}", parent.anagrafica.nome)
                        .replace("{{therapistName}}", `${therapist.anagrafica.nome} ${therapist.anagrafica.cognome}`)
                };
                await transporter.sendMail(mailOption);
            } catch (e) { console.error(e); }

            res.json({ success: true, message: "Invito accettato con successo!" });
        } else {
            // action === 'reject'
            parent.therapists.splice(therapistIndex, 1);
            await parent.save();

            // Notify parent
            try {
                const mailOption = {
                    from: process.env.SENDER_EMAIL,
                    to: parent.anagrafica.email,
                    subject: "Aggiornamento Richiesta Terapista",
                    html: INVITATION_REJECTED_TEMPLATE
                        .replace("{{parentName}}", parent.anagrafica.nome)
                        .replace("{{therapistName}}", `${therapist.anagrafica.nome} ${therapist.anagrafica.cognome}`)
                };
                await transporter.sendMail(mailOption);
            } catch (e) { console.error(e); }

            res.json({ success: true, message: "Invito rifiutato." });
        }

    } catch (error) {
        console.error("Errore respondToInvitation:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};