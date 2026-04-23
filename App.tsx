import React, { useState, useEffect } from 'react';
import { Upload, Loader2, Moon, Sun, Monitor, ZoomIn, ZoomOut, Clock, Trash2, FileText, Layers, Play, Square } from 'lucide-react';
import { LoadedPDF, ReaderTheme, SelectionData, DefinitionState, TranslationLanguage } from './types';
import { parsePDF, getPageText } from './services/pdfService';
import { Reader } from './components/Reader';
import { DefinitionPopover } from './components/DefinitionPopover';
import { FlashcardList } from './components/FlashcardList';
import { getWordTranslation } from './services/translationService';
import { getRecentBooks, loadBookFromStorage, saveBookToStorage, deleteBookFromStorage, StoredBookMetadata, saveFlashcard } from './services/storageService';

const logoUrl = new URL('./assets/logo.png', import.meta.url).href;

const App: React.FC = () => {
    // View State
    const [currentView, setCurrentView] = useState<'home' | 'reader' | 'flashcards'>('home');

    // PDF State
    const [pdfDocument, setPdfDocument] = useState<LoadedPDF | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [isLoadingPDF, setIsLoadingPDF] = useState(false);
    
    // Storage State
    const [recentBooks, setRecentBooks] = useState<StoredBookMetadata[]>([]);
    const [isStorageLoading, setIsStorageLoading] = useState(true);

    // UI State
    const [theme, setTheme] = useState<ReaderTheme>(ReaderTheme.LIGHT);
    const [zoomLevel, setZoomLevel] = useState(15);
    const [currentPageText, setCurrentPageText] = useState("");
    const [isReadingPage, setIsReadingPage] = useState(false);
    const [translationLanguage, setTranslationLanguage] = useState<TranslationLanguage>('pt');

    // Definition Popover State
    const [definitionState, setDefinitionState] = useState<DefinitionState>({
        isVisible: false,
        isLoading: false,
        text: '',
        definition: null,
        targetLanguage: 'pt',
        position: { top: 0, left: 0 }
    });

    // Modal State
    const [modalConfig, setModalConfig] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        type: 'alert' | 'confirm' | 'prompt';
        onConfirm?: () => void;
        onCancel?: () => void;
        promptText?: string;
    }>({ isOpen: false, title: '', message: '', type: 'alert' });

    const showAlert = (title: string, message: string) => {
        setModalConfig({ isOpen: true, title, message, type: 'alert' });
    };

    const showConfirm = (title: string, message: string, onConfirm: () => void) => {
        setModalConfig({ isOpen: true, title, message, type: 'confirm', onConfirm, onCancel: () => setModalConfig(prev => ({ ...prev, isOpen: false })) });
    };

    const showPrompt = (title: string, message: string, promptText: string) => {
        setModalConfig({ isOpen: true, title, message, type: 'prompt', promptText, onCancel: () => setModalConfig(prev => ({ ...prev, isOpen: false })) });
    };

    // --- INITIALIZATION ---

    useEffect(() => {
        loadRecents();
    }, []);

    useEffect(() => {
        if (!pdfDocument) return;
        const fetchContext = async () => {
            const text = await getPageText(pdfDocument.proxy, currentPage);
            setCurrentPageText(text || "");
        };
        fetchContext();

        // Stop reading if page changes
        window.speechSynthesis.cancel();
        setIsReadingPage(false);
    }, [currentPage, pdfDocument]);

    const loadRecents = async () => {
        try {
            const books = await getRecentBooks();
            setRecentBooks(books);
        } catch (e) {
            console.error("Failed to load history", e);
        } finally {
            setIsStorageLoading(false);
        }
    };

    // --- FILE HANDLING ---

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.type !== 'application/pdf') {
            showAlert('Invalid File', 'Please upload a valid PDF file.');
            return;
        }

        setIsLoadingPDF(true);
        try {
            const parsedDoc = await parsePDF(file);
            setPdfDocument(parsedDoc);
            await saveBookToStorage(file, parsedDoc);
            loadRecents();
            setCurrentView('reader');
        } catch (error) {
            console.error(error);
            showAlert('Error', 'Failed to parse PDF.');
        } finally {
            setIsLoadingPDF(false);
        }
    };

    const handleOpenRecent = async (id: string) => {
        setIsLoadingPDF(true);
        try {
            const { file } = await loadBookFromStorage(id);
            const parsedDoc = await parsePDF(file);
            setPdfDocument(parsedDoc);
            loadRecents();
            setCurrentView('reader');
        } catch (error) {
            console.error(error);
            showAlert('Error', "Could not load book.");
            loadRecents();
        } finally {
            setIsLoadingPDF(false);
        }
    };

    const handleDeleteRecent = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        showConfirm('Remove Book', 'Remove this book from your library?', async () => {
            await deleteBookFromStorage(id);
            loadRecents();
        });
    };

    // --- CORE LOGIC ---

    // 1. Translation Logic (Auto runs on select)
    const performTranslation = async (text: string, targetLanguage: TranslationLanguage) => {
         try {
            const context = `[Page ${currentPage}]:\n${currentPageText}`;
            const definition = await getWordTranslation(text, targetLanguage, context);
            
            setDefinitionState(prev => {
                if (prev.text !== text || prev.targetLanguage !== targetLanguage) return prev;
                return {
                    ...prev,
                    isLoading: false,
                    definition: definition
                };
            });
        } catch (error) {
            setDefinitionState(prev => ({
                ...prev,
                isLoading: false,
                definition: "Translation failed."
            }));
        }
    };

    const handleTranslationLanguageChange = (targetLanguage: TranslationLanguage) => {
        setTranslationLanguage(targetLanguage);

        const selectedText = definitionState.isVisible ? definitionState.text : '';

        setDefinitionState(prev => {
            if (!prev.isVisible || !prev.text) {
                return {
                    ...prev,
                    targetLanguage
                };
            }

            return {
                ...prev,
                isLoading: true,
                definition: null,
                targetLanguage
            };
        });

        if (selectedText) {
            performTranslation(selectedText, targetLanguage);
        }
    };

    // 2. Selection Handler
    const handleTextSelect = (data: SelectionData) => {
        if (!data) return;
        
        const { text, rect } = data;
        const cleanText = text.trim();
        
        const isShortPhrase = cleanText.split(' ').length <= 12 && cleanText.length < 150;
        
        if (isShortPhrase && cleanText.length > 0) {
            const top = rect.top;
            const left = rect.left + (rect.width / 2);

            setDefinitionState({
                isVisible: true,
                isLoading: true,
                text: cleanText,
                definition: null,
                targetLanguage: translationLanguage,
                position: { top, left }
            });

            performTranslation(cleanText, translationLanguage);
        }
    };

    // --- CLIPBOARD HELPER (Fallback Mechanism) ---
    const copyToClipboard = async (text: string): Promise<boolean> => {
        // Method 1: Modern API
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (err) {
            console.warn("Navigator API failed, trying fallback...", err);
        }

        // Method 2: Fallback (Legacy execCommand)
        try {
            const textArea = document.createElement("textarea");
            textArea.value = text;
            
            // Ensure element is not visible but part of DOM
            textArea.style.position = "fixed";
            textArea.style.left = "-9999px";
            textArea.style.top = "0";
            document.body.appendChild(textArea);
            
            textArea.focus();
            textArea.select();
            
            const successful = document.execCommand('copy');
            document.body.removeChild(textArea);
            return successful;
        } catch (err) {
            console.error("Fallback copy failed", err);
            return false;
        }
    };

    // 3. External Explanation Handler
    const handleExplain = async (targetText: string) => {
        const prompt = `Explain the phrase "${targetText}" in easy-to-read English.`;
        const chatGptUrl = `https://chatgpt.com/?q=${encodeURIComponent(prompt)}`;

        // Copy to clipboard as a backup.
        await copyToClipboard(prompt);

        const opened = window.open(chatGptUrl, '_blank');
        if (!opened) {
            showAlert('Pop-up Blocked', 'Please allow pop-ups to open ChatGPT.');
        }
    };

    // 4. Save Flashcard Handler
    const handleSaveFlashcard = async (word: string, definition: string) => {
        try {
            const snippet = currentPageText.substring(0, 150) + "..."; 
            await saveFlashcard(word, definition, snippet);
        } catch (e) {
            console.error("Failed to save flashcard", e);
        }
    };

    // 5. Read Page Handler
    const toggleReadPage = () => {
        if (isReadingPage) {
            window.speechSynthesis.cancel();
            setIsReadingPage(false);
        } else {
            if (!currentPageText) return;
            
            // Clean up text: remove newlines, fix hyphenated words at end of lines
            const cleanText = currentPageText
                .replace(/-\n/g, '') // fix hyphenation
                .replace(/\n/g, ' ') // replace newlines with spaces
                .replace(/\s+/g, ' '); // remove multiple spaces
            
            const utterance = new SpeechSynthesisUtterance(cleanText);
            utterance.lang = 'en-US';
            utterance.rate = 0.9;

            // Try to find a better, more natural voice
            const voices = window.speechSynthesis.getVoices();
            const preferredVoices = [
                'Google US English', // Chrome's high quality voice
                'Samantha', // macOS high quality female
                'Alex', // macOS high quality male
                'Microsoft Zira', // Windows high quality female
                'Microsoft Aria Online', // Windows Edge high quality
                'Google UK English Female'
            ];

            let bestVoice = null;
            for (const name of preferredVoices) {
                bestVoice = voices.find(v => v.name.includes(name));
                if (bestVoice) break;
            }
            
            // Fallback to any English voice if preferred ones aren't found
            if (!bestVoice) {
                bestVoice = voices.find(v => v.lang.startsWith('en')) || null;
            }

            if (bestVoice) {
                utterance.voice = bestVoice;
            }
            
            utterance.onend = () => setIsReadingPage(false);
            utterance.onerror = () => setIsReadingPage(false);
            
            window.speechSynthesis.speak(utterance);
            setIsReadingPage(true);
        }
    };

    const closeDefinition = () => {
        setDefinitionState(prev => ({ ...prev, isVisible: false }));
    };

    const isHomeDark = theme === ReaderTheme.DARK;
    const homeClasses = {
        page: isHomeDark ? 'bg-brand-dark text-white' : 'bg-brand-bg text-brand-text',
        gradient: isHomeDark ? 'from-brand-blue/25 to-transparent' : 'from-brand-tealLight/35 to-transparent',
        themeControl: isHomeDark ? 'bg-white/10 border-white/15' : 'bg-brand-surface border-brand-border',
        inactiveThemeButton: isHomeDark ? 'text-white hover:text-white hover:bg-white/10' : 'text-brand-muted hover:text-brand-dark hover:bg-brand-tealLight/20',
        logoCard: isHomeDark ? 'bg-white/10 border-white/15 shadow-black/20' : 'bg-brand-surface border-brand-border shadow-brand-dark/10',
        title: isHomeDark ? 'text-white' : 'text-brand-dark',
        subtitle: isHomeDark ? 'text-white' : 'text-brand-muted',
        sectionTitle: isHomeDark ? 'text-white' : 'text-brand-dark',
        card: isHomeDark ? 'bg-white/10 border-white/15 hover:bg-white/15 hover:border-brand-tealLight/70' : 'bg-brand-surface border-brand-border hover:bg-brand-tealLight/20 hover:border-brand-blue/50',
        cardStrong: isHomeDark ? 'text-white' : 'text-brand-dark',
        cardMuted: isHomeDark ? 'text-white' : 'text-brand-muted',
        uploadIcon: isHomeDark ? 'bg-white/10 text-white group-hover:bg-brand-blue/30' : 'bg-brand-bg text-brand-blue group-hover:bg-brand-tealLight/35',
        supportIcon: isHomeDark ? 'bg-white/10 text-white group-hover:text-white' : 'bg-brand-tealLight/30 text-brand-teal group-hover:text-brand-blue',
        panel: isHomeDark ? 'bg-white/10 border-white/15' : 'bg-brand-surface/80 border-brand-border',
        row: isHomeDark ? 'bg-white/10 border-white/15 hover:bg-white/15 hover:border-brand-tealLight/70' : 'bg-brand-bg border-brand-border hover:bg-brand-tealLight/20 hover:border-brand-teal',
        fileIcon: isHomeDark ? 'bg-white/10 border-white/15 text-white' : 'bg-brand-surface border-brand-border text-brand-blue',
    };

    // --- RENDER ---

    const renderModal = () => {
        if (!modalConfig.isOpen) return null;
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-dark/35 backdrop-blur-sm">
                <div className="bg-brand-bg border border-brand-border rounded-xl p-6 max-w-md w-full shadow-2xl">
                    <h3 className="text-xl font-semibold text-brand-dark mb-2">{modalConfig.title}</h3>
                    <p className="text-brand-muted mb-6 whitespace-pre-wrap">{modalConfig.message}</p>
                    
                    {modalConfig.type === 'prompt' && modalConfig.promptText && (
                        <textarea 
                            readOnly 
                            className="w-full h-32 bg-brand-surface text-brand-text p-3 rounded-lg border border-brand-border mb-6 font-mono text-sm"
                            value={modalConfig.promptText}
                        />
                    )}

                    <div className="flex justify-end gap-3">
                        {(modalConfig.type === 'confirm' || modalConfig.type === 'prompt') && (
                            <button 
                                onClick={modalConfig.onCancel}
                                className="px-4 py-2 rounded-lg text-brand-muted hover:bg-brand-surface transition-colors"
                            >
                                Cancel
                            </button>
                        )}
                        <button 
                            onClick={() => {
                                if (modalConfig.onConfirm) modalConfig.onConfirm();
                                setModalConfig(prev => ({ ...prev, isOpen: false }));
                            }}
                            className="px-4 py-2 rounded-lg bg-brand-blue text-white hover:bg-brand-dark transition-colors"
                        >
                            {modalConfig.type === 'confirm' ? 'Confirm' : 'OK'}
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    if (currentView === 'flashcards') {
        return (
            <>
                <FlashcardList onBack={() => setCurrentView(pdfDocument ? 'reader' : 'home')} />
                {renderModal()}
            </>
        );
    }

    if (!pdfDocument || currentView === 'home') {
        // Landing Screen
        return (
            <>
            <div className={`min-h-screen ${homeClasses.page} flex flex-col items-center justify-center p-6 relative transition-colors duration-300`}>
                <div className={`absolute top-0 left-0 w-full h-96 bg-gradient-to-b ${homeClasses.gradient} pointer-events-none`}></div>
                <div className={`absolute top-5 right-5 z-20 flex rounded-lg border p-1 shadow-sm ${homeClasses.themeControl}`}>
                    <button
                        onClick={() => setTheme(ReaderTheme.LIGHT)}
                        className={`p-1.5 rounded transition-colors ${theme === ReaderTheme.LIGHT ? 'bg-brand-bg shadow-sm text-brand-blue' : homeClasses.inactiveThemeButton}`}
                        title="Light theme"
                    >
                        <Monitor size={16} />
                    </button>
                    <button
                        onClick={() => setTheme(ReaderTheme.SEPIA)}
                        className={`p-1.5 rounded transition-colors ${theme === ReaderTheme.SEPIA ? 'bg-brand-amber shadow-sm text-brand-dark' : homeClasses.inactiveThemeButton}`}
                        title="Sepia theme"
                    >
                        <Sun size={16} />
                    </button>
                    <button
                        onClick={() => setTheme(ReaderTheme.DARK)}
                        className={`p-1.5 rounded transition-colors ${theme === ReaderTheme.DARK ? 'bg-brand-blue shadow-sm text-white' : homeClasses.inactiveThemeButton}`}
                        title="Dark theme"
                    >
                        <Moon size={16} />
                    </button>
                </div>
                <div className="max-w-4xl w-full flex flex-col items-center space-y-12 z-10">
                    <div className="text-center space-y-4">
                        <div className={`inline-flex justify-center p-4 rounded-2xl shadow-xl mb-2 border ${homeClasses.logoCard}`}>
                            <img src={logoUrl} alt="Booklingo logo" className="h-24 w-24 rounded-xl object-cover" />
                        </div>
                        <h1 className={`text-4xl font-serif ${homeClasses.title}`}>Booklingo</h1>
                        <p className={`${homeClasses.subtitle} text-lg max-w-md mx-auto`}>
                            Upload a PDF to start reading with translation support.
                        </p>
                    </div>

                    <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                             {/* New Book Card */}
                            <h2 className={`text-lg font-semibold flex items-center gap-2 ${homeClasses.sectionTitle}`}>
                                <Upload size={20} className="text-brand-teal" />
                                Start Reading
                            </h2>
                            <div className="relative group h-64">
                                <div className="absolute -inset-1 bg-gradient-to-r from-brand-blue to-brand-teal rounded-xl blur opacity-20 group-hover:opacity-35 transition duration-1000"></div>
                                <div className={`relative h-full rounded-xl p-8 shadow-sm border transition-all flex flex-col items-center justify-center text-center cursor-pointer ${homeClasses.card}`}>
                                    <input type="file" accept=".pdf" onChange={handleFileUpload} disabled={isLoadingPDF} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20" />
                                    {isLoadingPDF ? (
                                        <div className="flex flex-col items-center gap-4 animate-pulse">
                                            <Loader2 className="animate-spin text-brand-blue" size={40} />
                                            <p className={`font-medium ${homeClasses.cardMuted}`}>Processing...</p>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center gap-4">
                                            <div className={`p-4 rounded-full group-hover:scale-110 transition-transform duration-300 ${homeClasses.uploadIcon}`}>
                                                <Upload size={32} />
                                            </div>
                                            <div className="space-y-1">
                                                <p className={`font-semibold text-lg ${homeClasses.cardStrong}`}>New Book</p>
                                                <p className={`text-sm ${homeClasses.cardMuted}`}>Click to upload PDF</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            {/* Flashcards Button */}
                            <button 
                                onClick={() => setCurrentView('flashcards')}
                                className={`w-full flex items-center justify-between p-4 border rounded-xl transition-all group ${homeClasses.card}`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${homeClasses.supportIcon}`}>
                                        <Layers size={20} />
                                    </div>
                                    <div className="text-left">
                                        <p className={`font-semibold ${homeClasses.cardStrong}`}>Flashcards</p>
                                        <p className={`text-xs ${homeClasses.cardMuted}`}>Review your saved words</p>
                                    </div>
                                </div>
                                <Monitor size={16} className={`${homeClasses.cardMuted} group-hover:text-brand-blue`} />
                            </button>
                        </div>

                        <div className="space-y-4 flex flex-col h-full">
                            <h2 className={`text-lg font-semibold flex items-center gap-2 ${homeClasses.sectionTitle}`}>
                                <Clock size={20} className="text-brand-teal" />
                                Recent Library
                            </h2>
                            <div className={`flex-1 backdrop-blur-sm rounded-xl border p-4 shadow-sm overflow-y-auto max-h-[400px] custom-scrollbar ${homeClasses.panel}`}>
                                {isStorageLoading ? (
                                    <div className="flex justify-center items-center h-32">
                                        <Loader2 className="animate-spin text-brand-blue" />
                                    </div>
                                ) : recentBooks.length === 0 ? (
                                    <div className={`flex flex-col items-center justify-center h-full gap-2 py-8 ${homeClasses.cardMuted}`}>
                                        <img src={logoUrl} alt="" className="h-14 w-14 rounded-xl object-cover opacity-25" />
                                        <p className="text-sm">No recent books.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {recentBooks.map((book) => (
                                            <div 
                                                key={book.id}
                                                onClick={() => handleOpenRecent(book.id)}
                                                className={`group flex items-center justify-between p-3 border rounded-lg transition-all cursor-pointer ${homeClasses.row}`}
                                            >
                                                <div className="flex items-center gap-3 overflow-hidden">
                                                    <div className={`min-w-[40px] h-12 rounded flex items-center justify-center border ${homeClasses.fileIcon}`}>
                                                        <FileText size={20} />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <h3 className={`font-medium truncate text-sm transition-colors ${homeClasses.cardStrong}`}>{book.name}</h3>
                                                        <p className={`text-xs flex items-center gap-1 ${homeClasses.cardMuted}`}>
                                                            <span>{book.totalPages} pgs</span>
                                                            <span>&middot;</span>
                                                            <span>{(book.size / 1024 / 1024).toFixed(1)} MB</span>
                                                        </p>
                                                    </div>
                                                </div>
                                                <button 
                                                    onClick={(e) => handleDeleteRecent(e, book.id)}
                                                    className="p-2 text-brand-muted hover:text-brand-amber hover:bg-brand-amber/15 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {renderModal()}
            </>
        );
    }

    // Reader Screen
    return (
        <>
        <div className="flex h-screen w-screen overflow-hidden bg-brand-bg">
            {/* Popover Layer */}
            {definitionState.isVisible && (
                <DefinitionPopover 
                    key={definitionState.text} 
                    isVisible={definitionState.isVisible}
                    isLoading={definitionState.isLoading}
                    text={definitionState.text}
                    definition={definitionState.definition}
                    targetLanguage={definitionState.targetLanguage}
                    position={definitionState.position}
                    onClose={closeDefinition}
                    onExplain={handleExplain}
                    onSaveFlashcard={handleSaveFlashcard}
                    onLanguageChange={handleTranslationLanguageChange}
                />
            )}

            <div className="flex flex-col flex-1 h-full relative">
                <div className="h-14 bg-brand-dark border-b border-brand-border flex items-center justify-between px-6 z-20 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div 
                            onClick={() => setCurrentView('home')}
                            className="cursor-pointer hover:bg-brand-blue/25 p-1.5 rounded-lg transition-colors text-brand-tealLight mr-2"
                        >
                            <img src={logoUrl} alt="Booklingo home" className="h-8 w-8 rounded-md object-cover" />
                        </div>
                        <h2 className="font-semibold text-white truncate max-w-[200px]" title={pdfDocument.fileName}>{pdfDocument.fileName}</h2>
                        <span className="text-xs bg-brand-blue/20 px-2 py-1 rounded text-brand-tealLight">Page {currentPage} of {pdfDocument.numPages}</span>
                    </div>
                    
                    <div className="flex items-center">
                        <div className="flex bg-white/10 rounded-lg p-1 mr-4">
                            <button onClick={() => setTheme(ReaderTheme.LIGHT)} className={`p-1.5 rounded ${theme === ReaderTheme.LIGHT ? 'bg-white shadow-sm text-brand-blue' : 'text-brand-tealLight hover:text-white'}`}><Monitor size={16} /></button>
                            <button onClick={() => setTheme(ReaderTheme.SEPIA)} className={`p-1.5 rounded ${theme === ReaderTheme.SEPIA ? 'bg-brand-amber shadow-sm text-brand-dark' : 'text-brand-tealLight hover:text-white'}`}><Sun size={16} /></button>
                            <button onClick={() => setTheme(ReaderTheme.DARK)} className={`p-1.5 rounded ${theme === ReaderTheme.DARK ? 'bg-brand-blue shadow-sm text-white' : 'text-brand-tealLight hover:text-white'}`}><Moon size={16} /></button>
                        </div>
                        <div className="flex bg-white/10 rounded-lg p-1 mr-4">
                            <button 
                                onClick={toggleReadPage} 
                                className={`p-1.5 rounded flex items-center gap-1 ${isReadingPage ? 'bg-brand-amber text-brand-dark hover:bg-brand-amber/80' : 'text-brand-tealLight hover:text-white'}`}
                                title={isReadingPage ? "Stop reading" : "Read full page"}
                            >
                                {isReadingPage ? <Square size={16} /> : <Play size={16} />}
                            </button>
                        </div>
                        <div className="w-px h-6 bg-white/20 mx-2 hidden sm:block"></div>
                        <div className="flex items-center gap-2">
                             <button onClick={() => setZoomLevel(prev => Math.max(8, prev - 1))} className="p-1.5 text-brand-tealLight hover:text-white rounded-md hover:bg-white/10"><ZoomOut size={16} /></button>
                             <input type="range" min="8" max="25" value={zoomLevel} onChange={(e) => setZoomLevel(parseInt(e.target.value))} className="w-24 accent-brand-amber h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer" />
                             <button onClick={() => setZoomLevel(prev => Math.min(25, prev + 1))} className="p-1.5 text-brand-tealLight hover:text-white rounded-md hover:bg-white/10"><ZoomIn size={16} /></button>
                        </div>
                    </div>
                </div>
                <div className="flex-1 overflow-hidden relative group">
                    <Reader 
                        pdfDocument={pdfDocument} 
                        currentPage={currentPage}
                        theme={theme}
                        zoomLevel={zoomLevel}
                        onTextSelect={handleTextSelect}
                        onPageChange={setCurrentPage}
                        onScroll={closeDefinition}
                    />
                </div>
            </div>
        </div>
        {renderModal()}
        </>
    );
};

export default App;
