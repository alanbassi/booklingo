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
        <div className="min-h-screen bg-brand-bg text-brand-text flex flex-col p-6 overflow-hidden relative">
            {/* Header */}
            <div className="flex items-center justify-between mb-8 z-10">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={onBack}
                        className="p-2 bg-brand-surface hover:bg-brand-tealLight/30 rounded-full text-brand-blue transition-colors border border-brand-border"
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <h1 className="text-3xl font-serif text-brand-dark">My Flashcards</h1>
                        <p className="text-brand-muted text-sm">{cards.length} cards saved</p>
                    </div>
                </div>

                {/* Export Button */}
                {cards.length > 0 && (
                    <button
                        onClick={() => setIsExportOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-brand-blue border border-brand-blue hover:bg-brand-dark rounded-lg text-sm font-medium text-white transition-all"
                    >
                        <Download size={16} className="text-brand-tealLight" />
                        Export to Quizlet
                    </button>
                )}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar pb-20">
                {loading ? (
                    <div className="flex justify-center mt-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-blue"></div>
                    </div>
                ) : cards.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-brand-muted mt-20 gap-4">
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
                                        <div className="absolute inset-0 backface-hidden bg-brand-surface border border-brand-border rounded-xl p-6 flex flex-col items-center justify-center text-center shadow-lg group-hover:border-brand-teal transition-colors">
                                            {/* Audio Button */}
                                            <div className="absolute top-3 right-3">
                                                <button 
                                                    onClick={(e) => handleSpeak(e, card.word)}
                                                    className="p-2 text-brand-muted hover:text-brand-blue hover:bg-brand-tealLight/25 rounded-full transition-colors"
                                                    title="Listen pronunciation"
                                                >
                                                    <Volume2 size={20} />
                                                </button>
                                            </div>

                                            <h3 className="text-2xl font-serif font-bold text-brand-dark mb-2 px-4">{card.word}</h3>
                                            <p className="text-xs text-brand-muted mt-auto flex items-center gap-1">
                                                <RotateCw size={12} />
                                                Click to flip
                                            </p>
                                        </div>

                                        {/* BACK */}
                                        <div className="absolute inset-0 backface-hidden rotate-y-180 bg-brand-dark border border-brand-blue rounded-xl p-6 flex flex-col justify-between shadow-lg">
                                            <div className="overflow-y-auto custom-scrollbar">
                                                <p className="font-medium text-white text-lg mb-3">{card.definition}</p>
                                                {card.context && (
                                                    <div className="bg-brand-blue/20 p-2 rounded text-xs text-brand-tealLight italic border-l-2 border-brand-amber">
                                                        "{card.context}"
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex justify-between items-center mt-4 pt-4 border-t border-white/15">
                                                <span className="text-[10px] text-brand-tealLight flex items-center gap-1">
                                                    <Calendar size={10} />
                                                    {new Date(card.createdAt).toLocaleDateString()}
                                                </span>
                                                <button 
                                                    onClick={(e) => handleDelete(e, card.id)}
                                                    className="p-1.5 text-brand-tealLight hover:text-brand-amber hover:bg-brand-amber/15 rounded transition-colors"
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
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-dark/45 backdrop-blur-sm p-4">
                    <div className="bg-brand-bg border border-brand-border rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[80vh]">
                        <div className="flex justify-between items-center p-4 border-b border-brand-border">
                            <h3 className="text-xl font-bold text-brand-dark flex items-center gap-2">
                                <Download size={20} className="text-brand-blue" />
                                Export for Quizlet
                            </h3>
                            <button 
                                onClick={() => setIsExportOpen(false)}
                                className="text-brand-muted hover:text-brand-dark transition-colors"
                            >
                                <X size={24} />
                            </button>
                        </div>
                        
                        <div className="p-4 flex-1 overflow-hidden flex flex-col gap-4">
                            <div className="text-sm text-brand-text bg-brand-surface border border-brand-border p-3 rounded-lg">
                                <p><strong>How to use:</strong></p>
                                <ol className="list-decimal list-inside mt-1 space-y-1 text-brand-muted">
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
                                    className="w-full h-full bg-brand-surface border border-brand-border rounded-lg p-4 font-mono text-sm text-brand-text focus:outline-none focus:border-brand-blue resize-none custom-scrollbar"
                                />
                            </div>
                        </div>

                        <div className="p-4 border-t border-brand-border flex justify-end gap-3">
                            <button 
                                onClick={() => setIsExportOpen(false)}
                                className="px-4 py-2 text-brand-muted hover:text-brand-dark transition-colors"
                            >
                                Close
                            </button>
                            <button 
                                onClick={handleCopyExport}
                                className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-all ${
                                    copySuccess 
                                    ? 'bg-brand-teal text-white' 
                                    : 'bg-brand-blue hover:bg-brand-dark text-white'
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
