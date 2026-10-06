import { LocalStorage } from "./local";
import type { Storage } from "./types";

export function getStorage(): Storage {
	const provider = process.env.STORAGE_PROVIDER || "local";
	if (provider === "local") {
		return new LocalStorage();
	}

	throw new Error(`Unsupported storage provider: ${provider}`);
}
