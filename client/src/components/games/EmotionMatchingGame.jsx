import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { appContext } from '../../context/appContext';
import axios from 'axios';
import { toast } from 'react-toastify';
import Navbar from '../Navbar';

const EmotionMatchingGame = () => {
    const { storyId } = useParams();
    const navigate = useNavigate();
    const { backendUrl } = useContext(appContext);

    const [story, setStory] = useState(null);
    const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
    const [selectedEmotion, setSelectedEmotion] = useState(null);
    const [score, setScore] = useState(0);
    const [isComplete, setIsComplete] = useState(false);
    const [loading, setLoading] = useState(true);
    const [showFeedback, setShowFeedback] = useState(false);
    const [isCorrectAnswer, setIsCorrectAnswer] = useState(false);

    const emotions = [
        { name: 'Felice', emoji: '😊', color: 'bg-yellow-200 hover:bg-yellow-300' },
        { name: 'Triste', emoji: '😢', color: 'bg-blue-200 hover:bg-blue-300' },
        { name: 'Arrabbiato', emoji: '😠', color: 'bg-red-200 hover:bg-red-300' },
        { name: 'Sorpreso', emoji: '😲', color: 'bg-purple-200 hover:bg-purple-300' },
        { name: 'Spaventato', emoji: '😨', color: 'bg-gray-200 hover:bg-gray-300' },
        { name: 'Eccitato', emoji: '🤩', color: 'bg-pink-200 hover:bg-pink-300' }
    ];

    // Mapping semplice per demo (in produzione potrebbe essere nel DB)
    const getExpectedEmotion = (sceneText) => {
        const text = sceneText.toLowerCase();
        if (text.includes('felice') || text.includes('contento') || text.includes('gioia')) return 'Felice';
        if (text.includes('triste') || text.includes('piange')) return 'Triste';
        if (text.includes('arrabbiato') || text.includes('furioso')) return 'Arrabbiato';
        if (text.includes('sorpreso') || text.includes('stupito')) return 'Sorpreso';
        if (text.includes('paura') || text.includes('spaventato')) return 'Spaventato';
        if (text.includes('eccitato') || text.includes('entusiasta')) return 'Eccitato';
        return 'Felice'; // Default
    };

    useEffect(() => {
        fetchStory();
    }, [storyId]);

    const fetchStory = async () => {
        try {
            axios.defaults.withCredentials = true;
            const { data } = await axios.get(`${backendUrl}/api/story/${storyId}`);

            if (data.success) {
                setStory(data.story);
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

    const handleEmotionSelect = (emotion) => {
        if (showFeedback) return;

        setSelectedEmotion(emotion.name);
        const currentScene = story.paragraphs[currentSceneIndex];
        const expectedEmotion = getExpectedEmotion(currentScene.text);
        const correct = emotion.name === expectedEmotion;

        setIsCorrectAnswer(correct);
        setShowFeedback(true);

        if (correct) {
            setScore(score + 1);
            toast.success(`✅ Corretto! È ${emotion.emoji}`);
        } else {
            toast.error(`❌ Riprova! L'emozione corretta era ${emotions.find(e => e.name === expectedEmotion)?.emoji}`);
        }

        // Next scene after 2 seconds
        setTimeout(() => {
            if (currentSceneIndex < story.paragraphs.length - 1) {
                setCurrentSceneIndex(currentSceneIndex + 1);
                setSelectedEmotion(null);
                setShowFeedback(false);
            } else {
                setIsComplete(true);
            }
        }, 2000);
    };

    const resetGame = () => {
        setCurrentSceneIndex(0);
        setScore(0);
        setIsComplete(false);
        setSelectedEmotion(null);
        setShowFeedback(false);
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
                <p className="text-2xl text-indigo-600 font-medium animate-pulse">Caricamento gioco...</p>
            </div>
        );
    }

    const currentScene = story?.paragraphs[currentSceneIndex];

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
            <Navbar />

            <div className="container mx-auto px-4 py-8 max-w-4xl">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-gray-800 mb-2">💭 Gioco: Indovina l'Emozione</h1>
                    <p className="text-xl text-gray-600">{story?.title}</p>
                    <p className="text-lg text-gray-500 mt-2">Quale emozione rappresenta questa scena?</p>
                </div>

                {!isComplete ? (
                    <>
                        {/* Progress */}
                        <div className="mb-8 bg-white rounded-2xl p-6 shadow-lg">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-lg font-bold text-gray-700">Scena:</span>
                                <span className="text-2xl font-bold text-indigo-600">
                                    {currentSceneIndex + 1} / {story?.paragraphs.length}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-lg font-bold text-gray-700">Punteggio:</span>
                                <span className="text-2xl font-bold text-green-600">⭐ {score}</span>
                            </div>
                        </div>

                        {/* Current Scene */}
                        <div className="bg-white rounded-3xl p-8 shadow-2xl mb-8">
                            {currentScene?.mediaUrl && currentScene.mediaType === 'image' && (
                                <img
                                    src={currentScene.mediaUrl}
                                    alt="Scena"
                                    className="w-full h-64 object-cover rounded-2xl mb-6"
                                />
                            )}
                            <p className="text-2xl font-semibold text-gray-800 text-center leading-relaxed">
                                {currentScene?.text}
                            </p>
                        </div>

                        {/* Emotions Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                            {emotions.map((emotion) => (
                                <button
                                    key={emotion.name}
                                    onClick={() => handleEmotionSelect(emotion)}
                                    disabled={showFeedback}
                                    className={`
                                        p-8 rounded-3xl shadow-xl transition-all duration-300
                                        ${emotion.color}
                                        ${showFeedback
                                            ? (selectedEmotion === emotion.name
                                                ? (isCorrectAnswer ? 'ring-4 ring-green-500 scale-105' : 'ring-4 ring-red-500')
                                                : 'opacity-50')
                                            : 'hover:scale-110 hover:shadow-2xl cursor-pointer'
                                        }
                                        ${showFeedback ? 'cursor-not-allowed' : ''}
                                    `}
                                >
                                    <p className="text-6xl mb-3 text-center">{emotion.emoji}</p>
                                    <p className="text-xl font-bold text-gray-800 text-center">{emotion.name}</p>
                                </button>
                            ))}
                        </div>
                    </>
                ) : (
                    <div className="text-center">
                        <div className="bg-white rounded-3xl p-12 shadow-2xl mb-8">
                            <p className="text-8xl mb-6">🎉</p>
                            <h2 className="text-4xl font-bold text-gray-800 mb-4">Gioco Completato!</h2>
                            <p className="text-3xl font-bold text-indigo-600 mb-2">
                                Punteggio Finale: {score} / {story?.paragraphs.length}
                            </p>
                            <p className="text-xl text-gray-600">
                                {score === story?.paragraphs.length
                                    ? "Perfetto! Hai indovinato tutte le emozioni! 🌟"
                                    : score >= story?.paragraphs.length / 2
                                        ? "Ottimo lavoro! Continua così! 👏"
                                        : "Buon tentativo! Riprova per migliorare! 💪"
                                }
                            </p>
                        </div>

                        <div className="flex gap-4 justify-center">
                            <button
                                onClick={resetGame}
                                className="px-8 py-4 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-full font-bold text-lg hover:shadow-xl hover:scale-105 transition-all"
                            >
                                🔄 Gioca Ancora
                            </button>
                            <button
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

export default EmotionMatchingGame;
