/**
 * MY TRACKS: audio files the player chose to keep in their Signal Pack.
 *
 * Stored in this browser's IndexedDB only (never uploaded), so they exist on this
 * PC and nowhere else. A kept track is replayed through the normal custom-audio
 * path, so its course, boards and cache behave exactly like a fresh import.
 */

const DB_NAME = 'm0vem1nt.myTracks';
const STORE = 'tracks';
/** Keeps storage use sane: a few dozen songs, none absurdly large. */
export const MY_TRACKS_MAX_COUNT = 30;
export const MY_TRACKS_MAX_BYTES = 80 * 1024 * 1024;

export interface MyTrackInfo {
  id: string;
  name: string;
  size: number;
  addedAt: number;
}

interface MyTrackRecord extends MyTrackInfo {
  type: string;
  blob: Blob;
}

/** Same file twice is one entry: name + size is enough for a personal library. */
export function myTrackId(name: string, size: number): string {
  return `${name.toLowerCase()}|${size}`;
}

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('storage unavailable'));
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('storage error'));
  });
}

function run<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return open().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const req = fn(tx.objectStore(STORE));
        tx.oncomplete = () => {
          db.close();
          resolve(req.result);
        };
        tx.onerror = tx.onabort = () => {
          db.close();
          reject(tx.error ?? new Error('storage error'));
        };
      })
  );
}

export const myTracksStore = {
  async list(): Promise<MyTrackInfo[]> {
    try {
      const all = (await run('readonly', (s) => s.getAll())) as MyTrackRecord[];
      return all
        .map(({ id, name, size, addedAt }) => ({ id, name, size, addedAt }))
        .sort((a, b) => b.addedAt - a.addedAt);
    } catch {
      return [];
    }
  },

  /** Keeps a copy of the file. Returns a short reason if it could not be kept. */
  async add(file: File): Promise<{ ok: true } | { ok: false; reason: string }> {
    try {
      if (file.size > MY_TRACKS_MAX_BYTES) return { ok: false, reason: 'FILE TOO LARGE TO KEEP (80 MB MAX)' };
      const existing = await this.list();
      const id = myTrackId(file.name, file.size);
      if (existing.some((t) => t.id === id)) return { ok: true };
      if (existing.length >= MY_TRACKS_MAX_COUNT) return { ok: false, reason: `MY TRACKS IS FULL (${MY_TRACKS_MAX_COUNT} MAX)` };
      const record: MyTrackRecord = { id, name: file.name, size: file.size, addedAt: Date.now(), type: file.type, blob: file };
      await run('readwrite', (s) => s.put(record));
      return { ok: true };
    } catch {
      return { ok: false, reason: 'THIS BROWSER WOULD NOT STORE THE FILE' };
    }
  },

  async getFile(id: string): Promise<File | null> {
    try {
      const rec = (await run('readonly', (s) => s.get(id))) as MyTrackRecord | undefined;
      return rec ? new File([rec.blob], rec.name, { type: rec.type }) : null;
    } catch {
      return null;
    }
  },

  async remove(id: string): Promise<void> {
    try {
      await run('readwrite', (s) => s.delete(id));
    } catch {
      /* nothing to remove */
    }
  }
};
