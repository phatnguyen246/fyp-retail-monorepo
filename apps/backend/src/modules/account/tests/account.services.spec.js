import { describe, expect, it, vi } from "vitest";
import {
    createCreateAccountService,
    createEnsureEmailAvailableService,
    createGetAccountByEmailService,
    createGetAccountByIdService,
} from "../services/index.js";

describe("account services", () => {
    describe("createAccount", () => {
        it("creates account with generated accountId and normalized input", async () => {
            const accountRepository = {
                findAccountByEmail: vi.fn().mockResolvedValue(null),
                createAccount: vi.fn().mockResolvedValue(undefined),
            };
            const validation = {
                parseCreateAccountInput: vi.fn().mockImplementation((input) => ({
                    ...input,
                    email: String(input.email).trim().toLowerCase(),
                })),
            };
            const service = createCreateAccountService({
                accountRepository,
                validation,
                accountIdFactory: () => "acc-generated-1",
            });

            const result = await service({
                input: {
                    email: "  USER@Example.com ",
                    passwordHash: "hash",
                    role: "customer",
                },
            });

            expect(validation.parseCreateAccountInput).toHaveBeenCalledWith({
                email: "  USER@Example.com ",
                passwordHash: "hash",
                role: "customer",
                accountId: "acc-generated-1",
            });
            expect(accountRepository.findAccountByEmail).toHaveBeenCalledWith({
                email: "user@example.com",
            });
            expect(accountRepository.createAccount).toHaveBeenCalledTimes(1);
            expect(result.accountId).toBe("acc-generated-1");
            expect(result.email).toBe("user@example.com");
            expect(result.role).toBe("customer");
        });

        it("throws ACCOUNT_CONFLICT when duplicate key happens during create (race safe)", async () => {
            const accountRepository = {
                findAccountByEmail: vi.fn().mockResolvedValue(null),
                createAccount: vi.fn().mockRejectedValue({
                    code: 11000,
                }),
            };
            const validation = {
                parseCreateAccountInput: vi.fn().mockReturnValue({
                    accountId: "acc-2",
                    email: "race@example.com",
                    passwordHash: "hash",
                    role: "customer",
                }),
            };
            const service = createCreateAccountService({
                accountRepository,
                validation,
            });

            await expect(
                service({
                    input: {
                        email: "race@example.com",
                        passwordHash: "hash",
                        role: "customer",
                    },
                })
            ).rejects.toMatchObject({
                httpStatus: 409,
                code: "ACCOUNT_CONFLICT",
            });
        });
    });

    describe("ensureEmailAvailable", () => {
        it("returns available=true for non-string normalized email without querying repository", async () => {
            const accountRepository = {
                findAccountByEmail: vi.fn(),
            };
            const validation = {
                normalizers: {
                    normalizeEmailInput: vi.fn().mockReturnValue(undefined),
                },
            };
            const service = createEnsureEmailAvailableService({
                accountRepository,
                validation,
            });

            const result = await service({
                email: "   ",
            });

            expect(result).toEqual({
                email: null,
                available: true,
            });
            expect(accountRepository.findAccountByEmail).not.toHaveBeenCalled();
        });

        it("throws ACCOUNT_CONFLICT when normalized email already exists", async () => {
            const accountRepository = {
                findAccountByEmail: vi.fn().mockResolvedValue({
                    accountId: "acc-3",
                }),
            };
            const validation = {
                normalizers: {
                    normalizeEmailInput: vi.fn().mockReturnValue("taken@example.com"),
                },
            };
            const service = createEnsureEmailAvailableService({
                accountRepository,
                validation,
            });

            await expect(
                service({
                    email: "Taken@Example.com",
                })
            ).rejects.toMatchObject({
                httpStatus: 409,
                code: "ACCOUNT_CONFLICT",
                meta: {
                    email: "taken@example.com",
                },
            });
        });
    });

    describe("getAccountByEmail", () => {
        it("returns null when email is invalid after normalization", async () => {
            const accountRepository = {
                findAccountByEmail: vi.fn(),
            };
            const validation = {
                normalizers: {
                    normalizeEmailInput: vi.fn().mockReturnValue(undefined),
                },
            };
            const service = createGetAccountByEmailService({
                accountRepository,
                validation,
            });

            const result = await service({
                email: " ",
                projection: {
                    accountId: 1,
                },
            });

            expect(result).toBeNull();
            expect(accountRepository.findAccountByEmail).not.toHaveBeenCalled();
        });
    });

    describe("getAccountById", () => {
        it("passes accountId and projection to repository", async () => {
            const accountRepository = {
                findAccountByAccountId: vi.fn().mockResolvedValue({
                    accountId: "acc-9",
                    email: "id@example.com",
                }),
            };
            const service = createGetAccountByIdService({
                accountRepository,
            });

            const result = await service({
                accountId: "acc-9",
                projection: {
                    email: 1,
                },
            });

            expect(accountRepository.findAccountByAccountId).toHaveBeenCalledWith({
                accountId: "acc-9",
                projection: {
                    email: 1,
                },
            });
            expect(result).toMatchObject({
                accountId: "acc-9",
            });
        });
    });
});
