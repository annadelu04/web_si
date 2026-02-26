import React, { useState, useContext, useEffect } from 'react';
import Navbar from '../components/Navbar';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { appContext } from '../context/appContext';
import ProgressBar from '../components/ProgressBar';

const NewStory = () => {
    // --- 1. CONFIGURAZIONE E CONTESTO ---
    const { backendUrl, userData, getUserData } = useContext(appContext);
    const navigate = useNavigate();

    // --- 2. STATO DELLA STORIA (METADATI) ---
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('Socialità');
    const [isPublic, setIsPublic] = useState(true);

    // Stati per l'Audio Narrato
    const [audioUrl, setAudioUrl] = useState(null);
    const [audioSyncData, setAudioSyncData] = useState(null); // Dati per evidenziare il testo (karaoke)
    const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
    const [selectedVoice, setSelectedVoice] = useState('it-Spk0_woman'); // Default: voce femminile
    const [selectedSpeed, setSelectedSpeed] = useState(1.0);
    const [generationProgress, setGenerationProgress] = useState(0); // Progresso barra caricamento
    const [generateAudio, setGenerateAudio] = useState(false);

    // Opzioni Gioco
    const [isSequencingGameActive, setIsSequencingGameActive] = useState(false);

    // --- 3. STATO DEI PARAGRAFI (SCENE) ---
    // Ogni storia è composta da un array di oggetti (scene)
    const [paragraphs, setParagraphs] = useState([
        {
            id: 1,
            text: '',
            media: null,    // URL anteprima (blob)
            rawFile: null,  // File reale da caricare (File Object)
            mediaType: 'none',
            color: 'bg-white',
            isKeyStep: false, // Per il gioco di riordino
            gameText: ''
        }
    ]);

    // Palette colori per le scene
    const colors = [
        { name: 'White', value: 'bg-white' },
        { name: 'Blue', value: 'bg-blue-300' },
        { name: 'Green', value: 'bg-green-300' },
        { name: 'Yellow', value: 'bg-yellow-300' },
        { name: 'Pink', value: 'bg-pink-300' },
        { name: 'Purple', value: 'bg-purple-300' },
    ];

    // --- 4. EFFETTO INIZIALE ---
    // Assicuriamoci che i dati utente siano caricati
    useEffect(() => {
        if (!userData) {
            getUserData();
        }
    }, [userData]);

    // --- FUNZIONI DI GESTIONE SCENE (CRUD LOCALE) ---

    // Aggiungi una nuova scena vuota
    const addParagraph = () => {
        setParagraphs([...paragraphs, {
            id: Date.now(),
            text: '',
            media: null,
            rawFile: null,
            mediaType: 'none',
            color: 'bg-white',
            isKeyStep: false,
            gameText: ''
        }]);
    };

    // Rimuovi una scena specifica
    const removeParagraph = (id) => {
        setParagraphs(paragraphs.filter(p => p.id !== id));
    };

    // Aggiorna un campo di una scena (es. testo, colore)
    const updateParagraph = (id, field, value) => {
        setParagraphs(paragraphs.map(p => p.id === id ? { ...p, [field]: value } : p));
    };

    // Toggle per marcare una scena come tappa fondamentale del gioco
    const handleKeyStepToggle = (id, isChecked) => {
        setParagraphs(paragraphs.map(p => p.id === id ? { ...p, isKeyStep: isChecked } : p));
    };

    // Gestione caricamento file multimediali (Immagini/Video/Audio)
    const handleMediaChange = (id, e) => {
        const file = e.target.files[0];
        if (file) {
            const previewUrl = URL.createObjectURL(file); // Crea URL temporaneo per anteprima
            const mediaType = file.type.startsWith('image') ? 'image'
                : file.type.startsWith('video') ? 'video'
                    : file.type.startsWith('audio') ? 'audio'
                        : 'none';

            setParagraphs(paragraphs.map(p =>
                p.id === id ? { ...p, media: previewUrl, rawFile: file, mediaType: mediaType } : p
            ));
        }
    };

    // --- FUNZIONE DI GENERAZIONE AUDIO (VibeVoice) ---
    const handleGenerateAudio = async () => {
        // Filtriamo le scene vuote
        const validParagraphs = paragraphs.filter(p => p.text.trim().length > 0);

        // Controllo 1: Almeno 2 scene
        if (validParagraphs.length < 2) {
            toast.warning("Serve almeno 2 scene con testo per generare l'audio!");
            return;
        }

        // Uniamo il testo di tutte le scene
        const fullStoryText = validParagraphs
            .map((p) => p.text)
            .join('. ');

        // Limiti di caratteri per VibeVoice
        const MIN_CHARACTERS = 100;
        const MAX_CHARACTERS = 5000;

        // Controllo 2: Lunghezza minima
        if (fullStoryText.length < MIN_CHARACTERS) {
            toast.error(
                `⚠️ Testo troppo corto! Servono almeno ${MIN_CHARACTERS} caratteri.\n\n` +
                `Attualmente: ${fullStoryText.length} caratteri\n` +
                `Mancano: ${MIN_CHARACTERS - fullStoryText.length} caratteri`
            );
            return;
        }

        // Controllo 3: Lunghezza massima
        if (fullStoryText.length > MAX_CHARACTERS) {
            toast.warning(
                `⚠️ Testo troppo lungo! Massimo ${MAX_CHARACTERS} caratteri.\n\n` +
                `Attualmente: ${fullStoryText.length} caratteri\n` +
                `Riduci di: ${fullStoryText.length - MAX_CHARACTERS} caratteri`
            );
            return;
        }

        console.log("📝 Testo TTS:", fullStoryText);
        console.log("📊 Lunghezza:", fullStoryText.length);
        console.log("🎤 Voce:", selectedVoice);

        setIsGeneratingAudio(true);
        setGenerationProgress(0);

        // Simulazione progresso visuale (per feedback utente)
        // Aumenta la barra progressivamente fino al 95% in attesa della risposta del server
        const progressInterval = setInterval(() => {
            setGenerationProgress(prev => {
                if (prev >= 95) return 95;
                const step = Math.random() * 2 + 0.5;
                return prev + step;
            });
        }, 1000);

        try {
            axios.defaults.withCredentials = true;

            // Chiamata al Backend
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
                setGenerateAudio(true);
                toast.success("🎧 Audio generato con successo!");
            } else {
                toast.error(data.message);
            }

        } catch (error) {
            console.error("❌ Errore audio:", error);

            if (error.response?.status === 400) {
                toast.error(error.response.data.message);
            } else if (error.response?.status === 500) {
                toast.error(error.response.data.message || "Errore server. Verifica configurazione VibeVoice.");
            } else {
                toast.error("Errore connessione al server");
            }
        } finally {
            clearInterval(progressInterval);
            setIsGeneratingAudio(false);
            setGenerationProgress(100); // Completa la barra
            setTimeout(() => setGenerationProgress(0), 3000); // Resetta dopo 3 secondi
        }
    };

    // --- FUNZIONE DI PUBBLICAZIONE (Salvataggio su DB) ---
    const publishStory = async () => {
        if (!userData || !userData._id) {
            toast.error("Utente non identificato. Effettua il login.");
            return;
        }

        if (!title.trim()) {
            toast.error("Il titolo è obbligatorio!");
            return;
        }

        // Creiamo un FormData perché potremmo dover inviare file (immagini/audio)
        const formData = new FormData();
        formData.append('userId', userData._id);
        formData.append('title', title);
        formData.append('description', description);
        formData.append('category', category);
        formData.append('isPublic', isPublic);
        formData.append('isSequencingGameActive', isSequencingGameActive);

        // Se abbiamo generato l'audio, aggiungiamo l'URL e i dati di sync
        if (audioUrl) {
            formData.append('narrationUrl', audioUrl);
            if (audioSyncData) {
                formData.append('narrationSyncData', JSON.stringify(audioSyncData));
            }
        }

        // Serializziamo i paragrafi per inviarli come JSON string
        const paragraphsData = paragraphs.map(p => ({
            text: p.text,
            isKeyStep: p.isKeyStep,
            gameText: p.gameText,
            mediaType: p.mediaType || 'none',
            color: p.color
        }));

        formData.append('paragraphs', JSON.stringify(paragraphsData));

        // Appendiamo i file reali dei paragrafi (se presenti)
        paragraphs.forEach((p, index) => {
            if (p.rawFile) {
                // La chiave deve corrispondere a quella gestita da Multer nel backend
                formData.append(`media_${index}`, p.rawFile);
            }
        });

        try {
            axios.defaults.withCredentials = true;
            const { data } = await axios.post(backendUrl + '/api/story/create', formData);

            if (data.success) {
                toast.success("Storia pubblicata con successo!");
                navigate('/profile'); // Redirect alla dashboard
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            console.error(error);
            toast.error(error.message || "Errore durante la pubblicazione");
        }
    };

    // --- RENDER ---
    // Se i dati utente non sono ancora caricati, mostriamo una schermata di caricamento
    if (!userData) {
        return (
            <div className="min-h-screen flex flex-col justify-center items-center bg-purple-50">
                <Navbar />
                <div className="text-xl font-bold text-gray-500 mt-10">Caricamento dati utente...</div>
                <button onClick={() => window.location.reload()} className="mt-4 text-blue-500 underline">
                    Ricarica pagina
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100 pb-20">
            <Navbar />

            <div className="container mx-auto px-4 py-8 max-w-4xl">
                <div className="bg-white rounded-3xl shadow-2xl p-8 mb-8">
                    <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">
                        Crea la tua Nuova Storia
                    </h1>

                    {/* --- DATI PRINCIPALI (TITOLO, DESCRIZIONE) --- */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 p-4 bg-gray-50 rounded-xl border border-gray-100">
                        {/* Titolo */}
                        <div className="col-span-1 md:col-span-2">
                            <label className="block text-gray-700 text-sm font-bold mb-2 ml-1">Titolo</label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Es: Andare dal dentista"
                                className="w-full text-xl font-semibold p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
                            />
                        </div>

                        {/* Descrizione */}
                        <div className="col-span-1 md:col-span-2">
                            <label className="block text-gray-700 text-sm font-bold mb-2 ml-1">
                                Descrizione (Opzionale)
                            </label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Breve descrizione dell'attività..."
                                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 h-24 resize-none"
                            />
                        </div>

                        {/* Categoria */}
                        <div className="col-span-1 md:col-span-2">
                            <label className="block text-gray-700 text-sm font-bold mb-2 ml-1">Categoria Social Story</label>
                            <div className="flex gap-2">
                                <select
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value)}
                                    className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 font-medium"
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
                                {category === "Altro" && (
                                    <input
                                        type="text"
                                        placeholder="Inserisci categoria personalizzata..."
                                        className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 font-medium"
                                        onChange={(e) => setCategory(e.target.value)}
                                    />
                                )}
                            </div>
                        </div>

                        {/* Toggle Pubblica/Privata */}
                        <div className="flex items-center justify-start mt-6">
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
                    </div>

                    {/* --- OPZIONI DI GIOCO --- */}
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

                    {/* ========================================= */}
                    {/* SEZIONE: GENERAZIONE AUDIO (UI) */}
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
                        <div className="mb-6 p-4 bg-white rounded-xl border border-indigo-100 shadow-sm">
                            <label className="block text-sm font-bold text-gray-700 mb-3">
                                ⏳ Velocità della voce:
                            </label>

                            <div className="flex bg-gray-100 p-1 rounded-xl">
                                <button
                                    type="button"
                                    onClick={() => setSelectedSpeed(0.8)}
                                    className={`flex-1 py-2 px-4 rounded-lg font-bold transition-all text-sm ${selectedSpeed === 0.8 ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    Lenta (0.8x)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSelectedSpeed(1.0)}
                                    className={`flex-1 py-2 px-4 rounded-lg font-bold transition-all text-sm ${selectedSpeed === 1.0 ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    Normale
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSelectedSpeed(1.2)}
                                    className={`flex-1 py-2 px-4 rounded-lg font-bold transition-all text-sm ${selectedSpeed === 1.2 ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    Veloce (1.2x)
                                </button>
                            </div>
                            <p className="text-[10px] text-gray-400 mt-2 text-center uppercase tracking-wider">La velocità influisce sulla durata totale dell'audio</p>
                        </div>

                        {/* Pulsante Genera Audio */}
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
                                className={`w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-bold shadow-lg transition-all ${isGeneratingAudio ||
                                    paragraphs.filter(p => p.text.trim()).length < 2 ||
                                    paragraphs.reduce((acc, p) => acc + p.text.length, 0) < 100
                                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:scale-105'
                                    }`}
                            >
                                <span className="text-2xl">🎤</span>
                                <span>Genera Audio Narrato</span>
                            </button>
                        )}

                        {/* Player Audio Generato */}
                        {audioUrl && (
                            <div className="mt-6 p-5 bg-white rounded-xl border-2 border-green-300 shadow-lg animate-fadeIn">
                                <div className="flex items-center gap-3 mb-4">
                                    <span className="text-3xl">✅</span>
                                    <div>
                                        <p className="font-bold text-green-700 text-lg">Audio generato!</p>
                                        <p className="text-sm text-gray-600">
                                            Voce: {selectedVoice === 'it-Spk0_woman' ? '👩 Femminile' : '👨 Maschile'}
                                        </p>
                                    </div>
                                </div>

                                <audio controls src={audioUrl} className="w-full mb-4" />

                                <button
                                    type="button"
                                    onClick={handleGenerateAudio}
                                    className="w-full text-indigo-600 text-sm font-semibold py-2 bg-indigo-50 rounded-lg hover:bg-indigo-100"
                                >
                                    🔄 Rigenera Audio
                                </button>
                            </div>
                        )}

                        {/* Box Statistiche */}
                        <div className="mt-6 text-xs bg-white/70 p-5 rounded-xl border border-indigo-100">
                            <strong className="text-gray-700 text-sm flex items-center gap-2 mb-3">
                                <span>📊</span> Statistiche:
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
                                <li className={`pt-2 font-bold text-center ${paragraphs.filter(p => p.text.trim()).length >= 2 &&
                                    paragraphs.reduce((acc, p) => acc + p.text.length, 0) >= 100
                                    ? 'text-green-600'
                                    : 'text-red-600'
                                    }`}>
                                    {paragraphs.filter(p => p.text.trim()).length < 2
                                        ? '❌ Serve almeno 2 scene'
                                        : paragraphs.reduce((acc, p) => acc + p.text.length, 0) < 100
                                            ? `❌ Mancano ${100 - paragraphs.reduce((acc, p) => acc + p.text.length, 0)} caratteri`
                                            : '✅ Pronto per generare audio!'
                                    }
                                </li>
                            </ul>
                        </div>
                    </div>

                    <hr className="mb-8 border-gray-200" />

                    {/* --- LISTA SCENE (EDITOR) --- */}
                    <h2 className="text-xl font-bold text-gray-700 mb-4">Scene della Storia</h2>
                    <div className="space-y-6">
                        {paragraphs.map((paragraph, index) => (
                            <div key={paragraph.id} className={`p-6 rounded-2xl shadow-xl border border-gray-100 ${paragraph.color}`}>
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-xl font-bold text-gray-700">Scena {index + 1}</h3>
                                    {paragraphs.length > 1 && (
                                        <button
                                            onClick={() => removeParagraph(paragraph.id)}
                                            className="text-red-400 hover:text-red-600 p-2 text-sm font-medium"
                                        >
                                            Rimuovi Scena
                                        </button>
                                    )}
                                </div>

                                {/* Anteprima Media (se presente) */}
                                {paragraph.media && paragraph.mediaType !== 'none' && (
                                    <div className="mb-4 p-4 rounded-xl bg-white shadow-lg flex flex-col items-center">
                                        <p className="text-sm font-semibold mb-3 text-gray-600">Anteprima Media</p>

                                        {paragraph.mediaType === 'image' && (
                                            <img src={paragraph.media} alt={`Scena ${index + 1}`} className="max-h-64 w-auto rounded-lg" />
                                        )}
                                        {paragraph.mediaType === 'video' && (
                                            <video src={paragraph.media} controls className="max-h-64 w-full max-w-md rounded-lg" />
                                        )}
                                        {paragraph.mediaType === 'audio' && (
                                            <audio src={paragraph.media} controls className="w-full max-w-md" />
                                        )}

                                        <button
                                            onClick={() => {
                                                updateParagraph(paragraph.id, 'media', null);
                                                updateParagraph(paragraph.id, 'rawFile', null);
                                                updateParagraph(paragraph.id, 'mediaType', 'none');
                                            }}
                                            className="mt-3 text-red-500 text-sm hover:underline"
                                        >
                                            Rimuovi Media
                                        </button>
                                    </div>
                                )}

                                {/* Area di Testo Scena */}
                                <textarea
                                    value={paragraph.text}
                                    onChange={(e) => updateParagraph(paragraph.id, 'text', e.target.value)}
                                    placeholder="Scrivi qui il testo della scena..."
                                    className="w-full p-4 mb-4 border border-gray-200 rounded-xl focus:border-purple-400 bg-white/80 min-h-[100px] resize-y"
                                />

                                {/* Controlli: Media e Colore */}
                                <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-white/60 p-4 rounded-xl">
                                    <label className="flex items-center gap-2 cursor-pointer bg-indigo-50 hover:bg-indigo-100 text-indigo-600 px-4 py-2 rounded-lg font-bold">
                                        <span>{paragraph.rawFile ? 'Cambia Media' : 'Aggiungi Media'}</span>
                                        <input
                                            type="file"
                                            accept="image/*,video/*,audio/*"
                                            className="hidden"
                                            onChange={(e) => handleMediaChange(paragraph.id, e)}
                                        />
                                    </label>

                                    <div className="flex gap-2 items-center">
                                        <span className="text-sm font-medium text-gray-600 hidden sm:inline">Colore:</span>
                                        {colors.map((color) => (
                                            <button
                                                key={color.name}
                                                onClick={() => updateParagraph(paragraph.id, 'color', color.value)}
                                                className={`w-8 h-8 rounded-full border-2 ${color.value} ${paragraph.color === color.value ? 'ring-2 ring-purple-500' : ''
                                                    }`}
                                            />
                                        ))}
                                    </div>
                                </div>

                                {/* Opzione Passo Chiave (per Gioco) */}
                                {isSequencingGameActive && (
                                    <div className="mt-4 p-3 border border-dashed border-purple-300 rounded-lg bg-purple-50/50">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={paragraph.isKeyStep}
                                                onChange={(e) => handleKeyStepToggle(paragraph.id, e.target.checked)}
                                                className="h-5 w-5"
                                            />
                                            <span className="font-medium text-purple-700">
                                                Passo Chiave per il Gioco
                                            </span>
                                        </label>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* BOTTONI AZIONI FINALI */}
                    <div className="mt-10 flex justify-center gap-4">
                        <button
                            onClick={addParagraph}
                            className="px-6 py-3 rounded-full font-bold shadow-lg bg-gray-100 text-indigo-600 hover:bg-gray-200"
                        >
                            + Aggiungi Scena
                        </button>
                        <button
                            onClick={publishStory}
                            className="px-8 py-3 rounded-full font-bold shadow-lg bg-gradient-to-r from-purple-500 to-indigo-600 text-white hover:scale-105"
                        >
                            Pubblica Storia
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NewStory;