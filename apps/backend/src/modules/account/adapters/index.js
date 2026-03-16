import { createAccountPersistence } from "./persistence/index.js";

export function createAccountAdapters({ db } = {}) {
    return {
        persistence: createAccountPersistence({ db }),
    };
}

