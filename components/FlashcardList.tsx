import React, { useEffect, useState } from 'react';
import { ArrowLeft, Trash2, Book, Calendar, RotateCw, Layers, Volume2, Download, Copy, Check, X } from 'lucide-react';
import { Flashcard } from '../types';
import { getFlashcards, deleteFlashcard } from '../services/storageService';

interface FlashcardListProps {
    onBack: () => void;
}

export const FlashcardList: React.FC<FlashcardListProps> = ({ onBack }) => {
    const [cards, setCards] = useState<Flashcard[]>([]);
    const [loading, setLoading] = useState(true);
    // Track which cards are flipped (id -> boolean)
    const [flippedCards, setFlippedCards] = useState<Record<string, boolean>>({});
    
    // Export Modal State
    const [isExportOpen, setIsExportOpen] = useState(false);
    const [copySuccess, setCopySuccess] = useState(false);

    useEffect(() => {
        loadCards();
    }, []);

    const loadCards = async () => {
        try {
            const data = await getFlashcards();
            setCards(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (window.confirm("Delete this flashcard?")) {
            await deleteFlashcard(id);
            setCards(prev => prev.filter(c => c.id !== id));
        }
    };

    const handleSpeak = (e: React.MouseEvent, text: string) => {
        e.stopPropagation();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US'; 
        utterance.rate = 0.9; 
        window.speechSynthesis.speak(utterance);
    };

    const toggleFlip = (id: string) => {
        setFlippedCards(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    // Generate text compatible with Quizlet (Word + Tab + Definition)
    const getExportText = () => {
        return cards.map(c => {
            // Remove newlines from definition to keep one card per line
            const cleanDef = c.definition.replace(/(\r\n|\n|\r)/gm, " ");
            return `${c.word}\t${cleanDef}`;
        }).join('\n');
    };

    const handleCopyExport = async () => {
        try {
            await navigator.clipboard.writeText(getExportText());
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
        } catch (err) {
            console.error('Failed to copy', err);
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col p-6 overflow-hidden relative">
            {/* Header */}
            <div className="flex items-center justify-between mb-8 z-10">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={onBack}
                        className="p-2 bg-gray-800 hover:bg-gray-700 rounded-full text-indigo-400 transition-colors"
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <h1 className="text-3xl font-serif text-white">My Flashcards</h1>
                        <p className="text-gray-400 text-sm">{cards.length} cards saved</p>
                    </div>
                </div>

                {/* Export Button */}
                {cards.length > 0 && (
                    <button
                        onClick={() => setIsExportOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-800 border border-gray-700 hover:bg-gray-750 hover:border-indigo-500/50 rounded-lg text-sm font-medium text-gray-200 transition-all"
                    >
                        <Download size={16} className="text-indigo-400" />
                        Export to Quizlet
                    </button>
                )}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar pb-20">
                {loading ? (
                    <div className="flex justify-center mt-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
                    </div>
                ) : cards.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500 mt-20 gap-4">
                        <Layers size={48} className="opacity-20" />
                        <p className="text-lg">No flashcards yet.</p>
                        <p className="text-sm">Read a book and click the bookmark icon on words to save them.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {cards.map(card => {
                            const isFlipped = !!flippedCards[card.id];
                            
                            return (
                                <div 
                                    key={card.id}
                                    onClick={() => toggleFlip(card.id)}
                                    className="group relative h-64 perspective-1000 cursor-pointer"
                                >
                                    {/* Inner Container for Flip Effect */}
                                    <div className={`relative w-full h-full transition-transform duration-500 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
                                        
                                        {/* FRONT */}
                                        <div className="absolute inset-0 backface-hidden bg-gray-800 border border-gray-700 rounded-xl p-6 flex flex-col items-center justify-center text-center shadow-lg group-hover:border-indigo-500/50 transition-colors">
                                            {/* Audio Button */}
                                            <div className="absolute top-3 right-3">
                                                <button 
                                                    onClick={(e) => handleSpeak(e, card.word)}
                                                    className="p-2 text-gray-400 hover:text-indigo-400 hover:bg-gray-700 rounded-full transition-colors"
                                                    title="Listen pronunciation"
                                                >
                                                    <Volume2 size={20} />
                                                </button>
                                            </div>

                                            <h3 className="text-2xl font-serif font-bold text-white mb-2 px-4">{card.word}</h3>
                                            <p className="text-xs text-gray-500 mt-auto flex items-center gap-1">
                                                <RotateCw size={12} />
                                                Click to flip
                                            </p>
                                        </div>

                                        {/* BACK */}
                                        <div className="absolute inset-0 backface-hidden rotate-y-180 bg-indigo-900 border border-indigo-700 rounded-xl p-6 flex flex-col justify-between shadow-lg">
                                            <div className="overflow-y-auto custom-scrollbar">
                                                <p className="font-medium text-white text-lg mb-3">{card.definition}</p>
                                                {card.context && (
                                                    <div className="bg-indigo-950/50 p-2 rounded text-xs text-indigo-200 italic border-l-2 border-indigo-400">
                                                        "{card.context}"
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex justify-between items-center mt-4 pt-4 border-t border-indigo-800/50">
                                                <span className="text-[10px] text-indigo-300 flex items-center gap-1">
                                                    <Calendar size={10} />
                                                    {new Date(card.createdAt).toLocaleDateString()}
                                                </span>
                                                <button 
                                                    onClick={(e) => handleDelete(e, card.id)}
                                                    className="p-1.5 text-indigo-300 hover:text-red-300 hover:bg-red-900/30 rounded transition-colors"
                                                    title="Delete card"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Export Modal */}
            {isExportOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                    <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[80vh]">
                        <div className="flex justify-between items-center p-4 border-b border-gray-700">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <Download size={20} className="text-indigo-400" />
                                Export for Quizlet
                            </h3>
                            <button 
                                onClick={() => setIsExportOpen(false)}
                                className="text-gray-400 hover:text-white transition-colors"
                            >
                                <X size={24} />
                            </button>
                        </div>
                        
                        <div className="p-4 flex-1 overflow-hidden flex flex-col gap-4">
                            <div className="text-sm text-gray-300 bg-indigo-900/30 border border-indigo-500/30 p-3 rounded-lg">
                                <p><strong>How to use:</strong></p>
                                <ol className="list-decimal list-inside mt-1 space-y-1 text-gray-400">
                                    <li>Copy the text below.</li>
                                    <li>Go to Quizlet and create a new study set.</li>
                                    <li>Click on <strong>"Import from Word, Excel, Google Docs, etc."</strong>.</li>
                                    <li>Paste the data. It is formatted as <code>Word [TAB] Definition</code>.</li>
                                </ol>
                            </div>
                            
                            <div className="relative flex-1">
                                <textarea 
                                    readOnly
                                    value={getExportText()}
                                    className="w-full h-full bg-gray-900 border border-gray-700 rounded-lg p-4 font-mono text-sm text-gray-300 focus:outline-none focus:border-indigo-500 resize-none custom-scrollbar"
                                />
                            </div>
                        </div>

                        <div className="p-4 border-t border-gray-700 flex justify-end gap-3">
                            <button 
                                onClick={() => setIsExportOpen(false)}
                                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                            >
                                Close
                            </button>
                            <button 
                                onClick={handleCopyExport}
                                className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-all ${
                                    copySuccess 
                                    ? 'bg-green-600 text-white' 
                                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                                }`}
                            >
                                {copySuccess ? (
                                    <>
                                        <Check size={18} />
                                        Copied!
                                    </>
                                ) : (
                                    <>
                                        <Copy size={18} />
                                        Copy to Clipboard
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            <style jsx>{`
                .perspective-1000 { perspective: 1000px; }
                .transform-style-3d { transform-style: preserve-3d; }
                .backface-hidden { backface-visibility: hidden; }
                .rotate-y-180 { transform: rotateY(180deg); }
            `}</style>
        </div>
    );
};