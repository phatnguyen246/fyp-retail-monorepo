import {
    createAuthInvalidCredentialsError,
} from "./auth-service.errors.js";
import { mapCurrentAuthenticatedUser } from "../utils/index.js";

export function createLoginService({
    accountReader,
    jwtService,
    passwordHasher,
    validation,
} = {}) {
    return async function login({ input } = {}) {
        const parsedInput = validation.parseLoginInput(input ?? {});
        const account = await accountReader.findAccountByEmail({
            email: parsedInput.email,
        });

        if (!account) {
            throw createAuthInvalidCredentialsError();
        }

        const isPasswordValid = await passwordHasher.verifyPassword(
            parsedInput.password,
            account.passwordHash
        );

        if (!isPasswordValid) {
            throw createAuthInvalidCredentialsError();
        }

        return {
            accessToken: jwtService.issueAccessToken({
                accountId: account.accountId,
                role: account.role,
                email: account.email,
            }),
            currentUser: mapCurrentAuthenticatedUser(account),
        };
    };
}

