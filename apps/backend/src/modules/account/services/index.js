import { createAccountAdapters } from "../adapters/index.js";
import { createAccountHealthPayload } from "../utils/index.js";
import { createAccountValidation } from "../validation/index.js";
import { createCreateAccountService } from "./create-account.service.js";
import { createEnsureEmailAvailableService } from "./ensure-email-available.service.js";
import { createGetAccountByEmailService } from "./get-account-by-email.service.js";
import { createGetAccountByIdService } from "./get-account-by-id.service.js";
import { createSeedAdminAccountService } from "./seed-admin-account.service.js";

export { createCreateAccountService } from "./create-account.service.js";
export { createEnsureEmailAvailableService } from "./ensure-email-available.service.js";
export { createGetAccountByEmailService } from "./get-account-by-email.service.js";
export { createGetAccountByIdService } from "./get-account-by-id.service.js";
export { createSeedAdminAccountService } from "./seed-admin-account.service.js";

export function createAccountServices({
    adapters = createAccountAdapters(),
    validation = createAccountValidation(),
} = {}) {
    const accountRepository = adapters?.persistence?.accountRepository;

    return {
        getHealth() {
            return createAccountHealthPayload();
        },
        createAccount: createCreateAccountService({
            accountRepository,
            validation,
        }),
        getAccountById: createGetAccountByIdService({
            accountRepository,
        }),
        getAccountByEmail: createGetAccountByEmailService({
            accountRepository,
            validation,
        }),
        ensureEmailAvailable: createEnsureEmailAvailableService({
            accountRepository,
            validation,
        }),
        seedAdminAccount: createSeedAdminAccountService({
            accountRepository,
            validation,
        }),
    };
}

