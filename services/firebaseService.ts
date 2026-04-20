import { doc, getDoc, collection, getDocs, writeBatch, setDoc } from 'firebase/firestore';
import { db, auth } from './firebase';
import { exportAllData, importAllData } from './localStorageManager';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: any;
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  // Only throw OFFLINE_ERROR if the error message actually indicates a connectivity issue
  const connectivityKeywords = ['offline', 'network', 'connection', 'unavailable', 'failed-precondition'];
  const isNetworkError = connectivityKeywords.some(kw => errorMessage.toLowerCase().includes(kw));

  if (isNetworkError) {
      throw new Error('OFFLINE_ERROR');
  }

  const errInfo: FirestoreErrorInfo = {
    error: errorMessage,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.error('Firestore Error Details: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

const CHUNK_SIZE = 800000; // 800,000 characters (~800KB) to stay safely under Firestore's 1MB limit

const getUserPath = () => {
    const user = auth.currentUser;
    if (!user) throw new Error("AUTH_REQUIRED_ERROR");
    return user.uid;
};

export const saveAiKeyToCloud = async (inspectorName: string, apiKey: string) => {
    try {
        const userId = getUserPath();
        const path = `backups/${userId}`;
        const metaRef = doc(db, 'backups', userId);
        await setDoc(metaRef, { geminiApiKey: apiKey, inspectorName }, { merge: true });
    } catch (e) {
        if (e instanceof Error && e.message.includes('permission')) {
             handleFirestoreError(e, OperationType.WRITE, `backups/${auth.currentUser?.uid}`);
        }
        if (e instanceof Error && e.message === 'AUTH_REQUIRED_ERROR') {
            // Background save of AI key shouldn't spam console if not logged in
            return;
        }
        console.error("Failed to save AI key:", e);
    }
};

export const loadAiKeyFromCloud = async (inspectorName: string): Promise<string | null> => {
    try {
        const userId = getUserPath();
        const metaRef = doc(db, 'backups', userId);
        const metaSnap = await getDoc(metaRef);
        if (metaSnap.exists() && metaSnap.data().geminiApiKey) {
            return metaSnap.data().geminiApiKey;
        }
    } catch (e) {
        if (e instanceof Error && e.message.includes('permission')) {
             handleFirestoreError(e, OperationType.GET, `backups/${auth.currentUser?.uid}`);
        }
        console.error("Failed to load AI key:", e);
    }
    return null;
};

export const syncToCloud = async (inspectorName: string) => {
    const userId = getUserPath();

    const data = exportAllData();
    const jsonString = JSON.stringify(data);
// ... existing code continues below ...

    // Split the large JSON string into smaller chunks
    const chunks: string[] = [];
    for (let i = 0; i < jsonString.length; i += CHUNK_SIZE) {
        chunks.push(jsonString.substring(i, i + CHUNK_SIZE));
    }

    // Use a batch to write all chunks atomically (up to 500 operations per batch)
    const batch = writeBatch(db);

    // 1. Update the main metadata document
    const metaRef = doc(db, 'backups', userId);
    batch.set(metaRef, {
        totalChunks: chunks.length,
        updatedAt: new Date().toISOString(),
        inspectorName
    }, { merge: true });

    // 2. Write each chunk to a subcollection
    for (let i = 0; i < chunks.length; i++) {
        const chunkRef = doc(db, 'backups', userId, 'chunks', i.toString());
        batch.set(chunkRef, {
            index: i,
            data: chunks[i]
        });
    }

    // Commit the batch to Firestore
    try {
        await batch.commit();
    } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, `backups/${userId}`);
    }
};

export const syncFromCloud = async (inspectorName: string) => {
    const userId = getUserPath();

    // 1. Get metadata
    const metaRef = doc(db, 'backups', userId);
    let metaSnap;
    try {
        metaSnap = await getDoc(metaRef);
    } catch (e) {
        handleFirestoreError(e, OperationType.GET, `backups/${userId}`);
    }

    if (!metaSnap || !metaSnap.exists()) {
        // Fallback: Check if they have an old backup in the previous 'users_data' collection
        const legacyDocRef = doc(db, 'users_data', inspectorName);
        const legacyDocSnap = await getDoc(legacyDocRef);
        if (legacyDocSnap.exists() && legacyDocSnap.data().backupData) {
            const parsedData = JSON.parse(legacyDocSnap.data().backupData);
            importAllData(parsedData);
            return true;
        }
        throw new Error("لم يتم العثور على أي نسخة احتياطية في السحابة لهذا المستخدم.");
    }

    const totalChunks = metaSnap.data().totalChunks;
    if (!totalChunks) throw new Error("بيانات النسخة الاحتياطية تالفة.");

    // 2. Get all chunks from the subcollection
    const chunksRef = collection(db, 'backups', userId, 'chunks');
    let chunksSnap;
    try {
        chunksSnap = await getDocs(chunksRef);
    } catch (e) {
        handleFirestoreError(e, OperationType.LIST, `backups/${userId}/chunks`);
    }

    if (!chunksSnap || chunksSnap.empty) {
        throw new Error("لم يتم العثور على أجزاء البيانات في السحابة.");
    }

    // 3. Reconstruct the JSON string
    const chunksData: { index: number, data: string }[] = [];
    chunksSnap.forEach(doc => {
        chunksData.push(doc.data() as { index: number, data: string });
    });

    // Sort by index
    chunksData.sort((a, b) => a.index - b.index);

    // CRITICAL: Filter chunks to only include those that belong to the CURRENT backup version
    // If a previous backup had more chunks, those leftover documents might still exist in the collection.
    const validChunks = chunksData.filter(c => c.index >= 0 && c.index < totalChunks);

    const fullJsonString = validChunks.map(c => c.data).join('').trim();

    // 4. Parse and import
    try {
        const parsedData = JSON.parse(fullJsonString);
        
        // Merge geminiApiKey from metadata if it exists
        if (metaSnap.data().geminiApiKey) {
            parsedData.geminiApiKey = metaSnap.data().geminiApiKey;
        }
        
        importAllData(parsedData);
        return true;
    } catch (e: any) {
        console.error("JSON Parse Error during Sync:", e);
        console.log("Raw string length:", fullJsonString.length);
        console.log("String start:", fullJsonString.substring(0, 100));
        console.log("String end:", fullJsonString.substring(fullJsonString.length - 100));
        throw new Error(`خطأ في معالجة البيانات المسترجعة: ${e.message}`);
    }
};
