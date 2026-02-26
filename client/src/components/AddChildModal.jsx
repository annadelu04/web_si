import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FaChild, FaRocket, FaCat, FaDog, FaHeart, FaStar, FaCar, FaTree } from 'react-icons/fa';

const AddChildModal = ({ isOpen, onClose, backendUrl, onChildAdded }) => {
    const [name, setName] = useState('');
    const [selectedAvatar, setSelectedAvatar] = useState('FaChild');
    const [pin, setPin] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const avatars = [
        { name: 'FaChild', icon: FaChild, label: 'Bambino', color: 'bg-blue-100 hover:bg-blue-200' },
        { name: 'FaRocket', icon: FaRocket, label: 'Razzo', color: 'bg-purple-100 hover:bg-purple-200' },
        { name: 'FaCat', icon: FaCat, label: 'Gatto', color: 'bg-orange-100 hover:bg-orange-200' },
        { name: 'FaDog', icon: FaDog, label: 'Cane', color: 'bg-amber-100 hover:bg-amber-200' },
        { name: 'FaHeart', icon: FaHeart, label: 'Cuore', color: 'bg-pink-100 hover:bg-pink-200' },
        { name: 'FaStar', icon: FaStar, label: 'Stella', color: 'bg-yellow-100 hover:bg-yellow-200' },
        { name: 'FaCar', icon: FaCar, label: 'Auto', color: 'bg-red-100 hover:bg-red-200' },
        { name: 'FaTree', icon: FaTree, label: 'Albero', color: 'bg-green-100 hover:bg-green-200' }
    ];

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        if (!name.trim()) {
            toast.error("Il nome del bambino è obbligatorio.");
            setIsSubmitting(false);
            return;
        }

        if (pin && pin.length !== 4) {
            toast.error("Il PIN deve essere di 4 cifre.");
            setIsSubmitting(false);
            return;
        }

        try {
            axios.defaults.withCredentials = true;
            axios.defaults.withCredentials = true;

            const formData = new FormData();
            formData.append('name', name);
            formData.append('avatarIcon', selectedAvatar); // Changed to avoid conflict with upload.single('avatar')
            if (pin) formData.append('pin', pin);

            // Nota: Se in futuro supporti upload file REALE per avatar, qui faresti formData.append('avatar', file)
            // Backend si aspetta campi nel body o multipart. FormData funziona per multipart.

            const { data } = await axios.post(backendUrl + '/api/user/add-child', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (data.success) {
                toast.success(data.message);
                onChildAdded(data.child);
                onClose();
                setName('');
                setSelectedAvatar('FaChild');
                setPin('');
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            toast.error("Errore durante la creazione del profilo.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center border-b pb-4 mb-6">
                    <h2 className="text-3xl font-bold text-gray-800">👶 Aggiungi Profilo Bambino</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-3xl font-bold leading-none">
                        &times;
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Nome */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Nome del Bambino</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Es: Marco"
                            className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-green-400 focus:ring-2 focus:ring-green-200 outline-none transition-all text-lg"
                        />
                    </div>

                    {/* Selezione Avatar */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-3">Scegli un Avatar</label>
                        <div className="grid grid-cols-4 gap-4">
                            {avatars.map((avatar) => {
                                const IconComponent = avatar.icon;
                                return (
                                    <button
                                        key={avatar.name}
                                        type="button"
                                        onClick={() => setSelectedAvatar(avatar.name)}
                                        className={`
                                            p-6 rounded-2xl transition-all duration-300 transform
                                            ${avatar.color}
                                            ${selectedAvatar === avatar.name
                                                ? 'ring-4 ring-green-500 scale-105 shadow-lg'
                                                : 'hover:scale-105 shadow-md'
                                            }
                                        `}
                                    >
                                        <IconComponent className="w-12 h-12 mx-auto text-gray-700" />
                                        <p className="text-xs font-medium text-gray-600 mt-2 text-center">{avatar.label}</p>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* PIN Opzionale */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                            PIN Opzionale (4 cifre)
                        </label>
                        <input
                            type="text"
                            value={pin}
                            onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                            placeholder="0000"
                            maxLength={4}
                            className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-green-400 focus:ring-2 focus:ring-green-200 outline-none transition-all text-lg text-center tracking-widest"
                        />
                        <p className="text-xs text-gray-500 mt-1">Lascia vuoto se non vuoi un PIN</p>
                    </div>

                    {/* Pulsante Salva */}
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full bg-gradient-to-r from-green-400 to-green-600 text-white py-4 px-6 rounded-full font-bold text-lg hover:shadow-xl hover:scale-105 transition-all disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? 'Creazione in corso...' : '✓ Crea Profilo'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AddChildModal;
