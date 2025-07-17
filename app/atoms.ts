import { atomWithStorage } from "jotai/utils";
import { atom } from "jotai";

// User-specific context ID storage
export const userIdAtom = atom<string>("");
export const contextIdAtom = atomWithStorage<string>("contextId", "");

// Create user-specific storage key
export const getUserContextKey = (userId: string) => `contextId_${userId || 'anonymous'}`;
