import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, X, Trash2, Check, Loader2, AlertCircle, Image, RotateCcw } from 'lucide-react';
import { createWorker } from 'tesseract.js';

const PhotoCapture = ({ onComplete, onClose }) => {
    const [photos, setPhotos] = useState([]);
    const [isCapturing, setIsCapturing] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState(null);
    const [cameraError, setCameraError] = useState(null);
    const [ocrProgress, setOcrProgress] = useState(0);

    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);

    // Initialiser la caméra
    const startCamera = useCallback(async () => {
        setCameraError(null);

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'environment', // Caméra arrière sur mobile
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                }
            });

            streamRef.current = stream;

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                setIsCapturing(true);
            }
        } catch (err) {
            console.error('Erreur accès caméra:', err);

            if (err.name === 'NotAllowedError') {
                setCameraError('Accès à la caméra refusé. Veuillez autoriser l\'accès dans les paramètres.');
            } else if (err.name === 'NotFoundError') {
                setCameraError('Aucune caméra détectée.');
            } else {
                setCameraError('Impossible d\'accéder à la caméra.');
            }
        }
    }, []);

    // Arrêter la caméra
    const stopCamera = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        setIsCapturing(false);
    }, []);

    // Initialiser au montage
    useEffect(() => {
        startCamera();

        return () => {
            stopCamera();
        };
    }, [startCamera, stopCamera]);

    // Capturer une photo
    const capturePhoto = () => {
        if (!videoRef.current || !canvasRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');

        // Définir la taille du canvas
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Dessiner la frame vidéo sur le canvas
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Convertir en data URL
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

        // Ajouter à la liste des photos
        const newPhoto = {
            id: Date.now(),
            dataUrl,
            text: '',
            isProcessing: false,
            error: null
        };

        setPhotos(prev => [...prev, newPhoto]);
    };

    // Supprimer une photo
    const removePhoto = (id) => {
        setPhotos(prev => prev.filter(p => p.id !== id));
    };

    // Traiter toutes les photos avec OCR
    const processPhotos = async () => {
        if (photos.length === 0) return;

        setIsProcessing(true);
        setError(null);
        setOcrProgress(0);

        try {
            // Créer un worker Tesseract
            const worker = await createWorker('fra', 1, {
                logger: (m) => {
                    if (m.status === 'recognizing text') {
                        setOcrProgress(Math.round(m.progress * 100));
                    }
                }
            });

            const extractedTexts = [];

            // Traiter chaque photo
            for (let i = 0; i < photos.length; i++) {
                const photo = photos[i];

                // Mettre à jour le statut de cette photo
                setPhotos(prev => prev.map(p =>
                    p.id === photo.id ? { ...p, isProcessing: true } : p
                ));

                try {
                    const { data: { text } } = await worker.recognize(photo.dataUrl);

                    // Mettre à jour avec le texte extrait
                    setPhotos(prev => prev.map(p =>
                        p.id === photo.id ? { ...p, isProcessing: false, text } : p
                    ));

                    if (text.trim()) {
                        extractedTexts.push(text.trim());
                    }
                } catch (ocrError) {
                    console.error('Erreur OCR photo:', ocrError);
                    setPhotos(prev => prev.map(p =>
                        p.id === photo.id ? { ...p, isProcessing: false, error: 'Erreur OCR' } : p
                    ));
                }

                // Mettre à jour la progression globale
                setOcrProgress(Math.round(((i + 1) / photos.length) * 100));
            }

            // Terminer le worker
            await worker.terminate();

            // Combiner tous les textes
            const combinedText = extractedTexts.join('\n\n');

            if (combinedText.trim()) {
                stopCamera();
                onComplete(combinedText);
            } else {
                setError('Aucun texte n\'a pu être extrait des photos. Essayez avec des images plus nettes.');
            }
        } catch (err) {
            console.error('Erreur traitement OCR:', err);
            setError('Erreur lors du traitement des photos.');
        } finally {
            setIsProcessing(false);
        }
    };

    // Fermer et nettoyer
    const handleClose = () => {
        stopCamera();
        onClose();
    };

    // Réessayer d'initialiser la caméra
    const retryCamera = () => {
        startCamera();
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black z-50 flex flex-col"
        >
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent absolute top-0 left-0 right-0 z-10">
                <button
                    onClick={handleClose}
                    className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                >
                    <X size={24} className="text-white" />
                </button>
                <h2 className="text-white font-medium">
                    {photos.length > 0 ? `${photos.length} photo${photos.length > 1 ? 's' : ''}` : 'Prendre une photo'}
                </h2>
                <div className="w-10" /> {/* Spacer pour centrer le titre */}
            </div>

            {/* Zone de caméra ou erreur */}
            <div className="flex-1 relative flex items-center justify-center">
                {cameraError ? (
                    <div className="text-center p-6">
                        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-error/20 flex items-center justify-center">
                            <AlertCircle className="w-10 h-10 text-error" />
                        </div>
                        <p className="text-white mb-4">{cameraError}</p>
                        <button
                            onClick={retryCamera}
                            className="flex items-center gap-2 mx-auto px-4 py-2 bg-primary rounded-xl text-white"
                        >
                            <RotateCcw size={18} />
                            Réessayer
                        </button>
                    </div>
                ) : (
                    <>
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-full object-cover"
                        />
                        <canvas ref={canvasRef} className="hidden" />

                        {/* Overlay de guidage */}
                        {isCapturing && (
                            <div className="absolute inset-0 pointer-events-none">
                                <div className="absolute inset-8 border-2 border-white/30 rounded-2xl" />
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Galerie de photos */}
            {photos.length > 0 && (
                <div className="absolute bottom-32 left-0 right-0 px-4">
                    <div className="flex gap-2 overflow-x-auto pb-2">
                        {photos.map((photo, index) => (
                            <motion.div
                                key={photo.id}
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 border-white/30"
                            >
                                <img
                                    src={photo.dataUrl}
                                    alt={`Photo ${index + 1}`}
                                    className="w-full h-full object-cover"
                                />

                                {/* Overlay de traitement */}
                                {photo.isProcessing && (
                                    <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                                        <Loader2 className="w-6 h-6 text-primary animate-spin" />
                                    </div>
                                )}

                                {/* Indicateur de succès */}
                                {photo.text && !photo.isProcessing && (
                                    <div className="absolute inset-0 bg-green-500/30 flex items-center justify-center">
                                        <Check className="w-6 h-6 text-green-400" />
                                    </div>
                                )}

                                {/* Indicateur d'erreur */}
                                {photo.error && (
                                    <div className="absolute inset-0 bg-error/30 flex items-center justify-center">
                                        <AlertCircle className="w-6 h-6 text-error" />
                                    </div>
                                )}

                                {/* Bouton supprimer */}
                                {!isProcessing && (
                                    <button
                                        onClick={() => removePhoto(photo.id)}
                                        className="absolute -top-1 -right-1 w-5 h-5 bg-error rounded-full flex items-center justify-center"
                                    >
                                        <X size={12} className="text-white" />
                                    </button>
                                )}
                            </motion.div>
                        ))}
                    </div>
                </div>
            )}

            {/* Contrôles en bas */}
            <div className="p-6 bg-gradient-to-t from-black via-black/90 to-transparent">
                {/* Message d'erreur global */}
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-4 p-3 bg-error/20 border border-error/30 rounded-xl"
                    >
                        <p className="text-error text-sm text-center">{error}</p>
                    </motion.div>
                )}

                {/* Barre de progression OCR */}
                {isProcessing && (
                    <div className="mb-4">
                        <div className="flex justify-between text-sm text-white/70 mb-1">
                            <span>Extraction du texte...</span>
                            <span>{ocrProgress}%</span>
                        </div>
                        <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${ocrProgress}%` }}
                                className="h-full bg-primary rounded-full"
                            />
                        </div>
                    </div>
                )}

                {/* Boutons d'action */}
                <div className="flex items-center justify-center gap-6">
                    {/* Bouton Galerie (placeholder) */}
                    <button
                        disabled={isProcessing}
                        className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center disabled:opacity-50"
                    >
                        <Image size={24} className="text-white" />
                    </button>

                    {/* Bouton Capture */}
                    <button
                        onClick={capturePhoto}
                        disabled={!isCapturing || isProcessing || cameraError}
                        className="w-20 h-20 rounded-full bg-white flex items-center justify-center disabled:opacity-50 disabled:bg-white/50"
                    >
                        <div className="w-16 h-16 rounded-full border-4 border-black/20" />
                    </button>

                    {/* Bouton Traiter */}
                    <button
                        onClick={processPhotos}
                        disabled={photos.length === 0 || isProcessing}
                        className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                            photos.length > 0 && !isProcessing
                                ? 'bg-primary'
                                : 'bg-white/10'
                        } disabled:opacity-50`}
                    >
                        {isProcessing ? (
                            <Loader2 size={24} className="text-white animate-spin" />
                        ) : (
                            <Check size={24} className="text-white" />
                        )}
                    </button>
                </div>

                {/* Instructions */}
                <p className="text-center text-white/60 text-sm mt-4">
                    {isProcessing
                        ? 'Extraction du texte en cours...'
                        : photos.length > 0
                            ? 'Appuie sur ✓ pour extraire le texte'
                            : 'Prends des photos de ton cours'}
                </p>
            </div>
        </motion.div>
    );
};

export default PhotoCapture;
