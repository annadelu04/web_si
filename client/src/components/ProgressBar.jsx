import React from 'react';

/**
 * Componente ProgressBar
 * Mostra una barra di avanzamento stilizzata con animazione "shimmer" (luccichio).
 * 
 * Props:
 * @param {number} progress - La percentuale di completamento (0-100).
 * @param {string} label - Etichetta principale (es. "Caricamento").
 * @param {string} subLabel - Etichetta secondaria piccola (es. "Attendere prego").
 * @param {string} color - Classe Tailwind per il colore della barra (default: bg-indigo-600).
 * @param {string} height - Classe Tailwind per l'altezza (default: h-4).
 * @param {string} rounded - Classe Tailwind per il raggio del bordo (default: rounded-full).
 * @param {boolean} animate - Se true, mostra l'animazione di pulsazione/shimmer.
 */
const ProgressBar = ({
    progress,
    label,
    subLabel,
    color = 'bg-indigo-600',
    height = 'h-4',
    rounded = 'rounded-full',
    animate = true
}) => {
    // Assicura che progress sia tra 0 e 100 per evitare errori visuali
    const clampedProgress = Math.min(Math.max(progress, 0), 100);

    return (
        <div className="w-full">
            {/* Header: Label e Percentuale */}
            <div className="flex justify-between items-end mb-2 px-1">
                <div>
                    {label && <p className="text-sm font-bold text-gray-700">{label}</p>}
                    {subLabel && <p className="text-[10px] text-gray-500 uppercase tracking-wider">{subLabel}</p>}
                </div>
                <span className="text-sm font-black text-indigo-600">{Math.round(clampedProgress)}%</span>
            </div>

            {/* Container Barra */}
            <div className={`w-full bg-gray-200 ${rounded} overflow-hidden shadow-inner ${height}`}>
                {/* Barra di Riempimento Animata */}
                <div
                    className={`h-full ${color} ${rounded} transition-all duration-500 ease-out relative`}
                    style={{ width: `${clampedProgress}%` }}
                >
                    {/* Effetti Animazione (Pulse + Shimmer) */}
                    {animate && (
                        <div className="absolute inset-0 w-full h-full">
                            <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                            <div
                                className="absolute inset-0 w-full h-full opacity-30 bg-gradient-to-r from-transparent via-white to-transparent"
                                style={{
                                    backgroundSize: '200% 100%',
                                    animation: 'shimmer 2s infinite linear'
                                }}
                            ></div>
                        </div>
                    )}
                </div>
            </div>

            {/* Stili locali per keyframes */}
            <style jsx>{`
                @keyframes shimmer {
                    0% { background-position: -200% 0; }
                    100% { background-position: 200% 0; }
                }
            `}</style>
        </div>
    );
};

export default ProgressBar;
