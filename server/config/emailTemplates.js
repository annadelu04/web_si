export const EMAIL_VERIFY_TEMPLATE = `
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">

<head>
  <title>Email Verify</title>
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link href="https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600&display=swap" rel="stylesheet" type="text/css">
  <style type="text/css">
    body {
      margin: 0;
      padding: 0;
      font-family: 'Open Sans', sans-serif;
      background: #E5E5E5;
    }

    table, td {
      border-collapse: collapse;
    }

    .container {
      width: 100%;
      max-width: 500px;
      margin: 70px 0px;
      background-color: #ffffff;
    }

    .main-content {
      padding: 48px 30px 40px;
      color: #000000;
    }

    .button {
      width: 100%;
      background: #22D172;
      text-decoration: none;
      display: inline-block;
      padding: 10px 0;
      color: #fff;
      font-size: 14px;
      text-align: center;
      font-weight: bold;
      border-radius: 7px;
    }

    @media only screen and (max-width: 480px) {
      .container {
        width: 80% !important;
      }

      .button {
        width: 50% !important;
      }
    }
  </style>
</head>

<body>
  <table width="100%" cellspacing="0" cellpadding="0" border="0" align="center" bgcolor="#F6FAFB">
    <tbody>
      <tr>
        <td valign="top" align="center">
          <table class="container" width="600" cellspacing="0" cellpadding="0" border="0">
            <tbody>
              <tr>
                <td class="main-content">
                  <table width="100%" cellspacing="0" cellpadding="0" border="0">
                    <tbody>
                      <tr>
                        <td style="padding: 0 0 24px; font-size: 18px; line-height: 150%; font-weight: bold;">
                          Verify your email
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 0 0 10px; font-size: 14px; line-height: 150%;">
                          You are just one step away to verify your account for this email: <span style="color: #4C83EE;">{{email}}</span>.
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 0 0 16px; font-size: 14px; line-height: 150%; font-weight: 700;">
                          Use below OTP to verify your account.
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 0 0 24px;">
                          <p class="button" >{{otp}}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 0 0 10px; font-size: 14px; line-height: 150%;">
                          This OTP is valid for 24 hours.
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>
            </tbody>
          </table>
        </td>
      </tr>
    </tbody>
  </table>
</body>
</html>

`

export const PASSWORD_RESET_TEMPLATE = `

<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">

<head>
  <title>Password Reset</title>
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link href="https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600&display=swap" rel="stylesheet" type="text/css">
  <style type="text/css">
    body {
      margin: 0;
      padding: 0;
      font-family: 'Open Sans', sans-serif;
      background: #E5E5E5;
    }

    table, td {
      border-collapse: collapse;
    }

    .container {
      width: 100%;
      max-width: 500px;
      margin: 70px 0px;
      background-color: #ffffff;
    }

    .main-content {
      padding: 48px 30px 40px;
      color: #000000;
    }

    .button {
      width: 100%;
      background: #22D172;
      text-decoration: none;
      display: inline-block;
      padding: 10px 0;
      color: #fff;
      font-size: 14px;
      text-align: center;
      font-weight: bold;
      border-radius: 7px;
    }

    @media only screen and (max-width: 480px) {
      .container {
        width: 80% !important;
      }

      .button {
        width: 50% !important;
      }
    }
  </style>
</head>

<body>
  <table width="100%" cellspacing="0" cellpadding="0" border="0" align="center" bgcolor="#F6FAFB">
    <tbody>
      <tr>
        <td valign="top" align="center">
          <table class="container" width="600" cellspacing="0" cellpadding="0" border="0">
            <tbody>
              <tr>
                <td class="main-content">
                  <table width="100%" cellspacing="0" cellpadding="0" border="0">
                    <tbody>
                      <tr>
                        <td style="padding: 0 0 24px; font-size: 18px; line-height: 150%; font-weight: bold;">
                          Forgot your password?
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 0 0 10px; font-size: 14px; line-height: 150%;">
                          We received a password reset request for your account: <span style="color: #4C83EE;">{{email}}</span>.
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 0 0 16px; font-size: 14px; line-height: 150%; font-weight: 700;">
                          Use the OTP below to reset the password.
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 0 0 24px;">
                          <p class="button" >{{otp}}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 0 0 10px; font-size: 14px; line-height: 150%;">
                          The password reset otp is only valid for the next 15 minutes.
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>
            </tbody>
          </table>
        </td>
      </tr>
    </tbody>
  </table>
</body>
</html>
`

