import { createAccountBaseRepository } from "./account-base.repository.js";
import { ensureAccountIndexes } from "./account-indexes.js";
import { createAccountRepository } from "./account.repository.js";

export { createAccountBaseRepository } from "./account-base.repository.js";
export { ensureAccountIndexes } from "./account-indexes.js";
export { createAccountRepository } from "./account.repository.js";

export function createAccountPersistence({ db } = {}) {
    const baseRepository = createAccountBaseRepository({ db });

    return {
        baseRepository,
        accountRepository: createAccountRepository({
            db,
            baseRepository,
        }),
    };
}

