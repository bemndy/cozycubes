import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { Solve } from "./stats-engine";

interface CubeFlowDB extends DBSchema {
  solves: {
    key: string;
    value: Solve;
    indexes: { cubeSize: number; timestamp: number };
  };
}

const DB_NAME = "cozycubes";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<CubeFlowDB>> | null = null;

function getDb(): Promise<IDBPDatabase<CubeFlowDB>> {
  if (!dbPromise) {
    dbPromise = openDB<CubeFlowDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const store = db.createObjectStore("solves", { keyPath: "id" });
        store.createIndex("cubeSize", "cubeSize");
        store.createIndex("timestamp", "timestamp");
      },
    });
  }
  return dbPromise;
}

export async function addSolve(solve: Solve): Promise<void> {
  const db = await getDb();
  await db.put("solves", solve);
}

export async function updateSolve(solve: Solve): Promise<void> {
  const db = await getDb();
  await db.put("solves", solve);
}

export async function deleteSolve(id: string): Promise<void> {
  const db = await getDb();
  await db.delete("solves", id);
}

/** All solves for a cube size, oldest first (stats-engine expects chronological order). */
export async function getSolvesByCubeSize(cubeSize: number): Promise<Solve[]> {
  const db = await getDb();
  const all = await db.getAllFromIndex("solves", "cubeSize", cubeSize);
  return all.sort((a, b) => a.timestamp - b.timestamp);
}

export async function clearAllSolves(): Promise<void> {
  const db = await getDb();
  await db.clear("solves");
}
