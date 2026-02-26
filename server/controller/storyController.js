import storyModel from "../models/storyModel.js";
import { userModel } from "../models/userModel.js";
import transporter from '../config/nodemailer.js';
import jwt from 'jsonwebtoken';
import { STORY_CREATED_TEMPLATE, STORY_UPDATED_TEMPLATE, STORY_PENDING_TEMPLATE } from '../config/emailTemplates.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * @desc    Crea e salva una nuova storia.
 *          Gestisce l'upload dei media (immagini, video, audio) nei vari paragrafi tramite 'multer'.
 *          Se l'utente è un genitore, salva la storia nello stato 'PENDING' e invia notifiche per l'approvazione;
 *          se è un terapista, salva la storia direttamente nello stato 'APPROVED' e notifica l'avvenuta pubblicazione.
 * @route   POST /api/story/create
 * @access  Private (Genitori e Terapisti)
 * @param {Object} req - L'oggetto della richiesta. I campi testuali (title, description, isActive) arrivano dal body,
 *                       mentre i file arrivano tramite req.files. I paragrafi vengono ricevuti come stringa JSON.
 * @param {Object} res - L'oggetto della risposta.
 * @returns {Object} JSON con l'esito della creazione e con i dati base della storia.
 */
export const createStory = async (req, res) => {
    try {
        const userId = req.userId;

        // Quando usiamo FormData dal frontend, i dati testuali arrivano come stringhe.
        // Dobbiamo fare il parsing dei dati JSON che invieremo come stringa.
        const title = req.body.title;
        const description = req.body.description;
        const isPublic = req.body.isPublic === 'true'; // FormData invia booleani come stringhe
        const isSequencingGameActive = req.body.isSequencingGameActive === 'true';
        const backgroundColor = req.body.backgroundColor;
        const category = req.body.category || 'Socialità';
        const narrationUrl = req.body.narrationUrl || '';

        let narrationSyncData = null;
        if (req.body.narrationSyncData) {
            try {
                narrationSyncData = JSON.parse(req.body.narrationSyncData);
            } catch (e) {
                console.error("Errore parsing narrationSyncData:", e);
            }
        }


        // I paragrafi arrivano come stringa JSON, li convertiamo in oggetto
        let paragraphs = [];
        try {
            paragraphs = JSON.parse(req.body.paragraphs);
        } catch (e) {
            return res.json({ success: false, message: 'Formato paragrafi non valido' });
        }

        // I file caricati si trovano in req.files (grazie a multer)
        // Dobbiamo mappare ogni file al paragrafo giusto.
        // Dal frontend invieremo i file con nomi tipo "media_0", "media_1" (dove il numero è l'indice)

        if (req.files && req.files.length > 0) {
            req.files.forEach(file => {
                // Il "fieldname" sarà tipo "media_0", "media_2", ecc.
                // Estraiamo l'indice (il numero dopo l'underscore)
                const index = parseInt(file.fieldname.split('_')[1]);

                if (!isNaN(index) && paragraphs[index]) {
                    // Creiamo l'URL completo dell'immagine
                    const protocol = req.protocol;
                    const host = req.get('host');
                    // Esempio: http://localhost:4000/uploads/123456-nomefile.jpg
                    const fileUrl = `${protocol}://${host}/uploads/${file.filename}`;

                    paragraphs[index].mediaUrl = fileUrl;

                    if (file.mimetype.startsWith('video')) {
                        paragraphs[index].mediaType = 'video';
                    } else if (file.mimetype.startsWith('audio')) {
                        paragraphs[index].mediaType = 'audio';
                    } else {
                        paragraphs[index].mediaType = 'image';
                    }
                }
            });
        }

        if (!title || !paragraphs) {
            return res.json({ success: false, message: 'Titolo e paragrafi sono obbligatori' });
        }

        const user = await userModel.findById(userId);
        const isTherapist = user && user.tipo_utente === 'terapeuta';

        const newStory = new storyModel({
            userId,
            title,
            description,
            category,
            paragraphs,
            isPublic,
            isSequencingGameActive,
            backgroundColor,
            narrationUrl,
            narrationSyncData,
            status: isTherapist ? 'APPROVED' : 'PENDING', // ← SE TERAPISTA, APPROVA SUBITO
            createdAt: new Date()
        });

        await newStory.save();

        // Invia email di notifica al genitore (SOLO se non è un terapista)
        try {
            if (!isTherapist) {
                // ... codice email esistente per genitori ...
                if (user) {
                    const mailOption = {
                        from: process.env.SENDER_EMAIL,
                        to: user.anagrafica.email,
                        subject: "Nuova Storia Creata!",
                        html: STORY_CREATED_TEMPLATE
                            .replace("{{name}}", user.anagrafica.nome)
                            .replace("{{title}}", title)
                            .replace("{{description}}", description || "Nessuna descrizione")
                            .replace("{{visibility}}", isPublic ? "Pubblica" : "Privata")
                    };
                    await transporter.sendMail(mailOption);

                    // Notifica terapista se presente (SOLO per genitori)
                    if (user.therapists && user.therapists.length > 0) {
                        for (const therapistRef of user.therapists) {
                            const therapist = await userModel.findById(therapistRef.therapistId);
                            if (therapist) {
                                const therapistMail = {
                                    from: process.env.SENDER_EMAIL,
                                    to: therapist.anagrafica.email,
                                    subject: "Nuova Storia da Revisionare",
                                    html: STORY_PENDING_TEMPLATE
                                        .replace("{{therapistName}}", therapist.anagrafica.nome)
                                        .replace("{{storyTitle}}", title)
                                        .replace("{{parentName}}", `${user.anagrafica.nome} ${user.anagrafica.cognome}`)
                                };
                                await transporter.sendMail(therapistMail);
                            }
                        }
                    }
                }
            } else {
                // Email per terapista (opzionale, conferma creazione)
                const mailOption = {
                    from: process.env.SENDER_EMAIL,
                    to: user.anagrafica.email,
                    subject: "Storia Creata e Pubblicata!",
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                            <h2 style="color: #4F46E5;">✅ Storia Pubblicata con Successo</h2>
                            <p>Ciao ${user.anagrafica.nome},</p>
                            <p>La tua storia "<strong>${title}</strong>" è stata creata e pubblicata automaticamente.</p>
                            <p style="color: #6B7280; font-size: 14px;">Come terapista, le tue storie sono approvate automaticamente.</p>
                        </div>
                    `
                };
                await transporter.sendMail(mailOption);
            }
        } catch (emailError) {
            console.log("Errore invio email (non bloccante):", emailError);
        }

        res.json({
            success: true,
            message: isTherapist
                ? 'Storia creata e pubblicata con successo!'
                : 'Storia creata con successo! In attesa di approvazione.'
        });

    } catch (error) {
        console.error("Errore createStory:", error);
        res.json({ success: false, message: error.message });
    }
}

/**
 * @desc    Genera un file audio narrato (Text-to-Speech) a partire dal testo della storia utilizzando "VibeVoice".
 *          Questa funzione esegue in modo asincrono uno script Python configurato esternamente, monitora l'elaborazione,
 *          sposta l'output generato nella cartella permanente ed esegue un'ulteriore analisi per sincronizzare l'audio alle sillabe (karaoke).
 * @route   POST /api/story/generate-audio
 * @access  Private
 * @param {Object} req - L'oggetto della richiesta, contenente il text, storyTitle, speakerName e la speed per la voce.
 * @param {Object} res - L'oggetto della risposta.
 * @returns {Object} JSON con l'URL dell'audio generato (audioUrl) e i dati di sincronizzazione karaoke (syncData).
 */
export const generateAudio = async (req, res) => {
    let tempTextPath = null;
    let tempOutputDir = null;

    try {
        const { text, storyTitle, speakerName, speed } = req.body;

        console.log(`🎙️ Generazione audio per: "${storyTitle}" | Voce: ${speakerName} | Velocità: ${speed || 1.0}`);
        // ========================================
        // VALIDAZIONE LUNGHEZZA TESTO
        // ========================================
        const MIN_CHARACTERS = 100;
        const MAX_CHARACTERS = 5000;

        if (!text || text.length < MIN_CHARACTERS) {
            return res.status(400).json({
                success: false,
                message: `Testo troppo corto. Servono almeno ${MIN_CHARACTERS} caratteri. Attualmente: ${text?.length || 0} caratteri.`
            });
        }

        if (text.length > MAX_CHARACTERS) {
            return res.status(400).json({
                success: false,
                message: `Testo troppo lungo. Massimo ${MAX_CHARACTERS} caratteri. Attualmente: ${text.length} caratteri.`
            });
        }

        // Usa lo speakerName ricevuto dal frontend, default a voce femminile
        const speaker = speakerName || 'it-Spk0_woman';

        console.log("🎤 Richiesta generazione audio con VibeVoice:");
        console.log("   Titolo:", storyTitle);
        console.log("   Lunghezza testo:", text.length, "caratteri");
        console.log("   Voce selezionata:", speaker);

        // ========================================
        // ========================================

        // CONFIGURAZIONE PATHS

        // ========================================



        // Calcola percorsi relativi di default (rispetto alla cartella server/)

        const serverDir = path.join(__dirname, '..');

        const defaultVibeVoicePath = path.join(serverDir, '..', 'VibeVoice');

        const defaultPythonPath = path.join(defaultVibeVoicePath, 'env1', 'Scripts', 'python.exe');



        // Usa i percorsi dal .env se presenti, altrimenti usa quelli relativi

        const vibeVoicePath = process.env.VIBEVOICE_PATH || defaultVibeVoicePath;

        const pythonPath = process.env.PYTHON_VENV_PATH || defaultPythonPath;



        console.log('📁 VibeVoice path:', vibeVoicePath);

        console.log('🐍 Python path:', pythonPath);



        // ========================================
        // Path allo script demo
        const scriptPath = path.join(vibeVoicePath, 'demo', 'realtime_model_inference_from_file.py');
        if (!fs.existsSync(scriptPath)) throw new Error('Script not found: ' + scriptPath);

        // CREA FILE TEMPORANEI
        // ========================================

        // Crea cartella temporanea per questa richiesta
        const timestamp = Date.now();
        tempOutputDir = path.join(__dirname, '..', 'temp_audio', `audio_${timestamp}`);

        if (!fs.existsSync(tempOutputDir)) {
            fs.mkdirSync(tempOutputDir, { recursive: true });
        }

        // Crea file di testo temporaneo
        tempTextPath = path.join(tempOutputDir, 'input.txt');
        fs.writeFileSync(tempTextPath, text, 'utf8');

        console.log("📁 File creati:");
        console.log("   Testo input:", tempTextPath);
        console.log("   Directory output:", tempOutputDir);

        // ========================================
        // ========================================
        // ESEGUI VIBEVOICE
        // ========================================

        // Costruisci il comando per eseguire VibeVoice
        const command = `"${pythonPath}" "${scriptPath}" --model_path microsoft/VibeVoice-Realtime-0.5B --txt_path "${tempTextPath}" --speaker_name ${speaker} --output_dir "${tempOutputDir}"`;

        console.log("⏳ Esecuzione VibeVoice...");
        console.log("   Voce:", speaker);
        console.log("   Questo potrebbe richiedere 1-2 minuti...");

        // Esegui VibeVoice
        const { stdout, stderr } = await execAsync(command, {
            maxBuffer: 50 * 1024 * 1024, // 50MB buffer
            timeout: 900000, // 15 minuti timeout
            cwd: vibeVoicePath // Esegui dalla cartella VibeVoice
        });

        // Log output Python (per debug)
        if (stderr) console.log("📋 VibeVoice stderr:", stderr);
        if (stdout) console.log("📋 VibeVoice stdout:", stdout);

        // ========================================
        // TROVA E SALVA PERMANENTEMENTE
        // ========================================

        // VibeVoice genera file tipo: input_it-Spk0_woman.wav
        const generatedFiles = fs.readdirSync(tempOutputDir).filter(f => f.endsWith('.wav'));

        if (generatedFiles.length === 0) {
            throw new Error("Nessun file audio generato da VibeVoice.");
        }

        const audioFilePath = path.join(tempOutputDir, generatedFiles[0]);

        // Crea nome file definitivo
        const finalFileName = `narration_${timestamp}_${speaker}.wav`;
        const finalFilePath = path.join(__dirname, '..', 'uploads', 'audio', finalFileName);
        const finalDir = path.dirname(finalFilePath);

        console.log("📂 Tentativo di salvataggio finale:");
        console.log("   Sorgente:", audioFilePath);
        console.log("   Destinazione:", finalFilePath);
        console.log("   Directory finale:", finalDir);

        // Assicura che la cartella di destinazione esista e non sia un file
        if (fs.existsSync(finalDir)) {
            const stats = fs.statSync(finalDir);
            if (!stats.isDirectory()) {
                console.log("⚠️ Attenzione: uploads/audio esiste ma è un file! Tentativo di rimozione...");
                fs.unlinkSync(finalDir);
                fs.mkdirSync(finalDir, { recursive: true });
            }
        } else {
            fs.mkdirSync(finalDir, { recursive: true });
            console.log("📁 Cartella creata:", finalDir);
        }

        // Verifica che il file sorgente esista davvero prima di procedere
        if (!fs.existsSync(audioFilePath)) {
            console.error("❌ Errore critico: Il file sorgente generato da Python non è stato trovato!");
            throw new Error(`File sorgente non trovato: ${audioFilePath}`);
        }

        // Sposta il file (Copia + Elimina è più affidabile di renameSync su Windows)
        try {
            fs.copyFileSync(audioFilePath, finalFilePath);
            fs.unlinkSync(audioFilePath);
            console.log("✅ Audio spostato con successo via Copy+Unlink");
        } catch (moveErr) {
            console.warn("⚠️ Fallimento Copy+Unlink, provo renameSync tradizionale:", moveErr.message);
            fs.renameSync(audioFilePath, finalFilePath);
        }

        console.log("✅ Audio salvato permanentemente!");

        // --- ANALISI AUDIO PER SINCRONIZZAZIONE (KARAOKE) ---
        let syncData = null;
        try {
            console.log("🔍 Analisi audio per sincronizzazione...");
            const analyzerScript = path.join(__dirname, '..', 'utils', 'audioAnalyzer.py');
            const targetSpeed = speed || 1.0;
            const analysisResult = execSync(`"${pythonPath}" "${analyzerScript}" "${finalFilePath}" ${targetSpeed}`, { encoding: 'utf8' });
            syncData = JSON.parse(analysisResult);
            if (syncData.error) {
                console.error("❌ Errore analisi audio:", syncData.error);
                syncData = null;
            } else {
                console.log("✅ Analisi completata con successo!");
            }
        } catch (analysisErr) {
            console.error("❌ Fallimento analisi audio:", analysisErr.message);
        }

        // Crea URL pubblico
        const protocol = req.protocol;
        const host = req.get('host');
        const fileUrl = `${protocol}://${host}/uploads/audio/${finalFileName}`;

        res.json({
            success: true,
            message: "Audio generato con successo!",
            audioUrl: fileUrl,
            syncData: syncData, // Invia i dati di sync al frontend
            speaker: speaker
        });
        // ========================================

        setTimeout(() => {
            try {
                if (tempOutputDir && fs.existsSync(tempOutputDir)) {
                    fs.rmSync(tempOutputDir, { recursive: true, force: true });
                    console.log("🗑️ Cartella temporanea eliminata");
                }
            } catch (e) {
                console.error("Errore pulizia:", e);
            }
        }, 2000);

    } catch (error) {
        console.error("❌ Errore generateAudio:", error);

        // Pulizia in caso di errore
        if (tempOutputDir && fs.existsSync(tempOutputDir)) {
            try {
                fs.rmSync(tempOutputDir, { recursive: true, force: true });
            } catch (e) {
                console.error("Errore pulizia:", e);
            }
        }

        // ========================================
        // GESTIONE ERRORI SPECIFICI
        // ========================================

        if (error.message.includes('ENOENT')) {
            return res.status(500).json({
                success: false,
                message: "⚠️ Python o VibeVoice non trovati. Verifica i path nel file .env:\n" +
                    "PYTHON_VENV_PATH e VIBEVOICE_PATH"
            });
        }

        if (error.message.includes('timeout')) {
            return res.status(500).json({
                success: false,
                message: "⏱️ Timeout: La generazione audio ha impiegato troppo tempo (oltre 3 minuti).\n" +
                    "Riprova con un testo più corto o verifica che VibeVoice sia configurato correttamente."
            });
        }

        if (error.message.includes('Configura PYTHON_VENV_PATH')) {
            return res.status(500).json({
                success: false,
                message: "⚠️ Configurazione mancante!\n" +
                    "Aggiungi queste righe al file .env:\n" +
                    "PYTHON_VENV_PATH=C:\\path\\to\\VibeVoice\\venv\\Scripts\\python.exe\n" +
                    "VIBEVOICE_PATH=C:\\path\\to\\VibeVoice"
            });
        }

        if (error.message.includes('Script VibeVoice non trovato')) {
            return res.status(500).json({
                success: false,
                message: "⚠️ Script VibeVoice non trovato!\n" +
                    "Verifica che il path VIBEVOICE_PATH nel .env punti alla cartella corretta\n" +
                    "e che esista il file: demo/realtime_model_inference_from_file.py"
            });
        }

        // Errore generico
        res.status(500).json({
            success: false,
            message: error.message || "Errore durante la generazione dell'audio"
        });
    }
};

/**
 * @desc    Recupera tutte le storie che sono impostate come pubbliche (isPublic = true)
 *          e che sono anche state approvate (status = 'APPROVED'). Utilizzata generalmente per esplorazioni generali o debug.
 * @route   GET /api/story/all
 * @access  Public
 * @param {Object} req - L'oggetto della richiesta.
 * @param {Object} res - L'oggetto della risposta.
 * @returns {Object} JSON contenente un array delle storie pubbliche e approvate.
 */
export const getAllStories = async (req, res) => {
    try {
        // Prima prendiamo TUTTE le storie per vedere cosa c'è
        const allStories = await storyModel.find({}).sort({ createdAt: -1 });

        console.log('📚 TUTTE le storie nel DB:', allStories.length);

        // Log dettagliato di ogni storia
        allStories.forEach((story, index) => {
            console.log(`\n--- Storia ${index + 1} ---`);
            console.log('ID:', story._id);
            console.log('Titolo:', story.title);
            console.log('isPublic:', story.isPublic);
            console.log('status:', story.status);
            console.log('userId:', story.userId);
        });

        // Ora filtriamo per pubbliche e approvate
        const publicApprovedStories = await storyModel.find({
            isPublic: true,
            status: 'APPROVED'
        }).sort({ createdAt: -1 });

        console.log('\n📚 Storie PUBBLICHE e APPROVATE:', publicApprovedStories.length);

        res.json({ success: true, stories: publicApprovedStories });
    } catch (error) {
        console.error(error);
        res.json({ success: false, message: error.message });
    }
};

/**
 * @desc    Recupera l'elenco di tutte le storie create dall'utente attualmente loggato, ordinate dalla più recente.
 * @route   GET /api/story/my-stories
 * @access  Private
 * @param {Object} req - L'oggetto della richiesta, con userId ottenuto tramite middleware.
 * @param {Object} res - L'oggetto della risposta.
 * @returns {Object} JSON con l'array contenente le storie dell'utente corrente.
 */
export const getUserStories = async (req, res) => {
    try {
        const userId = req.userId;

        const stories = await storyModel.find({ userId }).sort({ createdAt: -1 });

        res.json({ success: true, stories });

    } catch (error) {
        console.error("Errore getUserStories:", error);
        res.json({ success: false, message: error.message });
    }
}

/**
 * @desc    Recupera i dettagli di una singola storia specifica ricercandola per ID.
 *          Serve tipicamente per la modalità "lettura" o visualizzazione dettagliata di una storia.
 * @route   GET /api/story/:id
 * @access  Public/Private in base all'implementazione delle rotte
 * @param {Object} req - L'oggetto della richiesta, parametro `id` passato via URL.
 * @param {Object} res - L'oggetto della risposta.
 * @returns {Object} JSON con i dati completi della singola storia richiesta.
 */
export const getStoryById = async (req, res) => {
    try {
        const { id } = req.params;

        const story = await storyModel.findById(id);

        if (!story) {
            return res.json({ success: false, message: 'Storia non trovata' });
        }

        res.json({ success: true, story });

    } catch (error) {
        console.error("Errore getStoryById:", error);
        res.json({ success: false, message: error.message });
    }
}

/**
 * @desc    Cambia la visibilità (pubblica o privata) di una specifica storia tramite il flag isPublic.
 *          Garantisce l'autorizzazione di modifica verificando che la storia appartenga all'utente loggato.
 * @route   POST /api/story/toggle-visibility
 * @access  Private
 * @param {Object} req - L'oggetto della richiesta, contenente storyId e isPublic (booleano) nel body.
 * @param {Object} res - L'oggetto della risposta.
 * @returns {Object} JSON indicante l'esito dell'aggiornamento e la storia aggiornata in `story`.
 */
export const toggleVisibility = async (req, res) => {
    try {
        const { storyId, isPublic } = req.body;
        const userId = req.userId; // Ottenuto dal middleware userAuth

        // Trova la storia e aggiorna solo se appartiene all'utente
        const story = await storyModel.findOneAndUpdate(
            { _id: storyId, userId: userId }, // Filtro: ID storia E ID proprietario
            { isPublic: isPublic },           // Aggiornamento
            { new: true }                     // Opzione: ritorna il documento aggiornato
        );

        if (!story) {
            return res.json({ success: false, message: "Storia non trovata o non autorizzato" });
        }

        return res.json({ success: true, message: "Visibilità aggiornata", story });

    } catch (error) {
        console.log(error);
        return res.json({ success: false, message: error.message });
    }
}
/**
 * @desc    Modifica i dati (testi o contenuti multimediali) di una storia esistente.
 *          Gestisce l'upload di eventuali nuovi file mediatici andandoli ad associare al paragrafo corretto per via dell'indice in `fieldname`.
 *          Verifica i permessi (l'utente deve essere il proprietario o un terapista assegnato a quel genitore).
 *          Gestisce anche i cambiamenti di stato se lo "status" di una storia approvata necessita di nuova revisione dopo la modifica.
 * @route   PUT /api/story/:id
 * @access  Private (Proprietario o Terapista Assegnato)
 * @param {Object} req - L'oggetto della richiesta, body per testi assortiti e req.files per i nuovi file in upload.
 * @param {Object} res - L'oggetto della risposta.
 * @returns {Object} JSON confermando l'aggiornamento, corredato della nuova storia.
 */
export const updateStory = async (req, res) => {
    try {
        const userId = req.userId;
        const { id } = req.params;

        // Trova la storia per ID
        const story = await storyModel.findById(id);

        if (!story) {
            return res.json({ success: false, message: 'Storia non trovata' });
        }

        // --- CONTROLLO AUTORIZZAZIONE ---
        let isAuthorized = false;
        let isTherapistEdit = false;

        // 1. Check if Owner
        if (story.userId.toString() === userId) {
            isAuthorized = true;
        } else {
            // 2. Check if Assigned Therapist
            const therapistUser = await userModel.findById(userId);

            if (therapistUser && therapistUser.tipo_utente === 'terapeuta') {
                const parentUser = await userModel.findById(story.userId);

                if (parentUser && parentUser.therapists) {
                    const isAssigned = parentUser.therapists.some(t =>
                        t.therapistId && t.therapistId.toString() === userId
                    );

                    if (isAssigned) {
                        isAuthorized = true;
                        isTherapistEdit = true;
                    }
                }
            }
        }

        if (!isAuthorized) {
            return res.json({ success: false, message: 'Non autorizzato a modificare questa storia.' });
        }

        // --- AGGIORNAMENTO DATI TESTUALI ---
        const title = req.body.title || story.title;
        const description = req.body.description || story.description;
        const category = req.body.category || story.category || 'Socialità';
        const isPublic = req.body.isPublic === 'true'; // FormData string to boolean
        const isSequencingGameActive = req.body.isSequencingGameActive === 'true';
        const backgroundColor = req.body.backgroundColor || story.backgroundColor;
        const narrationUrl = req.body.narrationUrl || story.narrationUrl;

        let narrationSyncData = story.narrationSyncData;
        if (req.body.narrationSyncData) {
            try {
                narrationSyncData = JSON.parse(req.body.narrationSyncData);
            } catch (e) {
                console.error("Errore parsing narrationSyncData update:", e);
            }
        }

        // Gestione Paragrafi (JSON parsing)
        let paragraphs = story.paragraphs; // Default ai vecchi
        if (req.body.paragraphs) {
            try {
                paragraphs = JSON.parse(req.body.paragraphs);
            } catch (e) {
                return res.json({ success: false, message: 'Formato paragrafi non valido' });
            }
        }

        // --- GESTIONE FILE (IMMAGINI/VIDEO) ---
        // Questa parte deve stare FUORI dai cicli di salvataggio
        if (req.files && req.files.length > 0) {
            req.files.forEach(file => {
                // Cerchiamo l'indice nel nome del campo (es: "media_0", "media_2")
                // Nota: Assicurati che il frontend mandi "media_0", "media_1" ecc.
                // Se il frontend manda "paragraphs[0][media]", il parsing è diverso.
                // Usiamo una logica generica che controlla l'underscore.

                let index = -1;

                // Caso 1: media_0
                if (file.fieldname.includes('_')) {
                    index = parseInt(file.fieldname.split('_')[1]);
                }
                // Caso 2: paragraphs[0][media] (Regex)
                else {
                    const match = file.fieldname.match(/\[(\d+)\]/);
                    if (match) index = parseInt(match[1]);
                }

                if (index > -1 && paragraphs[index]) {
                    const protocol = req.protocol;
                    const host = req.get('host');
                    const fileUrl = `${protocol}://${host}/uploads/${file.filename}`;

                    paragraphs[index].mediaUrl = fileUrl;

                    if (file.mimetype.startsWith('video')) {
                        paragraphs[index].mediaType = 'video';
                    } else if (file.mimetype.startsWith('audio')) {
                        paragraphs[index].mediaType = 'audio';
                    } else {
                        paragraphs[index].mediaType = 'image';
                    }
                }

                // Gestione Copertina (se presente)
                if (file.fieldname === 'coverImage') {
                    const protocol = req.protocol;
                    const host = req.get('host');
                    story.coverImage = `${protocol}://${host}/uploads/${file.filename}`;
                }
            });
        }

        // Applichiamo le modifiche all'oggetto storia
        story.title = title;
        story.description = description;
        story.category = category;
        story.paragraphs = paragraphs;
        story.isPublic = isPublic;
        story.isSequencingGameActive = isSequencingGameActive;
        story.backgroundColor = backgroundColor;
        story.narrationUrl = narrationUrl;
        story.narrationSyncData = narrationSyncData;

        // --- LOGICA STATO E NOTIFICHE (FUORI DAL CICLO FILE) ---

        if (isTherapistEdit) {
            // IL TERAPISTA MODIFICA
            // Non cambiamo lo stato in PENDING perché è già una revisione professionale.
            // Magari approviamo direttamente o lasciamo invariato.

            // Notifica al Genitore
            try {
                const parent = await userModel.findById(story.userId);
                if (parent) {
                    const mailOption = {
                        from: process.env.SENDER_EMAIL,
                        to: parent.anagrafica.email,
                        subject: "Storia Modificata dal Terapista",
                        html: `<h2>Ciao ${parent.anagrafica.nome},</h2><p>Il tuo terapista ha apportato modifiche alla storia "<strong>${title}</strong>".</p><p>Accedi alla piattaforma per vedere le novità.</p>`
                    };
                    await transporter.sendMail(mailOption);
                }
            } catch (emailError) { console.log("Email error:", emailError); }

        } else {
            // IL GENITORE MODIFICA
            // Se il genitore ha dei terapisti, la storia torna in revisione (PENDING)
            const user = await userModel.findById(userId);

            if (user && user.therapists && user.therapists.length > 0) {
                story.status = 'PENDING';
                story.rejectionReason = ''; // Reset motivi rifiuto precedenti
                story.reviewedBy = null;

                // Notifica a tutti i terapisti del genitore
                for (const therapistRef of user.therapists) {
                    try {
                        const therapist = await userModel.findById(therapistRef.therapistId);
                        if (therapist) {
                            const therapistMail = {
                                from: process.env.SENDER_EMAIL,
                                to: therapist.anagrafica.email,
                                subject: "Storia Modificata: Richiesta Approvazione",
                                html: STORY_PENDING_TEMPLATE
                                    .replace("{{therapistName}}", therapist.anagrafica.nome)
                                    .replace("{{storyTitle}}", title)
                                    .replace("{{parentName}}", `${user.anagrafica.nome} ${user.anagrafica.cognome}`)
                            };
                            await transporter.sendMail(therapistMail);
                        }
                    } catch (e) { console.error(e); }
                }
            }

            // Email di conferma al genitore
            try {
                if (user) {
                    const mailOption = {
                        from: process.env.SENDER_EMAIL,
                        to: user.anagrafica.email,
                        subject: "Storia Modificata con Successo",
                        html: STORY_UPDATED_TEMPLATE
                            .replace("{{name}}", user.anagrafica.nome)
                            .replace("{{title}}", title)
                            .replace("{{date}}", new Date().toLocaleDateString('it-IT'))
                    };
                    await transporter.sendMail(mailOption);
                }
            } catch (emailError) { console.log(emailError); }
        }

        // SALVATAGGIO FINALE (Una volta sola!)
        await story.save();

        res.json({ success: true, message: 'Storia aggiornata con successo!', story });

    } catch (error) {
        console.error("Errore updateStory:", error);
        res.json({ success: false, message: error.message });
    }
};

/**
 * @desc    Elimina in modo definitivo e permanente una singola storia del database.
 *          Richiede che la storia sia di proprietà esclusiva dell'utente che vuole eliminarla.
 * @route   DELETE /api/story/:id
 * @access  Private
 * @param {Object} req - L'oggetto della richiesta, `id` storia estratto da req.params.
 * @param {Object} res - L'oggetto della risposta.
 * @returns {Object} JSON recante il messaggio d'esito della cancellazione.
 */
export const deleteStory = async (req, res) => {
    try {
        const userId = req.userId;
        const { id } = req.params;

        // Trova la storia
        const story = await storyModel.findById(id);

        if (!story) {
            return res.json({ success: false, message: 'Storia non trovata' });
        }

        // Verifica che l'utente sia il proprietario
        if (story.userId.toString() !== userId) {
            return res.json({ success: false, message: 'Non autorizzato a eliminare questa storia.' });
        }

        // Elimina la storia
        await storyModel.findByIdAndDelete(id);

        res.json({ success: true, message: 'Storia eliminata con successo!' });

    } catch (error) {
        console.error("Errore deleteStory:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Consente a un Genitore o a un Terapista di assegnare direttamente una certa storia
 *          all'interno della dashboard di lettura di specifici bambini selezionati.
 *          La lista aggiornata dei bambini (via array `childrenIds`) viene memorizzata nel documento della Storia.
 * @route   POST /api/story/assign
 * @access  Private
 * @param {Object} req - L'oggetto della richiesta, contiene storyId e childrenIds nel form body.
 * @param {Object} res - L'oggetto della risposta.
 * @returns {Object} JSON con l'esito dell'assegnazione e l'array childrenIds corrente.
 */
export const assignStoryToChildren = async (req, res) => {
    try {
        const userId = req.userId;
        const { storyId, childrenIds } = req.body; // Array di ID dei bambini

        if (!storyId || !childrenIds || !Array.isArray(childrenIds)) {
            return res.json({ success: false, message: 'Dati mancanti o non validi' });
        }

        // Trova la storia
        const story = await storyModel.findById(storyId);

        if (!story) {
            return res.json({ success: false, message: 'Storia non trovata' });
        }

        // Verifica che l'utente sia il proprietario
        if (story.userId.toString() !== userId) {
            return res.json({ success: false, message: 'Non autorizzato' });
        }

        // Aggiorna la lista dei bambini assegnati (rimuovi duplicati)
        const existingChildren = story.assignedChildren || [];
        const newChildren = [...new Set([...existingChildren.map(id => id.toString()), ...childrenIds])];

        story.assignedChildren = newChildren;
        await story.save();

        res.json({
            success: true,
            message: 'Storia assegnata ai bambini selezionati!',
            assignedChildren: story.assignedChildren
        });

    } catch (error) {
        console.error("Errore assignStoryToChildren:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Recupera le storie disponibili per l'interfaccia/lettura esclusiva di un bambino specifico.
 *          Verifica l'esistenza di un token "childToken" attivo (la speciale modalità switch sessione Bambino).
 *          Ritorna unicamente le storie di competenza che possiedono lo status in stato 'APPROVED'.
 * @route   GET /api/story/child-stories
 * @access  Private (Loggato in sessione Bambino)
 * @param {Object} req - L'oggetto della richiesta; legge il cookie "childToken".
 * @param {Object} res - L'oggetto della risposta.
 * @returns {Object} JSON contenente un set filtrato ed ottimizzato di storie pertinenti al bambino.
 */
export const getChildStories = async (req, res) => {
    try {
        // Verifica se c'è un childToken
        const childToken = req.cookies.childToken;

        if (!childToken) {
            return res.json({ success: false, message: 'Sessione bambino non trovata.' });
        }

        // Decodifica il token per ottenere parentId (usa jwt già importato, NON require!)
        const decoded = jwt.verify(childToken, process.env.JWT_SECRETE);
        const parentId = decoded.parentId;
        const childId = decoded.childId;
        const childName = decoded.childName;

        console.log("Child logged:", { parentId, childId, childName }); // DEBUG

        // Trova le storie APPROVED del genitore ASSEGNATE a questo bambino
        const stories = await storyModel.find({
            userId: parentId,
            status: 'APPROVED',
            assignedChildren: childId
        }).sort({ createdAt: -1 });

        console.log("Stories found:", stories.length); // DEBUG

        res.json({
            success: true,
            stories,
            child: {
                name: childName,
                id: childId,
                avatar: decoded.avatar || null
            }
        });

    } catch (error) {
        console.error("Errore getChildStories:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Ottiene tutte le storie presenti nel database segnate come isPublic=true e aventi status 'APPROVED'.
 *          Tenta anche di ricostruire e agganciare un dato accessorio "authorName" per un mapping visualizzazione/UI.
 *          Ritorna una "Vetrina Libera" che comunicherà la creatività degli user alla community o come demo.
 * @route   GET /api/story/public
 * @access  Public
 * @param {Object} req - L'oggetto della richiesta.
 * @param {Object} res - L'oggetto della risposta contenente l'elenco.
 * @returns {Object} JSON dell'elenco pubblico delle storie processato con l'AuthorName unificato.
 */
export const getPublicStories = async (req, res) => {
    try {
        // Trova tutte le storie pubbliche e approvate
        const stories = await storyModel.find({
            isPublic: true,
            status: 'APPROVED'
        }).sort({ createdAt: -1 });

        // Per ogni storia, trova manualmente l'autore (perché userId è String, non ObjectId)
        const storiesWithAuthor = await Promise.all(
            stories.map(async (story) => {
                try {
                    const author = await userModel.findById(story.userId);
                    return {
                        ...story.toObject(),
                        authorName: author
                            ? `${author.anagrafica.nome} ${author.anagrafica.cognome}`
                            : 'Anonimo'
                    };
                } catch (error) {
                    console.error("Errore recupero autore per storia:", story._id, error);
                    return {
                        ...story.toObject(),
                        authorName: 'Anonimo'
                    };
                }
            })
        );

        res.json({
            success: true,
            stories: storiesWithAuthor
        });

    } catch (error) {
        console.error("Errore getPublicStories:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};



