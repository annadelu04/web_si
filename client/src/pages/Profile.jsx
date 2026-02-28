import { useContext, useEffect, useState } from 'react'; //useEffect hook che si attiva quando il componenete viene caricato. Usato per scaricare i dati dal server
import Navbar from '../components/Navbar';
import { appContext } from '../context/appContext';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
//icone vettoriali da react-icons (es. occhio per vedere, cestino per eliminare).
import { FaEye, FaEdit, FaTrash, FaSignOutAlt, FaUserPlus, FaPen, FaUserMd, FaCheck, FaTimes, FaChild, FaSearch } from 'react-icons/fa';
//Importiamo le finestre modali (popup) che useremo:
import EditProfileModal from './EditProfileModal';
import DeleteProfileModal from '../components/DeleteProfileModal';
import AddChildModal from '../components/AddChildModal';
import EmailVerify from './EmailVerify';
import AssignChildrenForm from '../components/AssignChildrenForm';

const Profile = () => {
    // --- 1. CONFIGURAZIONE E HOOKS ---
    const { userData, backendUrl, getUserData } = useContext(appContext); //Estraiamo dal contesto i dati fondamentali
    const navigate = useNavigate();

    // --- 2. GESTIONE STATO (STATE MANAGEMENT) ---
    // Variabili booleane (Vero/Falso) che decidono se le finestre popup sono visibili.
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    // Stato Storie (Usato da entrambi: Genitore = Le sue storie, Terapista = Le sue storie "Private")
    const [stories, setStories] = useState([]);

    // --- STATO LATO GENITORE ---
    const [myChildren, setMyChildren] = useState([]); // Lista figli
    const [isAddChildModalOpen, setIsAddChildModalOpen] = useState(false);
    const [searchTherapistModalOpen, setSearchTherapistModalOpen] = useState(false);
    const [therapistsList, setTherapistsList] = useState([]); // Risultati ricerca terapeuti
    const [myTherapists, setMyTherapists] = useState([]); // Terapeuti attualmente collegati
    const [assignChildrenModalOpen, setAssignChildrenModalOpen] = useState(false);
    //Quando clicchi "Assegna", qui salva quale storia hai scelto per passarla alla modale.
    const [selectedStoryForAssign, setSelectedStoryForAssign] = useState(null);

    // --- STATO LATO TERAPISTA ---
    const [pendingStories, setPendingStories] = useState([]);     // Storie in attesa di approvazione
    const [pendingInvitations, setPendingInvitations] = useState([]); // Richieste di collegamento da nuovi genitori.
    const [assignedFamilies, setAssignedFamilies] = useState([]);  // Le famiglie che il terapeuta sta seguendo.
    const [rejectReason, setRejectReason] = useState('');           // Motivo rifiuto storia
    const [selectedStoryIdForReject, setSelectedStoryIdForReject] = useState(null);

    // --- STATO VERIFICA ACCOUNT ---
    const [showOtpModal, setShowOtpModal] = useState(false); //Se mostrare il popup per inserire il codice email.
    const [currentPlayingAudio, setCurrentPlayingAudio] = useState(null);


    // --- 3. EFFETTI (DATA FETCHING) -- Controlla che tipo di utente sei---
    useEffect(() => {
        if (userData) {
            if (userData.tipo_utente === 'terapeuta') {
                fetchTherapistData();
            } else {
                fetchParentData();
            }
        }
    }, [userData, backendUrl]);

    // --- 4. FUNZIONI GENITORE (PARENT ACTIONS) ---
    // Carica dati dashboard Genitore
    const fetchParentData = async () => {  //tre chiamate al server in parallelo
        try {
            axios.defaults.withCredentials = true;
            // Scarica le storie create dall'utente
            const storiesRes = await axios.get(backendUrl + '/api/story/my-stories');
            if (storiesRes.data.success) setStories(storiesRes.data.stories);

            // Scarica i figli.
            const childrenRes = await axios.get(backendUrl + '/api/user/children');
            if (childrenRes.data.success) setMyChildren(childrenRes.data.children);

            // Scarica i terapeuti collegati.
            const therapistsRes = await axios.get(backendUrl + '/api/user/therapists');
            if (therapistsRes.data.success) setMyTherapists(therapistsRes.data.therapists);

        } catch (error) {
            console.error(error);
        }
    };

    // Chiede al server la lista di tutti i terapeuti disponibili e apre la modale per mostrarli.
    const handleSearchTherapists = async () => {
        try {
            const { data } = await axios.post(backendUrl + '/api/user/search-therapists');
            if (data.success) {
                setTherapistsList(data.therapists);
                setSearchTherapistModalOpen(true);
            }
        } catch (error) {
            toast.error("Errore ricerca terapeuti");
        }
    };

    // Aggiungi un terapeuta (Invia Richiesta di collegamento tramite mail)
    const addTherapist = async (email) => {
        try {
            const { data } = await axios.post(backendUrl + '/api/user/add-therapist', { therapistEmail: email });
            if (data.success) {
                toast.success(data.message);
                setSearchTherapistModalOpen(false);
                fetchParentData();
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            toast.error("Errore aggiunta terapista");
        }
    };

    // Switch Profilo: Passa alla modalità Bambino (Child Mode)
    const handleChildSwitch = async (child) => {
        let pinToSend = '';

        if (child.pin) {   //Se il bambino ha un PIN, apre un prompt del browser per chiederlo.
            const enteredPin = prompt(`Inserisci il PIN per ${child.name}:`);
            if (!enteredPin) return; // Annullato dall'utente
            pinToSend = enteredPin;
        }

        try {
            axios.defaults.withCredentials = true;
            const { data } = await axios.post(
                `${backendUrl}/api/user/switch-child/${child._id}`,
                { pin: pinToSend }
            );

            if (data.success) {
                toast.success(data.message);
                navigate('/child-dashboard');
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            console.error("Errore switch:", error);
            toast.error(error.response?.data?.message || "Errore durante lo switch");
        }
    };

    // --- 5. FUNZIONI TERAPISTA (THERAPIST ACTIONS) ---

    // Carica dati dashboard Terapista
    const fetchTherapistData = async () => {
        try {
            axios.defaults.withCredentials = true;
            // 1. Pending Stories (Storie da approvare)
            const pendingRes = await axios.get(`${backendUrl}/api/approval/pending-stories`);
            if (pendingRes.data.success) setPendingStories(pendingRes.data.stories);

            // 2. Assigned Families (Famiglie che hanno collegato questo terapista)
            const childrenRes = await axios.get(`${backendUrl}/api/approval/assigned-children`);
            if (childrenRes.data.success) {
                setAssignedFamilies(childrenRes.data.families || []);
            }

            // 3. Pending Invitations (Inviti di collegamento ricevuti)
            const invitationsRes = await axios.get(`${backendUrl}/api/approval/invitations`);
            if (invitationsRes.data.success) {
                setPendingInvitations(invitationsRes.data.invitations || []);
            }

            // 4. Therapist's Own Stories (Storie create dal terapista stesso)
            const myStoriesRes = await axios.get(`${backendUrl}/api/story/my-stories`);
            if (myStoriesRes.data.success) setStories(myStoriesRes.data.stories);

        } catch (error) {
            console.error(error);
        }
    };

    // Approva una storia inviata da un genitore
    const handleApprove = async (storyId) => {  //Dice al server che la storia è OK (diventa pubblica)
        try {
            const { data } = await axios.post(`${backendUrl}/api/approval/approve/${storyId}`);
            if (data.success) {
                toast.success(data.message);
                fetchTherapistData();
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            toast.error("Errore approvazione");
        }
    };

    // Rifiuta una storia (Richiede motivazione)
    const handleReject = async (storyId) => {
        if (!rejectReason) return toast.warning("Motivazione richiesta");
        try {
            const { data } = await axios.post(`${backendUrl}/api/approval/reject/${storyId}`, { reason: rejectReason });
            if (data.success) {
                toast.success(data.message);
                setRejectReason('');
                setSelectedStoryIdForReject(null);
                fetchTherapistData();
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            toast.error("Errore rifiuto");
        }
    };

    // Accetta o rifiuta la richiesta di un genitore di collegarsi.
    const handleRespondInvitation = async (parentId, action) => {
        try {
            const { data } = await axios.post(`${backendUrl}/api/approval/respond-invitation`, { parentId, action });
            if (data.success) {
                toast.success(data.message);
                fetchTherapistData();
                getUserData(); // Update patient count in header if needed
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            toast.error("Errore gestione invito");
        }
    };

    // Rimuovi collegamento con Terapista (lato Genitore) o Famiglia (lato Terapista)
    const handleRemoveConnection = async (targetId, name) => {
        if (!window.confirm(`Sei sicuro di voler rimuovere il collegamento con ${name}?`)) return;

        try {
            axios.defaults.withCredentials = true;
            const { data } = await axios.post(`${backendUrl}/api/user/remove-connection`, { targetId });

            if (data.success) {
                toast.success(data.message);
                if (userData.tipo_utente === 'terapeuta') {
                    fetchTherapistData();
                } else {
                    fetchParentData();
                }
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            toast.error("Errore disconnessione");
        }
    };

    // RENDER: Loading State
    if (!userData) return <div className="text-center p-10">Caricamento...</div>;

    // --- 6. BLOCCO VERIFICA ACCOUNT (ACCOUNT VERIFICATION CHECK) ---
    // Se l'utente non ha verificato l'email, blocchiamo l'accesso alla dashboard
    if (!userData.isAccountVerified) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
                <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border-t-8 border-red-500">
                    <h1 className="text-3xl font-bold text-red-600 mb-4">Account Non Verificato</h1>
                    <p className="text-gray-600 mb-6">
                        Ciao {userData.name}, per accedere alla tua dashboard e utilizzare la piattaforma devi verificare il tuo indirizzo email.
                    </p>
                    <p className="text-sm text-gray-400 bg-gray-100 p-3 rounded mb-6">
                        Controlla la tua casella di posta: <strong>{userData.email}</strong>
                    </p>
                    <button
                        onClick={async () => {
                            try {
                                axios.defaults.withCredentials = true;
                                const { data } = await axios.post(backendUrl + '/api/auth/send-verify-otp');
                                if (data.success) {
                                    toast.success("Email di verifica inviata! Controlla la posta.");
                                    navigate('/email-verify');
                                } else {
                                    toast.error(data.message);
                                }
                            } catch (e) {
                                console.error(e);
                                toast.error("Errore durante l'invio dell'email.");
                            }
                        }}
                        className="w-full bg-indigo-600 text-white py-3 rounded-full font-bold hover:bg-indigo-700 transition"
                    >
                        Invia Nuova Email di Verifica
                    </button>

                    <div className="mt-6 border-t pt-4">
                        <button onClick={() => navigate('/')} className="text-gray-500 text-sm hover:underline">Torna alla Home</button>
                        <span className="mx-2 text-gray-300">|</span>
                        <button
                            onClick={async () => {
                                await axios.post(backendUrl + '/api/auth/logout');
                                window.location.reload();
                            }}
                            className="text-gray-500 text-sm hover:underline"
                        >
                            Logout
                        </button>
                    </div>

                    {showOtpModal && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                            <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl animate-fadeIn relative">
                                <button onClick={() => setShowOtpModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10">✕</button>
                                <EmailVerify isModal={true} onVerified={() => setShowOtpModal(false)} />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }


    const isTherapist = userData.tipo_utente === 'terapeuta';

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <Navbar />

            <div className="container mx-auto px-4 py-8 max-w-6xl">

                {/* --- HEADER PROFILO (Dati Utente & Bottoni Azione) --- comune sia per Genitori che per Terapeuti. Mostra chi sei.*/}
                <div className="bg-white rounded-3xl shadow-lg p-8 mb-8 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-6 w-full md:w-auto"> 
                        <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white text-4xl font-bold shadow-md">
                            {userData.name ? userData.name[0].toUpperCase() : 'U'} 
                        </div> 
                        <div>
                            <h1 className="text-3xl font-bold text-gray-800">Ciao, {userData.name}!</h1>
                            <p className="text-gray-500">{userData.email}</p>
                            <span className={`inline-block mt-2 px-3 py-1 rounded-full text-sm font-semibold ${isTherapist ? 'bg-indigo-100 text-indigo-700' : 'bg-purple-100 text-purple-700'}`}>
                                {isTherapist ? '👨‍⚕️ Terapeuta' : '👪 Genitore'}
                            </span> 
                        </div>
                    </div>
                    {/* Bottone per aprire la modale di modifica.*/}
                    <div className="flex flex-wrap gap-3 justify-center md:justify-end w-full md:w-auto">
                        <button onClick={() => setIsEditModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 shadow-md transition-all">
                            <FaEdit /> Modifica Profilo
                        </button>
                    {/* se sei genitore, mostra due bottoni extra: "Aggiungi Bambino" e "Trova Terapista" */}
                        {!isTherapist && (
                            <>
                                <button onClick={() => setIsAddChildModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-full hover:bg-green-600 shadow-md transition-all">
                                    <FaUserPlus /> Aggiungi Bambino
                                </button>
                                <button onClick={handleSearchTherapists} className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 shadow-md transition-all">
                                    <FaUserMd /> Trova Terapista
                                </button>
                            </>
                        )}
                    {/*Bottoni rossi/grigi per eliminare l'account e fare logout. */}
                        <button onClick={() => setIsDeleteModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-600 rounded-full hover:bg-red-200 transition-all">
                            <FaTrash /> Elimina
                        </button>

                        <button
                            onClick={async () => {
                                try {
                                    axios.defaults.withCredentials = true;
                                    await axios.post(backendUrl + '/api/auth/logout');
                                    navigate('/');
                                    window.location.reload();
                                } catch (e) { toast.error("Logout error"); }
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-full hover:bg-gray-700 shadow-md transition-all"
                        >
                            <FaSignOutAlt /> Logout
                        </button>
                    </div>
                </div>

                {isTherapist ? (
                    // === 7. VISTA TERAPISTA (THERAPIST DASHBOARD) ===
                    <div className="grid lg:grid-cols-3 gap-8">
                        {/* COLONNA SINISTRA: Inviti e Storie */}
                        <div className="lg:col-span-2 space-y-8">

                            {/* --- SEZIONE A: INVITI DA FAMIGLIE --- */}
                            <div>
                                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2 mb-4">
                                    📩 Inviti in Attesa <span className="text-sm bg-blue-100 text-blue-700 px-2 py-1 rounded-full">{pendingInvitations.length}</span>
                                </h2>

                                {pendingInvitations.length === 0 ? (
                                    <div className="bg-white p-6 rounded-2xl text-center text-gray-500 shadow-sm">
                                        Nessun nuovo invito da famiglie.
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {pendingInvitations.map(inv => (
                                            <div key={inv.parentId} className="bg-white p-5 rounded-2xl shadow-sm border-l-4 border-blue-500 flex flex-col md:flex-row justify-between items-center gap-4">
                                                <div>
                                                    <h3 className="font-bold text-lg text-gray-800">{inv.parentName}</h3>
                                                    <p className="text-sm text-gray-500">{inv.parentEmail}</p>
                                                    <p className="text-[10px] text-gray-400 mt-1">Ricevuto il: {new Date(inv.invitedAt).toLocaleDateString()}</p>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleRespondInvitation(inv.parentId, 'reject')}
                                                        className="px-4 py-2 border border-red-200 text-red-600 rounded-lg text-sm font-bold hover:bg-red-50"
                                                    >
                                                        Rifiuta
                                                    </button>
                                                    <button
                                                        onClick={() => handleRespondInvitation(inv.parentId, 'accept')}
                                                        className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 shadow-md"
                                                    >
                                                        Accetta
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* --- SEZIONE B: STORIE DA APPROVARE --- */}
                            <div>
                                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2 mb-4">
                                    ⏳ Storie da Approvare <span className="text-sm bg-yellow-200 text-yellow-800 px-2 py-1 rounded-full">{pendingStories.length}</span>
                                </h2>

                                {pendingStories.length === 0 ? (
                                    <div className="bg-white p-6 rounded-2xl text-center text-gray-500 shadow-sm">
                                        Nessuna storia in attesa di approvazione.
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {pendingStories.map(story => (
                                            <div key={story._id} className="bg-white p-5 rounded-2xl shadow-sm border border-yellow-100 flex flex-col md:flex-row gap-4">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <h3 className="font-bold text-lg">{story.title}</h3>
                                                        <span className="text-xs bg-gray-100 px-2 py-1 rounded-full text-gray-600">da {story.authorName || 'Genitore'}</span>
                                                    </div>
                                                    <p className="text-sm text-gray-600 mb-3">{story.description}</p>
                                                    <button onClick={() => navigate(`/story/${story._id}`)} className="text-indigo-600 text-sm font-semibold hover:underline flex items-center gap-1">
                                                        <FaEye /> Leggi Storia
                                                    </button>
                                                </div>

                                                <div className="flex flex-col gap-2 justify-center min-w-[140px]">
                                                    <button
                                                        onClick={() => handleApprove(story._id)}
                                                        className="bg-green-100 text-green-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-green-200 flex items-center justify-center gap-2"
                                                    >
                                                        <FaCheck /> Approva
                                                    </button>
                                                    <button
                                                        onClick={() => setSelectedStoryIdForReject(story._id === selectedStoryIdForReject ? null : story._id)}
                                                        className="bg-red-100 text-red-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-200 flex items-center justify-center gap-2"
                                                    >
                                                        <FaTimes /> Rifiuta
                                                    </button>

                                                    {story.narrationUrl && (
                                                        <button
                                                            onClick={() => setCurrentPlayingAudio(story.narrationUrl === currentPlayingAudio ? null : story.narrationUrl)}
                                                            className="bg-blue-100 text-blue-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-200 flex items-center justify-center gap-2"
                                                        >
                                                            <span>🎧</span> {currentPlayingAudio === story.narrationUrl ? 'Stop Audio' : 'Ascolta Audio'}
                                                        </button>
                                                    )}
                                                </div>

                                                {/* Audio Player for this story */}
                                                {currentPlayingAudio === story.narrationUrl && (
                                                    <div className="w-full mt-2 bg-blue-50 p-2 rounded-xl animate-fadeIn">
                                                        <audio controls src={story.narrationUrl} autoPlay className="w-full h-8" />
                                                    </div>
                                                )}

                                                {/* Reject Form Dropdown */}
                                                {selectedStoryIdForReject === story._id && (
                                                    <div className="w-full md:w-auto md:absolute md:mt-24 bg-white border border-red-200 p-3 rounded-xl shadow-lg z-10">
                                                        <textarea
                                                            className="w-full border rounded p-2 text-sm mb-2"
                                                            placeholder="Motivo del rifiuto..."
                                                            value={rejectReason}
                                                            onChange={(e) => setRejectReason(e.target.value)}
                                                        />
                                                        <button
                                                            onClick={() => handleReject(story._id)}
                                                            className="w-full bg-red-500 text-white py-1 rounded text-sm hover:bg-red-600"
                                                        >
                                                            Conferma Rifiuto
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* --- SEZIONE C: LE TUE STORIE (LATO TERAPISTA) --- */}
                            <div className="mt-10 pt-10 border-t border-gray-200">
                                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2 mb-6">
                                    📚 Le Tue Storie
                                    <span className="text-sm bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full">{stories.length}</span>
                                </h2>

                                {stories.length === 0 ? (
                                    <div className="bg-white p-10 rounded-2xl shadow-sm text-center text-gray-500">
                                        Non hai ancora creato storie.
                                        <button
                                            onClick={() => navigate('/create-story')}
                                            className="mt-4 bg-indigo-600 text-white px-6 py-2 rounded-full hover:bg-indigo-700 transition-all font-bold block mx-auto w-fit"
                                        >
                                            Crea la tua prima storia
                                        </button>
                                    </div>
                                ) : (
                                    <div className="grid md:grid-cols-2 gap-6">
                                        {stories.map(story => (
                                            <div key={story._id} className="bg-white rounded-xl shadow-md p-6 border border-gray-100 hover:shadow-lg transition-shadow relative">
                                                <div className="absolute top-4 right-4 text-xs font-bold px-2 py-1 rounded bg-green-100">
                                                    <span className="text-green-600 flex items-center gap-1">
                                                        <FaCheck /> Approvata
                                                    </span>
                                                </div>

                                                <h3 className="font-bold text-lg mb-2 truncate pr-24">{story.title}</h3>
                                                <p className="text-xs text-gray-500 mb-4 line-clamp-2">{story.description}</p>

                                                {/* bottone Pubblico/Privato */}
                                                <div className="flex items-center gap-2 mb-4">
                                                    <button
                                                        onClick={async () => {
                                                            try {
                                                                axios.defaults.withCredentials = true;
                                                                const { data } = await axios.put(
                                                                    `${backendUrl}/api/story/toggle-visibility`,
                                                                    { storyId: story._id, isPublic: !story.isPublic }
                                                                );

                                                                if (data.success) {
                                                                    toast.success(story.isPublic ? 'Storia resa privata' : 'Storia resa pubblica');
                                                                    fetchTherapistData();
                                                                } else {
                                                                    toast.error(data.message);
                                                                }
                                                            } catch (error) {
                                                                toast.error("Errore cambio visibilità");
                                                            }
                                                        }}
                                                        className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold transition-all ${story.isPublic
                                                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                            }`}
                                                    >
                                                        {story.isPublic ? '🌍 Pubblica' : '🔒 Privata'}
                                                    </button>
                                                </div>

                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => navigate(`/edit-story/${story._id}`)}
                                                        className="flex-1 bg-indigo-50 text-indigo-700 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-100 transition-colors flex items-center justify-center gap-1"
                                                    >
                                                        <FaEdit size={12} /> Modifica
                                                    </button>
                                                    <button
                                                        onClick={() => navigate(`/story/${story._id}`)}
                                                        className="bg-white border border-gray-200 text-gray-600 px-3 rounded-lg hover:bg-gray-50"
                                                    >
                                                        <FaEye />
                                                    </button>
                                                    <button
                                                        onClick={async () => {
                                                            if (window.confirm(`Eliminare definitivamente "${story.title}"?`)) {
                                                                try {
                                                                    axios.defaults.withCredentials = true;
                                                                    const { data } = await axios.delete(`${backendUrl}/api/story/delete/${story._id}`);
                                                                    if (data.success) {
                                                                        toast.success(data.message);
                                                                        fetchTherapistData();
                                                                    } else {
                                                                        toast.error(data.message);
                                                                    }
                                                                } catch (error) {
                                                                    toast.error("Errore eliminazione storia");
                                                                }
                                                            }
                                                        }}
                                                        className="bg-red-50 text-red-600 px-3 rounded-lg hover:bg-red-100"
                                                    >
                                                        <FaTrash size={12} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* COLONNA DESTRA: Famiglie Assegnate */}
                        <div>
                            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                                Le Tue Famiglie
                            </h2>
                            <div className="space-y-6">
                                {assignedFamilies.length === 0 ? (
                                    <div className="bg-white p-6 rounded-2xl shadow-sm text-center text-gray-400">
                                        Nessuna famiglia assegnata.
                                    </div>
                                ) : (
                                    assignedFamilies.map((family) => (
                                        <div key={family.parentId} className="bg-white rounded-2xl shadow-md overflow-hidden border border-gray-100">
                                            {/* Header Famiglia */}
                                            <div className="bg-gradient-to-r from-gray-50 to-white p-4 flex justify-between items-center border-b border-gray-100">
                                                <div>
                                                    <h3 className="font-bold text-gray-800 text-lg">{family.parentName}</h3>
                                                    <p className="text-xs text-gray-500">{family.parentEmail}</p>
                                                </div>
                                                <button
                                                    onClick={() => handleRemoveConnection(family.parentId, family.parentName)}
                                                    className="text-red-400 hover:text-red-600 bg-white p-2 rounded-full shadow-sm"
                                                    title="Rimuovi Famiglia"
                                                >
                                                    <FaTrash size={12} />
                                                </button>
                                            </div>

                                            {/* Lista Bambini */}
                                            <div className="p-4 bg-white grid gap-3">
                                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Bambini</p>
                                                {family.children.length === 0 && <p className="text-xs text-gray-400 italic">Nessun bambino profilato.</p>}

                                                {family.children.map((child, i) => (
                                                    <div key={i} className="flex items-center gap-3 p-2 bg-indigo-50/50 rounded-xl border border-indigo-50">
                                                        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-lg overflow-hidden border border-indigo-100 shadow-sm">
                                                            {child.avatar && child.avatar.startsWith('http') ? <img src={child.avatar} alt="" className="w-full h-full object-cover" /> : <FaChild className="text-indigo-400" />}
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-sm text-gray-800">{child.name}</p>
                                                            <p className="text-[10px] text-gray-500">PIN: {child.pin || '-'}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                ) : (
                    // === 8. VISTA GENITORE (PARENT DASHBOARD) ===
                    <div className="flex flex-col gap-10">

                        {/* --- SEZIONE A: I TUOI BAMBINI --- */}
                        <section>
                            <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                                👶 I Tuoi Bambini
                            </h2>
                            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">

                                {myChildren.map(child => ( //CARD: Crea un rettangolo cliccabile per ogni figlio trovato.
                                    <div
                                        key={child._id}
                                        className="bg-white p-4 rounded-xl shadow-sm flex items-center gap-4 relative group cursor-pointer hover:shadow-lg transition-all"
                                        onClick={() => handleChildSwitch(child)}
                                    > 
                                        <div className="w-14 h-14 rounded-full bg-orange-100 flex items-center justify-center text-2xl overflow-hidden">
                                            {child.avatar.startsWith('http') ? //se il bambino ha una foto mostra quella. Altrimenti mostra l'icona generica
                                                <img src={child.avatar} alt={child.name} className="w-full h-full object-cover" /> :
                                                <FaChild className="text-orange-400" />
                                            }
                                        </div>
                                        <div> {/* Info bambino e PIN */}
                                            <p className="font-bold text-gray-800">{child.name}</p>
                                            <p className="text-xs text-gray-500">PIN: {child.pin ? 'Reimposta' : 'Nessuno'}</p>
                                        </div>
                                        <button
                                            onClick={async (e) => {
                                                e.stopPropagation();
                                                if (window.confirm(`Eliminare profilo di ${child.name}?`)) {  //elimina profilo
                                                    try {
                                                        await axios.delete(backendUrl + `/api/user/delete-child/${child._id}`);
                                                        toast.success("Eliminato");
                                                        fetchParentData();
                                                    } catch (e) { toast.error("Errore eliminazione"); } 
                                                }
                                            }}
                                            className="absolute top-2 right-2 text-red-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                            title="Elimina bambino"
                                        >{/*cestino in alto a destra per eliminare il profilo del bambino.*/}
                                            <FaTrash size={12} />  
                                        </button>
                                    </div>
                                ))}
                                <button onClick={() => setIsAddChildModalOpen(true)} className="border-2 border-dashed border-gray-300 rounded-xl p-4 flex items-center justify-center text-gray-400 hover:text-indigo-500 hover:border-indigo-400 transition-colors">
                                    <FaUserPlus /> Aggiungi 
                                </button>  {/*pulsante tratteggiato per aggiungere nuovo bambino */}
                            </div>
                        </section>

                        {/* --- SEZIONE B: LE TUE STORIE (LATO GENITORE) --- */}
                        <section>
                            <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                                📖 Le Tue Storie
                            </h2> 
                            {stories.length === 0 ? ( //se non ci sono storie, mostra un testo. Altrimenti apre una griglia.
                                <p className="text-gray-500">Non hai ancora creato storie.</p>
                            ) : (
                                <div className="grid md:grid-cols-3 gap-6">
                                    {stories.map(story => (
                                        <div key={story._id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow relative">
                                          
                                            {/* etichetta colorata se (Approvata/In Attesa/Rifiutata) */}
                                            <div className="absolute top-4 right-4 text-xs font-bold px-2 py-1 rounded bg-gray-100">
                                                {story.status === 'APPROVED' && <span className="text-green-600 flex items-center gap-1"><FaCheck /> Pubblicata</span>}
                                                {story.status === 'PENDING' && <span className="text-yellow-600 flex items-center gap-1">⏳ In attesa</span>}
                                                {story.status === 'REJECTED' && <span className="text-red-600 flex items-center gap-1"><FaTimes /> Rifiutata</span>}
                                            </div>

                                            <h3 className="font-bold text-lg mb-1 truncate pr-20">{story.title}</h3>
                                            <p className="text-xs text-gray-500 mb-4 line-clamp-2">{story.description}</p>

                                            {/* Tasto Pubblico/Privato */}
                                            <div className="flex items-center gap-2 mb-3">
                                                <button
                                                    onClick={async () => {
                                                        try {
                                                            const { data } = await axios.put(
                                                                `${backendUrl}/api/story/toggle-visibility`,
                                                                { storyId: story._id, isPublic: !story.isPublic }
                                                            );

                                                            if (data.success) {
                                                                toast.success(story.isPublic ? 'Storia resa privata' : 'Storia resa pubblica');
                                                                fetchParentData();
                                                            } else {
                                                                toast.error(data.message);
                                                            }
                                                        } catch (error) {
                                                            toast.error("Errore cambio visibilità");
                                                        }
                                                    }}
                                                    className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold transition-all ${story.isPublic
                                                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                        }`}
                                                >
                                                    {story.isPublic ? '🌍 Pubblica' : '🔒 Privata'}
                                                </button>
                                            </div>

                                            {/* Motivo Rifiuto (se presente) */}
                                            {story.status === 'REJECTED' && story.rejectionReason && (
                                                <div className="bg-red-50 p-2 rounded text-xs text-red-700 mb-3 border border-red-100">
                                                    <strong>Motivo rifiuto:</strong> {story.rejectionReason}
                                                </div>
                                            )}

                                            {/* Bottoni Azione (Modifica, Vedi, Elimina) */}
                                            <div className="flex flex-col gap-2 mt-2">
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => navigate(`/edit-story/${story._id}`)}
                                                        className="flex-1 bg-indigo-50 text-indigo-700 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-100 transition-colors"
                                                    >
                                                        Modifica
                                                    </button>
                                                    <button
                                                        onClick={() => navigate(`/story/${story._id}`)}
                                                        className="bg-white border border-gray-200 text-gray-600 px-3 rounded-lg hover:bg-gray-50"
                                                    >
                                                        <FaEye />
                                                    </button>
                                                </div>

                                                {/* Pulsante Assegna ai Figli */}
                                                <button
                                                    onClick={() => {
                                                        setSelectedStoryForAssign(story);
                                                        setAssignChildrenModalOpen(true);
                                                    }}
                                                    className="w-full bg-purple-50 text-purple-700 py-2 rounded-lg text-sm font-semibold hover:bg-purple-100 transition-colors flex items-center justify-center gap-1"
                                                >
                                                    <FaChild /> Assegna ai Figli
                                                </button>

                                                {/* Pulsante Elimina */}
                                                <button
                                                    onClick={async () => {
                                                        if (window.confirm(`Eliminare definitivamente "${story.title}"?`)) {
                                                            try {
                                                                const { data } = await axios.delete(`${backendUrl}/api/story/delete/${story._id}`);
                                                                if (data.success) {
                                                                    toast.success(data.message);
                                                                    fetchParentData();
                                                                } else {
                                                                    toast.error(data.message);
                                                                }
                                                            } catch (error) {
                                                                toast.error("Errore eliminazione storia");
                                                            }
                                                        }
                                                    }}
                                                    className="w-full bg-red-50 text-red-600 py-2 rounded-lg text-sm font-semibold hover:bg-red-100 transition-colors flex items-center justify-center gap-1"
                                                >
                                                    <FaTrash /> Elimina Storia
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>

                        {/* --- SEZIONE C: I TUOI TERAPISTI --- */}
                        <section>
                            <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                                👨‍⚕️ I Tuoi Terapisti
                            </h2>
                            <div className="grid md:grid-cols-3 gap-4">
                                {myTherapists.map((t, i) => (
                                    <div key={i} className="bg-white p-4 rounded-xl border border-blue-100 flex items-center justify-between gap-4 group hover:shadow-md transition-all">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-xl">
                                                <FaUserMd />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <p className="font-bold text-gray-800">{t.name}</p>
                                                    {t.status === 'pending' ? (
                                                        <span className="text-[10px] bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-bold">In Attesa</span>
                                                    ) : (
                                                        <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">Attivo</span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-gray-500">{t.email}</p>
                                                <p className="text-xs text-blue-500 font-medium">{t.specialization}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleRemoveConnection(t.id, t.name)}
                                            className="text-red-300 hover:text-red-500 p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                            title="Rimuovi Terapeuta"
                                        >
                                            <FaTimes />
                                        </button>
                                    </div>
                                ))}
                                <button onClick={handleSearchTherapists} className="border-2 border-dashed border-blue-200 rounded-xl p-4 flex items-center justify-center text-blue-400 hover:text-blue-600 hover:border-blue-400 transition-colors bg-blue-50/50">
                                    <FaSearch /> Cerca Terapista
                                </button>
                            </div>
                        </section>
                    </div>
                )}

            </div>

            {/* --- 9. MODALI (MODALS) --- */}

            {/* Modale Modifica Profilo */}
            {isEditModalOpen && <EditProfileModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} currentUser={userData} onUpdateSuccess={() => { getUserData(); setIsEditModalOpen(false); }} />}

            {/* Modale Elimina Profilo */}
            {isDeleteModalOpen && <DeleteProfileModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} backendUrl={backendUrl} onDeleteSuccess={() => { navigate('/'); window.location.reload(); }} />}

            {/* Modale Aggiungi Bambino */}
            {isAddChildModalOpen && <AddChildModal
                isOpen={isAddChildModalOpen}
                onClose={() => setIsAddChildModalOpen(false)}
                backendUrl={backendUrl}
                onChildAdded={() => { fetchParentData(); }}
            />}

            {/* Modale Cerca Terapista */}
            {searchTherapistModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-gray-800">Trova un Terapista</h2>
                            <button onClick={() => setSearchTherapistModalOpen(false)} className="text-gray-400 hover:text-gray-600"><FaTimes size={24} /></button>
                        </div>

                        <div className="space-y-4">
                            {therapistsList.map(t => (
                                <div key={t.id} className="flex flex-col md:flex-row justify-between items-center bg-gray-50 p-4 rounded-xl border border-gray-200 gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-white rounded-full border flex items-center justify-center text-2xl">👨‍⚕️</div>
                                        <div>
                                            <h3 className="font-bold text-lg">{t.name}</h3>
                                            <p className="text-sm text-gray-600">{t.specialization} • Max {t.maxChildren} bimbi</p>
                                            <p className="text-xs text-gray-400">{t.email}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => addTherapist(t.email)}
                                        className="bg-blue-600 text-white px-6 py-2 rounded-full font-bold hover:bg-blue-700 shadow-md transition-all whitespace-nowrap"
                                    >
                                        Invia Richiesta
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Modale Assegna Storia ai Figli -- disegna il popup solo se hai cliccato "Assegna"*/}
            {assignChildrenModalOpen && selectedStoryForAssign && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-gray-800">
                                👶 Assegna Storia ai Tuoi Figli
                            </h2>
                            <button
                                onClick={() => {
                                    setAssignChildrenModalOpen(false);
                                    setSelectedStoryForAssign(null);
                                }}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <FaTimes size={24} />
                            </button>
                        </div>
                        {/*Mostra il titolo della storia scelta in un box viola. */}
                        <div className="mb-6 p-4 bg-purple-50 rounded-xl">
                            <h3 className="font-bold text-purple-800 mb-1">{selectedStoryForAssign.title}</h3>
                            <p className="text-xs text-purple-600">{selectedStoryForAssign.description}</p>
                        </div>

                        <p className="text-sm text-gray-600 mb-4">
                            Seleziona i bambini che potranno leggere questa storia:
                        </p>

                        {myChildren.length === 0 ? (
                            <div className="text-center py-8 text-gray-400">
                                <p>Non hai ancora aggiunto bambini.</p>
                                <button
                                    onClick={() => {
                                        setAssignChildrenModalOpen(false);
                                        setIsAddChildModalOpen(true);
                                    }}
                                    className="mt-4 text-indigo-600 hover:underline"
                                >
                                    Aggiungi il primo bambino
                                </button>
                            </div>
                        ) : ( //Se hai figli, chiama il componente AssignChildrenForm  per farti scegliere a chi darla.
                            <AssignChildrenForm
                                children={myChildren}
                                storyId={selectedStoryForAssign._id}
                                backendUrl={backendUrl}
                                onSuccess={() => {
                                    setAssignChildrenModalOpen(false);
                                    setSelectedStoryForAssign(null);
                                    fetchParentData();
                                }}
                            />
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Profile;