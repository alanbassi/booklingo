// We treat the pdfjsLib types loosely as 'any' to avoid complex TS setup in this environment,
// but fundamentally it is the PDFDocumentProxy.
export interface LoadedPDF {
    fileName: string;
    numPages: number;
    proxy: any; // PDFDocumentProxy
}

export enum ReaderTheme {
    LIGHT = 'light',
    SEPIA = 'sepia',
    DARK = 'dark',
}

export type TranslationLanguage = 'pt' | 'es' | 'zh-CN';

export type SelectionData = {
    text: string;
    rect: { top: number; left: number; height: number; width: number };
} | null;

export interface DefinitionState {
    isVisible: boolean;
    isLoading: boolean;
    text: string;
    definition: string | null;
    targetLanguage: TranslationLanguage;
    // Optional fields for external explanations.
    isExplanationLoading?: boolean;
    explanation?: string | null;
    position: { top: number; left: number };
}

// --- Flashcards ---

export interface Flashcard {
    id: string;
    word: string;
    definition: string;
    context: string; // The sentence or page context
    createdAt: number;
}
