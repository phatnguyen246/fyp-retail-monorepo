import { randomUUID } from "node:crypto";
import { createAccount } from "../models/index.js";
import {
    createAccountConflictError,
    isDuplicateKeyError,
} from "./account-service.errors.js";

export function createSeedAdminAccountService({
    accountRepository,
    validation,
    accountIdFactory = randomUUID,
} = {}) {
    return async function seedAdminAccount({ input } = {}) {
        const parsedInput = validation.parseCreateAccountInput({
            ...input,
            accountId: input?.accountId ?? accountIdFactory(),
            role: "admin",
        });
        const existingAccount = await accountRepository.findAccountByEmail({
            email: parsedInput.email,
        });

        if (existingAccount) {
            if (existingAccount.role === "admin") {
                return existingAccount;
            }

            throw createAccountConflictError(
                `Account email already belongs to a non-admin account: ${parsedInput.email}`,
                {
                    email: parsedInput.email,
                    accountId: existingAccount.accountId,
                    role: existingAccount.role,
                }
            );
        }

        const account = createAccount(parsedInput);

        try {
            await accountRepository.createAccount({
                document: account,
            });
        } catch (error) {
            if (isDuplicateKeyError(error)) {
                throw createAccountConflictError(
                    `Account email is already registered: ${parsedInput.email}`,
                    {
                        email: parsedInput.email,
                    }
                );
            }

            throw error;
        }

        return account;
    };
}

