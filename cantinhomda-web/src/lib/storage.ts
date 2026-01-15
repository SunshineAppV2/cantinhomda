/**
 * A resilient storage utility that falls back to in-memory storage
 * if localStorage or sessionStorage are blocked (e.g., in private mode or via security policies).
 */

class MemoryStorage implements Storage {
    private data: Record<string, string> = {};

    get length(): number {
        return Object.keys(this.data).length;
    }

    clear(): void {
        this.data = {};
    }

    getItem(key: string): string | null {
        return this.data[key] || null;
    }

    key(index: number): string | null {
        return Object.keys(this.data)[index] || null;
    }

    removeItem(key: string): void {
        delete this.data[key];
    }

    setItem(key: string, value: string): void {
        this.data[key] = String(value);
    }
}

function createSafeStorage(type: 'localStorage' | 'sessionStorage'): Storage {
    try {
        const storage = window[type];
        const testKey = '__storage_test__';
        storage.setItem(testKey, testKey);
        storage.removeItem(testKey);
        return storage;
    } catch (e) {
        console.warn(`[safeStorage] ${type} is not available. Falling back to in-memory storage.`, e);
        return new MemoryStorage();
    }
}

export const safeLocalStorage = createSafeStorage('localStorage');
export const safeSessionStorage = createSafeStorage('sessionStorage');
