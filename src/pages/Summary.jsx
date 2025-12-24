import React, { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, BookOpen, Share2, Bookmark, ArrowRight } from 'lucide-react';
import useActiveTimer from '../hooks/useActiveTimer'; // Assuming this path for the custom hook

const Summary = () => {
    useActiveTimer('summary');

    const location = useLocation();
    const content = location.state?.content || "Photosynthesis is the process by which green plants and some other organisms use sunlight to synthesize foods from carbon dioxide and water. Photosynthesis in plants generally involves the green pigment chlorophyll and generates oxygen as a byproduct.";

    return (
        <div className="min-h-full bg-background flex flex-col">
            {/* Header */}
            <header className="sticky top-0 bg-background/80 backdrop-blur-md z-20 px-6 py-4 flex justify-between items-center border-b border-white/5">
                <Link to="/" className="p-2 -ml-2 text-text-muted hover:text-text-main transition-colors">
                    <ArrowLeft size={24} />
                </Link>
                <div className="flex gap-2">
                    <button className="p-2 text-text-muted hover:text-primary transition-colors">
                        <Bookmark size={20} />
                    </button>
                    <button className="p-2 text-text-muted hover:text-primary transition-colors">
                        <Share2 size={20} />
                    </button>
                </div>
            </header>

            {/* Content */}
            <main className="flex-1 p-6 pb-24">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-4">
                        <BookOpen size={14} />
                        Résumé Simplifié
                    </div>

                    <h1 className="text-2xl font-bold text-text-main mb-6 leading-tight">
                        Comprendre la Photosynthèse
                    </h1>

                    <div className="space-y-6 text-text-main/90 leading-relaxed font-light text-lg">
                        <p>
                            Imagine la <span className="text-primary font-medium">photosynthèse</span> comme une cuisine à l'intérieur d'une plante. 🌿
                        </p>
                        <p>
                            La plante prend trois ingrédients principaux :
                        </p>
                        <ul className="list-disc pl-5 space-y-2 marker:text-primary">
                            <li>☀️ Lumière du soleil (Énergie)</li>
                            <li>💧 Eau (des racines)</li>
                            <li>💨 Dioxyde de Carbone (de l'air)</li>
                        </ul>
                        <p>
                            Elle les mélange pour fabriquer sa propre nourriture (sucre) et libère de l'<span className="text-success font-medium">Oxygène</span> pour que nous puissions respirer !
                        </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-12 grid grid-cols-2 gap-4">
                        <Link to="/flashcards" className="flex flex-col items-center justify-center p-4 rounded-2xl bg-surface border border-white/5 hover:bg-surface/80 transition-colors">
                            <span className="text-2xl mb-2">⚡️</span>
                            <span className="text-sm font-medium text-text-main">Flashcards</span>
                        </Link>
                        <Link to="/quiz" className="flex flex-col items-center justify-center p-4 rounded-2xl bg-surface border border-white/5 hover:bg-surface/80 transition-colors">
                            <span className="text-2xl mb-2">🧠</span>
                            <span className="text-sm font-medium text-text-main">Lancer le Quiz</span>
                        </Link>
                    </div>
                </motion.div>
            </main>
        </div>
    );
};

export default Summary;
