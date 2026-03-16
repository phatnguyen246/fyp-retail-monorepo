import { AUTH_MODULE_NAME } from "../constants/index.js";

export function createAuthHealthPayload() {
    return {
        ok: true,
        module: AUTH_MODULE_NAME,
    };
}

export function mapCurrentAuthenticatedUser(account) {
    return {
        accountId: account.accountId,
        email: account.email,
        role: account.role,
    };
}

export function createAuthContext({
    accountId,
    role,
    email = null,
} = {}) {
    return {
        isAuthenticated: true,
        accountId,
        role,
        email,
    };
}

export function clearRequestAuthContext(req) {
    req.auth = null;
    req.isAuthenticated = false;
    req.accountId = null;
    req.role = "guest";
    req.email = null;
    req.user = null;
}

export function applyRequestAuthContext(req, authContext) {
    if (!authContext) {
        clearRequestAuthContext(req);

        return;
    }

    req.auth = authContext;
    req.isAuthenticated = true;
    req.accountId = authContext.accountId;
    req.role = authContext.role;
    req.email = authContext.email ?? null;
    req.user = {
        id: authContext.accountId,
        accountId: authContext.accountId,
        role: authContext.role,
        email: authContext.email ?? null,
        isAuthenticated: true,
    };
}

