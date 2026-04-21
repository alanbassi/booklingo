import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { Loader2, X, Volume2, AlertCircle, Sparkles, Mic, Check, XCircle, ExternalLink, Youtube, Bookmark, BookmarkCheck } from 'lucide-react';
import { TranslationLanguage } from '../types';
import { translationLanguageLabels, translationLanguageOptions } from '../services/translationService';

interface DefinitionPopoverProps {
    isVisible: boolean;
    isLoading: boolean;
    text: string;
    definition: string | null;
    targetLanguage: TranslationLanguage;
    position: { top: number; left: number };
    onClose: () => void;
    onExplain: (text: string) => void;
    onSaveFlashcard: (text: string, definition: string) => void;
    onLanguageChange: (language: TranslationLanguage) => void;
}

interface IWindow extends Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
}

type PronunciationStatus = 'idle' | 'listening' | 'success' | 'error';

export const DefinitionPopover: React.FC<DefinitionPopoverProps> = ({
    isVisible,
    isLoading,
    text,
    definition,
    targetLanguage,
    position,
    onClose,
    onExplain,
    onSaveFlashcard,
    onLanguageChange
}) => {
    const [status, setStatus] = useState<PronunciationStatus>('idle');
    const [spokenText, setSpokenText] = useState('');
    const [isSaved, setIsSaved] = useState(false);
    const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({ opacity: 0 });
    const [arrowLeft, setArrowLeft] = useState<number>(0);
    const [isPlacedBelow, setIsPlacedBelow] = useState(false);

    const recognitionRef = useRef<any>(null);
    const popoverRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setStatus('idle');
        setSpokenText('');
        setIsSaved(false);
        if (recognitionRef.current) {
            recognitionRef.current.stop();
        }
    }, [text, isVisible]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        if (isVisible) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isVisible, onClose]);

    useLayoutEffect(() => {
        if (!isVisible || !popoverRef.current) return;

        const padding = 16;
        const gap = 12;
        const element = popoverRef.current;
        const rect = element.getBoundingClientRect();
        const { innerWidth, innerHeight } = window;

        let left = position.left - (rect.width / 2);
        let top = position.top - rect.height - gap;
        let placedBelow = false;

        if (left < padding) {
            left = padding;
        } else if (left + rect.width > innerWidth - padding) {
            left = innerWidth - rect.width - padding;
        }

        if (top < padding) {
            top = position.top + gap + 20;
            placedBelow = true;

            if (top + rect.height > innerHeight - padding) {
                top = innerHeight - rect.height - padding;
            }
        }

        const relativeArrowX = position.left - left;
        const clampedArrowX = Math.max(12, Math.min(rect.width - 12, relativeArrowX));

        setPopoverStyle({
            top,
            left,
            opacity: 1,
            transform: 'none'
        });
        setArrowLeft(clampedArrowX);
        setIsPlacedBelow(placedBelow);
    }, [isVisible, position, text, definition, isLoading]);

    if (!isVisible) return null;

    const handleSpeak = (e: React.MouseEvent) => {
        e.stopPropagation();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        utterance.rate = 0.9;

        const voices = window.speechSynthesis.getVoices();
        const preferredVoices = [
            'Google US English',
            'Samantha',
            'Alex',
            'Microsoft Zira',
            'Microsoft Aria Online',
            'Google UK English Female'
        ];

        let bestVoice = null;
        for (const name of preferredVoices) {
            bestVoice = voices.find(v => v.name.includes(name));
            if (bestVoice) break;
        }

        if (!bestVoice) {
            bestVoice = voices.find(v => v.lang.startsWith('en')) || null;
        }

        if (bestVoice) {
            utterance.voice = bestVoice;
        }

        window.speechSynthesis.speak(utterance);
    };

    const handleSave = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isSaved || !definition) return;
        onSaveFlashcard(text, definition);
        setIsSaved(true);
    };

    const handleRecord = (e: React.MouseEvent) => {
        e.stopPropagation();

        if (status === 'listening') {
            recognitionRef.current?.stop();
            setStatus('idle');
            return;
        }

        const { webkitSpeechRecognition, SpeechRecognition } = window as unknown as IWindow;
        const SpeechRecognitionConstructor = SpeechRecognition || webkitSpeechRecognition;

        if (!SpeechRecognitionConstructor) {
            alert('Your browser does not support speech recognition.');
            return;
        }

        const recognition = new SpeechRecognitionConstructor();
        recognitionRef.current = recognition;

        recognition.lang = 'en-US';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
            setStatus('listening');
            setSpokenText('');
        };

        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            setSpokenText(transcript);
            validatePronunciation(transcript);
        };

        recognition.onerror = (event: any) => {
            console.error('Speech recognition error', event.error);
            setStatus('error');
            setSpokenText("I couldn't understand that.");
        };

        recognition.onend = () => {
            setStatus(prev => prev === 'listening' ? 'idle' : prev);
        };

        recognition.start();
    };

    const validatePronunciation = (transcript: string) => {
        const cleanTarget = text.toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, '').trim();
        const cleanSpoken = transcript.toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, '').trim();

        if (cleanSpoken === cleanTarget || cleanSpoken.includes(cleanTarget)) {
            setStatus('success');
        } else {
            setStatus('error');
        }
    };

    return (
        <div
            ref={popoverRef}
            className="fixed z-50 bg-white rounded-xl shadow-2xl border border-gray-200 w-auto min-w-[280px] max-w-md transition-opacity duration-200"
            style={popoverStyle}
            onMouseDown={(e) => e.stopPropagation()}
        >
            <div
                className="absolute w-4 h-4 bg-white border-gray-200 transform rotate-45"
                style={{
                    left: arrowLeft,
                    top: isPlacedBelow ? -9 : undefined,
                    bottom: isPlacedBelow ? undefined : -9,
                    borderTop: isPlacedBelow ? '1px solid #e5e7eb' : 'none',
                    borderLeft: isPlacedBelow ? '1px solid #e5e7eb' : 'none',
                    borderBottom: isPlacedBelow ? 'none' : '1px solid #e5e7eb',
                    borderRight: isPlacedBelow ? 'none' : '1px solid #e5e7eb',
                    transform: 'translate(-50%, 0) rotate(45deg)'
                }}
            ></div>

            <div className="relative p-3 bg-white rounded-xl overflow-hidden flex flex-col max-h-[500px]">
                <div className="flex justify-between items-center mb-2 gap-3 border-b border-gray-100 pb-2">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleSave}
                            disabled={!definition || isSaved}
                            className={`p-1.5 rounded-full transition-all ${isSaved ? 'text-green-500 bg-green-50' : 'text-gray-400 hover:text-indigo-500 hover:bg-indigo-50'}`}
                            title={isSaved ? 'Saved to flashcards' : 'Save flashcard'}
                        >
                            {isSaved ? <BookmarkCheck size={18} fill="currentColor" /> : <Bookmark size={18} />}
                        </button>
                        <h3 className="font-serif font-bold text-lg text-gray-800 truncate max-w-[180px]">
                            {text}
                        </h3>
                        <button
                            onClick={handleSpeak}
                            className="text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 p-1.5 rounded-full transition-colors flex-shrink-0"
                            title="Hear pronunciation"
                        >
                            <Volume2 size={18} />
                        </button>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors flex-shrink-0"
                    >
                        <X size={16} />
                    </button>
                </div>

                <div className="overflow-y-auto overflow-x-hidden custom-scrollbar pr-1">
                    <div className="grid grid-cols-3 gap-1 rounded-lg bg-gray-100 p-1 mb-3">
                        {translationLanguageOptions.map((language) => (
                            <button
                                key={language}
                                type="button"
                                onClick={() => onLanguageChange(language)}
                                className={`px-2 py-1.5 rounded-md text-[11px] font-semibold transition-colors ${
                                    targetLanguage === language
                                        ? 'bg-white text-indigo-700 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-800'
                                }`}
                            >
                                {translationLanguageLabels[language]}
                            </button>
                        ))}
                    </div>

                    {isLoading ? (
                        <div className="flex items-center justify-center py-2 px-2 text-indigo-500 gap-2">
                            <Loader2 className="animate-spin" size={16} />
                            <span className="text-sm font-medium">Translating...</span>
                        </div>
                    ) : definition ? (
                        <div className="text-base text-gray-800 leading-snug px-1 mb-4 font-medium">
                            {definition}
                        </div>
                    ) : (
                        <div className="flex items-center justify-center py-2 text-red-500 text-xs mb-2">
                            <AlertCircle size={14} className="mr-1" />
                            <span>Translation unavailable</span>
                        </div>
                    )}

                    <div className="bg-gray-50 rounded-lg p-2.5 mb-3 border border-gray-100">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Pronunciation</span>
                            {status === 'listening' && (
                                <span className="flex h-1.5 w-1.5">
                                    <span className="animate-ping absolute inline-flex h-1.5 w-1.5 rounded-full bg-red-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500"></span>
                                </span>
                            )}
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleRecord}
                                className={`p-2 rounded-full transition-all duration-300 flex items-center justify-center shadow-sm
                                    ${status === 'listening'
                                        ? 'bg-red-100 text-red-600 ring-2 ring-red-400 ring-opacity-50'
                                        : status === 'success'
                                            ? 'bg-green-100 text-green-600'
                                            : 'bg-white border border-gray-200 text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200'
                                    }
                                `}
                            >
                                <Mic size={18} className={status === 'listening' ? 'animate-pulse' : ''} />
                            </button>

                            <div className="flex-1 min-w-0">
                                {status === 'idle' && !spokenText && (
                                    <p className="text-xs text-gray-400">Tap to speak.</p>
                                )}
                                {status === 'listening' && (
                                    <p className="text-xs text-gray-600 font-medium animate-pulse">Listening...</p>
                                )}
                                {status === 'success' && (
                                    <div className="flex items-center gap-1 text-green-600">
                                        <Check size={14} strokeWidth={3} />
                                        <p className="text-xs font-bold">Excellent!</p>
                                    </div>
                                )}
                                {status === 'error' && (
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-1 text-orange-600">
                                            <XCircle size={14} />
                                            <p className="text-xs font-bold">Try again</p>
                                        </div>
                                        {spokenText && (
                                            <p className="text-[10px] text-gray-500 mt-0.5 truncate max-w-[150px]" title={spokenText}>
                                                Heard: <span className="font-medium text-gray-700 italic">"{spokenText}"</span>
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="pt-1 space-y-2">
                        <a
                            href={`https://youglish.com/pronounce/${encodeURIComponent(text)}/english`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full group relative flex items-center justify-center gap-2 bg-white border border-gray-200 hover:border-red-200 hover:bg-red-50 text-gray-700 hover:text-red-700 text-xs font-semibold py-2 px-4 rounded-lg shadow-sm transition-all"
                        >
                            <Youtube size={16} className="text-red-600" />
                            <span>View on YouGlish</span>
                        </a>

                        <button
                            onClick={() => onExplain(text)}
                            className="w-full group relative flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-semibold py-2.5 px-4 rounded-lg shadow-sm transition-all hover:shadow-md"
                        >
                            <Sparkles size={14} className="text-emerald-100" />
                            <span>Ask ChatGPT</span>
                            <ExternalLink size={14} className="opacity-70 group-hover:translate-x-0.5 transition-transform duration-300" />
                        </button>
                    </div>
                    <p className="text-[10px] text-gray-400 text-center mt-2 px-2">
                        The selected text will be sent to ChatGPT automatically.
                    </p>
                </div>
            </div>
        </div>
    );
};
