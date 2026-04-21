import { LoadedPDF, Flashcard } from "../types";
import { parsePDF } from "./pdfService";

const DB_NAME = 'BooklingoDB';
const LEGACY_DB_NAME = 'LinguistReaderDB';
const DB_VERSION = 2; // Incremented for Flashcards
const STORE_BOOKS = 'books';
const STORE_FLASHCARDS = 'flashcards';

const storeNames = [STORE_BOOKS, STORE_FLASHCARDS] as const;

export interface StoredBookMetadata {
    id: string;
    name: string;
    lastOpened: number;
    totalPages: number;
    size: number;
}

interface StoredBook extends StoredBookMetadata {
    data: ArrayBuffer;
}

const createStores = (db: IDBDatabase) => {
    if (!db.objectStoreNames.contains(STORE_BOOKS)) {
        db.createObjectStore(STORE_BOOKS, { keyPath: 'id' });
    }

    if (!db.objectStoreNames.contains(STORE_FLASHCARDS)) {
        const store = db.createObjectStore(STORE_FLASHCARDS, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt', { unique: false });
    }
};

const openDatabase = (name: string): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(name, DB_VERSION);

        request.onerror = () => reject("Error opening database");

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            createStores(db);
        };

        request.onsuccess = (event) => {
            resolve((event.target as IDBOpenDBRequest).result);
        };
    });
};

const copyStoreData = (source: IDBDatabase, target: IDBDatabase, storeName: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        const sourceTransaction = source.transaction([storeName], 'readonly');
        const sourceStore = sourceTransaction.objectStore(storeName);
        const getAllRequest = sourceStore.getAll();

        getAllRequest.onerror = () => reject(`Error reading legacy ${storeName}`);
        getAllRequest.onsuccess = () => {
            const records = getAllRequest.result;

            if (records.length === 0) {
                resolve();
                return;
            }

            const targetTransaction = target.transaction([storeName], 'readwrite');
            const targetStore = targetTransaction.objectStore(storeName);

            records.forEach((record) => targetStore.put(record));
            targetTransaction.oncomplete = () => resolve();
            targetTransaction.onerror = () => reject(`Error migrating ${storeName}`);
        };
    });
};

const migrateLegacyDatabase = async (target: IDBDatabase): Promise<void> => {
    const legacy = await openDatabase(LEGACY_DB_NAME);

    try {
        await Promise.all(
            storeNames
                .filter((storeName) => legacy.objectStoreNames.contains(storeName))
                .map((storeName) => copyStoreData(legacy, target, storeName))
        );
    } finally {
        legacy.close();
    }
};

let migrationPromise: Promise<void> | null = null;

const openDB = async (): Promise<IDBDatabase> => {
    const db = await openDatabase(DB_NAME);

    migrationPromise ??= migrateLegacyDatabase(db).catch((error) => {
        console.warn('Legacy database migration skipped:', error);
    });

    await migrationPromise;
    return db;
};

// --- BOOK OPERATIONS ---

export const saveBookToStorage = async (file: File, pdfData: LoadedPDF): Promise<StoredBookMetadata> => {
    const db = await openDB();
    const arrayBuffer = await file.arrayBuffer();

    const bookEntry: StoredBook = {
        id: crypto.randomUUID(),
        name: file.name,
        lastOpened: Date.now(),
        totalPages: pdfData.numPages,
        size: file.size,
        data: arrayBuffer
    };

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_BOOKS], 'readwrite');
        const store = transaction.objectStore(STORE_BOOKS);
        const request = store.put(bookEntry);

        request.onsuccess = () => {
            const { data, ...metadata } = bookEntry;
            resolve(metadata);
        };
        request.onerror = () => reject("Error saving book");
    });
};

export const getRecentBooks = async (): Promise<StoredBookMetadata[]> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_BOOKS], 'readonly');
        const store = transaction.objectStore(STORE_BOOKS);
        const request = store.getAll();

        request.onsuccess = () => {
            const results: StoredBook[] = request.result;
            const metadata = results
                .map(({ data, ...meta }) => meta)
                .sort((a, b) => b.lastOpened - a.lastOpened);
            resolve(metadata);
        };
        request.onerror = () => reject("Error fetching books");
    });
};

export const loadBookFromStorage = async (id: string): Promise<{ file: File, meta: StoredBookMetadata }> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_BOOKS], 'readwrite');
        const store = transaction.objectStore(STORE_BOOKS);
        const request = store.get(id);

        request.onsuccess = () => {
            const result: StoredBook = request.result;
            if (!result) {
                reject("Book not found");
                return;
            }
            result.lastOpened = Date.now();
            store.put(result);
            const file = new File([result.data], result.name, { type: 'application/pdf' });
            const { data, ...meta } = result;
            resolve({ file, meta });
        };
        request.onerror = () => reject("Error loading book");
    });
};

export const deleteBookFromStorage = async (id: string): Promise<void> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_BOOKS], 'readwrite');
        const store = transaction.objectStore(STORE_BOOKS);
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = () => reject("Error deleting book");
    });
};

// --- FLASHCARD OPERATIONS ---

export const saveFlashcard = async (word: string, definition: string, context: string): Promise<Flashcard> => {
    const db = await openDB();
    
    const card: Flashcard = {
        id: crypto.randomUUID(),
        word,
        definition,
        context,
        createdAt: Date.now()
    };

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_FLASHCARDS], 'readwrite');
        const store = transaction.objectStore(STORE_FLASHCARDS);
        const request = store.put(card);

        request.onsuccess = () => resolve(card);
        request.onerror = () => reject("Error saving flashcard");
    });
};

export const getFlashcards = async (): Promise<Flashcard[]> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_FLASHCARDS], 'readonly');
        const store = transaction.objectStore(STORE_FLASHCARDS);
        const index = store.index('createdAt');
        // Get all, sort by newest first roughly (cursor direction)
        const request = index.openCursor(null, 'prev');
        const results: Flashcard[] = [];

        request.onsuccess = (event) => {
            const cursor = (event.target as IDBRequest).result;
            if (cursor) {
                results.push(cursor.value);
                cursor.continue();
            } else {
                resolve(results);
            }
        };
        request.onerror = () => reject("Error fetching flashcards");
    });
};

export const deleteFlashcard = async (id: string): Promise<void> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_FLASHCARDS], 'readwrite');
        const store = transaction.objectStore(STORE_FLASHCARDS);
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = () => reject("Error deleting flashcard");
    });
};
