import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FaChild, FaCheck } from 'react-icons/fa';

const AssignChildrenForm = ({ children, storyId, backendUrl, onSuccess }) => {
    const [selectedChildren, setSelectedChildren] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const toggleChild = (childId) => {
        if (selectedChildren.includes(childId)) {
            setSelectedChildren(selectedChildren.filter(id => id !== childId));
        } else {
            setSelectedChildren([...selectedChildren, childId]);
        }
    };

    const handleSubmit = async () => {
        if (selectedChildren.length === 0) {
            toast.warning("Seleziona almeno un bambino");
            return;
        }

        setIsSubmitting(true);

        try {
            axios.defaults.withCredentials = true;

            console.log("Dati inviati:", { storyId, childrenIds: selectedChildren }); // DEBUG
            console.log("URL:", `${backendUrl}/api/story/assign-to-children`); // DEBUG

            const { data } = await axios.post(
                `${backendUrl}/api/story/assign-to-children`,
                {
                    storyId,
                    childrenIds: selectedChildren
                }
            );

            console.log("Risposta ricevuta:", data); // DEBUG

            if (data.success) {
                toast.success(data.message);
                onSuccess();
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            console.error("Errore completo:", error); // DEBUG
            console.error("Errore response:", error.response); // DEBUG
            toast.error(error.response?.data?.message || "Errore assegnazione storia");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-4">
            {/* Lista Bambini Selezionabili */}
            <div className="max-h-64 overflow-y-auto space-y-2">
                {children.map(child => {
                    const isSelected = selectedChildren.includes(child._id);

                    return (
                        <button
                            key={child._id}
                            onClick={() => toggleChild(child._id)}
                            className={`w-full p-4 rounded-xl border-2 transition-all flex items-center justify-between ${isSelected
                                    ? 'border-purple-500 bg-purple-50'
                                    : 'border-gray-200 bg-white hover:border-purple-300'
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center text-xl overflow-hidden">
                                    {child.avatar && child.avatar.startsWith('http') ? (
                                        <img src={child.avatar} alt={child.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <FaChild className="text-orange-400" />
                                    )}
                                </div>
                                <div className="text-left">
                                    <p className="font-bold text-gray-800">{child.name}</p>
                                    <p className="text-xs text-gray-500">PIN: {child.pin || 'Nessuno'}</p>
                                </div>
                            </div>

                            {isSelected && (
                                <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white">
                                    <FaCheck />
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Pulsante Conferma */}
            <button
                onClick={handleSubmit}
                disabled={isSubmitting || selectedChildren.length === 0}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-600 text-white py-4 rounded-xl font-bold text-lg hover:shadow-xl transition-all disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
                {isSubmitting ? (
                    '⏳ Assegnazione in corso...'
                ) : (
                    <>
                        <FaCheck /> Conferma Assegnazione ({selectedChildren.length})
                    </>
                )}
            </button>
        </div>
    );
};

export default AssignChildrenForm;