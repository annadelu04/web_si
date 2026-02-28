import React, { useContext, useEffect, useState } from "react"; // Hook base React: Context (Variabili Globali), Effect (Azioni al caricamento componente), State (Variabili Locali Componente)
import { assets } from "../assets/assets";                      // Import Modulo Locale: File JS contenente dizionario di Path (String URLs) a loghi e svg 
import axios from "axios";                                      // Fetcher di Rete: Semplifica le API Restful "POST/GET/ecc.." con config automatica di Content-Type Header a Json
import { toast } from "react-toastify";                         // UI Feedback: Mostra Notifiche non-intrusive in Overlay
import { appContext } from "../context/appContext";             // Importa il File Configura Context ("Silos Dati Globali" del progetto).
import { useNavigate } from "react-router-dom";                 // ReactRouter: Generatore di Callback function per rimbalzare client-side (`navigate("/home")`) l'utente a rotte predefinite

// COMPONENTE: EmailVerify 
// PATTERN: 2-way usage (Modale in page O Pagina intera assestante)
// Questo Componente React si occupa di fare la validazione Sicura a 2 Fattori (2FA / OTP One Time Pass). 
const EmailVerify = ({ isModal = false, onVerified }) => {

    // AXIOS SECURITY CONFIGURAION
    // `withCredentials`: Abilita flag in HttpRequest header che obbliga l'invio e ricezione dei Cookie di sessione(Auth JWT Token) a prescindere le policy Cross-Origin 
    axios.defaults.withCredentials = true;

    // CONTEXT DESTRUCTURING (Estrae 4 Variabili vitali dall'oggetto "Global Storage" Context.Provider genitore in App.Js)
    const { backendUrl, isLoggedin, userData, getUserData } = useContext(appContext);

    // REACT STATE: `isSubmitting`. Boolean UX locker. 
    // True blocca il tasto in "Loading", evide race-conditions (utente che clicca 2 volte veloci avviando 2 db Query inutili)
    const [isSubmitting, setIsSubmitting] = useState(false);

    // REACT ROUTER INITIALIZER
    const navigate = useNavigate();

    // REACT REF ARRAY: MEMORY PONTER NON-REATTIVI
    // Array che conserva puntatore HTML (`Reference`) per accedere alle funzioni di Sistema (.focus, .value ecc.) dei 6 quadrati dell'OTP. Non innescano LifeCycle Rerender se cambiati!
    const inputRefs = React.useRef([]);

    // FUNZIONE HELPER 1: GESTIONE AUTO-FOCUS AVANTI
    // Si accende all "OnInput" Typeing Key Event. Scrive un Carettare e salta di 1 quadratino di form a Destra usando Native HTML.Focus() API Browser
    const handleInput = (e, index) => {
        // PREVENZIONE OVERFLOW INDEXING: Evita Fatal Error (Out of Bounds) impedendo al JumpTarget index "5+1" di sforzare un Jump a casella nr. 7 Inesistente
        if (e.target.value.length > 0 && index < inputRefs.current.length - 1) {
            inputRefs.current[index + 1].focus(); // focus sposta il Cursore UI sul prossimo campo (il +1)
        }
    };

    // FUNZIONE HELPER 2: GESTIONE AUTO-FOCUS INDIETRO (TASTO CANC)
    // OnKeyDown Listener. Se rileva BackSpace (`e.key`), target Value deve essere nullo, E deve essere Casella > 0
    const handleKeyDown = (e, index) => {
        if (e.key === "Backspace" && e.target.value === "" && index > 0) {
            inputRefs.current[index - 1].focus(); // Come Prima ma Jump target -1 !  
        }
    };

    // FUNZIONE HELPER 3: GESTIONE "INCOLLA/PASTE TEXT" DA CLIPBOARD
    // Estraiamo Nativo Evento `clipboardData`, preleviamo testo stringa
    const handlePaste = (e) => {
        const paste = e.clipboardData.getData("text");

        // CONVESIONE STRINGA TO ARRAY (`String.split('')`)
        const pasteArray = paste.split("");

        // LOOP DI ESPANSIONE: Itera ogni carattere E forza (Direct DOM Modification - bypass react state !!) `ref.current.value` ad essere compilato per tutti e 6 contemporaneamente 
        pasteArray.forEach((char, index) => {
            if (inputRefs.current[index]) {
                inputRefs.current[index].value = char;
            }
        });
    };

    // FUNZIONE SUBMIT (ASYNCHRONOUS FORM SENDER)
    // Racchiusa in "Try..Catch" Error boundary JS moderno
    const onSubmitHandler = async (e) => {
        try {
            e.preventDefault(); // Stoppa Submit Form GET Browser Vanilla per evitare refreh pagina bianco 
            setIsSubmitting(true); // Blocco UX Frontend UI (pulsante disabilitato, avvio girandola se ci fosse)

            // PRELIEVO ED ESTRATTURA ARRAY NORMALE DA REF VIRTUAL DOM REACT
            // `.map((e) => e.value)` = Costruisco nuovo vettore che salva il char digitato e non roba complessa html NodeObject
            const otpArray = inputRefs.current.map((e) => e.value);

            // SERIALIZZATORE `.join('')`: Da array `['1','2','3']` a stringa `"123"` per il server json
            const otp = otpArray.join("");

            // CHIAMATA API POST AXIOS: Schedula Evento NodeLoop e fa Promise Await per fine rete.
            const { data } = await axios.post(
                backendUrl + "/api/auth/verify-account",
                { otp }  // Shorthand Ojbect Es6 = `{otp: otp}`
            );

            // SUCCESS RESPONSE CHECK
            if (data.success) {
                toast.success(data.message);

                // RICHIESTA RI-SCANSIONE USER: l'utente ormai è Validato Backend! Ricarico DB info al frontend cosi ho il check verde Verified visualizzato
                await getUserData();

                // RENDERING MODE CHECK: Se modale => chiamo callBack onVerified. Altrmenti se pagina isolata faccio Re-Direct Root home `/` 
                if (isModal && onVerified) {
                    onVerified();
                } else {
                    navigate("/");
                }
            } else {
                toast.error(data.message); // Notifica Backend Message "Wrong OTP" / "Timeout" ecc.
            }
        } catch (error) {
            toast.error(error.message);    // Eccezione HTTP Fallto, Timeout Rete, 500 error
        } finally {
            // RELASE BLOCK UX: Indipendentemente da Esito DB, riapre l interazione pulsante Utente Finaley
            setIsSubmitting(false);
        }
    };

    // GUARD HOOK LIFECYCLE EFFETTO: 
    // Lo scopo è Re-Direct per "GIA' VERIFICATI" in arrivo forzatamente a link o tramite back button history su questa pagina superflua
    useEffect(() => {
        // LOGICA Multipla (Tutte Verità)
        // !isModal (non modale popup). isLogged (ha session). Userdata e property account= true.. Vai Al Via via `Navigate()` route
        if (!isModal && isLoggedin && userData && userData.isAccountVerified) {
            navigate("/");
        }
    }, [isLoggedin, userData, isModal]); // Watcher dependencies

    // JSX CORE : FORM CONTENITORE VERO E PROPRIO
    // Variabilizzato dentro "Content" Javascript memory Object reference per pattern DRY (Don't Repeat Yourself UI)
    const content = (
        <form
            onSubmit={onSubmitHandler} // Attach OnSubmit Function to <form> 
            // CLASSE DINAMICA CSS TERNARY (se è una modale non serve il Box viola Gradient, altrimenti si ! Tailwind Engine `isModal?` ternary.) 
            className={isModal ? "text-sm w-full" : "bg-gradient-to-br from-pink-200  to-purple-400 border border-slate-400 rounded-lg p-9 w-96 text-sm"}
        >
            <h1 className={`${isModal ? "text-gray-800" : "text-white"} text-2xl font-semibold text-center mb-4`}>
                Email Verify OTP
            </h1>

            <p className={`text-center mb-6 ${isModal ? "text-gray-500" : "text-indigo-700"}`}>
                Enter the 6-digit code sent to your email id.
            </p>

            {/* OTP COMPOSITOR ROW Container
                `OnPaste` = Binding a clipboard Native Event Listener handler */}
            <div className="flex justify-between mb-8" onPaste={handlePaste}>
                {/* ARRAY ITERATION AUTOMATICA DI VETTORE INIT FITTIZIO A 6 POSIZIONI "Array(6).fill(0)" -> Mappato a Caselle Html Dinamiche 
                   Si Spaccia sintassi Javascript ripetitiva ed ingombrante  che genererebbe DOM Bloat per creare 6 caselle singolarmente. */}
                {Array(6)
                    .fill(0) // Da 6 undefined -> 6 [0] array per fare `.map()` che si applica solo in defined values.
                    .map((_, index) => (
                        <input
                            className={`w-12 h-12 ${isModal ? "bg-gray-50 border border-gray-300 text-gray-800" : "bg-[#333A5C] text-white"} text-center text-xl rounded-md outline-blue-600`}
                            type="text"   // Usa tastiera virtuale Testo, spesso OTP ios suona meglio con questo mode
                            maxLength="1" // Lunghezza Max
                            key={index}   // REQUISITO CHIAVE REACT ITERATION VDOM ALGORITMO! Aiuta lo state watcher
                            required      // Previne HTML Form Submit prima validazione Native
                            // ALLOCAZIONE REFERENCE: Aggiunge Elemento HTML caricato `e` array Ref React
                            ref={(e) => (inputRefs.current[index] = e)}
                            onInput={(e) => handleInput(e, index)}       // Event Handler KeyStroke Lettere Nuove Typing   
                            onKeyDown={(e) => handleKeyDown(e, index)}   // Event Handler BackSpace (Cancellazione) 
                        />
                    ))}
            </div>

            <button
                // LOGICA CASCATA CSS `IsSubmitting ? "Grey Disabled Apparenza": "Blue Clickalbe Apparanza "`
                className={`py-3 text-white font-semibold text-base bg-gradient-to-r from-indigo-500 to-purple-600 w-full rounded-full ${isSubmitting
                    ? "bg-gray-400 cursor-not-allowed border-2 border-blue-500 outline outline-blue-400"
                    : "bg-blue-600 hover:bg-blue-700"
                    }`}
                disabled={isSubmitting}>
                Verify Email
            </button>
        </form>
    );

    // ROOT COMPONENTE RENDERING RETURN PATHS "FORKED" (CONDITIONAL RENDER TREE BASEMENT) 

    if (isModal) {
        // Se e Modale (`/ChildArea` usage Modals e settings) spara solo Form Crudo
        return content;
    }

    // Se è pagina stand-alone (`/email-verify` rotta) incasella iL FORM CRUDO prebuild in un Layout Full screen di UI Design "Bg" gradiente
    return (
        <div className="bg-gradient-to-br from-blue-200 to-pink-400 min-w-screen min-h-screen flex flex-col justify-center items-center">
            {/* LOGO REDIRECT HEADER */}
            <img
                onClick={() => navigate("/")}
                src={assets.myLogo}
                alt=""
                className="absolute left-5 sm:left-20 top-0 w-28 sm:w-32 cursor-pointer shadow-lg"
            />

            {/* INJECT REACT VARIABLE NODE `CONTENT` (Contiene JSX preRenderizzato ed unbindato alla memoria di questo wrapper parent) */}
            {content}
        </div>
    );
};

// ESPORTA REACT COMPONENT AS "LIBRERIA" 
export default EmailVerify;
