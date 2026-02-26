import jwt from 'jsonwebtoken';
import bcryptjs from 'bcryptjs';
import { userModel } from '../models/userModel.js';
import transporter from '../config/nodemailer.js';
import { EMAIL_VERIFY_TEMPLATE, PASSWORD_RESET_TEMPLATE } from '../config/emailTemplates.js';

/**
 * @desc    Registra un nuovo utente (Genitore o Terapeuta).
 *          Esegue la validazione dei dati, controlla se l'email esiste già, genera l'hash della password
 *          e salva il nuovo utente. Alla fine, genera un token JWT per il login automatico e invia una mail di benvenuto.
 * @route   POST /api/auth/register
 * @access  Public
 * @param {Object} req - L'oggetto della richiesta, contenente name, surname, email, password, userType nel body.
 * @param {Object} res - L'oggetto della risposta, restituisce l'esito della registrazione.
 * @returns {Object} JSON con { success: true, message: '...' } in caso di successo.
 */
export const register = async (req, res) => {
   // 1. Estrazione dati dal body
   const { name, surname, email, password, userType } = req.body;

   // 2. Validazione input
   if (!name || !surname || !email || !password || !userType) {
      return res.json({ success: false, error: "Dettagli mancanti. Compila tutti i campi." });
   }

   try {
      // 3. Controllo esistenza utente tramite email anagrafica
      const existingUser = await userModel.findOne({ 'anagrafica.email': email });

      if (existingUser) {
         return res.json({ success: false, error: "Utente già registrato con questa email" });
      }

      // 4. Cifratura Password (Hashing)
      const hashedPassword = await bcryptjs.hash(password, 10);

      // 5. Creazione Utente
      const registerUser = new userModel({
         tipo_utente: userType.toLowerCase(), // Normalizza input (Bambino -> bambino)

         anagrafica: {
            nome: name,
            cognome: surname,
            email: email,
            // codice_fiscale: opzionale
         },
         login: {
            password: hashedPassword,
            nuovo_utente: true
         },
         profilo: {
            livello: 1,
            punti_totali: 0,
            avatar: ""
         },
         // Campi sicurezza iniziali
         isAccountVerified: false,
         verifyOtp: '',
         verifyOtpExpireAt: 0,
         resetOtp: '',
         resetOtpExpireAt: 0
      });

      await registerUser.save();

      // 6. Generazione Token JWT (Login automatico post-registrazione)
      const token = jwt.sign({ id: registerUser._id }, process.env.JWT_SECRETE, { expiresIn: "7d" });

      // Imposta cookie HTTP-Only sicuro
      res.cookie('token', token, {
         httpOnly: true,
         secure: process.env.NODE_ENV === 'production',
         sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
         maxAge: 7 * 24 * 60 * 60 * 1000
      });

      // 7. Invio Email di Benvenuto
      const sendEmail = {
         from: process.env.SENDER_EMAIL,
         to: email,
         subject: "Benvenuto in Storie Amiche!",
         html: `<h2>Ciao ${name}, il tuo account (${userType}) è stato creato con successo!</h2>`
      };

      try {
         await transporter.sendMail(sendEmail);
      } catch (emailError) {
         console.log("Errore invio email (non bloccante):", emailError);
      }

      return res.json({ success: true, message: "Account creato con successo!" });

   } catch (error) {
      console.log(error);
      return res.json({ success: false, message: error.message });
   }
};

/**
 * @desc    Autenticazione utente e creazione sessione (Login).
 *          Verifica l'esistenza dell'email, controlla la corrispondenza della password tramite bcrypt
 *          e restituisce un token JWT configurato come cookie HTTP-Only.
 * @route   POST /api/auth/login
 * @access  Public
 * @param {Object} req - L'oggetto della richiesta, contenente email e password.
 * @param {Object} res - L'oggetto della risposta, restituisce il token nel cookie e l'esito del login.
 * @returns {Object} JSON con { success: true, message: '...', user: {...} } in caso di successo.
 */
