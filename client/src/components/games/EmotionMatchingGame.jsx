import React, { useState, useEffect, useContext } from 'react'; // React: User Interface. Hooks (useState, useEffect, useContext) per gestione stato e ciclo di vita.
import { useParams, useNavigate } from 'react-router-dom';      // React Router: logica di navigazione. useParams=parametri URL, useNavigate=spostamenti programmatici.
import { appContext } from '../../context/appContext';          // Context API: gestisce lo stato "Globale" senza passare props a cascata (es. url per API).
import axios from 'axios';                                      // Axios: HTTP Client. Semplifica `fetch()` richiedendo e mandando JSON nativamente.
import { toast } from 'react-toastify';                         // Toastify: Libreria per notifiche visive popup non bloccanti.
import Navbar from '../Navbar';                                 // Navbar: componente React importato da un file esterno.

// COMPONENTE: EmotionMatchingGame
// GESTISCE: Un gioco di associazione Testo->Emozione tramite State Machine.
const EmotionMatchingGame = () => {
    // ESTREZIONE PARAMETRI URL: Ottiene lo "storyId" dal path, es. /games/emotion/:storyId
    const { storyId } = useParams();

    // NAVIGAZIONE PROGRAMMATICA: Permette di forzare reindirizzamenti (es. alla fine del gioco).
    const navigate = useNavigate();

    // DESTRUCTURING DA CONTEXT: Otteniamo `backendUrl` globale (mantenuto in Context API).
    const { backendUrl } = useContext(appContext);

    // STATE - DATI STORIA: Salva il payload JSON intero restituito dal Backend. (Object)
    const [story, setStory] = useState(null);

    // STATE - PROGRESSIONE: Indice 0-based della scena attualmente in gioco. (Number)
    const [currentSceneIndex, setCurrentSceneIndex] = useState(0);

    // STATE - INPUT UTENTE: Emozione cliccata dal giocatore. (String, es. "Felice")
    const [selectedEmotion, setSelectedEmotion] = useState(null);

    // STATE - GAMIFICATION: Punteggio totalizzato. Incrementa con risposte giuste. (Number)
    const [score, setScore] = useState(0);

    // STATE - FLUSSO: Segnala se tutte le scene sono esaurite (true=fine). (Boolean)
    const [isComplete, setIsComplete] = useState(false);

    // STATE - UX/UI: Selezionando un bottone lo blocchiamo e gestiamo UI attesa. (Boolean)
    const [loading, setLoading] = useState(true);

    // STATE - TIMING E FEEDBACK: true mostra un feedback (bordo rosso/verde) per 2 sec. (Boolean)
    const [showFeedback, setShowFeedback] = useState(false);

    // STATE - VALIDAZIONE: true se la precedente emozione scelta era corretta. (Boolean)
    const [isCorrectAnswer, setIsCorrectAnswer] = useState(false);

    // CONFIGURAZIONE STATICA: Database delle emoji. Ogni oggetto mappa un ID al CSS.
    // L'implementazione hardcoded va bene se gli elementi non cambieranno spesso.
    const emotions = [
        { name: 'Felice', emoji: '😊', color: 'bg-yellow-200 hover:bg-yellow-300' },
        { name: 'Triste', emoji: '😢', color: 'bg-blue-200 hover:bg-blue-300' },
        { name: 'Arrabbiato', emoji: '😠', color: 'bg-red-200 hover:bg-red-300' },
        { name: 'Sorpreso', emoji: '😲', color: 'bg-purple-200 hover:bg-purple-300' },
        { name: 'Spaventato', emoji: '😨', color: 'bg-gray-200 hover:bg-gray-300' },
        { name: 'Eccitato', emoji: '🤩', color: 'bg-pink-200 hover:bg-pink-300' }
    ];

    // FUNZIONE LOGICA (NATURAL LANGUAGE PROCESSING): Riconoscimento "rule-based" basato su keyword base.
    const getExpectedEmotion = (sceneText) => {
        // STRING.TOLOWERCASE(): Formatta tutto a minuscolo, evitando problemi col Case Sensitivity (es "Felice" vs "felice").
        const text = sceneText.toLowerCase();

        // MATCHING CON PRIORITÀ: Il primo `.includes` che scatta ferma l'algoritmo usando `return`.
        // Qui applichiamo un NLP rule-based, una tipologia molto semplice di Intelligenza Artificiale per l'assegnamento delle etichette del sentimento ("sentiment analysis").
        if (text.includes('felice') || text.includes('contento') || text.includes('gioia')) return 'Felice';
        if (text.includes('triste') || text.includes('piange')) return 'Triste';
        if (text.includes('arrabbiato') || text.includes('furioso')) return 'Arrabbiato';
        if (text.includes('sorpreso') || text.includes('stupito')) return 'Sorpreso';
        if (text.includes('paura') || text.includes('spaventato')) return 'Spaventato';
        if (text.includes('eccitato') || text.includes('entusiasta')) return 'Eccitato';

        // FALLBACK VALUE: Evitiamo che la funzione non ritorni nulla (null) in mancanza di trigger.
        return 'Felice';
    };

    // HOOK DI EFFETTO: Viene eseguito SOLO quando il componente viene "Montato" nella visualizzazione (DOM), oppure quando cambia la dipendenza "storyId"
    useEffect(() => {
        fetchStory(); // Definiamo e lanciamo il fetch iniziale asincrono dalla API.
    }, [storyId]);    // DIPENDENZE (DEPENDENCY ARRAY): Mettendo storyId il fetch ricarica i dati se c'è un cambiamento nell'url.

    // FUNZIONE ASINCRONA: Si connette al backend prelevando il file dal database di mongo DB
    const fetchStory = async () => {
        try {
            // AXIOS - CREDENZIALI: Permette di spedire Session/Token(Cookies JWT) garantendo autenticazione alla route
            axios.defaults.withCredentials = true;

            // AXIOS - GET RICHIESTA HTTP: Prende i file da Backend ExpressJs (Metodo GET). Costruiamo URL dinamicamente via TEMPLATE LITERAL `${}`
            const { data } = await axios.get(`${backendUrl}/api/story/${storyId}`);

            // DATI REST: data.success in backend gestisce se abbiamo esito (200 OK)
            if (data.success) {
                setStory(data.story); // POPOLAZIONE STATO REATTIVO REACT (Trigger render).
            } else {
                toast.error("Storia non trovata");
                navigate('/');        // ERROR HANDLING FRONTEND: rimbalza utente a home
            }
        } catch (error) {
            console.error(error);     // ERROR HANDLING CATCH: Se fallisce rete/API lo logghiamo.
            toast.error("Errore nel caricamento della storia");
        } finally {
            // CLAUSOLA FINALLY: A monte o a errore, garantiamo la fine del modale caricamento UI. (Ottimo pattern UI/UX)
            setLoading(false);
        }
    };

    // FUNZIONE "EVENT HANDLER": Scatterà dal bottone all'onClick. Contiene tutta logica del gioco.
    const handleEmotionSelect = (emotion) => {
        // STATE GUARD: Prevenzione interazioni dell'utente (UX Pattern - Debouncing manuale). Evita spam onClick
        if (showFeedback) return;

        // SET STATE: Scrittura dello stato per evidenziare il bottone via logica CSS later
        setSelectedEmotion(emotion.name);

        // ACCESS DATA: Estrazione porzione (paragrafo attuale) dalla Storia
        const currentScene = story.paragraphs[currentSceneIndex];

        // LOGICA GIOCO (NLP Call): Processa se l'algoritmo di testo coincide.
        const expectedEmotion = getExpectedEmotion(currentScene.text);

        // CONTROLLO DI MATCH: Vero se L'input (emotion) combacia col target (expectedEmotion) es: Felice == Felice.
        const correct = emotion.name === expectedEmotion;

        // SET STATE PROGRESSIONE: Boolean se corretto o no.
        setIsCorrectAnswer(correct);

        // MOSTRA FEEDBACK UI: Scatena UI ricaricando il Rendering Visivo con l'avviso di "Gia Scelto"
        setShowFeedback(true);

        // BRANCHING RISULTATO
        if (correct) {
            // SE SUCCESS: score+1. Usiamo notifica toast per un buon UX "Premio"
            setScore(score + 1);
            toast.success(`✅ Corretto! È ${emotion.emoji}`);
        } else {
            // SE FALSE: Cerchiamo (Array.find()) nella variabile `emotions` lemozione e ritorniamo emoji corrispondente col "?.emoji" optional chaining.
            toast.error(`❌ Riprova! L'emozione corretta era ${emotions.find(e => e.name === expectedEmotion)?.emoji}`);
        }

        // BROWSER API: "setTimeout". Callbacks per timing asincrono. Rende pausata per 2000ms l'azione successiva al frontend 
        setTimeout(() => {
            // CONTROLLO LOOP MATRICE: `paragraphs.length - 1` fa match con indice che parte da 0.
            if (currentSceneIndex < story.paragraphs.length - 1) {
                // NEXT LEVEL STATUS FLUSH
                setCurrentSceneIndex(currentSceneIndex + 1);
                setSelectedEmotion(null);
                setShowFeedback(false);
            } else {
                // GAME OVER STATUS "Win State"
                setIsComplete(true);
            }
        }, 2000);
    };

    // RESET FUNCTION
    const resetGame = () => {
        // HARD RESET: Pulizia di tutti gli stati legati a progresso per creare un loop
        setCurrentSceneIndex(0);
        setScore(0);
        setIsComplete(false);
        setSelectedEmotion(null);
        setShowFeedback(false);
    };

    // RENDERING GUARD / CONDITIONAL RETURN (Early Return)
    // Se "Loading" = "true" viene interrotto l`output di UI e viene emesso questa "Div" caricamento
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
                <p className="text-2xl text-indigo-600 font-medium animate-pulse">Caricamento gioco...</p>
            </div>
        );
    }

    // NULL SAFETY OPERATOR (`?.`): Estrae currentScene. Se undefined (Mancanza Storia), previene un fatal error Exception alla pagina.
    const currentScene = story?.paragraphs[currentSceneIndex];

    // RETURN REACT/JSX (Visualizzazione a schermo).
    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
            <Navbar /> {/* COMPONENTE COMPOSIZIONE REACT: Richiamo di altro Navbar separato  */}

            <div className="container mx-auto px-4 py-8 max-w-4xl">

                {/* VISUALIZZAZIONE HEADER GAME (Titoli Descrittivi) */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-gray-800 mb-2">💭 Gioco: Indovina l'Emozione</h1>
                    {/* Interpolazione variabaile `story?.title` via `{}` */}
                    <p className="text-xl text-gray-600">{story?.title}</p>
                    <p className="text-lg text-gray-500 mt-2">Quale emozione rappresenta questa scena?</p>
                </div>

                {/* TERNARY RENDER OPERATOR: L'Intera pagina è regolata da un boolean: "Vero ? (X) : Falso ? (Y)". 
                    In questo caso Seleziona se il gioco è completato (JSX-A) o se c`è il game in loop (JSX-B). */}
                {!isComplete ? (
                    // React.Fragment `<>` per incapsulare nodi fratelli in assenza di tag genitore `div` per mantenere pulito DOM tree
                    <>
                        {/* SCORE BANNER UI SCENE */}
                        <div className="mb-8 bg-white rounded-2xl p-6 shadow-lg">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-lg font-bold text-gray-700">Scena:</span>
                                <span className="text-2xl font-bold text-indigo-600">
                                    {/* 1-BASED OUTPUT INDEX (+1) per non mostrare 'Scena 0' */}
                                    {currentSceneIndex + 1} / {story?.paragraphs.length}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-lg font-bold text-gray-700">Punteggio:</span>
                                {/* `score` intero per feedback immediato */}
                                <span className="text-2xl font-bold text-green-600">⭐ {score}</span>
                            </div>
                        </div>

                        {/* DISPLAY IMMAGINE & TESTO SCENA */}
                        <div className="bg-white rounded-3xl p-8 shadow-2xl mb-8">
                            {/* AND LOGICAL OPERATOR (`&&`): Nel JSX questo valuterà ed opererà il render HTML del tag `<IMG>` 
                                ESCLUSIVAMENTE se currentScene E mediaType rispettano le query (Image esistente).  */}
                            {currentScene?.mediaUrl && currentScene.mediaType === 'image' && (
                                <img
                                    src={currentScene.mediaUrl}
                                    alt="Scena"
                                    // CSS: `object-cover` è utilissimo per impedire all'immagine di stretcharsi mantenendo le sue properzioni (Aspect Ratio) su width-100 `w-full`.
                                    className="w-full h-64 object-cover rounded-2xl mb-6"
                                />
                            )}
                            {/* DISPLAY PARAGRAFO TESTUALE. Render sempre Presente poiche' parte essenziale  */}
                            <p className="text-2xl font-semibold text-gray-800 text-center leading-relaxed">
                                {currentScene?.text}
                            </p>
                        </div>

                        {/* GRIGLIA PULSANTI EMOTIONAL, Layout Grid (CSS Grid via CSS Tailwind):
                            `grid-cols-2`: A schermo < Medium 2 colonne
                            `md:grid-cols-3` Responsivity (Media Query breakpoint M) a 3 Cols. */}
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">

                            {/* `.map()` CICLO FUNZIONALE: Data la matrice Array `emotions` React itera ciascun child ritornando bottoni (High-order array method). */}
                            {emotions.map((emotion) => (
                                <button
                                    // LA KEY: Parametro `key` è un requisito assoluto e FONDAMENTALE in React per performance ottimali del Virtual DOM Diffing Algorithm
                                    key={emotion.name}
                                    onClick={() => handleEmotionSelect(emotion)} // Event Binding: Collega funzione `Handler` 
                                    disabled={showFeedback} // Feedback UI Guard: Attiva la proprietà HTML Disabled sul bottone se `ShowFeedback` sta bloccando con Timer (precedente setTimeout Timeout).

                                    // COMPLESSA TEMPLATE STRING CLASSNAME INLINE TERNARY LOGIC
                                    // Combiniamo CSS Tailwnd dinamico. Controlla stati (`showFeedback`, `isCorrectAnswer`, `selectedEmotion`).
                                    className={`
                                        p-8 rounded-3xl shadow-xl transition-all duration-300
                                        ${emotion.color}
                                        ${showFeedback
                                            // LOGICA GRAFICA FEEDBACK
                                            ? (selectedEmotion === emotion.name
                                                // Se la carta "Selezionata" combacia il flag boolean 'IsCorrect' -> Mostra 'Ring 4 green' (bordo verde HTML-Tailwind API), o rosso ('red') per Errato.
                                                ? (isCorrectAnswer ? 'ring-4 ring-green-500 scale-105' : 'ring-4 ring-red-500')
                                                : 'opacity-50') // Oscura "Muta" gli elementi non premuti in questo istante diminuendo Opacty/Alpha  via  "opacity-50"
                                            : 'hover:scale-110 hover:shadow-2xl cursor-pointer'
                                        }
                                        ${showFeedback ? 'cursor-not-allowed' : ''} // Feedback logic Pointer Not-Allowed per far capire il Block state del bottone
                                    `}
                                >
                                    <p className="text-6xl mb-3 text-center">{emotion.emoji}</p>
                                    <p className="text-xl font-bold text-gray-800 text-center">{emotion.name}</p>
                                </button>
                            ))}
                        </div>
                    </>
                ) : (
                    // SECONDA FASE TERNARY: FASE FINALE `isComplete` "WIN STATE" o "GAME OVER"
                    <div className="text-center">
                        <div className="bg-white rounded-3xl p-12 shadow-2xl mb-8">
                            <p className="text-8xl mb-6">🎉</p>
                            <h2 className="text-4xl font-bold text-gray-800 mb-4">Gioco Completato!</h2>
                            <p className="text-3xl font-bold text-indigo-600 mb-2">
                                Punteggio Finale: {score} / {story?.paragraphs.length}
                            </p>

                            {/* LOGICA MULTIPLA A CASCATA (IF..ELSE IF TERNARY) 
                                Per decidere il messaggio da stampare. Compara lo score al n dei paragrafi */}
                            <p className="text-xl text-gray-600">
                                {score === story?.paragraphs.length
                                    ? "Perfetto! Hai indovinato tutte le emozioni! 🌟"
                                    : score >= story?.paragraphs.length / 2
                                        ? "Ottimo lavoro! Continua così! 👏"
                                        : "Buon tentativo! Riprova per migliorare! 💪"
                                }
                            </p>
                        </div>

                        {/* PULSANTIERA REDIRECT FINALI*/}
                        <div className="flex gap-4 justify-center">
                            <button
                                onClick={resetGame} // Attacca funzione ResetGame via bind all'onclick del VirtualDom
                                className="px-8 py-4 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-full font-bold text-lg hover:shadow-xl hover:scale-105 transition-all"
                            >
                                🔄 Gioca Ancora
                            </button>

                            <button
                                // ROUTING LAMBDA CALL `useNavigate()` (`navigate`) triggera il route per il redirect al dashboard dell'utente.
                                onClick={() => navigate('/child-area')}
                                className="px-8 py-4 bg-gray-200 text-gray-700 rounded-full font-bold text-lg hover:bg-gray-300 transition-all"
                            >
                                ← Torna ai Giochi
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default EmotionMatchingGame; // Esportazione modulo standard NodeJS. Permette di "chiamarlo" in altre route in `App.jsx`.
