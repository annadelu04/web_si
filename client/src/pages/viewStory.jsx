import React, { useEffect, useState, useContext } from 'react';
import Navbar from '../components/Navbar';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { appContext } from '../context/appContext';
import ProgressBar from '../components/ProgressBar';

const ViewStory = () => {
    // --- 1. CONFIGURAZIONE E HOOKS ---
    const { backendUrl, userData } = useContext(appContext);
    const { id } = useParams(); // ID della storia dall'URL
    const navigate = useNavigate();

    // --- 2. STATO DEL COMPONENTE ---
    const [story, setStory] = useState(null);
    const [loading, setLoading] = useState(true);

    // --- State per Karaoke (Sincronizzazione Audio-Testo) ---
    const [currentTime, setCurrentTime] = useState(0); // Tempo corrente di riproduzione
    const [duration, setDuration] = useState(0);       // Durata totale audio
    const [isPlaying, setIsPlaying] = useState(false);

    // --- 3. FETCH DELLA STORIA ---
    useEffect(() => {
        const fetchStory = async () => {
            try {
                axios.defaults.withCredentials = true;
                const { data } = await axios.get(`${backendUrl}/api/story/${id}`);
                if (data.success) {
                    setStory(data.story);
                } else {
                    toast.error(data.message);
                    navigate('/profile'); // Redirect se non trovata
                }
            } catch (error) {
                toast.error("Errore nel caricamento della storia");
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        fetchStory();
    }, [backendUrl, id, navigate]);

    // RENDER: Schermata di Caricamento
    if (loading) {
        return (
            <div className="min-h-screen flex flex-col justify-center items-center bg-gray-50 p-8">
                <div className="w-full max-w-md bg-white p-8 rounded-3xl shadow-xl">
                    <ProgressBar
                        progress={65}
                        label="Apertura della Storia..."
                        subLabel="Stiamo preparando il tuo mondo magico"
                        animate={true}
                    />
                </div>
            </div>
        );
    }

    // RENDER: Storia Non Trovata
    if (!story) {
        return (
            <div className="min-h-screen">
                <Navbar />
                <div className="flex justify-center items-center h-[80vh]">
                    <h2 className="text-2xl text-gray-600">Storia non trovata</h2>
                </div>
            </div>
        )
    }

    const pageBgColor = story.backgroundColor || '#ffffff';

    // --- 4. LOGICA KARAOKE AVANZATA (VibeVoice Sync) ---
    // Appiattiamo il testo in un unico array di parole per calcolare l'indice corrente
    const allWords = story.paragraphs.flatMap(p => p.text.split(/\s+/));

    // Recuperiamo i dati di sincronizzazione generati dal backend (se presenti)
    const syncData = story.narrationSyncData;

    let currentWordIndex = -1;

    // Se l'audio è in riproduzione, calcoliamo quale parola evidenziare
    if (isPlaying && duration > 0) {
        if (syncData && syncData.success) {
            // CASO A: Abbiamo dati precisi di inizio/fine parlato (VAD)
            const { start, end, silences } = syncData;
            const actualSpeechDuration = end - start;

            // Verifichiamo se siamo nel segmento di parlato
            if (currentTime >= start && currentTime <= end) {
                const relativeTime = currentTime - start;

                // Mappiamo il tempo relativo sull'array di parole
                // Nota: Questa è una stima lineare migliorata dai dati VAD.
                // In futuro, VibeVoice potrebbe fornire timestamp per parola.
                const wordIndex = Math.floor((relativeTime / actualSpeechDuration) * allWords.length);
                currentWordIndex = Math.min(wordIndex, allWords.length - 1);
            }
        } else {
            // CASO B: Fallback Euristico (Senza VAD)
            // Stimiamo la posizione basandoci sulla lunghezza delle parole e punteggiatura
            let charCounter = 0;
            const wordData = story.paragraphs.flatMap(p => {
                const words = p.text.split(/\s+/);
                return words.map(word => {
                    const length = word.length;
                    charCounter += length + 1;

                    // Assegniamo un "peso" temporale maggiore a punteggiatura
                    let weight = length;
                    if (/[.!?]$/.test(word)) weight += 15; // Pausa lunga
                    if (/[,;:]$/.test(word)) weight += 7;  // Pausa breve
                    return { weight };
                });
            });

            const totalWeight = wordData.reduce((sum, wd) => sum + wd.weight, 0);
            const targetWeight = (currentTime / duration) * totalWeight;

            let accumulatedWeight = 0;
            for (let i = 0; i < wordData.length; i++) {
                accumulatedWeight += wordData[i].weight;
                if (accumulatedWeight >= targetWeight) {
                    currentWordIndex = i;
                    break;
                }
            }
        }
    }

    // Contatore globale per mappare l'indice calcolato sui paragrafi renderizzati
    let globalWordCounter = 0;

    return (
        <div
            className="min-h-screen transition-colors duration-500"
            style={{ backgroundColor: pageBgColor }}
        >
            <Navbar />

            <div className="container mx-auto px-4 py-8 max-w-5xl">

                {/* --- HEADER STORIA (Titolo e Descrizione) --- */}
                <div className="bg-white/90 backdrop-blur rounded-3xl shadow-xl p-8 mb-10 border border-gray-100 text-center">
                    {/* Badge Categoria */}
                    {story.category && (
                        <div className="mb-4">
                            <span className="bg-indigo-100 text-indigo-700 px-4 py-1.5 rounded-full text-sm font-black uppercase tracking-widest border-2 border-indigo-200">
                                {story.category}
                            </span>
                        </div>
                    )}
                    <h1 className="text-5xl font-black text-gray-800 mb-6">{story.title}</h1>
                    {story.description && (
                        <p className="text-2xl text-gray-600 font-medium italic mb-8 px-4">{story.description}</p>
                    )}

                    {/* --- AUDIO PLAYER (Con Eventi per Sync) --- */}
                    {story.narrationUrl && (
                        <div className="mt-4 p-4 bg-indigo-50 rounded-2xl border border-indigo-100 inline-block w-full max-w-lg mx-auto shadow-inner">
                            <div className="flex items-center gap-3 mb-2 justify-center">
                                <span className="text-2xl">🎧</span>
                                <span className="font-bold text-indigo-700">Ascolta e Leggi con l'IA</span>
                            </div>
                            <audio
                                controls
                                src={story.narrationUrl}
                                className="w-full"
                                // Eventi fondamentali per il Karaoke
                                onTimeUpdate={(e) => setCurrentTime(e.target.currentTime)}
                                onLoadedMetadata={(e) => setDuration(e.target.duration)}
                                onPlay={() => setIsPlaying(true)}
                                onPause={() => setIsPlaying(false)}
                                onEnded={() => { setIsPlaying(false); setCurrentTime(0); }}
                            />
                        </div>
                    )}
                </div>

                {/* --- RENDER DEI PARAGRAFI (SCENE) --- */}
                <div className="space-y-12">
                    {story.paragraphs.map((paragraph, index) => {
                        // Dividiamo il testo in parole per applicare l'evidenziazione
                        const words = paragraph.text.split(/\s+/);

                        return (
                            <div
                                key={index}
                                className={`rounded-2xl shadow-lg border border-gray-200 overflow-hidden ${paragraph.color || 'bg-white'}`}
                            >
                                <div className="bg-indigo-600 px-6 py-2">
                                    <span className="text-white font-bold tracking-wide uppercase">
                                        Scena {index + 1}
                                    </span>
                                </div>

                                <div className={`p-6 md:p-8 flex flex-col items-center bg-white/50 ${paragraph.mediaUrl && paragraph.mediaType !== 'none' ? 'md:flex-row gap-8' : ''}`}>
                                    {/* Testo della Scena con Highlight */}
                                    <div className="w-full">
                                        <div className="text-4xl text-gray-800 leading-[1.6] font-bold">
                                            {words.map((word, i) => {
                                                const globalIndex = globalWordCounter++; // Incrementa contatore parole totale
                                                const isHighlighted = globalIndex === currentWordIndex; // Verifica se è la parola corrente

                                                return (
                                                    <span
                                                        key={i}
                                                        className={`inline-block mr-1.5 transition-all duration-200 rounded px-1 ${isHighlighted
                                                            ? 'bg-yellow-300 text-black transform scale-110 shadow-sm font-bold'
                                                            : ''
                                                            }`}
                                                    >
                                                        {word}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Media della Scena (Immagine/Video/Audio) */}
                                    {paragraph.mediaUrl && paragraph.mediaType !== 'none' && (
                                        <div className="w-full md:w-1/2 lg:w-5/12 mt-8 md:mt-0">
                                            <div className="rounded-xl overflow-hidden shadow-md border-4 border-white bg-gray-50 p-4">
                                                {paragraph.mediaType === 'video' ? (
                                                    <video src={paragraph.mediaUrl} controls className="w-full h-auto" />
                                                ) : paragraph.mediaType === 'audio' ? (
                                                    <div className="flex flex-col items-center">
                                                        <span className="text-4xl mb-4">🎵</span>
                                                        <audio src={paragraph.mediaUrl} controls className="w-full" />
                                                    </div>
                                                ) : (
                                                    <img
                                                        src={paragraph.mediaUrl}
                                                        alt={`Scena ${index + 1}`}
                                                        className="w-full h-auto object-cover transform hover:scale-105 transition-transform duration-500 rounded-lg"
                                                    />
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* --- FOOTER E AZIONI GIOCO --- */}
                <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-6 pb-12">
                    {/* Pulsante Gioco (Solo se attivo e per bambini) */}
                    {(() => {
                        if (userData && userData.isChildActive) {
                            console.log("🎮 Child Mode Active, Checking Game:", story.isSequencingGameActive);
                        }
                        return null;
                    })()}

                    {userData && userData.isChildActive && (story.isSequencingGameActive === true || story.isSequencingGameActive === 'true') && (
                        <button
                            onClick={() => navigate(`/games/sequencing/${story._id}`)}
                            className="w-full sm:w-auto bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-white font-black py-4 px-10 rounded-full shadow-xl transition-all transform hover:scale-110 flex items-center justify-center gap-3 border-4 border-white"
                        >
                            <span className="text-3xl">🎮</span>
                            <div className="text-left">
                                <p className="text-xs uppercase tracking-widest opacity-80">Mettiti alla prova</p>
                                <p className="text-xl">Gioca con la storia!</p>
                            </div>
                        </button>
                    )}

                    <button
                        onClick={() => {
                            if (userData && userData.isChildActive) {
                                navigate('/child-dashboard');
                            } else {
                                navigate('/profile');
                            }
                        }}
                        className="w-full sm:w-auto bg-white hover:bg-gray-50 text-indigo-600 font-bold py-4 px-8 rounded-full shadow-lg transition-all transform hover:scale-105 border-2 border-indigo-100"
                    >
                        {userData && userData.isChildActive ? 'Torna alla tua Bacheca' : 'Torna al Profilo'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ViewStory;