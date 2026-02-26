// client/src/components/EditProfileModal.jsx
import React, { useState, useContext } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { appContext } from '../context/appContext';
import { assets } from '../assets/assets'; // <--- 1. IMPORTIAMO ASSETS

const EditProfileModal = ({ isOpen, onClose, currentUser, onUpdateSuccess }) => {
    const { backendUrl } = useContext(appContext);

    const [name, setName] = useState(currentUser.name);
    const [email, setEmail] = useState(currentUser.email);
    const [surname, setSurname] = useState(currentUser.surname || '');
    const [password, setPassword] = useState('');
    const [specialization, setSpecialization] = useState(currentUser.therapistInfo?.specialization || '');
    const [maxChildren, setMaxChildren] = useState(currentUser.therapistInfo?.maxChildren || 10);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    if (!isOpen) return null;

    const isTherapist = currentUser.tipo_utente === 'terapeuta';

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        if (!name.trim() || !email.trim()) {
            toast.error("Nome e Email sono obbligatori.");
            setIsSubmitting(false);
            return;
        }

        const dataToSend = {
            userId: currentUser._id,
            name,
            email,
            surname,
            specialization,
            maxChildren
        };

        if (password) {
            dataToSend.password = password;
        }

        try {
            axios.defaults.withCredentials = true;
            const { data } = await axios.put(backendUrl + "/api/user/update", dataToSend);

            if (data.success) {
                toast.success("Profilo aggiornato con successo!");
                onUpdateSuccess();
                onClose();
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md mx-4">
                <div className="flex justify-between items-center border-b pb-3 mb-4">
                    <h2 className="text-2xl font-bold text-gray-800">Modifica Profilo</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-xl font-bold">
                        &times;
                    </button>
                </div>

                <form onSubmit={handleSubmit}>

                    {/* Nome */}
                    <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-medium mb-1">Nome</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                        />
                    </div>

                    {/* Cognome */}
                    <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-medium mb-1">Cognome</label>
                        <input
                            type="text"
                            value={surname}
                            onChange={(e) => setSurname(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                        />
                    </div>

                    {/* Email */}
                    <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-medium mb-1">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                        />
                    </div>

                    {isTherapist && (
                        <>
                            <div className="mb-4">
                                <label className="block text-gray-700 text-sm font-medium mb-1">Specializzazione</label>
                                <input
                                    type="text"
                                    value={specialization}
                                    onChange={(e) => setSpecialization(e.target.value)}
                                    placeholder="Logopedista, Psicomotricista..."
                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                                />
                            </div>
                            <div className="mb-4">
                                <label className="block text-gray-700 text-sm font-medium mb-1">Numero Massimo Bambini</label>
                                <input
                                    type="number"
                                    value={maxChildren}
                                    onChange={(e) => setMaxChildren(parseInt(e.target.value))}
                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                                />
                            </div>
                        </>
                    )}

                    {/* Password */}
                    <div className="mb-4 relative">
                        <label className="block text-gray-700 text-sm font-medium mb-1">Nuova Password (lascia vuoto per non modificare)</label>
                        <input
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Minimo 6 caratteri"
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-9 text-gray-500 hover:text-gray-700"
                        >
                            {showPassword ? (
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                                </svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            )}
                        </button>
                    </div>

                    {/* PULSANTE MODIFICA */}
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full bg-indigo-500 text-white py-2 px-4 rounded-full font-medium hover:bg-indigo-600 transition-colors shadow-md disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? "Aggiornamento in corso..." : "Aggiorna Profilo"}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default EditProfileModal;