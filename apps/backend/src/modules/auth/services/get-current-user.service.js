import {
    createAuthUnauthorizedError,
} from "./auth-service.errors.js";
import { mapCurrentAuthenticatedUser } from "../utils/index.js";

export function createGetCurrentUserService({
    accountReader,
} = {}) {
    return async function getCurrentUser({ accountId } = {}) {
        if (typeof accountId !== "string" || accountId.trim().length === 0) {
            throw createAuthUnauthorizedError();
        }

        const account = await accountReader.findAccountById({
            accountId: accountId.trim(),
        });

        if (!account) {
            throw createAuthUnauthorizedError();
        }

        return mapCurrentAuthenticatedUser(account);
    };
}

