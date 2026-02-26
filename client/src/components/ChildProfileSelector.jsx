import React, { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { appContext } from '../context/appContext';
import { FaChild, FaRocket, FaCat, FaDog, FaHeart, FaStar, FaCar, FaTree, FaArrowLeft } from 'react-icons/fa';
import Navbar from './Navbar';

const ChildProfileSelector = () => {
    const { backendUrl, getUserData } = useContext(appContext);
    const navigate = useNavigate();
    const [children, setChildren] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedChild, setSelectedChild] = useState(null);
    const [pin, setPin] = useState('');
    const [showPinInput, setShowPinInput] = useState(false);

    const avatarIcons = {
        FaChild, FaRocket, FaCat, FaDog, FaHeart, FaStar, FaCar, FaTree
    };

    const avatarColors = {
        FaChild: 'from-blue-300 to-blue-400',
        FaRocket: 'from-purple-300 to-purple-400',
        FaCat: 'from-orange-300 to-orange-400',
        FaDog: 'from-amber-300 to-amber-400',
        FaHeart: 'from-pink-300 to-pink-400',
        FaStar: 'from-yellow-300 to-yellow-400',
        FaCar: 'from-red-300 to-red-400',
        FaTree: 'from-green-300 to-green-400'
    };

    useEffect(() => {
        fetchChildren();
    }, []);

    const fetchChildren = async () => {
        try {
            axios.defaults.withCredentials = true;
            const { data } = await axios.get(backendUrl + '/api/user/children');

            if (data.success) {
                setChildren(data.children);
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            console.error(error);
            toast.error("Errore nel caricamento dei profili.");
        } finally {
            setLoading(false);
        }
    };

    const handleChildClick = async (child) => {
        // Se il bambino ha un PIN, mostra l'input
        if (child.pin) {
            setSelectedChild(child);
            setShowPinInput(true);
        } else {
            // Altrimenti accedi direttamente
            await switchToChild(child._id, '');
        }
    };

    const switchToChild = async (childId, pinValue) => {
        try {
            axios.defaults.withCredentials = true;
            const { data } = await axios.post(backendUrl + `/api/user/switch-child/${childId}`, {
                pin: pinValue
            });

            if (data.success) {
                toast.success(data.message);
                // Aggiorniamo i dati utente nel context per riflettere la sessione bambino attiva
                await getUserData();
                // Redirect all'area bambino
                navigate('/child-dashboard');
            } else {
                toast.error(data.message);
                setPin('');
            }
        } catch (error) {
            toast.error("Errore durante l'accesso.");
            setPin('');
        }
    };

    const handlePinSubmit = (e) => {
        e.preventDefault();
        if (selectedChild && pin.length === 4) {
            switchToChild(selectedChild._id, pin);
        } else {
            toast.error("Inserisci un PIN valido (4 cifre)");
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
                <p className="text-2xl text-indigo-600 font-medium animate-pulse">Caricamento profili...</p>
            </div>
        );
    }

    if (showPinInput && selectedChild) {
        const IconComponent = avatarIcons[selectedChild.avatar] || FaChild;
        const colorGradient = avatarColors[selectedChild.avatar] || 'from-blue-300 to-blue-400';

        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 p-4">
                <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full">
                    <button
                        onClick={() => {
                            setShowPinInput(false);
                            setSelectedChild(null);
                            setPin('');
                        }}
                        className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-6 transition-colors"
                    >
                        <FaArrowLeft /> Indietro
                    </button>

                    <div className="text-center mb-8">
                        <div className={`w-32 h-32 mx-auto rounded-full bg-gradient-to-br ${colorGradient} flex items-center justify-center shadow-lg mb-4`}>
                            <IconComponent className="w-16 h-16 text-white" />
                        </div>
                        <h2 className="text-3xl font-bold text-gray-800">{selectedChild.name}</h2>
                        <p className="text-gray-600 mt-2">Inserisci il tuo PIN</p>
                    </div>

                    <form onSubmit={handlePinSubmit}>
                        <input
                            type="text"
                            value={pin}
                            onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                            placeholder="••••"
                            maxLength={4}
                            autoFocus
                            className="w-full px-6 py-4 rounded-2xl border-4 border-gray-200 focus:border-green-400 outline-none transition-all text-3xl text-center tracking-widest font-bold"
                        />
                        <button
                            type="submit"
                            className="w-full mt-6 bg-gradient-to-r from-green-400 to-green-600 text-white py-4 rounded-full font-bold text-lg hover:shadow-xl hover:scale-105 transition-all"
                        >
                            Entra
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
            <Navbar />

            <div className="container mx-auto px-4 py-12">
                <div className="text-center mb-12">
                    <h1 className="text-5xl font-bold text-gray-800 mb-4">Chi sta giocando?</h1>
                    <p className="text-xl text-gray-600">Scegli il tuo profilo</p>
                </div>

                {children.length === 0 ? (
                    <div className="text-center py-20">
                        <p className="text-2xl text-gray-500 mb-6">Nessun profilo bambino trovato</p>
                        <button
                            onClick={() => navigate('/profile')}
                            className="px-8 py-4 bg-gradient-to-r from-green-400 to-green-600 text-white rounded-full font-bold text-lg hover:shadow-xl hover:scale-105 transition-all"
                        >
                            Torna al Profilo
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
                        {children.map((child) => {
                            const IconComponent = avatarIcons[child.avatar] || FaChild;
                            const colorGradient = avatarColors[child.avatar] || 'from-blue-300 to-blue-400';

                            return (
                                <button
                                    key={child._id}
                                    onClick={() => handleChildClick(child)}
                                    className="group focus:outline-none"
                                    aria-label={`Seleziona profilo ${child.name}`}
                                >
                                    <div className="transform transition-all duration-300 hover:scale-110 hover:-translate-y-2">
                                        <div className={`
                                            w-40 h-40 mx-auto rounded-3xl 
                                            bg-gradient-to-br ${colorGradient}
                                            flex items-center justify-center
                                            shadow-lg group-hover:shadow-2xl
                                            transition-all duration-300
                                            border-4 border-white
                                        `}>
                                            <IconComponent className="w-20 h-20 text-white" />
                                        </div>
                                        <p className="text-2xl font-bold text-gray-800 mt-4 text-center group-hover:text-green-600 transition-colors">
                                            {child.name}
                                        </p>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}

                <div className="text-center mt-12">
                    <button
                        onClick={() => navigate('/profile')}
                        className="flex items-center gap-2 mx-auto text-gray-600 hover:text-gray-800 text-lg transition-colors"
                    >
                        <FaArrowLeft /> Torna al Profilo Genitore
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ChildProfileSelector;
