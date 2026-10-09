export async function writeDraftRecord({
  key,
  raw,
  store = "drafts",
}: {
  key: string;
  raw: string;
  store?: string;
}) {
  await new Promise<void>((resolve, reject) => {
    const open = indexedDB.open("blog-writer", 1);
    open.onupgradeneeded = () => {
      open.result.createObjectStore("drafts");
      open.result.createObjectStore("recovery");
    };
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const db = open.result;
      const transaction = db.transaction(store, "readwrite");
      transaction.objectStore(store).put(raw, key);
      transaction.oncomplete = () => {
        db.close();
        resolve();
      };
      transaction.onabort = () => {
        db.close();
        reject(transaction.error);
      };
    };
  });
}
export async function readDraftRecord({
  key,
  store = "drafts",
}: {
  key: string;
  store?: string;
}): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open("blog-writer", 1);
    open.onupgradeneeded = () => {
      open.result.createObjectStore("drafts");
      open.result.createObjectStore("recovery");
    };
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const db = open.result;
      const transaction = db.transaction(store, "readonly");
      const read = transaction.objectStore(store).get(key);
      transaction.oncomplete = () => {
        db.close();
        resolve(read.result ?? null);
      };
      transaction.onabort = () => {
        db.close();
        reject(transaction.error);
      };
    };
  });
}