export const login = async (req, res) => {
   const { email, password } = req.body;

   if (!email || !password) {
      return res.json({ success: false, message: "Email e password richieste" });
   }

   try {
      // 1. Cerca utente per email
      const existingUser = await userModel.findOne({ 'anagrafica.email': email });

      if (!existingUser) {
         return res.json({ success: false, message: "Email non valida" });
      }

      // 2. Verifica password
      const matchPass = await bcryptjs.compare(password, existingUser.login.password);

      if (!matchPass) {
         return res.json({ success: false, message: "Password errata" });
      }

      // 3. Genera e invia Token
      const token = jwt.sign({ id: existingUser._id }, process.env.JWT_SECRETE, { expiresIn: "7d" });

      res.cookie('token', token, {
         httpOnly: true,
         secure: process.env.NODE_ENV === 'production',
         sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
         maxAge: 7 * 24 * 60 * 60 * 1000
      });

      return res.json({
         success: true,
         message: "Login effettuato con successo",
         user: {
            name: existingUser.anagrafica.nome,
            email: existingUser.anagrafica.email,
            tipo_utente: existingUser.tipo_utente
         }
      });

   } catch (error) {
      return res.json({ success: false, message: error.message });
   }
};

/**
 * @desc    Effettua il logout dell'utente cancellando il cookie contenente il token JWT.
 * @route   POST /api/auth/logout
 * @access  Private
 * @param {Object} req - L'oggetto della richiesta.
 * @param {Object} res - L'oggetto della risposta, utilizzato per pulire i cookie.
 * @returns {Object} JSON con l'esito dell'operazione.
 */
export const logOut = async (req, res) => {
   try {
      // Cancella il cookie del token
      res.clearCookie('token', {
         httpOnly: true,
         secure: process.env.NODE_ENV === 'production',
         sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict'
      });

      return res.json({ success: true, message: "Logout effettuato" });
   } catch (error) {
      return res.json({ success: false, message: error.message });
   }
};

/**
 * @desc    Richiede l'invio di un OTP (codice a 6 cifre) all'email dell'utente per la verifica dell'account.
 *          L'OTP generato ha una validità di 24 ore.
 * @route   POST /api/auth/send-verify-otp
 * @access  Private
 * @param {Object} req - L'oggetto della richiesta, contiene l'ID utente (req.userId).
 * @param {Object} res - L'oggetto della risposta.
 * @returns {Object} JSON con l'esito dell'operazione.
 */
export const sendVerifyOtp = async (req, res) => {
   try {
      const userId = req.userId;
      const user = await userModel.findById(userId);

      if (user.isAccountVerified) {
         return res.json({ success: false, message: "Account già verificato" });
      }

      // Genera codice a 6 cifre
      const otp = String(Math.floor(100000 + Math.random() * 900000));

      user.verifyOtp = otp;
      user.verifyOtpExpireAt = Date.now() + 24 * 60 * 60 * 1000; // Scade in 24 ore
      await user.save();

      const mailOption = {
         from: process.env.SENDER_EMAIL,
         to: user.anagrafica.email,
         subject: "Codice OTP Verifica Account",
         html: EMAIL_VERIFY_TEMPLATE.replace("{{otp}}", otp).replace("{{email}}", user.anagrafica.email)
      };
      await transporter.sendMail(mailOption);

      return res.json({ success: true, message: "OTP di verifica inviato" });

   } catch (error) {
      return res.json({ success: false, message: error.message });
   }
};

/**
 * @desc    Verifica l'OTP inserito dall'utente per confermare l'indirizzo email.
 *          Imposta `isAccountVerified` a true se l'OTP è corretto e non scaduto.
 * @route   POST /api/auth/verify-account
 * @access  Private
 * @param {Object} req - L'oggetto della richiesta, contiene l'OTP nel body e l'ID utente in req.userId.
 * @param {Object} res - L'oggetto della risposta.
 * @returns {Object} JSON con l'esito della verifica.
 */
export const verifyOtp = async (req, res) => {
   const { otp } = req.body;
   const userId = req.userId;

   if (!otp) return res.json({ success: false, message: "OTP mancante" });

   try {
      const user = await userModel.findById(userId);
      if (!user) return res.json({ success: false, message: "Utente non trovato" });

      if (user.verifyOtp === '' || user.verifyOtp !== otp) {
         return res.json({ success: false, message: "OTP non valido" });
      }

      if (user.verifyOtpExpireAt < Date.now()) {
         return res.json({ success: false, message: "OTP scaduto" });
      }

      // Conferma verifica
      user.isAccountVerified = true;
      user.verifyOtp = '';
      user.verifyOtpExpireAt = 0;

      await user.save();

      return res.json({ success: true, message: "Email verificata con successo" });

   } catch (error) {
      return res.json({ success: false, message: error.message });
   }
};

