import { useContext, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { appContext } from '../context/appContext';
import Navbar from '../components/Navbar';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FaSave, FaArrowLeft, FaPlus, FaTrash } from 'react-icons/fa';
import ProgressBar from '../components/ProgressBar';

/**
 * Componente EditStory
 * Permette ai genitori o terapisti di modificare una storia esistente.
 * Gestisce:
 * - Caricamento dei dati della storia dal backend.
 * - Modifica di metadati (titolo, descrizione, categoria).
 * - Aggiunta/Rimozione/Modifica di scene (paragrafi).
 * - Gestione dei media (immagini, video, audio) per ogni scena.
 * - Rigenerazione dell'audio narrato tramite IA.
 */
const EditStory = () => {
    const { id } = useParams(); // ID della storia dall'URL
    const navigate = useNavigate();
    const { backendUrl, userData } = useContext(appContext);

    // --- STATI DELLA STORIA ---
    const [loading, setLoading] = useState(true);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('');
    const [isPublic, setIsPublic] = useState(false);
    const [backgroundColor, setBackgroundColor] = useState('bg-white');
    const [paragraphs, setParagraphs] = useState([]);
    const [isSequencingGameActive, setIsSequencingGameActive] = useState(false);

    // --- STATI AUDIO (Narratore IA) ---
    const [audioUrl, setAudioUrl] = useState('');
    const [audioSyncData, setAudioSyncData] = useState(null);
    const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
    const [selectedVoice, setSelectedVoice] = useState('it-Spk1_man'); // Default voce maschile
    const [selectedSpeed, setSelectedSpeed] = useState(1.0); // Velocità normale
    const [generationProgress, setGenerationProgress] = useState(0); // Per la barra di progresso

    // Opzioni colori di sfondo per le scene
    const colors = [
        { name: 'White', value: 'bg-white' },
        { name: 'Blue', value: 'bg-blue-300' },
        { name: 'Green', value: 'bg-green-300' },
        { name: 'Yellow', value: 'bg-yellow-300' },
        { name: 'Pink', value: 'bg-pink-300' },
        { name: 'Purple', value: 'bg-purple-300' },
    ];

    // --- EFFETTO: CARICAMENTO DATI STORIA ---
    useEffect(() => {
        const fetchStory = async () => {
            try {
                axios.defaults.withCredentials = true;
                const { data } = await axios.get(`${backendUrl}/api/story/${id}`);

                if (data.success) {
                    const story = data.story;
                    setTitle(story.title);
                    setDescription(story.description || '');
                    setCategory(story.category || 'Socialità');
                    setIsPublic(story.isPublic || false);
                    setBackgroundColor(story.backgroundColor || 'bg-white');
                    setParagraphs(story.paragraphs || []);
                    setAudioUrl(story.narrationUrl || '');
                    setAudioSyncData(story.narrationSyncData || null);
                    setIsSequencingGameActive(story.isSequencingGameActive || false);
                } else {
                    toast.error("Errore nel caricamento della storia");
                    navigate('/profile');
                }
            } catch (error) {
                console.error(error);
                toast.error("Impossibile caricare la storia.");
                navigate('/profile');
            } finally {
                setLoading(false);
            }
        };

        if (userData) {
            fetchStory();
        }
    }, [id, backendUrl, userData, navigate]);

    /**
     * Aggiorna un campo specifico di un paragrafo (scena).
     * @param {number} index - Indice del paragrafo.
     * @param {string} field - Nome del campo da aggiornare (es. 'text', 'color').
     * @param {any} value - Nuovo valore.
     */
    const updateParagraph = (index, field, value) => {
        const updated = [...paragraphs];
        updated[index] = { ...updated[index], [field]: value };
        setParagraphs(updated);
    };

    /**
     * Gestisce il caricamento di un file media per una specifica scena.
     * Crea un'anteprima URL locale e imposta il tipo di media.
     * @param {number} index - Indice del paragrafo.
     * @param {Event} e - Evento di change dell'input file.
     */
    const handleMediaChange = (index, e) => {
        const file = e.target.files[0];
        if (file) {
            const previewUrl = URL.createObjectURL(file);
            const mediaType = file.type.startsWith('image') ? 'image' : file.type.startsWith('video') ? 'video' : file.type.startsWith('audio') ? 'audio' : 'none';

            // Aggiorna tutto insieme per forzare il re-render
            const updated = [...paragraphs];
            updated[index] = {
                ...updated[index],
                media: previewUrl, // Anteprima frontend
                rawFile: file,     // File effettivo da inviare al backend
                mediaType: mediaType,
                mediaUrl: '' // Reset URL remoto precedente se presente
            };
            setParagraphs(updated);

            // Reset input per permettere di ricaricare lo stesso file se necessario
            e.target.value = '';
        }
    };

    /**
     * Aggiunge una nuova scena vuota alla storia.
     */
    const addParagraph = () => {
        setParagraphs([...paragraphs, {
            text: '',
            media: null,
            rawFile: null,
            mediaType: 'none',
            color: 'bg-white',
            isKeyStep: false
        }]);
    };

    /**
     * Rimuove una scena dalla storia.
     * @param {number} index - Indice del paragrafo da rimuovere.
     */
    const removeParagraph = (index) => {
        setParagraphs(paragraphs.filter((_, i) => i !== index));
    };

    // --- FUNZIONE DI GENERAZIONE AUDIO ---
    // --- FUNZIONE DI GENERAZIONE AUDIO ---
    /**
     * Gestisce la generazione dell'audio narrato utilizzando l'IA.
     * Verifica i requisiti (lunghezza testo) e invia la richiesta al backend.
     * Include una simulazione della barra di progresso per feedback visivo.
     */
    const handleGenerateAudio = async () => {
        const validParagraphs = paragraphs.filter(p => p.text.trim().length > 0);

        if (validParagraphs.length < 2) {
            toast.warning("Serve almeno 2 scene con testo per generare l'audio!");
            return;
        }

        const fullStoryText = validParagraphs
            .map((p) => p.text)
            .join('. ');

        const MIN_CHARACTERS = 100;
        const MAX_CHARACTERS = 5000;

        // Validazione lunghezza testo
        if (fullStoryText.length < MIN_CHARACTERS) {
            toast.error(
                `⚠️ Testo troppo corto! Servono almeno ${MIN_CHARACTERS} caratteri.\n\n` +
                `Attualmente: ${fullStoryText.length} caratteri\n` +
                `Mancano: ${MIN_CHARACTERS - fullStoryText.length} caratteri`
            );
            return;
        }

        if (fullStoryText.length > MAX_CHARACTERS) {
            toast.warning(
                `⚠️ Testo troppo lungo! Massimo ${MAX_CHARACTERS} caratteri.\n\n` +
                `Attualmente: ${fullStoryText.length} caratteri\n` +
                `Riduci di: ${fullStoryText.length - MAX_CHARACTERS} caratteri`
            );
            return;
        }

        setIsGeneratingAudio(true);
        setGenerationProgress(0);

        // Simulazione progresso (circa 60 secondi come stima euristica)
        const progressInterval = setInterval(() => {
            setGenerationProgress(prev => {
                if (prev >= 95) return 95; // Si ferma al 95% finché non arriva la risposta reale
                const step = Math.random() * 2 + 0.5;
                return prev + step;
            });
        }, 1000);

        try {
            axios.defaults.withCredentials = true;

            const { data } = await axios.post(
                `${backendUrl}/api/story/generate-audio`,
                {
                    text: fullStoryText,
                    storyTitle: title || "Storia senza titolo",
                    speakerName: selectedVoice,
                    speed: selectedSpeed
                }
            );

            if (data.success) {
                setAudioUrl(data.audioUrl);
                setAudioSyncData(data.syncData);
                toast.success("🎧 Audio generato con successo!");
            } else {
                toast.error(data.message);
            }

        } catch (error) {
            console.error("❌ Errore audio:", error);
            toast.error(error.response?.data?.message || "Errore durante la generazione dell'audio.");
        } finally {
            clearInterval(progressInterval);
            setIsGeneratingAudio(false);
            setGenerationProgress(100);
            // Reset della barra dopo un po'
            setTimeout(() => setGenerationProgress(0), 3000);
        }
    };

    /**
     * Salva le modifiche alla storia inviando i dati al backend.
     * Utilizza FormData per gestire sia dati testuali che file binari (immagini/video).
     */
    const handleSave = async (e) => {
        e.preventDefault();

        if (!title.trim()) {
            toast.warning("Il titolo non può essere vuoto.");
            return;
        }

        const formData = new FormData();
        formData.append('title', title);
        formData.append('description', description);
        formData.append('category', category);
        formData.append('isPublic', isPublic);
        formData.append('backgroundColor', backgroundColor);
        formData.append('isSequencingGameActive', isSequencingGameActive);

        if (audioUrl) {
            formData.append('narrationUrl', audioUrl);
            if (audioSyncData) {
                formData.append('narrationSyncData', JSON.stringify(audioSyncData));
            }
        }

        // Prepara paragrafi senza file binari per l'invio come stringa JSON
        const paragraphsData = paragraphs.map(p => ({
            text: p.text,
            isKeyStep: p.isKeyStep || false,
            mediaType: p.mediaType || 'none',
            color: p.color,
            mediaUrl: p.mediaUrl // Mantieni URL esistente se non c'è nuovo file
        }));

        formData.append('paragraphs', JSON.stringify(paragraphsData));

        // Aggiungi i file binari separatamente al FormData
        paragraphs.forEach((p, index) => {
            if (p.rawFile) {
                formData.append(`media_${index}`, p.rawFile);
            }
        });

        try {
            axios.defaults.withCredentials = true;
            const { data } = await axios.put(`${backendUrl}/api/story/update/${id}`, formData);

            if (data.success) {
                toast.success("Storia aggiornata con successo! Controlla la tua email.");
                navigate('/profile');
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            console.error(error);
            toast.error("Errore durante il salvataggio.");
        }
    };

    // --- RENDERIZZA LO STATO DI CARICAMENTO ---
    if (loading) {
        return (
            <div className="min-h-screen flex flex-col justify-center items-center bg-indigo-50 p-8">
                <div className="w-full max-w-md bg-white p-8 rounded-3xl shadow-xl">
                    <ProgressBar
                        progress={45}
                        label="Caricamento Storia..."
                        subLabel="Stiamo preparando i tuoi ricordi"
                        animate={true}
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100 pb-20">
            <Navbar />

            <div className="container mx-auto px-4 py-8 max-w-4xl">
                {/* Pulsante Torna Indietro */}
                <button
                    onClick={() => navigate('/profile')}
                    className="flex items-center gap-2 text-gray-600 hover:text-indigo-600 mb-6 transition-colors font-medium"
                >
                    <FaArrowLeft /> Torna al Profilo
                </button>

                <div className="bg-white rounded-3xl shadow-2xl p-8">
                    <h1 className="text-3xl font-bold text-gray-800 mb-6 border-b pb-4">✏️ Modifica Storia</h1>

                    <form onSubmit={handleSave} className="space-y-6">
                        {/* --- 1. DATI PRINCIPALI STORIA --- */}

                        {/* Titolo */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Titolo Storia</label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all text-lg font-semibold"
                                placeholder="Inserisci il titolo..."
                            />
                        </div>

                        {/* Descrizione */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Descrizione</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows="3"
                                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                                placeholder="Di cosa parla questa storia?"
                            />
                        </div>

                        {/* Categoria */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Categoria Social Story</label>
                            <div className="flex gap-2">
                                <select
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value)}
                                    className="flex-1 p-3 rounded-xl border-2 border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all font-semibold"
                                >
                                    <option value="Socialità">Socialità</option>
                                    <option value="Emozioni">Emozioni</option>
                                    <option value="Igiene">Igiene</option>
                                    <option value="Salute">Salute</option>
                                    <option value="Routine">Routine</option>
                                    <option value="Scuola">Scuola</option>
                                    <option value="Autonomia">Autonomia</option>
                                    <option value="Sicurezza">Sicurezza</option>
                                    <option value="Altro">Altro (scrivi sotto)</option>
                                </select>
                                {(category === "Altro" || !["Socialità", "Emozioni", "Igiene", "Salute", "Routine", "Scuola", "Autonomia", "Sicurezza"].includes(category)) && (
                                    <input
                                        type="text"
                                        placeholder="Categoria personalizzata..."
                                        className="flex-1 p-3 rounded-xl border-2 border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all font-semibold"
                                        onChange={(e) => setCategory(e.target.value)}
                                        value={["Socialità", "Emozioni", "Igiene", "Salute", "Routine", "Scuola", "Autonomia", "Sicurezza", "Altro"].includes(category) ? "" : category}
                                    />
                                )}
                            </div>
                        </div>

                        {/* Visibilità (Pubblica/Privata) */}
                        <div className="flex items-center gap-4">
                            <label className="flex items-center cursor-pointer">
                                <div className="relative">
                                    <input
                                        type="checkbox"
                                        className="sr-only"
                                        checked={isPublic}
                                        onChange={() => setIsPublic(!isPublic)}
                                    />
                                    <div className={`block w-14 h-8 rounded-full transition-colors ${isPublic ? 'bg-purple-500' : 'bg-gray-300'}`}></div>
                                    <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${isPublic ? 'transform translate-x-6' : ''}`}></div>
                                </div>
                                <div className="ml-3 text-gray-700 font-medium">
                                    {isPublic ? 'Storia Pubblica' : 'Storia Privata'}
                                </div>
                            </label>
                        </div>

                        {/* --- 2. OPZIONI DI GIOCO (GAME OPTIONS) --- */}
                        <div className="mb-8 p-4 bg-purple-50 rounded-xl border border-purple-100">
                            <h2 className="text-xl font-bold text-purple-700 mb-4">Opzioni Interattive (Giochi)</h2>
                            <label className="flex items-center cursor-pointer">
                                <div className="relative">
                                    <input
                                        type="checkbox"
                                        className="sr-only"
                                        checked={isSequencingGameActive}
                                        onChange={() => setIsSequencingGameActive(!isSequencingGameActive)}
                                    />
                                    <div className={`block w-14 h-8 rounded-full transition-colors ${isSequencingGameActive ? 'bg-indigo-500' : 'bg-gray-300'}`}></div>
                                    <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${isSequencingGameActive ? 'transform translate-x-6' : ''}`}></div>
                                </div>
                                <div className="ml-3 text-gray-700 font-medium">
                                    Abilita Gioco: <strong>Riordina la Sequenza</strong>
                                </div>
                            </label>
                        </div>

                        <hr className="my-6" />

                        {/* ========================================= */}
                        {/* --- 3. SEZIONE: GENERAZIONE AUDIO --- */}
                        {/* ========================================= */}
                        <div className="mb-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-indigo-200 shadow-inner">
                            <div className="flex items-center gap-3 mb-4">
                                <span className="text-3xl">🎧</span>
                                <h2 className="text-xl font-bold text-indigo-700">Audio Narrato della Storia</h2>
                            </div>

                            <p className="text-sm text-gray-600 mb-4">
                                Genera una versione audio della tua storia che i bambini possono ascoltare.
                                <br />
                                <span className="font-semibold text-indigo-600">
                                    Requisiti: Minimo 2 scene e 100 caratteri totali.
                                </span>
                            </p>

                            {/* Selezione Voce */}
                            <div className="mb-6 p-4 bg-white rounded-xl border border-indigo-100">
                                <label className="block text-sm font-bold text-gray-700 mb-3">
                                    🎤 Seleziona il tipo di voce:
                                </label>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Voce Femminile */}
                                    <button
                                        type="button"
                                        onClick={() => setSelectedVoice('it-Spk0_woman')}
                                        className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${selectedVoice === 'it-Spk0_woman'
                                            ? 'border-pink-500 bg-pink-50 shadow-md ring-2 ring-pink-200'
                                            : 'border-gray-200 bg-white hover:border-pink-300'
                                            }`}
                                    >
                                        <span className="text-5xl">👩</span>
                                        <span className="font-bold text-gray-800 text-lg">Voce Femminile</span>
                                        {selectedVoice === 'it-Spk0_woman' && (
                                            <div className="mt-2 bg-pink-500 text-white px-4 py-1 rounded-full text-xs font-bold">
                                                ✓ Selezionata
                                            </div>
                                        )}
                                    </button>

                                    {/* Voce Maschile */}
                                    <button
                                        type="button"
                                        onClick={() => setSelectedVoice('it-Spk1_man')}
                                        className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${selectedVoice === 'it-Spk1_man'
                                            ? 'border-blue-500 bg-blue-50 shadow-md ring-2 ring-blue-200'
                                            : 'border-gray-200 bg-white hover:border-blue-300'
                                            }`}
                                    >
                                        <span className="text-5xl">👨</span>
                                        <span className="font-bold text-gray-800 text-lg">Voce Maschile</span>
                                        {selectedVoice === 'it-Spk1_man' && (
                                            <div className="mt-2 bg-blue-500 text-white px-4 py-1 rounded-full text-xs font-bold">
                                                ✓ Selezionata
                                            </div>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Selezione Velocità */}
                            <div className="mb-6 p-4 bg-white rounded-xl border border-indigo-100">
                                <label className="block text-sm font-bold text-gray-700 mb-3">
                                    ⏳ Velocità della voce:
                                </label>

                                <div className="flex bg-gray-100 p-1 rounded-xl">
                                    <button
                                        type="button"
                                        onClick={() => setSelectedSpeed(0.8)}
                                        className={`flex-1 py-2 px-4 rounded-lg font-bold transition-all ${selectedSpeed === 0.8 ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                                    >
                                        Lenta (0.8x)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedSpeed(1.0)}
                                        className={`flex-1 py-2 px-4 rounded-lg font-bold transition-all ${selectedSpeed === 1.0 ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                                    >
                                        Normale
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedSpeed(1.2)}
                                        className={`flex-1 py-2 px-4 rounded-lg font-bold transition-all ${selectedSpeed === 1.2 ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                                    >
                                        Veloce (1.2x)
                                    </button>
                                </div>
                                <p className="text-[10px] text-gray-400 mt-2 text-center uppercase tracking-wider">La velocità influisce sulla durata totale dell'audio</p>
                            </div>

                            {/* Stato Generazione e Pulsante */}
                            {isGeneratingAudio ? (
                                <div className="w-full bg-white/50 p-4 rounded-xl border border-indigo-200">
                                    <ProgressBar
                                        progress={generationProgress}
                                        label="Generazione in corso..."
                                        subLabel="L'IA sta creando il narrato per te"
                                        color="bg-gradient-to-r from-blue-500 to-indigo-600"
                                        height="h-6"
                                    />
                                    <p className="text-[10px] text-indigo-400 mt-2 text-center font-bold animate-pulse">
                                        NON CHIUDERE QUESTA PAGINA - POTREBBE RICHIEDERE UN MINUTO
                                    </p>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={handleGenerateAudio}
                                    disabled={
                                        isGeneratingAudio ||
                                        paragraphs.filter(p => p.text.trim()).length < 2 ||
                                        paragraphs.reduce((acc, p) => acc + p.text.length, 0) < 100
                                    }
                                    className={`w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-bold shadow-lg transition-all mb-6 ${isGeneratingAudio ||
                                        paragraphs.filter(p => p.text.trim()).length < 2 ||
                                        paragraphs.reduce((acc, p) => acc + p.text.length, 0) < 100
                                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                        : 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:scale-105'
                                        }`}
                                >
                                    <span className="text-2xl">🎤</span>
                                    <span>Genera/Aggiorna Audio Narrato</span>
                                </button>
                            )}

                            {/* Player Audio Prodotto */}
                            {audioUrl && (
                                <div className="p-5 bg-white rounded-xl border-2 border-green-300 shadow-lg animate-fadeIn">
                                    <div className="flex items-center gap-3 mb-4">
                                        <span className="text-3xl">✅</span>
                                        <div>
                                            <p className="font-bold text-green-700 text-lg">Audio presente!</p>
                                            <p className="text-sm text-gray-600">
                                                Voce: {selectedVoice === 'it-Spk0_woman' ? '👩 Femminile' : '👨 Maschile'}
                                            </p>
                                        </div>
                                    </div>

                                    <audio controls src={audioUrl} className="w-full mb-4" />

                                    <p className="text-xs text-center text-gray-500">
                                        Se hai modificato i testi delle scene, clicca sopra per rigenerare l'audio.
                                    </p>
                                </div>
                            )}

                            {/* Statistiche Riassuntive */}
                            <div className="mt-6 text-xs bg-white/70 p-5 rounded-xl border border-indigo-100">
                                <strong className="text-gray-700 text-sm flex items-center gap-2 mb-3">
                                    <span>📊</span> Statistiche per l'Audio:
                                </strong>

                                <ul className="space-y-2">
                                    <li className="flex justify-between">
                                        <span>Scene con testo:</span>
                                        <span className={`font-bold ${paragraphs.filter(p => p.text.trim()).length >= 2 ? 'text-green-600' : 'text-red-600'}`}>
                                            {paragraphs.filter(p => p.text.trim()).length}
                                        </span>
                                    </li>
                                    <li className="flex justify-between">
                                        <span>Caratteri totali:</span>
                                        <span className={`font-bold ${paragraphs.reduce((acc, p) => acc + p.text.length, 0) >= 100 &&
                                            paragraphs.reduce((acc, p) => acc + p.text.length, 0) <= 5000
                                            ? 'text-green-600'
                                            : 'text-red-600'
                                            }`}>
                                            {paragraphs.reduce((acc, p) => acc + p.text.length, 0)}
                                        </span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                        {/* --- 4. EDITOR DELLE SCENE (PARAGRAPHS) --- */}
                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold text-gray-700">Scene della Storia</h2>
                                <button
                                    type="button"
                                    onClick={addParagraph}
                                    className="flex items-center gap-2 px-4 py-2 bg-indigo-100 text-indigo-700 rounded-full hover:bg-indigo-200 transition-colors font-medium"
                                >
                                    <FaPlus size={14} /> Aggiungi Scena
                                </button>
                            </div>

                            <div className="space-y-6">
                                {paragraphs.map((para, index) => (
                                    <div key={index} className={`p-6 rounded-2xl shadow-xl border border-gray-100 transition-all ${para.color}`}>
                                        <div className="flex justify-between items-center mb-4">
                                            <h3 className="text-xl font-bold text-gray-700">Scena {index + 1}</h3>
                                            {paragraphs.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeParagraph(index)}
                                                    className="text-red-400 hover:text-red-600 p-2 text-sm font-medium"
                                                >
                                                    Rimuovi
                                                </button>
                                            )}
                                        </div>

                                        {/* Anteprima Media (Immagine/Video/Audio) */}
                                        {(para.media || para.mediaUrl) && para.mediaType !== 'none' && (
                                            <div className="mb-4 p-4 rounded-xl bg-white shadow-lg">
                                                <p className="text-sm font-semibold mb-3 text-gray-600">Anteprima Media</p>
                                                {para.mediaType === 'image' && (
                                                    <img
                                                        src={para.media || para.mediaUrl}
                                                        alt={`Media scena ${index + 1}`}
                                                        className="max-h-64 w-auto rounded-lg object-contain"
                                                    />
                                                )}
                                                {para.mediaType === 'video' && (
                                                    <video
                                                        src={para.media || para.mediaUrl}
                                                        controls
                                                        className="max-h-64 w-full rounded-lg"
                                                    />
                                                )}
                                                {para.mediaType === 'audio' && (
                                                    <audio
                                                        src={para.media || para.mediaUrl}
                                                        controls
                                                        className="w-full"
                                                    />
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        updateParagraph(index, 'media', null);
                                                        updateParagraph(index, 'rawFile', null);
                                                        updateParagraph(index, 'mediaType', 'none');
                                                        updateParagraph(index, 'mediaUrl', '');
                                                    }}
                                                    className="mt-3 text-red-500 text-sm hover:underline"
                                                >
                                                    Rimuovi Media
                                                </button>
                                            </div>

                                        )}

                                        {/* Area di Testo della Scena */}
                                        <textarea
                                            value={para.text}
                                            onChange={(e) => updateParagraph(index, 'text', e.target.value)}
                                            placeholder="Scrivi il testo della scena..."
                                            className="w-full p-4 mb-4 border border-gray-200 rounded-xl focus:border-purple-400 bg-white/80 min-h-[100px] resize-y"
                                        />

                                        {/* Controlli Media e Colore */}
                                        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-white/60 p-4 rounded-xl">
                                            <label className="flex items-center gap-2 cursor-pointer bg-indigo-50 hover:bg-indigo-100 text-indigo-600 px-4 py-2 rounded-lg transition-colors font-bold">
                                                <span>{para.rawFile ? 'Cambia Media' : 'Aggiungi Media'}</span>
                                                <input
                                                    type="file"
                                                    accept="image/*,video/*,audio/*"
                                                    className="hidden"
                                                    onChange={(e) => handleMediaChange(index, e)}
                                                />
                                            </label>

                                            {/* Selettore Colore sfondo */}
                                            <div className="flex gap-2 items-center">
                                                <span className="text-sm font-medium text-gray-600">Colore:</span>
                                                {colors.map((color) => (
                                                    <button
                                                        key={color.name}
                                                        type="button"
                                                        onClick={() => updateParagraph(index, 'color', color.value)}
                                                        className={`w-8 h-8 rounded-full border-2 transition-all ${color.value} ${para.color === color.value ? 'scale-110 ring-2 ring-purple-500' : 'border-gray-300 hover:scale-105'}`}
                                                    />
                                                ))}
                                            </div>
                                        </div>

                                        {/* Opzione Passo Chiave per il Gioco */}
                                        {isSequencingGameActive && (
                                            <div className="mt-4 p-3 border border-dashed border-purple-300 rounded-lg bg-white/50">
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={para.isKeyStep || false}
                                                        onChange={(e) => updateParagraph(index, 'isKeyStep', e.target.checked)}
                                                        className="h-5 w-5 accent-purple-600"
                                                    />
                                                    <span className="font-medium text-purple-700">
                                                        Passo Chiave per il Gioco (Sequenziamento)
                                                    </span>
                                                </label>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Messaggio se non ci sono scene */}
                            {paragraphs.length === 0 && (
                                <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                                    <p className="text-gray-400 mb-4">Nessuna scena presente</p>
                                    <button
                                        type="button"
                                        onClick={addParagraph}
                                        className="px-6 py-3 bg-indigo-500 text-white rounded-full font-bold hover:bg-indigo-600 transition-colors"
                                    >
                                        Aggiungi Prima Scena
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* --- 5. PULSANTI AZIONE (Action Buttons) --- */}
                        <div className="pt-6 border-t flex justify-end gap-4">
                            <button
                                type="button"
                                onClick={() => navigate('/profile')}
                                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-full font-bold hover:bg-gray-300 transition-colors"
                            >
                                Annulla
                            </button>
                            <button
                                type="submit"
                                className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all"
                            >
                                <FaSave /> Salva Modifiche
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default EditStory;