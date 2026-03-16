import { randomUUID } from "node:crypto";
import { createAccount } from "../models/index.js";
import {
    createAccountConflictError,
    isDuplicateKeyError,
} from "./account-service.errors.js";

export function createCreateAccountService({
    accountRepository,
    validation,
    accountIdFactory = randomUUID,
} = {}) {
    return async function createAccountRecord({ input } = {}) {
        const parsedInput = validation.parseCreateAccountInput({
            ...input,
            accountId: input?.accountId ?? accountIdFactory(),
        });

        const existingAccount = await accountRepository.findAccountByEmail({
            email: parsedInput.email,
        });

        if (existingAccount) {
            throw createAccountConflictError(
                `Account email is already registered: ${parsedInput.email}`,
                {
                    email: parsedInput.email,
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

