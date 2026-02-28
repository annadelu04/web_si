import jwt from 'jsonwebtoken';                   // JWT Validator: Genera/decodifica token stringhe sicuri per Autenticazione Stateless
import bcryptjs from 'bcryptjs';                    // Hashing Engine: Cripta password monodirezionalmente (Salt+Hash) evitando furti database psw in chiaro
import { userModel } from '../models/userModel.js'; // ODM Mongoose: Model x collection "users". (Es. UserModel.Find)
import transporter from '../config/nodemailer.js';  // Modulo Helper: Istanza pre-connessa SMPT per Email automatiche (Aruba/Gmail)
import { EMAIL_VERIFY_TEMPLATE, PASSWORD_RESET_TEMPLATE } from '../config/emailTemplates.js'; // Macro Stringhe HTML formattate 

// ============================================================
// ENDPOINT: REGISTRAZIONE UTENTE "SIGN-UP"
// Architettura: Express Request(req)/Response(res) CallBack
// ============================================================
export const register = async (req, res) => {

    // DESTRUTTURAZIONE POST BODY (Parsa JSON della Chiamata Fetch Lato Client React)
    const { name, surname, email, password, userType } = req.body;

    // VALIDAZIONE BASE (Campi vuoti)
    if (!name || !surname || !email || !password || !userType) {
        return res.json({ success: false, error: "Dettagli mancanti. Compila tutti i campi." });
    }

    try {
        // PREVENZIONE DUPLICATI DB. Cerca 1 riga che matcha chiave Annidata "Anagrafica.email"
        const existingUser = await userModel.findOne({ 'anagrafica.email': email });

        if (existingUser) {
            return res.json({ success: false, error: "Utente già registrato con questa email" });
        }

        // HASHER ASINCRONO PASSWORD (Valore SALT= 10 . Bilancia CPU Time Speso per cifrare vs Sicurezza Cracking Forza Bruta)
        const hashedPassword = await bcryptjs.hash(password, 10);

        // CREAZIONE FATTUALE IN RAM OGGETTO MONGOOSE(MONGODB DOC STRUCT) USANDO NEW "USERMODEL"
        const registerUser = new userModel({
            tipo_utente: userType.toLowerCase(),
            anagrafica: { nome: name, cognome: surname, email: email },
            login: { password: hashedPassword, nuovo_utente: true },
            profilo: { livello: 1, punti_totali: 0, avatar: "" },
            isAccountVerified: false,
            // Valori vuoti/falsi di partenza x sistema Recovery/Verifica 2FA (OTP)
            verifyOtp: '', verifyOtpExpireAt: 0, resetOtp: '', resetOtpExpireAt: 0
        });

        // SALVATAGGIO REALE STORAGE (Insert Document to CollectionMongo). Il "Await" Blocca Node Js finchè il DB cluster non risponde "Ok Salvaot"
        await registerUser.save();

        // AUTOLOGIN DOPO REGISTRAZIONE: Crea un Token Valido 7gg Nascondendo ("Firmando con Secret key app") ID di Mongo Netto _id
        const token = jwt.sign({ id: registerUser._id }, process.env.JWT_SECRETE, { expiresIn: "7d" });

        // ATTACCO COOKIE AL BROWSER UTENTE ("Res.Cookie"). E un header nativo http. "HttpOnly" blocca script Hacker Javascript (XSS Attack)
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        // OPZIONE ASINCRONA EMAIL WELCOME: Usa Helper Trasporter x Inviare email al Genitore
        const sendEmail = {
            from: process.env.SENDER_EMAIL,
            to: email,
            subject: "Benvenuto in Pepper Feel Good!",
            html: `<h2>Ciao ${name}, il tuo account (${userType}) è stato creato con successo!</h2>`
        };

        // TryCatch Silenzioso. Se server Aruba cade.. logghiamo errore di Console NodeJS Server.. MA RITORNIAMO UGUALMENTE {Success True} In fondo per far giocare cmq utente e non bloccare App !
        try {
            await transporter.sendMail(sendEmail);
        } catch (emailError) {
            console.log("Errore invio email (non bloccante):", emailError);
        }

        // ESITO API FINALE -> RISPOSTA X REACT
        return res.json({ success: true, message: "Account creato con successo!" });

    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};

// ============================================================
// ENDPOINT: AUTENTICA (LOGIN)
// ============================================================
export const login = async (req, res) => {

    // ESTRAZIONE E VALIDAZIONE PAYLOAD DA REACT FORM POST 
    const { email, password } = req.body;
    if (!email || !password) {
        return res.json({ success: false, message: "Email e password richieste" });
    }

    try {
        // 1. RICERCA UTENTE E CHECK ESITENZA 
        const existingUser = await userModel.findOne({ 'anagrafica.email': email });
        if (!existingUser) {
            return res.json({ success: false, message: "Email non valida" }); // "Ambiguità voluta". Non diciam a un Hacker bruteforcer se l'email esiste o no. Si dice "Generico Invalid Credentz."
        }

        // 2. CHECK COMPARAZIONE PASSWORD HASHATE MATEMATICHE 
        const matchPass = await bcryptjs.compare(password, existingUser.login.password);
        if (!matchPass) {
            return res.json({ success: false, message: "Password errata" });
        }

        // 3. GENERAZIONE E STAMPO IN FRONTE BROWSER CLIENT (COOKIE) DEL NOSTRO PASSAPORTO JWT 
        const token = jwt.sign({ id: existingUser._id }, process.env.JWT_SECRETE, { expiresIn: "7d" });

        res.cookie('token', token, {
            httpOnly: true, secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict', maxAge: 7 * 24 * 60 * 60 * 1000
        });

        // 4. FINE LOGICA -> RESITUISCE SUCESS + JSON (Metadati base di Utente  x Frontend Ui Store senza db call ) 
        return res.json({
            success: true, message: "Login effettuato",
            user: { name: existingUser.anagrafica.nome, email: existingUser.anagrafica.email, tipo_utente: existingUser.tipo_utente }
        });

    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};

// ============================================================
// ENDPOINT: DISCONESSIONE (LOG OUT)
// ============================================================
export const logOut = async (req, res) => {
    try {
        // NON CE UNA 'SESSIONE SERVER DA CANCELLARE'. Semplice istruisco Browser Utente di svuotare `ClearCookie("token")` la cache Crome/Safari bloccando l auth!
        res.clearCookie('token', {
            httpOnly: true, secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict'
        });
        return res.json({ success: true, message: "Logout effettuato" });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};

// ============================================================
// ENDPOINT OTP: GENERATORE E MITTENTE EMAIL OTP VALIDAZIONE (2FA ACC GENITORE)
// ============================================================
export const sendVerifyOtp = async (req, res) => {
    try {
        // "Req.Userid" = Variabile magica! E inettata nel Header da Middleware Interceptor JWT Token check prima del controller stesso.!
        const userId = req.userId;
        const user = await userModel.findById(userId); // Load db record 

        if (user.isAccountVerified) {
            // Blocca spamming inutilie se db record  ha gia spunto blu 
            return res.json({ success: false, message: "Account già verificato" });
        }

        // RNG FAKE MATH: Creazione Numero Casuale Random Intero "Stringato"  Limitato in range {100.000 -- 999.000} (Quindi a 6 cifre)
        const otp = String(Math.floor(100000 + Math.random() * 900000));

        // ASSEGNAZIOEN AL MODELLO DB E SAVE TIME METADATA 
        user.verifyOtp = otp;
        user.verifyOtpExpireAt = Date.now() + 24 * 60 * 60 * 1000; // Formula DateNow(Unix current ms) + 24Ore convertite in Ms! Scadenza timer.
        await user.save();

        // TEMPLATE ENGINE BASE: Sostituisce la scritta stringa {{otp}} del megafole html di un Design Email con la stringa "634842" !
        const mailOption = {
            from: process.env.SENDER_EMAIL, to: user.anagrafica.email, subject: "Codice OTP Verifica Account",
            html: EMAIL_VERIFY_TEMPLATE.replace("{{otp}}", otp).replace("{{email}}", user.anagrafica.email)
        };

        await transporter.sendMail(mailOption); // Smpt Aruba Dispatch Event 

        return res.json({ success: true, message: "OTP di verifica inviato" });

    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};

// ============================================================
// ENDPOINT OTP: VERIFICATORE (VALIDA CHI CERC DI DIGITARE PIN 6 CIFRE)
// ============================================================
export const verifyOtp = async (req, res) => {
    // ESTRAZIONE (dal Payload react fetch : L'otp.. / Dal Jwt Req. Middleware = L 'id del player richiedente)
    const { otp } = req.body;
    const userId = req.userId;

    if (!otp) return res.json({ success: false, message: "OTP mancante" });

    try {
        const user = await userModel.findById(userId);
        if (!user) return res.json({ success: false, message: "Utente non trovato" });

        // CONTROLLO ERROR STATE "NON MATCH" / "VUOTO"
        if (user.verifyOtp === '' || user.verifyOtp !== otp) {
            return res.json({ success: false, message: "OTP non valido" });
        }

        // CONTROLLO SCADENZA: Tempo attuale > VecchioRecordTimer + 24h ?? 
        if (user.verifyOtpExpireAt < Date.now()) {
            return res.json({ success: false, message: "OTP scaduto" });
        }

        // SUCCESS ! MUTATION DEL DOCUMENTO MONGODB RECORD 
        user.isAccountVerified = true;
        user.verifyOtp = '';           // Pulisco db e cache string token cosi non viene hackato \ riusato x bug
        user.verifyOtpExpireAt = 0;
        await user.save();

        return res.json({ success: true, message: "Email verificata con successo" });

    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};

// ============================================================
// ENDPOINT: RUTINES CHECK AUTH (GUARD FRONTEND)
// ============================================================
export const isUserAuthenticate = async (req, res) => {
    try {
        // E un ENDPOINT VUOTO chiamato costantemente dAL fRONTEND pET CHECKARE SE JWT ALLEGATO ALLA RICHIESTA DA PROPRIO COOKIE E ANCORA VALIDO OP PURE SCADUTO "True O false" risposte booleane
        return res.json({ success: true });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};

// ============================================================
// ENPOINT PASSWORD RESET OTP: INVIA PIN PER SCORDATO PSW (NON C E SESSIONE ATTIVA)
// ============================================================
export const sendResetOtp = async (req, res) => {
    // QUI SI USA SOLO `Email` DAL POST REACT E NON `req.UserId` perchè UTENTE E SCONNESSO E NON SAPPIAMO CHI E SE JWT! (Lo cerca nel Db via email Form Textbox input)
    const { email } = req.body;
    if (!email) return res.json({ success: false, message: "Email mancante" });

    try {
        const user = await userModel.findOne({ 'anagrafica.email': email });
        if (!user) return res.json({ success: false, message: "Utente non trovato" });

        const otp = String(Math.floor(100000 + Math.random() * 900000));
        user.resetOtp = otp;
        user.resetOtpExpireAt = Date.now() + 15 * 60 * 1000; // Timer Cortissimo per sicurezza: 15 MIns per un reset Psw ! 
        await user.save();

        const mailOption = {
            from: process.env.SENDER_EMAIL, to: user.anagrafica.email, subject: "Codice OTP Reset Password",
            html: PASSWORD_RESET_TEMPLATE.replace("{{otp}}", otp).replace("{{email}}", user.anagrafica.email)
        };
        await transporter.sendMail(mailOption);

        return res.json({ success: true, message: "OTP inviato via email" });

    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};

// ============================================================
// ENPOINT PASSWORD RESET OTP: CHECK 
// ============================================================
export const verifyResetOtp = async (req, res) => {
    // Si aspetta dal Client Sia L'email (chiesta form) che l OtP
    const { email, otp } = req.body;
    if (!email || !otp) return res.json({ success: false, message: "Dettagli mancanti" });

    try {
        const user = await userModel.findOne({ 'anagrafica.email': email });
        if (!user) return res.json({ success: false, message: "Utente non trovato" });

        // CONTROLLI STANDARD Visti PRIMA OTP MATCH 
        if (user.resetOtp === '' || user.resetOtp !== otp) {
            return res.json({ success: false, message: "OTP non valido" });
        }

        if (user.resetOtpExpireAt < Date.now()) {
            return res.json({ success: false, message: "OTP scaduto" });
        }

        // ESITO API
        return res.json({ success: true, message: "OTP verificato" });

    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};

// ============================================================
// ENDPOINT DI END EVENT (SALVA VERA NUOVA PASSWORD SUBITO DOPO CHECK VERIFY-RESET OK) 
// ============================================================
export const resetPassword = async (req, res) => {

    // Richiede in blocco form "Nuova Pss" e vecchio OTP per prevenire Hack postumi in sessione 
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) return res.json({ success: false, message: "Dettagli mancanti" });

    try {
        const user = await userModel.findOne({ 'anagrafica.email': email });
        if (!user) return res.json({ success: false, message: "Utente non trovato" });

        // SECURE CHECK DOPPIO GUARDIA ! Il Server ricontrolla che l OTP inviatoci  (nel post) fosse quello vero se per caso Utente Bypassava Pagina form FrontEnd usando un "Postman" \ hacker API 
        if (user.resetOtp === '' || user.resetOtp !== otp) { return res.json({ success: false, message: "OTP non valido" }); }
        if (user.resetOtpExpireAt < Date.now()) { return res.json({ success: false, message: "OTP scaduto" }); }

        // HASHA LA NUOVA STRINGA IN ARRIVO PASSWORD
        const hashedPassword = await bcryptjs.hash(newPassword, 10);

        // RIPULITURA RECORD RESET (Svuoto timer ecc) AND ASSEGNAZIONE NUOVA HASHPASW NEL RAM VIRTUAL DOC MODEL
        user.login.password = hashedPassword;
        user.resetOtp = '';
        user.resetOtpExpireAt = 0;

        await user.save(); // Salva VIRTUAL RAM DATA  in -> DB MONGODB
        return res.json({ success: true, message: "Password reimpostata" });

    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};
