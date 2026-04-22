import express from "express";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
    AUTH_ACCESS_TOKEN_COOKIE_NAME,
    AUTH_ADMIN_ACCESS_TOKEN_COOKIE_NAME,
    AUTH_CUSTOMER_ACCESS_TOKEN_COOKIE_NAME,
} from "../constants/index.js";
import { createAuthCookieService } from "../adapters/cookies/auth-cookie.service.js";
import { createAuthMiddleware } from "../http/auth.middleware.js";
import { createAuthLoginRateLimiter } from "../http/auth.rate-limit.js";

function createRequest({ headers = {}, cookies = {}, originalUrl = "/" } = {}) {
    const normalizedHeaders = new Map(
        Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value])
    );

    return {
        headers,
        cookies,
        originalUrl,
        get(name) {
            return normalizedHeaders.get(String(name).toLowerCase()) ?? undefined;
        },
    };
}

function runMiddleware(middleware, req) {
    return new Promise((resolve) => {
        middleware(req, {}, (error) => resolve(error));
    });
}

describe("auth middleware and cookie service", () => {
    describe("createAuthMiddleware", () => {
        it("optionalAuth clears context when token does not exist", async () => {
            const cookieService = {
                readAccessTokenFromRequest: vi.fn().mockReturnValue(null),
            };
            const jwtService = {
                verifyAccessToken: vi.fn(),
            };
            const middleware = createAuthMiddleware({
                cookieService,
                jwtService,
            });
            const req = createRequest();

            const error = await runMiddleware(middleware.optionalAuth, req);

            expect(error).toBeUndefined();
            expect(req.isAuthenticated).toBe(false);
            expect(req.role).toBe("guest");
            expect(jwtService.verifyAccessToken).not.toHaveBeenCalled();
        });

        it("requireAuth accepts pre-populated req.auth without re-verifying token", async () => {
            const cookieService = {
                readAccessTokenFromRequest: vi.fn(),
            };
            const jwtService = {
                verifyAccessToken: vi.fn(),
            };
            const middleware = createAuthMiddleware({
                cookieService,
                jwtService,
            });
            const req = createRequest();
            req.auth = {
                isAuthenticated: true,
                accountId: "acc-1",
                role: "customer",
                email: "u@example.com",
            };

            const error = await runMiddleware(middleware.requireAuth, req);

            expect(error).toBeUndefined();
            expect(req.isAuthenticated).toBe(true);
            expect(req.accountId).toBe("acc-1");
            expect(cookieService.readAccessTokenFromRequest).not.toHaveBeenCalled();
            expect(jwtService.verifyAccessToken).not.toHaveBeenCalled();
        });

        it("requireAuth returns AUTH_UNAUTHORIZED when token is absent", async () => {
            const cookieService = {
                readAccessTokenFromRequest: vi.fn().mockReturnValue(null),
            };
            const jwtService = {
                verifyAccessToken: vi.fn(),
            };
            const middleware = createAuthMiddleware({
                cookieService,
                jwtService,
            });
            const req = createRequest();

            const error = await runMiddleware(middleware.requireAuth, req);

            expect(error).toMatchObject({
                httpStatus: 401,
                code: "AUTH_UNAUTHORIZED",
            });
            expect(req.isAuthenticated).toBe(false);
            expect(req.role).toBe("guest");
        });

        it("requireAdmin blocks non-admin role even with a valid token", async () => {
            const cookieService = {
                readAccessTokenFromRequest: vi.fn().mockReturnValue("token-1"),
            };
            const jwtService = {
                verifyAccessToken: vi.fn().mockReturnValue({
                    accountId: "acc-2",
                    role: "customer",
                    email: "x@example.com",
                }),
            };
            const middleware = createAuthMiddleware({
                cookieService,
                jwtService,
            });
            const req = createRequest();

            const error = await runMiddleware(middleware.requireAdmin, req);

            expect(error).toMatchObject({
                httpStatus: 403,
                code: "AUTH_FORBIDDEN",
            });
        });

        it("requireAdmin allows admin role and applies auth context", async () => {
            const cookieService = {
                readAccessTokenFromRequest: vi.fn().mockReturnValue("token-admin"),
            };
            const jwtService = {
                verifyAccessToken: vi.fn().mockReturnValue({
                    accountId: "admin-1",
                    role: "admin",
                    email: "admin@example.com",
                }),
            };
            const middleware = createAuthMiddleware({
                cookieService,
                jwtService,
            });
            const req = createRequest({
                headers: {
                    "x-auth-scope": "admin",
                },
            });

            const error = await runMiddleware(middleware.requireAdmin, req);

            expect(error).toBeUndefined();
            expect(req.isAuthenticated).toBe(true);
            expect(req.role).toBe("admin");
            expect(req.accountId).toBe("admin-1");
        });
    });

    describe("createAuthCookieService", () => {
        it("reads access token by scope with expected precedence", () => {
            const cookieService = createAuthCookieService();
            const req = createRequest({
                cookies: {
                    [AUTH_ACCESS_TOKEN_COOKIE_NAME]: "token-default",
                    [AUTH_ADMIN_ACCESS_TOKEN_COOKIE_NAME]: "token-admin",
                    [AUTH_CUSTOMER_ACCESS_TOKEN_COOKIE_NAME]: "token-customer",
                },
            });

            expect(
                cookieService.readAccessTokenFromRequest(req, {
                    scope: "admin",
                })
            ).toBe("token-admin");
            expect(
                cookieService.readAccessTokenFromRequest(req, {
                    scope: "customer",
                })
            ).toBe("token-customer");
            expect(
                cookieService.readAccessTokenFromRequest(req, {
                    scope: "auto",
                })
            ).toBe("token-customer");
        });

        it("sets token cookie using scope-specific cookie name", () => {
            const cookieService = createAuthCookieService({
                maxAge: 12345,
                sameSite: "strict",
                secure: true,
                path: "/",
            });
            const res = {
                cookie: vi.fn(),
            };

            cookieService.setAccessTokenCookie(res, "jwt-customer", {
                scope: "customer",
            });

            expect(res.cookie).toHaveBeenCalledWith(
                AUTH_CUSTOMER_ACCESS_TOKEN_COOKIE_NAME,
                "jwt-customer",
                expect.objectContaining({
                    httpOnly: true,
                    sameSite: "strict",
                    secure: true,
                    path: "/",
                    maxAge: 12345,
                })
            );
        });

        it("clears all auth cookies when scope=all", () => {
            const cookieService = createAuthCookieService();
            const res = {
                clearCookie: vi.fn(),
            };

            cookieService.clearAccessTokenCookie(res, {
                scope: "all",
            });

            const names = res.clearCookie.mock.calls.map((call) => call[0]);

            expect(names).toEqual(
                expect.arrayContaining([
                    AUTH_CUSTOMER_ACCESS_TOKEN_COOKIE_NAME,
                    AUTH_ADMIN_ACCESS_TOKEN_COOKIE_NAME,
                    AUTH_ACCESS_TOKEN_COOKIE_NAME,
                ])
            );
        });
    });

    describe("createAuthLoginRateLimiter", () => {
        let server;

        afterEach(async () => {
            if (server) {
                await new Promise((resolve, reject) => {
                    server.close((error) => {
                        if (error) {
                            reject(error);
                            return;
                        }

                        resolve();
                    });
                });
                server = null;
            }
        });

        it("returns 429 AUTH_RATE_LIMITED after max attempts in window", async () => {
            const app = express();
            app.use(express.json());
            app.post(
                "/auth/login",
                createAuthLoginRateLimiter({
                    windowMs: 60 * 1000,
                    max: 1,
                }),
                (_req, res) => {
                    res.status(200).json({
                        ok: true,
                    });
                }
            );
            server = await new Promise((resolve) => {
                const activeServer = app.listen(0, () => resolve(activeServer));
            });
            const port = server.address().port;

            const firstResponse = await fetch(`http://127.0.0.1:${port}/auth/login`, {
                method: "POST",
            });
            const secondResponse = await fetch(`http://127.0.0.1:${port}/auth/login`, {
                method: "POST",
            });
            const secondBody = await secondResponse.json();

            expect(firstResponse.status).toBe(200);
            expect(secondResponse.status).toBe(429);
            expect(secondBody).toEqual({
                code: "AUTH_RATE_LIMITED",
                message: "Too many login attempts, please try again later",
            });
        });
    });
});
