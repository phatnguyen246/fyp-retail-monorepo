import { createAccountConflictError } from "./account-service.errors.js";

export function createEnsureEmailAvailableService({
    accountRepository,
    validation,
} = {}) {
    return async function ensureEmailAvailable({ email } = {}) {
        const normalizedEmail =
            validation.normalizers.normalizeEmailInput(email);

        if (typeof normalizedEmail !== "string") {
            return {
                email: normalizedEmail ?? null,
                available: true,
            };
        }

        const existingAccount = await accountRepository.findAccountByEmail({
            email: normalizedEmail,
        });

        if (existingAccount) {
            throw createAccountConflictError(
                `Account email is already registered: ${normalizedEmail}`,
                {
                    email: normalizedEmail,
                }
            );
        }

        return {
            email: normalizedEmail,
            available: true,
        };
    };
}