// Template per notifica modifica profilo
export const PROFILE_UPDATE_TEMPLATE = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; color: #6366f1; margin-bottom: 30px; }
        .content { color: #333; line-height: 1.6; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>✅ Profilo Aggiornato</h1>
        </div>
        <div class="content">
            <p>Ciao <strong>{{name}}</strong>,</p>
            <p>Il tuo profilo è stato aggiornato con successo!</p>
            <p><strong>Email:</strong> {{email}}</p>
            <p>Se non hai effettuato tu questa modifica, contattaci immediatamente.</p>
        </div>
        <div class="footer">
            <p>Questa è una email automatica, non rispondere a questo messaggio.</p>
        </div>
    </div>
</body>
</html>
`;

// Template per notifica creazione storia
export const STORY_CREATED_TEMPLATE = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; color: #9333ea; margin-bottom: 30px; }
        .content { color: #333; line-height: 1.6; }
        .story-info { background-color: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📖 Nuova Storia Creata!</h1>
        </div>
        <div class="content">
            <p>Ciao <strong>{{name}}</strong>,</p>
            <p>La tua storia è stata pubblicata con successo!</p>
            <div class="story-info">
                <p><strong>Titolo:</strong> {{title}}</p>
                <p><strong>Descrizione:</strong> {{description}}</p>
                <p><strong>Visibilità:</strong> {{visibility}}</p>
            </div>
            <p>Continua a creare storie meravigliose! ✨</p>
        </div>
        <div class="footer">
            <p>Questa è una email automatica, non rispondere a questo messaggio.</p>
        </div>
    </div>
</body>
</html>
`;

// Template per notifica modifica storia
export const STORY_UPDATED_TEMPLATE = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; color: #f59e0b; margin-bottom: 30px; }
        .content { color: #333; line-height: 1.6; }
        .story-info { background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>✏️ Storia Modificata!</h1>
        </div>
        <div class="content">
            <p>Ciao <strong>{{name}}</strong>,</p>
            <p>La tua storia è stata aggiornata con successo!</p>
            <div class="story-info">
                <p><strong>Titolo:</strong> {{title}}</p>
                <p><strong>Data modifica:</strong> {{date}}</p>
            </div>
        </div>
        <div class="footer">
            <p>Questa è una email automatica, non rispondere a questo messaggio.</p>
        </div>
    </div>
</body>
</html>
`;

// Template per OTP eliminazione profilo
export const DELETE_OTP_TEMPLATE = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; color: #dc2626; margin-bottom: 30px; }
        .content { color: #333; line-height: 1.6; }
        .otp-box { background-color: #fee2e2; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; }
        .otp-code { font-size: 32px; font-weight: bold; color: #dc2626; letter-spacing: 5px; }
        .warning { background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>⚠️ Conferma Eliminazione Profilo</h1>
        </div>
        <div class="content">
            <p>Ciao <strong>{{name}}</strong>,</p>
            <p>Hai richiesto l'eliminazione del tuo profilo. Usa il codice seguente per confermare:</p>
            <div class="otp-box">
                <div class="otp-code">{{otp}}</div>
                <p style="margin-top: 10px; font-size: 14px; color: #666;">Questo codice scade tra 15 minuti</p>
            </div>
            <div class="warning">
                <p><strong>⚠️ ATTENZIONE:</strong> Questa azione è irreversibile. Una volta eliminato il profilo, tutti i tuoi dati saranno persi definitivamente.</p>
            </div>
            <p>Se non hai richiesto questa operazione, ignora questa email e il tuo account rimarrà al sicuro.</p>
        </div>
        <div class="footer">
            <p>Questa è una email automatica, non rispondere a questo messaggio.</p>
        </div>
    </div>
</body>
</html>
`;

export const CHILD_ADDED_TEMPLATE = `
<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Nuovo Profilo Bambino Aggiunto</title>
</head>
<body style="font-family: Arial, sans-serif; background-color: #f0fdf4; margin: 0; padding: 0;">
    <div style="max-width: 600px; margin: 20px auto; background-color: #ffffff; padding: 20px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #4f46e5;">Nuovo Esploratore a Bordo! 🚀</h1>
        </div>
        <div style="color: #333333; font-size: 16px; line-height: 1.6;">
            <p>Ciao {{childName}},</p>
            <p>Ti confermiamo che è stato aggiunto un nuovo profilo bambino al tuo account: <strong>{{childName}}</strong>.</p>
            <p>Ora può accedere alla piattaforma in modo semplificato!</p>
            <br>
            <p>Se non hai effettuato tu questa operazione, ti preghiamo di contattarci immediatamente.</p>
        </div>
        <div style="margin-top: 30px; text-align: center; color: #888888; font-size: 12px;">
            <p>Grazie per usare la nostra piattaforma inclusiva.</p>
        </div>
    </div>
</body>
</html>
`;

export const THERAPIST_ADDED_TEMPLATE = `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif;">
    <h2 style="color: #4f46e5;">📩 Nuova Richiesta di Collaborazione</h2>
    <p>Ciao {{therapistName}},</p>
    <p>Il genitore <strong>{{parentName}}</strong> ({{parentEmail}}) ti ha inviato un invito per seguire il percorso dei suoi bambini.</p>
    <p>Puoi accettare o rifiutare questa richiesta direttamente dalla tua dashboard nella sezione "Inviti".</p>
    <p>Se accetti, potrai visualizzare i progressi e revisionare le storie dei bambini.</p>
</body>
</html>
`;

export const INVITATION_ACCEPTED_TEMPLATE = `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif;">
    <h2 style="color: #10b981;">✅ Invito Accettato!</h2>
    <p>Ciao {{parentName}},</p>
    <p>Il terapista <strong>{{therapistName}}</strong> ha accettato il tuo invito!</p>
    <p>Da ora potrà visualizzare i progressi e revisionare le storie che creerai per i tuoi bambini.</p>
</body>
</html>
`;

export const INVITATION_REJECTED_TEMPLATE = `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif;">
    <h2 style="color: #ef4444;">❌ Invito Non Accettato</h2>
    <p>Ciao {{parentName}},</p>
    <p>Ti informiamo che il terapista <strong>{{therapistName}}</strong> non ha potuto accettare la tua richiesta di collaborazione in questo momento.</p>
    <p>Puoi provare a contattare un altro professionista dalla lista dei terapisti disponibili.</p>
</body>
</html>
`;

export const STORY_PENDING_TEMPLATE = `<!DOCTYPE html><html><body style="font-family:Arial;background:#f4f4f4;padding:20px"><div style="max-width:600px;margin:auto;background:#fff;padding:30px;border-radius:10px"><h1 style="color:#f59e0b;text-align:center">⏳ Nuova Storia da Revisionare</h1><p>Ciao <strong>{{therapistName}}</strong>,</p><p>Una nuova storia è in attesa della tua approvazione:</p><div style="background:#fef3c7;padding:15px;border-radius:8px;margin:20px 0"><p><strong>Titolo:</strong> {{storyTitle}}</p><p><strong>Creata da:</strong> {{parentName}}</p></div><p>Accedi alla tua dashboard per revisionare e approvare la storia.</p></div></body></html>`;

export const STORY_APPROVED_TEMPLATE = `<!DOCTYPE html><html><body style="font-family:Arial;background:#f4f4f4;padding:20px"><div style="max-width:600px;margin:auto;background:#fff;padding:30px;border-radius:10px"><h1 style="color:#10b981;text-align:center">✅ Storia Approvata!</h1><p>Ciao <strong>{{parentName}}</strong>,</p><p>Ottima notizia! La tua storia è stata approvata dal terapista.</p><div style="background:#d1fae5;padding:15px;border-radius:8px;margin:20px 0;text-align:center"><p style="font-size:24px">🎉</p><p><strong>{{storyTitle}}</strong></p><p style="font-size:14px;color:#059669">Ora è visibile al bambino!</p></div></div></body></html>`;

export const STORY_REJECTED_TEMPLATE = `<!DOCTYPE html><html><body style="font-family:Arial;background:#f4f4f4;padding:20px"><div style="max-width:600px;margin:auto;background:#fff;padding:30px;border-radius:10px"><h1 style="color:#ef4444;text-align:center">❌ Storia Non Approvata</h1><p>Ciao <strong>{{parentName}}</strong>,</p><p>Il terapista ha revisionato la tua storia ma non è stata approvata.</p><div style="background:#fee2e2;padding:15px;border-radius:8px;margin:20px 0;border-left:4px solid #ef4444"><p><strong>Storia:</strong> {{storyTitle}}</p><p><strong>Motivo:</strong> {{rejectionReason}}</p></div><p>Puoi modificare la storia e inviarla nuovamente per l'approvazione.</p></div></body></html>`;

