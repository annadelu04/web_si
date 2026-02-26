// server/test-email.js
import nodemailer from "nodemailer";

// --- CONFIGURAZIONE GMAIL ---
const USER_EMAIL = "linked.out664@gmail.com";

// ⚠️ IMPORTANTE: Qui devi incollare la "Password per le App" di Google (16 lettere).
// NON usare la password con cui fai il login, e NON usare la chiave di Brevo.
const GOOGLE_APP_PASSWORD = "gfrd edvc bapk rlco";

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',  // Server di Google
    port: 465,               // Porta sicura per Gmail
    secure: true,            // Deve essere true per la porta 465
    auth: {
        user: USER_EMAIL,
        pass: GOOGLE_APP_PASSWORD
    },
    debug: true // Ci mostrerà i dettagli della connessione
});

async function main() {
    console.log("--------------------------------------------------");
    console.log(`Tentativo di connessione a GMAIL con: ${USER_EMAIL}`);
    console.log("--------------------------------------------------");

    try {
        // 1. Verifica la connessione
        await transporter.verify();
        console.log("✅ SUCCESSO! Connessione al server SMTP di Gmail riuscita.");

        // 2. Prova a inviare una vera email a te stesso per conferma finale
        console.log("Tentativo di invio email di prova...");
        const info = await transporter.sendMail({
            from: `"Test Server" <${USER_EMAIL}>`,
            to: USER_EMAIL, // La invia a te stesso
            subject: "Test Funzionamento Gmail ✔",
            text: "Se leggi questo messaggio, il tuo server Node.js può inviare email tramite Gmail!",
            html: "<b>Se leggi questo messaggio, il tuo server Node.js può inviare email tramite Gmail!</b>",
        });

        console.log("✅ EMAIL INVIATA CON SUCCESSO!");
        console.log("Message ID: %s", info.messageId);
        console.log("--------------------------------------------------");

    } catch (error) {
        console.error("❌ ERRORE:");
        console.error(error.message);

        if (error.responseCode === 535) {
            console.log("\n--- DIAGNOSI PER GMAIL ---");
            console.log("Errore 535 con Gmail significa solitamente:");
            console.log("1. Hai usato la tua password normale invece della 'Password per le App'.");
            console.log("2. Non hai attivato la verifica in 2 passaggi su Google.");
            console.log("3. Hai copiato la password con degli spazi extra.");
        }
    }
}

main();