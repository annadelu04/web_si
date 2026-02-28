import { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { appContext } from '../context/appContext';
import axios from 'axios';
import { FaBookOpen, FaSignOutAlt, FaHeart, FaUserMd, FaStar, FaGlobe, FaRocket } from 'react-icons/fa';
import { toast } from 'react-toastify';

const ChildDashboard = () => {
    const { backendUrl, getUserData } = useContext(appContext);
    const navigate = useNavigate();

    const [childData, setChildData] = useState(null);
    const [assignedStories, setAssignedStories] = useState([]); // Storie assegnate dai genitori
    const [otherStories, setOtherStories] = useState([]);       // Tutte le altre storie pubbliche
    const [loading, setLoading] = useState(true);

    
    useEffect(() => {
        fetchAllData();
    }, []);

    const fetchAllData = async () => {
        try {
            axios.defaults.withCredentials = true;

            // 1. Prendi le storie assegnate specificamente al bambino
            const assignedRes = await axios.get(`${backendUrl}/api/story/child-stories`);

            // 2. Prendi TUTTE le storie pubbliche/disponibili (Assicurati che questa rotta esista nel backend!)
            // Se non hai una rotta specifica 'public-stories', usa quella che restituisce tutte le storie approvate.
            const publicRes = await axios.get(`${backendUrl}/api/story/public-stories`);

            if (assignedRes.data.success) {
                const myAssigned = assignedRes.data.stories;
                setAssignedStories(myAssigned);
                setChildData(assignedRes.data.child);

                if (publicRes.data.success) {
                    const allPublic = publicRes.data.stories;

                    // 3. FILTRO: Mostra in "Altre Storie" solo quelle che NON sono già in "Assegnate"
                    // Creiamo un Set con gli ID delle storie assegnate per un controllo veloce
                    const assignedIds = new Set(myAssigned.map(s => s._id));

                    const filteredPublic = allPublic.filter(story => !assignedIds.has(story._id));

                    setOtherStories(filteredPublic);
                }
            }
        } catch (error) {
            console.error(error);
            // Non mostriamo errore all'utente se fallisce solo il caricamento delle pubbliche, ma logghiamo
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        try {
            axios.defaults.withCredentials = true;
            await axios.post(`${backendUrl}/api/user/logout-child`);
            await getUserData();
            navigate('/profile');
        } catch (error) {
            console.error(error);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-purple-100 via-pink-100 to-blue-100 flex items-center justify-center">
                <div className="text-2xl font-bold text-purple-600 animate-bounce">Caricamento le tue storie... 🎈</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-100 via-pink-100 to-blue-100 pb-20">

            <div className="container mx-auto px-4 py-8 max-w-6xl">

                {/* --- HEADER BAMBINO --- */}
                <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl p-8 mb-10 text-center border-4 border-white relative overflow-hidden">
                    {/* Decorazioni sfondo header */}
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-orange-400 via-pink-500 to-purple-600"></div>

                    <div className="relative w-32 h-32 mx-auto mb-4">
                        <div className="w-full h-full bg-gradient-to-br from-orange-400 to-pink-500 rounded-full flex items-center justify-center text-white text-6xl font-bold shadow-lg overflow-hidden border-4 border-white">
                            {childData?.avatar && childData.avatar.startsWith('http') ? (
                                <img src={childData.avatar} alt="Me" className="w-full h-full object-cover" />
                            ) : (
                                <span>👶</span>
                            )}
                        </div>
                        <div className="absolute bottom-1 right-1 bg-yellow-400 w-8 h-8 rounded-full border-2 border-white flex items-center justify-center shadow-sm animate-pulse">
                            <FaStar className="text-white text-xs" />
                        </div>
                    </div>

                    <h1 className="text-6xl font-black text-gray-800 mb-4 tracking-tight">
                        Ciao, <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">{childData?.name || 'Campione'}</span>! 👋
                    </h1>
                    <p className="text-gray-600 font-bold text-2xl mb-6">Cosa leggiamo oggi di bello?</p>

                    <button
                        onClick={handleLogout}
                        className="mt-6 flex items-center gap-2 px-8 py-3 bg-white text-red-500 border-2 border-red-100 rounded-full hover:bg-red-50 hover:border-red-200 shadow-sm transition-all mx-auto text-base font-black"
                    >
                        <FaSignOutAlt /> Torna ai Genitori
                    </button>
                </div>

                {/* --- SEZIONE 1: STORIE ASSEGNATE (PRIORITÀ) --- */}
                <div className="mb-12">
                    <div className="flex items-center gap-3 mb-6 px-2">
                        <div className="bg-white p-3 rounded-full shadow-md text-pink-500">
                            <FaHeart size={24} />
                        </div>
                        <div>
                            <h2 className="text-4xl font-black text-gray-800">
                                Scelte per te ❤️
                            </h2>
                            <p className="text-xl text-gray-500 font-bold mt-1">
                                Le tue storie speciali
                            </p>
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {assignedStories.length === 0 ? (
                            <div className="col-span-full text-center py-10 bg-white/50 rounded-3xl border-2 border-dashed border-pink-200">
                                <p className="text-gray-500 font-bold">Nessuna storia assegnata ancora.</p>
                            </div>
                        ) : (
                            assignedStories.map(story => (
                                <StoryCard key={story._id} story={story} navigate={navigate} isAssigned={true} />
                            ))
                        )}
                    </div>
                </div>

                {/* --- SEZIONE 2: ALTRE STORIE (LIBRERIA PUBBLICA) --- */}
                {otherStories.length > 0 && (
                    <div className="mb-6 animate-fadeIn">
                        <div className="flex items-center gap-3 mb-6 px-2 border-t border-gray-200 pt-8">
                            <div className="bg-white p-3 rounded-full shadow-md text-blue-500">
                                <FaGlobe size={24} />
                            </div>
                            <div>
                                <h2 className="text-4xl font-black text-gray-800">
                                    Esplora altre storie 🌍
                                </h2>
                                <p className="text-xl text-gray-500 font-bold mt-1">
                                    Tante nuove avventure ti aspettano
                                </p>
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {otherStories.map(story => (
                                <StoryCard key={story._id} story={story} navigate={navigate} isAssigned={false} />
                            ))}
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

// --- Componente Card Estratto per pulizia codice ---
const StoryCard = ({ story, navigate, isAssigned }) => {
    return (
        <div
            onClick={() => navigate(`/story/${story._id}`)}
            className={`
                relative bg-white rounded-3xl shadow-lg hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 cursor-pointer overflow-hidden group border
                ${isAssigned ? 'border-pink-100 ring-2 ring-pink-50' : 'border-gray-100'}
            `}
        >
            {/* Intestazione Card Colorata */}
            <div className={`h-24 bg-gradient-to-r relative overflow-hidden ${isAssigned ? 'from-pink-400 to-purple-400' : 'from-blue-400 to-cyan-400'}`}>
                <div className="absolute -bottom-8 -right-8 w-24 h-24 bg-white/20 rounded-full blur-xl"></div>
                <div className="absolute top-4 left-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-sm">
                    {isAssigned ? <span className="text-pink-600 flex gap-1 items-center"><FaHeart /> Per Te</span> : <span className="text-blue-600 flex gap-1 items-center"><FaRocket /> Esplora</span>}
                </div>
            </div>

            <div className="p-6 relative">
                {/* Icona fluttuante */}
                <div className="absolute -top-10 right-6 w-16 h-16 bg-white rounded-2xl shadow-md flex items-center justify-center text-4xl border-4 border-white group-hover:scale-110 transition-transform">
                    📖
                </div>

                <div className="mt-4">
                    <h3 className="font-black text-2xl text-gray-800 mb-3 leading-tight group-hover:text-purple-600 transition-colors line-clamp-2">
                        {story.title}
                    </h3>

                    {/* Mostra autore solo se disponibile e se è assegnata */}
                    {isAssigned && (
                        <div className="flex items-center gap-2 mb-3 text-xs text-gray-500 bg-gray-50 p-2 rounded-lg inline-flex w-full">
                            <FaUserMd className="text-blue-400" />
                            <span>
                                Da: <span className="font-bold text-gray-700">{story.authorName || 'Mamma/Papà'}</span>
                            </span>
                        </div>
                    )}

                    <p className="text-gray-600 text-base font-medium line-clamp-2 mb-6 h-12">
                        {story.description || "Clicca per leggere questa storia!"}
                    </p>

                    <button className={`
                        w-full text-white py-4 rounded-2xl font-black text-xl shadow-lg transition-all flex items-center justify-center gap-3
                        ${isAssigned ? 'bg-pink-500 hover:bg-pink-600' : 'bg-blue-500 hover:bg-blue-600'}
                    `}>
                        Leggi ora <FaBookOpen />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ChildDashboard;