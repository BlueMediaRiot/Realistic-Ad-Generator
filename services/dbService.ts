

const DB_NAME = 'MediaRiotDB';
const DB_VERSION = 1;
const STORE_NAME = 'projects';
const KEY = 'current_project';

export const initDB = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
        // We don't keep the connection open globally in this pattern
        const db = request.result;
        db.close();
        resolve();
    };
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
};

export const saveProject = async (data: any): Promise<void> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const putReq = store.put(data, KEY);
      putReq.onsuccess = () => {
          // Important: Close DB to avoid blocking future delete operations
          db.close();
          resolve();
      };
      putReq.onerror = () => {
          db.close();
          reject(putReq.error);
      };
    };
    request.onerror = () => reject(request.error);
  });
};

export const loadProject = async (): Promise<any | null> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const getReq = store.get(KEY);
      getReq.onsuccess = () => {
          db.close();
          resolve(getReq.result);
      };
      getReq.onerror = () => {
          db.close();
          reject(getReq.error);
      };
    };
    request.onerror = () => reject(request.error);
  });
};

// NUCLEAR OPTION: Force Close and Delete with Timeout Fallback
export const resetFullProject = async (): Promise<void> => {
    console.log("[DB] Starting full reset sequence...");
    
    // 1. Clear Object Store first (most reliable)
    try {
        const db = await new Promise<IDBDatabase>((resolve, reject) => {
            const req = indexedDB.open(DB_NAME, DB_VERSION);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
        
        console.log("[DB] Clearing object store...");
        // Transaction to clear content
        const tx = db.transaction(STORE_NAME, 'readwrite');
        await new Promise<void>((resolve, reject) => {
            const req = tx.objectStore(STORE_NAME).clear();
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });

        db.close();
        console.log("[DB] Store cleared.");
    } catch (e) {
        console.warn("[DB] Error clearing store (proceeding to delete attempt):", e);
    }

    // 2. Attempt Delete with Timeout
    return new Promise((resolve) => {
        console.log("[DB] Deleting database file...");
        const req = indexedDB.deleteDatabase(DB_NAME);
        
        // Race condition timeout - if blocked, we assume the previous clear() was sufficient
        const timeout = setTimeout(() => {
            console.warn("[DB] Delete timed out (likely blocked). Proceeding since store is cleared.");
            resolve();
        }, 500);

        req.onsuccess = () => {
            clearTimeout(timeout);
            console.log("[DB] Database deleted successfully.");
            resolve();
        };
        
        req.onerror = () => {
            clearTimeout(timeout);
            console.error("[DB] Failed to delete database:", req.error);
            resolve(); 
        };
        
        req.onblocked = () => {
            console.warn("[DB] Delete blocked.");
            // Don't resolve here, let timeout handle it
        };
    });
};