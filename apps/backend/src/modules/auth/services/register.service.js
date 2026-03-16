import { CART_GUEST_COOKIE_NAME } from "../../cart/constants/index.js";
import { mapCurrentAuthenticatedUser } from "../utils/index.js";
import { createAuthConflictError } from "./auth-service.errors.js";

export function createRegisterService({
    accountReader,
    cartServices,
    jwtService,
    passwordHasher,
    validation,
} = {}) {
    return async function register({ input, guestId } = {}) {
        const parsedInput = validation.parseRegisterInput(input ?? {});
        const existingAccount = await accountReader.findAccountByEmail({
            email: parsedInput.email,
        });

        if (existingAccount) {
            throw createAuthConflictError(
                `Email is already registered: ${parsedInput.email}`,
                {
                    email: parsedInput.email,
                }
            );
        }

        const passwordHash = await passwordHasher.hashPassword(parsedInput.password);
        let account;

        try {
            account = await accountReader.createCustomerAccount({
                email: parsedInput.email,
                passwordHash,
            });
        } catch (error) {
            if (error?.code === "ACCOUNT_CONFLICT") {
                throw createAuthConflictError(
                    `Email is already registered: ${parsedInput.email}`,
                    {
                        email: parsedInput.email,
                    }
                );
            }

            throw error;
        }
        const accessToken = jwtService.issueAccessToken({
            accountId: account.accountId,
            role: account.role,
            email: account.email,
        });

        if (
            typeof cartServices?.mergeGuestCartToCustomer === "function" &&
            typeof guestId === "string" &&
            guestId.trim().length > 0
        ) {
            await cartServices.mergeGuestCartToCustomer({
                guestId,
                customerAccountId: account.accountId,
            });
        }

        return {
            accessToken,
            currentUser: mapCurrentAuthenticatedUser(account),
            meta: {
                guestCartId:
                    typeof guestId === "string" && guestId.trim().length > 0
                        ? guestId
                        : null,
                cartGuestCookieName: CART_GUEST_COOKIE_NAME,
            },
        };
    };
}
