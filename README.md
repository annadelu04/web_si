# 🌈 Storie Amiche

**Storie Amiche** è una piattaforma web innovativa progettata per supportare bambini con autismo e neurodivergenze attraverso l'uso delle **Storie Sociali**. Il sistema facilita la comunicazione, l'apprendimento di routine quotidiane e la gestione delle emozioni attraverso un'interfaccia colorata, intuitiva e accessibile.

## 🚀 Caratteristiche Principali

- 📖 **Editor di Storie Dinamico**: Crea storie personalizzate con testi, immagini e video.
- 🎧 **Narrazione con IA (VibeVoice)**: Genera automaticamente l'audio della storia con voci naturali (maschili e femminili).
- 🧩 **Gioco delle Sequenze Interattivo**: Un gioco di riordino delle scene per allenare la logica e la comprensione temporale.
- 🎨 **Interfaccia Accessibile**: Design colorato, tessere grandi e supporti visivi per facilitare l'uso da parte dei bambini.
- 👩‍⚕️ **Profilo Terapista**: Strumenti per revisionare le storie e monitorare i progressi.
- 🔐 **Sistema di Autenticazione Completo**: Accesso sicuro per genitori e terapisti.

---

## 🧱 Tech Stack

**Frontend:**
- **React.js**: Per un'interfaccia reattiva e moderna.
- **Tailwind CSS**: Per un design elegante e responsivo.
- **Context API**: Per la gestione globale dello stato.
- **Axios**: Per le chiamate API al backend.

**Backend:**
- **Node.js & Express**: Il motore dell'applicazione.
- **MongoDB**: Per il salvataggio sicuro di storie e profili.
- **JWT & HTTP-Only Cookies**: Per la massima sicurezza dell'autenticazione.
- **VibeVoice (Python)**: Integrazione IA locale per la sintesi vocale.

---

## 🛠️ Installazione e Configurazione

> [!IMPORTANT]
> **PRIMO PASSO FONDAMENTALE:** 
> Prima di fare qualsiasi altra cosa, devi eseguire lo script di configurazione automatica(Setup.py). Questo script verificherà che tu abbia tutto il necessario e installerà le dipendenze per te.

### 1. Esegui lo Script di Setup 🚀
Assicurati di avere Python installato, poi apri il terminale nella cartella principale del progetto ed esegui:

```bash
python setup.py
```

Questo script farà tutto il lavoro sporco per te:
- ✅ **Installa le dipendenze** Node.js per Frontend e Backend.
- ✅ **Configura l'ambiente Python** per l'Intelligenza Artificiale (VibeVoice).
- ✅ **Crea le cartelle** necessarie per i file audio.
---
### 2. Configurazione Variabili d'Ambiente (.env) 🌐
Prima di avviare il server, è necessario configurare le variabili d'ambiente per il corretto funzionamento delle email (OTP e Reset Password). Crea un file `.env` nella cartella `server/` (se non esiste già) e aggiungi i seguenti valori:

```env
# Indirizzo email per l'autenticazione SMTP
SMTP_USER=
# Password applicativa per l'invio sicuro (Gmail App Password)
SMTP_PASS=
# Email visualizzata come mittente
SENDER_EMAIL=
```

> [!NOTE]
> Se usi Gmail, dovrai generare una "Password per le App" dalle impostazioni di sicurezza del tuo account Google.

---

### 3. Avvio del Progetto 🏁
Una volta completato il setup, puoi avviare il sito. Avrai bisogno di due terminali aperti:

#### Terminale 1: Backend (Server)
```bash
cd server
node server.js
```
*Il server partirà sulla porta 4000.*

#### Terminale 2: Frontend (Sito Web)
```bash
cd client
npm run dev
```
*Il sito sarà accessibile all'indirizzo mostrato nel terminale (solitamente http://localhost:5173).*

---

### 3. Note Aggiuntive e Prerequisiti
Se lo script `setup.py` dovesse darti errori, verifica di avere installato:
- **Node.js** (v16 o superiore)
- **Python** (v3.8 o superiore)
- **MongoDB** (Deve essere in esecuzione localmente o avere una stringa di connessione valida)

---

## 🤝 Contribuire
Siamo sempre aperti a miglioramenti! Se hai idee o trovi dei bug, apri una *Issue* o invia una *Pull Request*.

## 📝 Licenza
Progetto realizzato con ❤️ per il supporto terapeutico.