/**
 * @desc    Endpoint di controllo auth. Utilizzato dal Frontend per verificare se l'utente
 *          possiede un token JWT valido e non è scaduto. Ritorna sempre success: true se il middleware passa.
 * @route   GET /api/auth/is-auth
 * @access  Private
 * @param {Object} req - L'oggetto della richiesta.
 * @param {Object} res - L'oggetto della risposta.
 * @returns {Object} JSON con { success: true }.
 */
export const isUserAuthenticate = async (req, res) => {
   try {
      return res.json({ success: true });
   } catch (error) {
      return res.json({ success: false, message: error.message });
   }
};

/**
 * @desc    Richiede l'invio di un OTP all'email dell'utente per resettare la password.
 *          L'OTP generato ha una validità di 15 minuti.
 * @route   POST /api/auth/send-reset-otp
 * @access  Public
 * @param {Object} req - L'oggetto della richiesta, contenente l'email nel body.
 * @param {Object} res - L'oggetto della risposta.
 * @returns {Object} JSON con l'esito dell'operazione (successo/errore).
 */
export const sendResetOtp = async (req, res) => {
   const { email } = req.body;
   if (!email) return res.json({ success: false, message: "Email mancante" });

   try {
      const user = await userModel.findOne({ 'anagrafica.email': email });
      if (!user) return res.json({ success: false, message: "Utente non trovato" });

      const otp = String(Math.floor(100000 + Math.random() * 900000));
      user.resetOtp = otp;
      user.resetOtpExpireAt = Date.now() + 15 * 60 * 1000; // Scade in 15 minuti
      await user.save();

      const mailOption = {
         from: process.env.SENDER_EMAIL,
         to: user.anagrafica.email,
         subject: "Codice OTP Reset Password",
         html: PASSWORD_RESET_TEMPLATE.replace("{{otp}}", otp).replace("{{email}}", user.anagrafica.email)
      };
      await transporter.sendMail(mailOption);

      return res.json({ success: true, message: "OTP inviato via email" });

   } catch (error) {
      return res.json({ success: false, message: error.message });
   }
};

/**
 * @desc    Verifica se l'OTP fornito per il reset della password è valido e non scaduto.
 *          Questo passaggio serve per confermare l'identità prima di permettere il cambio password effettivo.
 * @route   POST /api/auth/verify-reset-otp
 * @access  Public
 * @param {Object} req - L'oggetto della richiesta, contenente email e otp nel body.
 * @param {Object} res - L'oggetto della risposta.
 * @returns {Object} JSON con l'esito della verifica dell'OTP.
 */
export const verifyResetOtp = async (req, res) => {
   const { email, otp } = req.body;
   if (!email || !otp) return res.json({ success: false, message: "Dettagli mancanti" });

   try {
      const user = await userModel.findOne({ 'anagrafica.email': email });
      if (!user) return res.json({ success: false, message: "Utente non trovato" });

      if (user.resetOtp === '' || user.resetOtp !== otp) {
         return res.json({ success: false, message: "OTP non valido" });
      }

      if (user.resetOtpExpireAt < Date.now()) {
         return res.json({ success: false, message: "OTP scaduto" });
      }

      return res.json({ success: true, message: "OTP verificato" });

   } catch (error) {
      return res.json({ success: false, message: error.message });
   }
};

/**
 * @desc    Reimposta la password dell'utente. Richiede l'email, un OTP valido e la nuova password in chiaro.
 *          La nuova password viene criptata prima del salvataggio nel database.
 * @route   POST /api/auth/reset-password
 * @access  Public
 * @param {Object} req - L'oggetto della richiesta, contenente email, otp e newPassword nel body.
 * @param {Object} res - L'oggetto della risposta.
 * @returns {Object} JSON con l'esito dell'operazione.
 */
export const resetPassword = async (req, res) => {
   const { email, otp, newPassword } = req.body;
   if (!email || !otp || !newPassword) return res.json({ success: false, message: "Dettagli mancanti" });

   try {
      const user = await userModel.findOne({ 'anagrafica.email': email });
      if (!user) return res.json({ success: false, message: "Utente non trovato" });

      if (user.resetOtp === '' || user.resetOtp !== otp) {
         return res.json({ success: false, message: "OTP non valido" });
      }

      if (user.resetOtpExpireAt < Date.now()) {
         return res.json({ success: false, message: "OTP scaduto" });
      }

      const hashedPassword = await bcryptjs.hash(newPassword, 10);

      user.login.password = hashedPassword;
      user.resetOtp = '';
      user.resetOtpExpireAt = 0;
      await user.save();

      return res.json({ success: true, message: "Password reimpostata con successo" });

   } catch (error) {
      return res.json({ success: false, message: error.message });
   }
};