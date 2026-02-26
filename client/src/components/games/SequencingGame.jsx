import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { appContext } from '../../context/appContext';
import axios from 'axios';
import { toast } from 'react-toastify';
import Navbar from '../Navbar';

const SequencingGame = () => {
    const { storyId } = useParams();
    const navigate = useNavigate();
    const { backendUrl } = useContext(appContext);

    const [story, setStory] = useState(null);
    const [shuffledScenes, setShuffledScenes] = useState([]);
    const [selectedOrder, setSelectedOrder] = useState([]); // Array di slot (lunghezza = num scene, inizialmente null)
    const [isComplete, setIsComplete] = useState(false);
    const [isCorrect, setIsCorrect] = useState(false);
    const [loading, setLoading] = useState(true);

    // --- COLOR THEMES ---
    const themes = [
        { name: 'rose', bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-900', slot: 'border-rose-100 bg-rose-50/10', active: 'bg-rose-400 border-rose-600 text-white' },
        { name: 'blue', bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-900', slot: 'border-blue-100 bg-blue-50/10', active: 'bg-blue-400 border-blue-600 text-white' },
        { name: 'amber', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-900', slot: 'border-amber-100 bg-amber-50/10', active: 'bg-amber-400 border-amber-600 text-white' },
        { name: 'emerald', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-900', slot: 'border-emerald-100 bg-emerald-50/10', active: 'bg-emerald-400 border-emerald-600 text-white' },
        { name: 'indigo', bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-900', slot: 'border-indigo-100 bg-indigo-50/10', active: 'bg-indigo-400 border-indigo-600 text-white' },
        { name: 'orange', bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-900', slot: 'border-orange-100 bg-orange-50/10', active: 'bg-orange-400 border-orange-600 text-white' },
        { name: 'purple', bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-900', slot: 'border-purple-100 bg-purple-50/10', active: 'bg-purple-400 border-purple-600 text-white' },
        { name: 'cyan', bg: 'bg-cyan-50', border: 'border-cyan-200', text: 'text-cyan-900', slot: 'border-cyan-100 bg-cyan-50/10', active: 'bg-cyan-400 border-cyan-600 text-white' },
        { name: 'lime', bg: 'bg-lime-50', border: 'border-lime-200', text: 'text-lime-900', slot: 'border-lime-100 bg-lime-50/10', active: 'bg-lime-400 border-lime-600 text-white' },
        { name: 'pink', bg: 'bg-pink-50', border: 'border-pink-200', text: 'text-pink-900', slot: 'border-pink-100 bg-pink-50/10', active: 'bg-pink-400 border-pink-600 text-white' },
    ];

    const getTheme = (index) => themes[index % themes.length];

    // --- DRAG AND DROP STATE ---
    const [draggedItem, setDraggedItem] = useState(null);
    const [dragSource, setDragSource] = useState(null); // 'pool' o 'composition'

    useEffect(() => {
        fetchStory();
    }, [storyId]);

    const fetchStory = async () => {
        try {
            axios.defaults.withCredentials = true;
            const { data } = await axios.get(`${backendUrl}/api/story/${storyId}`);

            if (data.success) {
                setStory(data.story);
                // Inizializza gli slot vuoti
                setSelectedOrder(new Array(data.story.paragraphs.length).fill(null));

                // Mescola le scene per il pool iniziale
                const shuffled = [...data.story.paragraphs]
                    .map((scene, index) => ({ ...scene, originalIndex: index }))
                    .sort(() => Math.random() - 0.5);
                setShuffledScenes(shuffled);
            } else {
                toast.error("Storia non trovata");
                navigate('/');
            }
        } catch (error) {
            console.error(error);
            toast.error("Errore nel caricamento della storia");
        } finally {
            setLoading(false);
        }
    };

    // --- DRAG AND DROP HANDLERS ---
    const handleDragStart = (e, item, source, index) => {
        setDraggedItem({ item, index });
        setDragSource(source);
        e.dataTransfer.setData('text/plain', ''); // Firefox fix
        e.dataTransfer.effectAllowed = 'move';

        // Aggiungiamo un'ombra o uno stile al trascinamento
        e.currentTarget.classList.add('opacity-50');
    };

    const handleDragEnd = (e) => {
        e.currentTarget.classList.remove('opacity-50');
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDropOnSlot = (e, targetIndex) => {
        e.preventDefault();
        if (!draggedItem) return;

        const { item, index: sourceIndex } = draggedItem;
        const newOrder = [...selectedOrder];

        if (dragSource === 'pool') {
            // Se lo slot è già occupato, mettiamo il vecchio pezzo "indietro" nel pool
            // (In realtà il pool è dinamico basato su usati, quindi basta sovrascrivere)
            newOrder[targetIndex] = item;
        } else if (dragSource === 'composition') {
            // Reordering: Scambio i due pezzi
            const temp = newOrder[targetIndex];
            newOrder[targetIndex] = item;
            newOrder[sourceIndex] = temp;
        }

        setSelectedOrder(newOrder);
        setDraggedItem(null);
        setDragSource(null);

        // Verifica se completo
        if (newOrder.filter(n => n !== null).length === story.paragraphs.length) {
            checkOrder(newOrder);
        }
    };

    const handleDropOnPool = (e) => {
        e.preventDefault();
        if (dragSource === 'composition' && draggedItem) {
            // Rimuovi dallo slot (torna nel pool automaticamente)
            const newOrder = [...selectedOrder];
            newOrder[draggedItem.index] = null;
            setSelectedOrder(newOrder);
        }
        setDraggedItem(null);
        setDragSource(null);
    };

    const handleRemovePiece = (index) => {
        const newOrder = [...selectedOrder];
        newOrder[index] = null;
        setSelectedOrder(newOrder);
    };

    const checkOrder = (order) => {
        const correct = order.every((scene, index) => scene && scene.originalIndex === index);
        setIsCorrect(correct);
        setIsComplete(true);

        if (correct) {
            toast.success("🎉 Bravissimo! Hai completato il puzzle correttamente!");
        } else {
            toast.error("❌ Ops! Qualcosa non è al posto giusto. Riprova!");
        }
    };

    const resetGame = () => {
        setSelectedOrder(new Array(story.paragraphs.length).fill(null));
        setIsComplete(false);
        setIsCorrect(false);
        const shuffled = [...story.paragraphs]
            .map((scene, index) => ({ ...scene, originalIndex: index }))
            .sort(() => Math.random() - 0.5);
        setShuffledScenes(shuffled);
    };

    // Helper per vedere quali scene sono state usate
    const usedIds = new Set(selectedOrder.filter(s => s !== null).map(s => s.originalIndex));

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
                <p className="text-2xl text-indigo-600 font-medium animate-pulse">Caricamento gioco... 🧩</p>
            </div>
        );
    }

    const allHaveImages = story?.paragraphs.every(p => p.mediaUrl && p.mediaType === 'image');

    return (
        <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-orange-50 to-red-50 pb-20">
            <Navbar />

            <div className="container mx-auto px-4 py-8 max-w-6xl">
                <div className="text-center mb-10">
                    <div className="inline-block bg-white px-6 py-2 rounded-full shadow-md mb-4 border-2 border-orange-200">
                        <span className="text-3xl">🧩</span>
                        <span className="text-sm font-bold text-orange-600 uppercase tracking-widest ml-2">Puzzle Story</span>
                    </div>
                    <h1 className="text-6xl font-black text-gray-800 mb-4">Metti in Ordine</h1>
                    <p className="text-3xl text-gray-600 font-bold italic">"{story?.title}"</p>
                    <p className="text-xl text-orange-700 mt-6 bg-white/80 inline-block px-8 py-3 rounded-full shadow-sm font-black border-2 border-orange-100">
                        Trascina i pezzi negli spazi bianchi o scambiali tra loro!
                    </p>
                </div>

                {/* Progress Bar */}
                <div className="mb-10 max-w-2xl mx-auto">
                    <div className="flex items-center justify-between mb-3 px-2">
                        <span className="text-xl font-bold text-gray-700">Completamento puzzle:</span>
                        <span className="text-2xl font-black text-orange-500">
                            {selectedOrder.filter(s => s !== null).length} / {shuffledScenes.length}
                        </span>
                    </div>
                    <div className="w-full bg-white rounded-full h-8 p-1 shadow-inner border-2 border-orange-100 overflow-hidden">
                        <div
                            className="bg-gradient-to-r from-yellow-400 via-orange-400 to-orange-500 h-full rounded-full transition-all duration-700 ease-out flex items-center justify-center"
                            style={{ width: `${(selectedOrder.filter(s => s !== null).length / shuffledScenes.length) * 100}%` }}
                        >
                            {selectedOrder.filter(s => s !== null).length > 0 && (
                                <span className="text-[10px] text-white font-bold animate-pulse">CARICAMENTO...</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* AREA 1: COMPOSIZIONE (SLOTS) */}
                <div className="mb-12 bg-white/40 backdrop-blur-sm rounded-[3rem] p-10 border-4 border-dashed border-orange-200 shadow-inner">
                    <h2 className="text-2xl font-bold text-gray-800 mb-8 flex items-center gap-2">
                        <span className="bg-orange-500 text-white w-10 h-10 rounded-full flex items-center justify-center text-lg font-black shadow-lg">1</span>
                        Il tuo capolavoro:
                    </h2>

                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-8">
                        {selectedOrder.map((scene, index) => {
                            const slotTheme = getTheme(index);
                            const sceneTheme = scene ? getTheme(scene.originalIndex) : null;

                            return (
                                <div
                                    key={index}
                                    onDragOver={handleDragOver}
                                    onDrop={(e) => handleDropOnSlot(e, index)}
                                    className={`
                                        relative aspect-square rounded-[2rem] border-4 transition-all duration-300 transform
                                        ${scene
                                            ? `shadow-2xl cursor-move hover:scale-105 ${sceneTheme.bg} ${sceneTheme.border}`
                                            : `border-dashed ${slotTheme.slot}`
                                        }
                                        ${isComplete && scene
                                            ? (scene.originalIndex === index ? 'ring-4 ring-green-400 border-green-500' : 'ring-4 ring-red-400 border-red-500')
                                            : ''
                                        }
                                    `}
                                    draggable={!!scene && !isComplete}
                                    onDragStart={(e) => scene && handleDragStart(e, scene, 'composition', index)}
                                    onDragEnd={handleDragEnd}
                                >
                                    {scene ? (
                                        <>
                                            <div className="w-full h-full rounded-[1.5rem] overflow-hidden">
                                                {scene.mediaUrl && scene.mediaType === 'image' ? (
                                                    <div className="relative w-full h-full">
                                                        <img src={scene.mediaUrl} alt="" className="w-full h-full object-cover" />
                                                        <div className={`absolute inset-0 opacity-20 ${sceneTheme.active}`}></div>
                                                    </div>
                                                ) : (
                                                    <div className={`w-full h-full p-4 flex items-center justify-center text-center overflow-y-auto ${sceneTheme.bg}`}>
                                                        <p className={`text-base font-black leading-tight ${sceneTheme.text}`}>
                                                            {scene.text}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Bottone Rimuovi */}
                                            {!isComplete && (
                                                <button
                                                    onClick={() => handleRemovePiece(index)}
                                                    className="absolute -top-3 -right-3 bg-red-500 hover:bg-red-600 text-white w-8 h-8 rounded-full flex items-center justify-center shadow-lg transition-all scale-100 hover:scale-110 z-20 border-2 border-white font-black"
                                                >
                                                    ×
                                                </button>
                                            )}

                                            <div className={`absolute -bottom-3 -left-3 text-white w-10 h-10 rounded-2xl flex items-center justify-center text-xl font-black shadow-lg border-2 border-white ${sceneTheme.active}`}>
                                                {index + 1}
                                            </div>

                                            {isComplete && (
                                                <div className="absolute inset-x-0 bottom-6 flex justify-center pointer-events-none">
                                                    <span className="bg-white/90 backdrop-blur px-4 py-1 rounded-full shadow-lg text-2xl">
                                                        {scene.originalIndex === index ? '✅' : '❌'}
                                                    </span>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <div className={`absolute inset-0 flex flex-col items-center justify-center ${slotTheme.text} opacity-30`}>
                                            <span className="font-black text-4xl">{index + 1}</span>
                                            <span className="text-[8px] font-bold uppercase tracking-widest mt-2 px-2 text-center opacity-70">Trascina qui il pezzo {index + 1}</span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* AREA 2: POOL (SCEGLI IL PEZZO) */}
                <div
                    className="p-10 rounded-[4rem] bg-indigo-900/5 border-4 border-white shadow-xl relative overflow-hidden"
                    onDragOver={handleDragOver}
                    onDrop={handleDropOnPool}
                >
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -mr-32 -mt-32"></div>

                    <h2 className="text-2xl font-bold text-gray-800 mb-8 flex items-center gap-2 relative z-10">
                        <span className="bg-indigo-600 text-white w-10 h-10 rounded-full flex items-center justify-center text-lg font-black shadow-lg">2</span>
                        Pezzi da rimettere a posto:
                    </h2>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-10 relative z-10">
                        {shuffledScenes.map((scene, index) => {
                            const isSelected = usedIds.has(scene.originalIndex);
                            const theme = getTheme(scene.originalIndex);

                            return (
                                <div
                                    key={index}
                                    draggable={!isSelected && !isComplete}
                                    onDragStart={(e) => handleDragStart(e, scene, 'pool', index)}
                                    onDragEnd={handleDragEnd}
                                    onClick={() => {
                                        if (!isSelected && !isComplete) {
                                            const firstFree = selectedOrder.indexOf(null);
                                            if (firstFree !== -1) {
                                                const newOrder = [...selectedOrder];
                                                newOrder[firstFree] = scene;
                                                setSelectedOrder(newOrder);
                                                if (newOrder.filter(n => n !== null).length === story.paragraphs.length) {
                                                    checkOrder(newOrder);
                                                }
                                            }
                                        }
                                    }}
                                    className={`
                                        relative aspect-square transition-all duration-500
                                        ${isSelected
                                            ? 'opacity-10 grayscale pointer-events-none scale-75 blur-[2px]'
                                            : 'cursor-grab active:cursor-grabbing hover:scale-110'
                                        }
                                    `}
                                >
                                    <div className={`
                                        w-full h-full rounded-[2rem] shadow-xl overflow-hidden border-4 flex flex-col group transition-colors duration-300
                                        ${!isSelected ? `bg-white ${theme.border} hover:border-indigo-400` : 'bg-gray-100 border-gray-200'}
                                    `}>
                                        {scene.mediaUrl && scene.mediaType === 'image' ? (
                                            <div className="relative w-full h-full">
                                                <img
                                                    src={scene.mediaUrl}
                                                    alt={`Pezzo`}
                                                    className="w-full h-full object-cover transition-transform group-hover:scale-110"
                                                />
                                                <div className={`absolute inset-0 opacity-0 group-hover:opacity-40 transition-opacity ${theme.active}`}></div>
                                                {!allHaveImages && (
                                                    <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-4 overflow-y-auto bg-black/60 backdrop-blur-sm shadow-inner`}>
                                                        <p className="text-white text-[10px] font-black leading-tight text-center">
                                                            {scene.text}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className={`w-full h-full p-4 flex items-center justify-center text-center overflow-y-auto ${theme.bg}`}>
                                                <p className={`text-base font-black leading-tight ${theme.text}`}>
                                                    {scene.text}
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Puzzle "knobs" decoration */}
                                    {!isSelected && (
                                        <>
                                            <div className={`absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-8 bg-white border-2 ${theme.border} rounded-full shadow-sm z-[-1]`}></div>
                                            <div className={`absolute top-1/2 -translate-y-1/2 -right-3 w-8 h-8 bg-white border-2 ${theme.border} rounded-full shadow-sm z-[-1]`}></div>
                                            <div className={`absolute bottom-1/4 -left-1 w-3 h-8 rounded-full blur-sm opacity-0 group-hover:opacity-100 transition-opacity ${theme.active}`}></div>
                                        </>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* --- OVERLAY RISULTATO --- */}
                {isComplete && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-indigo-950/80 backdrop-blur-xl animate-fadeIn">
                        <div className={`
                            max-w-md w-full rounded-[4rem] p-12 text-center shadow-2xl transform animate-popIn bg-white relative overflow-hidden
                            border-8 ${isCorrect ? 'border-green-400' : 'border-orange-400'}
                        `}>
                            {/* Fuochi d'artificio o stelle di sfondo */}
                            {isCorrect && (
                                <div className="absolute top-0 inset-x-0 flex justify-around pointer-events-none opacity-50">
                                    <span className="text-4xl animate-bounce" style={{ animationDelay: '0.1s' }}>✨</span>
                                    <span className="text-4xl animate-bounce" style={{ animationDelay: '0.3s' }}>🌟</span>
                                    <span className="text-4xl animate-bounce" style={{ animationDelay: '0.2s' }}>✨</span>
                                </div>
                            )}

                            <div className="text-9xl mb-8 filter drop-shadow-xl animate-pulse">
                                {isCorrect ? '🦁' : '🐢'}
                            </div>

                            <h2 className={`text-4xl font-black mb-4 uppercase tracking-tighter ${isCorrect ? 'text-green-600' : 'text-orange-600'}`}>
                                {isCorrect ? 'SEI UN GENIO!' : 'QUASI FATTO!'}
                            </h2>

                            <p className="text-xl text-gray-600 mb-10 font-bold leading-tight">
                                {isCorrect
                                    ? 'Hai rimesso tutta la storia nel posto giusto! Bravissimo capitano.'
                                    : 'Alcune tessere si sono perse... riprova a metterle al posto giusto!'}
                            </p>

                            <div className="flex flex-col gap-4">
                                <button
                                    onClick={resetGame}
                                    className={`
                                        w-full py-5 rounded-[2rem] font-black text-2xl shadow-xl transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center gap-3
                                        ${isCorrect
                                            ? 'bg-gradient-to-r from-green-400 to-emerald-600 text-white'
                                            : 'bg-gradient-to-r from-orange-400 to-red-500 text-white'}
                                    `}
                                >
                                    {isCorrect ? '⭐ GIOCA ANCORA' : '🔄 RIPROVA ORA'}
                                </button>

                                <div className="flex gap-4 mt-2">
                                    <button
                                        onClick={() => navigate(`/story/${storyId}`)}
                                        className="flex-1 py-4 bg-indigo-50 text-indigo-600 rounded-2xl font-black text-xs hover:bg-indigo-100 transition-all uppercase tracking-widest"
                                    >
                                        📖 Rileggi
                                    </button>
                                    <button
                                        onClick={() => navigate('/child-dashboard')}
                                        className="flex-1 py-4 bg-gray-100 text-gray-500 rounded-2xl font-black text-xs hover:bg-gray-200 transition-all uppercase tracking-widest"
                                    >
                                        🏠 Bacheca
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Animazioni personalizzate via Tailwind non bastano per bounceIn/popIn se non configurate - aggiungiamo classi CSS inline */}
            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes popIn {
                    0% { transform: scale(0.8) translateY(50px); opacity: 0; }
                    100% { transform: scale(1) translateY(0); opacity: 1; }
                }
                .animate-popIn { animation: popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
                
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                .animate-fadeIn { animation: fadeIn 0.3s ease-out forwards; }
                
                .cursor-grab { cursor: grab; }
                .cursor-grabbing { cursor: grabbing; }
            `}} />
        </div>
    );
};

export default SequencingGame;
