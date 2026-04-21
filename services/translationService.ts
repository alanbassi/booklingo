import { TranslationLanguage } from "../types";

const TRANSLATE_ENDPOINT = 'https://translate.googleapis.com/translate_a/single';

type GoogleTranslateChunk = [string, string, ...unknown[]];

export const translationLanguageLabels: Record<TranslationLanguage, string> = {
    pt: 'Portuguese',
    es: 'Spanish',
    'zh-CN': 'Chinese',
};

export const translationLanguageOptions = Object.keys(translationLanguageLabels) as TranslationLanguage[];

const fetchGoogleTranslate = async (text: string, targetLanguage: TranslationLanguage): Promise<string> => {
    const params = new URLSearchParams({
        client: 'gtx',
        sl: 'en',
        tl: targetLanguage,
        dt: 't',
        q: text,
    });

    const response = await fetch(`${TRANSLATE_ENDPOINT}?${params.toString()}`);

    if (!response.ok) {
        throw new Error('Translation request failed.');
    }

    const data = await response.json() as [GoogleTranslateChunk[]?];
    const chunks = data[0] ?? [];
    const translation = chunks.map(([translatedText]) => translatedText).join('');

    return translation || 'Translation not found.';
};

export const getWordTranslation = async (
    text: string,
    targetLanguage: TranslationLanguage = 'pt',
    _context?: string
): Promise<string> => {
    try {
        return await fetchGoogleTranslate(text, targetLanguage);
    } catch (error) {
        console.error('Google Translate Error:', error);
        return 'Translation service connection error.';
    }
};
