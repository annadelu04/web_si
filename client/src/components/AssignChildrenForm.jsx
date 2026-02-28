import React, { useState } from 'react'; // React: libreria UI. useState: Hook per stato locale (memoria del componente).
import axios from 'axios';               // Axios: client HTTP per richieste API (es. POST al backend).
import { toast } from 'react-toastify';  // Toast: libreria per notifiche visive (es. popup "Successo").
import { FaChild, FaCheck } from 'react-icons/fa'; // React Icons: componenti grafici vettoriali (SVG).

// COMPONENTE: AssignChildrenForm - Modulo per assegnare storie ai bambini.
// PROPS: children (array), storyId (stringa ID), backendUrl (stringa URL), onSuccess (funzione callback).
const AssignChildrenForm = ({ children, storyId, backendUrl, onSuccess }) => {

    // STATO React: Array degli ID dei bambini selezionati. `setSelectedChildren` aggiorna l'UI.
    const [selectedChildren, setSelectedChildren] = useState([]);

    // STATO React: Booleano per bloccare il pulsante durante la chiamata API (previene doppi click).
    const [isSubmitting, setIsSubmitting] = useState(false);

    // FUNZIONE: Aggiunge o rimuove un bambino dalla selezione.
    const toggleChild = (childId) => {
        // extends array: includes(id) ritorna vero se l'ID è presente.
        if (selectedChildren.includes(childId)) {
            // IMMUTABILITÀ: filter() crea un NUOVO array senza l'ID rimosso. Mai fare .push o .splice!
            setSelectedChildren(selectedChildren.filter(id => id !== childId));
        } else {
            // SPREAD OPERATOR (...): copia il vecchio array e ci aggiunge il nuovo ID.
            setSelectedChildren([...selectedChildren, childId]);
        }
    };

    // FUNZIONE: Gestisce l'invio del form al server. Funzione ASINCRONA (async).
    const handleSubmit = async () => {
        // VALIDAZIONE CLIENT: Evita chiamate HTTP inutili se non ci sono selezioni.
        if (selectedChildren.length === 0) {
            toast.warning("Seleziona almeno un bambino"); // Mostra avviso giallo.
            return; // Termina la funzione.
        }

        setIsSubmitting(true); // Blocca temporaneamente l'UI (spinner/testo attesa).

        try {
            // AXIOS CONFIG: withCredentials=true invia i Cookie (il JWT) con la richiesta per l'autenticazione.
            axios.defaults.withCredentials = true;

            // CHIAMATA API: POST invia dati (body JSON) all'endpoint backend. `await` aspetta la risposta.
            const { data } = await axios.post(
                `${backendUrl}/api/story/assign-to-children`,
                { storyId, childrenIds: selectedChildren } // Dati inviati come JSON
            );

            // LOGICA DI CONTROLLO: Il backend risponde con `{ success: true/false }`
            if (data.success) {
                toast.success(data.message); // Notifica di successo.
                onSuccess();                 // Lancia la callback definita nel genitore (es. chiudi modale).
            } else {
                toast.error(data.message);   // Notifica di errore gestito dal server.
            }
        } catch (error) {
            // OPTIONAL CHAINING (?.): Accede a `.data.message` solo se esistono, prevenendo crash.
            toast.error(error.response?.data?.message || "Errore assegnazione storia");
        } finally {
            // FINALLY: Si esegue SIA in caso di successo che di errore. Sblocca l'UI.
            setIsSubmitting(false);
        }
    };

    // JSX: "HTML" dentro JavaScript. Ritorna ciò che verrà visualizzato.
    return (
        // className usa Tailwind CSS. `space-y-4` = div in colonna distanziate.
        <div className="space-y-4">

            {/* Contenitore con `max-h-64` (altezza massima) e `overflow-y-auto` (scrollbar interna) */}
            <div className="max-h-64 overflow-y-auto space-y-2">

                {/* MAP: Itera l'array `children`. Genera dinamicamente bottoni per l'UI. */}
                {children.map(child => {
                    // Controlla se l'ID iterato è tra quelli selezionati.
                    const isSelected = selectedChildren.includes(child._id);

                    return (
                        // BUTTON per l'accessibilità (focus tastiera). `key` è essenziale per ottimizzazione React.
                        <button
                            key={child._id}
                            onClick={() => toggleChild(child._id)} // Event Listeners: Arrow function per passare argomenti.
                            // TEMPLATE LITERALS (`...`): Per stringhe dinamiche. Bordo verde se selezionato.
                            className={`w-full p-4 rounded-xl border-2 transition-all flex items-center justify-between ${isSelected ? 'border-purple-500 bg-purple-50' : 'border-gray-200 bg-white hover:border-purple-300'
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center text-xl overflow-hidden">
                                    {/* RENDERING CONDIZIONALE: Operatore Ternario ( ? : )
                                        Se c'è un'immagine URL, renderizza <img>. Altrimenti renderizza icona fittizia <FaChild>. */}
                                    {child.avatar && child.avatar.startsWith('http') ? (
                                        <img src={child.avatar} alt={child.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <FaChild className="text-orange-400" />
                                    )}
                                </div>

                                <div className="text-left">
                                    <p className="font-bold text-gray-800">{child.name}</p>
                                    <p className="text-xs text-gray-500">PIN: {child.pin || 'Nessuno'}</p> {/* Operatore testuale ( || ) per fallback  */}
                                </div>
                            </div>

                            {/* RENDERING CONDIZIONALE: Operatore && (And logic).
                                Visualizza la spunta SOLO SE `isSelected` è true */}
                            {isSelected && (
                                <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white">
                                    <FaCheck />
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* BOTTONE INVIA FORM */}
            <button
                onClick={handleSubmit}
                // PROPERTY "disabled": disabilita pulsante per evitare crash di doppie email o doppi salvataggi DB
                disabled={isSubmitting || selectedChildren.length === 0}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-600 text-white py-4 rounded-xl font-bold text-lg disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
                {/* RENDERING TERNARIO: testo "in caricamento" oppure "procedi" */}
                {isSubmitting ? (
                    '⏳ Assegnazione in corso...'
                ) : (
                    // React Fragments (<>...</>): Wrappa due elementi senza aggiungere nodi DOM (div).
                    <>
                        <FaCheck /> Conferma Assegnazione ({selectedChildren.length})
                    </>
                )}
            </button>
        </div>
    );
};

export default AssignChildrenForm; // Esporta il componente come default dal file.
