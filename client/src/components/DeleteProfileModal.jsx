import React, { useState } from 'react'; //gestisce gli step del processo
import axios from 'axios';
import { toast } from 'react-toastify';
 //onClose: Funzione per chiudere la modale, onDeleteSuccess: Funzione da chiamare se tutto va bene
const DeleteProfileModal = ({ isOpen, onClose, backendUrl, onDeleteSuccess }) => {
    const [step, setStep] = useState(1); // 1 = richiesta OTP, 2 = inserimento OTP
    const [otp, setOtp] = useState(''); //Dove salviamo i numeri che l'utente scrive
    const [isSubmitting, setIsSubmitting] = useState(false);
    //Se la modale deve essere chiusa, non restituisce nulla, quindi sparisce dallo schermo.
    if (!isOpen) return null;

    //parte quando l'utente clicca "Invia Codice OTP".
    //chiama l'endpoint del backend che genera un codice casuale e lo manda via email all'utente loggato.
    const handleRequestOtp = async () => {
        setIsSubmitting(true); // Blocca il bottone
        try {
            axios.defaults.withCredentials = true;  // Cookie on
            const { data } = await axios.post(backendUrl + '/api/user/request-delete-otp');
            //Se l'email è partita, avanziamo allo Step 2.
            if (data.success) {
                toast.success(data.message);
                setStep(2);
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            toast.error("Errore durante la richiesta OTP.");
        } finally {
            setIsSubmitting(false);
        }
    };
    //parte quando l'utente inserisce il codice e conferma
    const handleVerifyAndDelete = async (e) => {
        e.preventDefault(); // Niente refresh pagina
        setIsSubmitting(true);
        //Controlla che il codice abbia senso prima di chiamare il server.
        if (!otp || otp.length !== 6) {  
            toast.error("Inserisci un codice OTP valido (6 cifre).");
            setIsSubmitting(false);
            return;
        }
        //Invia il codice (otp) al server. Il server controlla se corrisponde a quello inviato via email.
        try {
            axios.defaults.withCredentials = true;
            const { data } = await axios.post(backendUrl + '/api/user/verify-delete', { otp });

            //Se il codice è giusto, l'account è stato cancellato lato server. 
            if (data.success) {
                toast.success(data.message);
                onDeleteSuccess(); // Chiama la funzione del genitore (Logout + Redirect)
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            toast.error("Errore durante la verifica OTP.");
        } finally {
            setIsSubmitting(false);
        }
    };


    //Titolo rosso per indicare pericolo e tasto X per chiudere.
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md mx-4">
                <div className="flex justify-between items-center border-b pb-3 mb-4">
                    <h2 className="text-2xl font-bold text-red-600">⚠️ Elimina Profilo</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-xl font-bold">
                        &times;
                    </button>
                </div>
               
                {/* Contenuto Dinamico (Step 1 vs Step 2)
                Se siamo all'inizio, mostra l'avviso spaventoso e il tasto per inviare l'email.
                Se siamo dopo l'invio, mostra il campo di input per il codice.*/}
    
                {step === 1 ? ( 
                    // --- VISTA STEP 1: AVVISO ---
                    <div>
                        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
                            <p className="text-red-700 font-semibold">Attenzione!</p>
                            <p className="text-red-600 text-sm mt-1">
                                Questa azione è irreversibile. Tutti i tuoi dati saranno eliminati definitivamente.
                            </p>
                        </div>
                        <p className="text-gray-700 mb-4">
                            Per procedere, ti invieremo un codice di verifica via email.
                        </p>
                        <button
                            onClick={handleRequestOtp}
                            disabled={isSubmitting}
                            className="w-full bg-red-600 text-white py-2 px-4 rounded-full font-medium hover:bg-red-700 transition-colors shadow-md disabled:bg-gray-400"
                        >
                            {isSubmitting ? 'Invio in corso...' : 'Invia Codice OTP'}
                        </button>
                    </div>
                ) : (
                    // --- VISTA STEP 2: FORM CODICE ---
                    <form onSubmit={handleVerifyAndDelete}>
                        <p className="text-gray-700 mb-4">
                            Inserisci il codice a 6 cifre che ti abbiamo inviato via email:
                        </p>
                        <input
                            type="text"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} //rimuove tutto ciò che non è un numero
                            placeholder="000000"
                            maxLength={6}
                            className="w-full p-3 border-2 border-gray-300 rounded-lg text-center text-2xl font-bold tracking-widest mb-4 focus:ring-red-500 focus:border-red-500"
                        />
                        <p className="text-sm text-gray-500 mb-4">
                            Il codice scade tra 15 minuti.
                        </p>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full bg-red-600 text-white py-2 px-4 rounded-full font-medium hover:bg-red-700 transition-colors shadow-md disabled:bg-gray-400"
                        >
                            {isSubmitting ? 'Verifica in corso...' : 'Conferma Eliminazione'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};

export default DeleteProfileModal;
