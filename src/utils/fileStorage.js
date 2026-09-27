const DB_NAME = 'studyflow-files';
const STORE_NAME = 'files';

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function requestStore(mode, action) {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, mode);
    const request = action(transaction.objectStore(STORE_NAME));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  }).finally(() => database.close());
}

export const saveFile = record => requestStore('readwrite', store => store.put(record));
export const getFile = id => requestStore('readonly', store => store.get(id));
export const getFiles = kind => requestStore('readonly', store => store.getAll()).then(files => files.filter(file => file.kind === kind));
export const removeFile = id => requestStore('readwrite', store => store.delete(id));

export async function openStoredFile(id) {
  const record = await getFile(id);
  if (!record) return;
  const url = URL.createObjectURL(record.file);
  window.open(url, '_blank', 'noopener,noreferrer');
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
