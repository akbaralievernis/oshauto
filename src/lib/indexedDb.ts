// -------------------------------------------------------------
// INDEXEDDB OFFLINE BUFFER UTILITY
// Местоположение: src/lib/indexedDb.ts
// Легкая нативная обертка для IndexedDB очереди оффлайн-оценок
// -------------------------------------------------------------

const DB_NAME = 'OshAutoOfflineDB';
const STORE_NAME = 'ratingsQueue';

export interface OfflineRating {
  id: string;
  vehicle_id: string;
  congestion_status: 'empty' | 'normal' | 'crowded';
  timestamp: string;
}

// Инициализация базы данных в браузере
export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('IndexedDB is only available in browser environment'));
      return;
    }

    const request = indexedDB.open(DB_NAME, 1);
    
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

// Сохранить оценку оффлайн
export const saveOfflineRating = async (rating: OfflineRating): Promise<void> => {
  const db = await initDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(rating);
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

// Получить все накопленные в оффлайне оценки
export const getOfflineRatings = async (): Promise<OfflineRating[]> => {
  const db = await initDB();
  return new Promise<OfflineRating[]>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

// Очистить очередь после успешной синхронизации с базой
export const clearOfflineRatings = async (): Promise<void> => {
  const db = await initDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.clear();
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};
