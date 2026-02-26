import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

const DeleteProfileModal = ({ isOpen, onClose, backendUrl, onDeleteSuccess }) => {
    const [step, setStep] = useState(1); // 1 = richiesta OTP, 2 = inserimento OTP
    const [otp, setOtp] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleRequestOtp = async () => {
        setIsSubmitting(true);
        try {
            axios.defaults.withCredentials = true;
            const { data } = await axios.post(backendUrl + '/api/user/request-delete-otp');

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

    const handleVerifyAndDelete = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        if (!otp || otp.length !== 6) {
            toast.error("Inserisci un codice OTP valido (6 cifre).");
            setIsSubmitting(false);
            return;
        }

        try {
            axios.defaults.withCredentials = true;
            const { data } = await axios.post(backendUrl + '/api/user/verify-delete', { otp });

            if (data.success) {
                toast.success(data.message);
                onDeleteSuccess();
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            toast.error("Errore durante la verifica OTP.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md mx-4">
                <div className="flex justify-between items-center border-b pb-3 mb-4">
                    <h2 className="text-2xl font-bold text-red-600">⚠️ Elimina Profilo</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-xl font-bold">
                        &times;
                    </button>
                </div>

                {step === 1 ? (
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
                    <form onSubmit={handleVerifyAndDelete}>
                        <p className="text-gray-700 mb-4">
                            Inserisci il codice a 6 cifre che ti abbiamo inviato via email:
                        </p>
                        <input
                            type="text"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
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
