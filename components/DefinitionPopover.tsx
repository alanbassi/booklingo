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
            className="fixed z-50 bg-brand-bg rounded-xl shadow-2xl border border-brand-border w-auto min-w-[280px] max-w-md transition-opacity duration-200"
            style={popoverStyle}
            onMouseDown={(e) => e.stopPropagation()}
        >
            <div
                className="absolute w-4 h-4 bg-brand-bg border-brand-border transform rotate-45"
                style={{
                    left: arrowLeft,
                    top: isPlacedBelow ? -9 : undefined,
                    bottom: isPlacedBelow ? undefined : -9,
                    borderTop: isPlacedBelow ? '1px solid #D6ECEB' : 'none',
                    borderLeft: isPlacedBelow ? '1px solid #D6ECEB' : 'none',
                    borderBottom: isPlacedBelow ? 'none' : '1px solid #D6ECEB',
                    borderRight: isPlacedBelow ? 'none' : '1px solid #D6ECEB',
                    transform: 'translate(-50%, 0) rotate(45deg)'
                }}
            ></div>

            <div className="relative p-3 bg-brand-bg rounded-xl overflow-hidden flex flex-col max-h-[500px]">
                <div className="flex justify-between items-center mb-2 gap-3 border-b border-brand-border pb-2">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleSave}
                            disabled={!definition || isSaved}
                            className={`p-1.5 rounded-full transition-all ${isSaved ? 'text-brand-teal bg-brand-tealLight/25' : 'text-brand-muted hover:text-brand-blue hover:bg-brand-surface'}`}
                            title={isSaved ? 'Saved to flashcards' : 'Save flashcard'}
                        >
                            {isSaved ? <BookmarkCheck size={18} fill="currentColor" /> : <Bookmark size={18} />}
                        </button>
                        <h3 className="font-serif font-bold text-lg text-brand-dark truncate max-w-[180px]">
                            {text}
                        </h3>
                        <button
                            onClick={handleSpeak}
                            className="text-brand-blue hover:text-brand-dark hover:bg-brand-surface p-1.5 rounded-full transition-colors flex-shrink-0"
                            title="Hear pronunciation"
                        >
                            <Volume2 size={18} />
                        </button>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-brand-muted hover:text-brand-dark p-1 rounded-full hover:bg-brand-surface transition-colors flex-shrink-0"
                    >
                        <X size={16} />
                    </button>
                </div>

                <div className="overflow-y-auto overflow-x-hidden custom-scrollbar pr-1">
                    <div className="grid grid-cols-3 gap-1 rounded-lg bg-brand-surface p-1 mb-3 border border-brand-border">
                        {translationLanguageOptions.map((language) => (
                            <button
                                key={language}
                                type="button"
                                onClick={() => onLanguageChange(language)}
                                className={`px-2 py-1.5 rounded-md text-[11px] font-semibold transition-colors ${
                                    targetLanguage === language
                                        ? 'bg-brand-bg text-brand-blue shadow-sm'
                                        : 'text-brand-muted hover:text-brand-dark'
                                }`}
                            >
                                {translationLanguageLabels[language]}
                            </button>
                        ))}
                    </div>

                    {isLoading ? (
                        <div className="flex items-center justify-center py-2 px-2 text-brand-blue gap-2">
                            <Loader2 className="animate-spin" size={16} />
                            <span className="text-sm font-medium">Translating...</span>
                        </div>
                    ) : definition ? (
                        <div className="text-base text-brand-text leading-snug px-1 mb-4 font-medium">
                            {definition}
                        </div>
                    ) : (
                        <div className="flex items-center justify-center py-2 text-brand-amber text-xs mb-2">
                            <AlertCircle size={14} className="mr-1" />
                            <span>Translation unavailable</span>
                        </div>
                    )}

                    <div className="bg-brand-surface rounded-lg p-2.5 mb-3 border border-brand-border">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-bold text-brand-muted uppercase tracking-wider">Pronunciation</span>
                            {status === 'listening' && (
                                <span className="flex h-1.5 w-1.5">
                                    <span className="animate-ping absolute inline-flex h-1.5 w-1.5 rounded-full bg-brand-amber opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-brand-amber"></span>
                                </span>
                            )}
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleRecord}
                                className={`p-2 rounded-full transition-all duration-300 flex items-center justify-center shadow-sm
                                    ${status === 'listening'
                                        ? 'bg-brand-amber/20 text-brand-dark ring-2 ring-brand-amber ring-opacity-60'
                                        : status === 'success'
                                            ? 'bg-brand-tealLight/30 text-brand-teal'
                                            : 'bg-brand-bg border border-brand-border text-brand-muted hover:bg-brand-tealLight/20 hover:text-brand-blue hover:border-brand-teal'
                                    }
                                `}
                            >
                                <Mic size={18} className={status === 'listening' ? 'animate-pulse' : ''} />
                            </button>

                            <div className="flex-1 min-w-0">
                                {status === 'idle' && !spokenText && (
                                    <p className="text-xs text-brand-muted">Tap to speak.</p>
                                )}
                                {status === 'listening' && (
                                    <p className="text-xs text-brand-muted font-medium animate-pulse">Listening...</p>
                                )}
                                {status === 'success' && (
                                    <div className="flex items-center gap-1 text-brand-teal">
                                        <Check size={14} strokeWidth={3} />
                                        <p className="text-xs font-bold">Excellent!</p>
                                    </div>
                                )}
                                {status === 'error' && (
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-1 text-brand-amber">
                                            <XCircle size={14} />
                                            <p className="text-xs font-bold">Try again</p>
                                        </div>
                                        {spokenText && (
                                            <p className="text-[10px] text-brand-muted mt-0.5 truncate max-w-[150px]" title={spokenText}>
                                                Heard: <span className="font-medium text-brand-text italic">"{spokenText}"</span>
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
                            className="w-full group relative flex items-center justify-center gap-2 bg-brand-bg border border-brand-border hover:border-brand-amber hover:bg-brand-surface text-brand-text hover:text-brand-dark text-xs font-semibold py-2 px-4 rounded-lg shadow-sm transition-all"
                        >
                            <Youtube size={16} className="text-brand-amber" />
                            <span>View on YouGlish</span>
                        </a>

                        <button
                            onClick={() => onExplain(text)}
                            className="w-full group relative flex items-center justify-center gap-2 bg-gradient-to-r from-brand-blue to-brand-teal hover:from-brand-dark hover:to-brand-blue text-white text-xs font-semibold py-2.5 px-4 rounded-lg shadow-sm transition-all hover:shadow-md"
                        >
                            <Sparkles size={14} className="text-brand-tealLight" />
                            <span>Ask ChatGPT</span>
                            <ExternalLink size={14} className="opacity-70 group-hover:translate-x-0.5 transition-transform duration-300" />
                        </button>
                    </div>
                    <p className="text-[10px] text-brand-muted text-center mt-2 px-2">
                        The selected text will be sent to ChatGPT automatically.
                    </p>
                </div>
            </div>
        </div>
    );
};
