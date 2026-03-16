import {
    createAuthForbiddenError,
    createAuthUnauthorizedError,
} from "../services/auth-service.errors.js";
import {
    applyRequestAuthContext,
    clearRequestAuthContext,
    createAuthContext,
} from "../utils/index.js";

function resolveVerifiedToken({ req, cookieService, jwtService } = {}) {
    const accessToken = cookieService.readAccessTokenFromRequest(req);

    if (!accessToken) {
        return null;
    }

    try {
        return jwtService.verifyAccessToken(accessToken);
    } catch (_error) {
        return null;
    }
}

export function createAuthMiddleware({
    cookieService,
    jwtService,
} = {}) {
    function optionalAuth(req, _res, next) {
        const tokenPayload = resolveVerifiedToken({
            req,
            cookieService,
            jwtService,
        });

        if (!tokenPayload) {
            clearRequestAuthContext(req);
            next();

            return;
        }

        applyRequestAuthContext(
            req,
            createAuthContext({
                accountId: tokenPayload.accountId,
                role: tokenPayload.role,
                email: tokenPayload.email,
            })
        );
        next();
    }

    function requireAuth(req, _res, next) {
        const tokenPayload =
            req?.auth?.isAuthenticated === true && req.auth.accountId
                ? req.auth
                : resolveVerifiedToken({
                      req,
                      cookieService,
                      jwtService,
                  });

        if (!tokenPayload?.accountId) {
            clearRequestAuthContext(req);
            next(createAuthUnauthorizedError());

            return;
        }

        applyRequestAuthContext(
            req,
            createAuthContext({
                accountId: tokenPayload.accountId,
                role: tokenPayload.role,
                email: tokenPayload.email,
            })
        );
        next();
    }

    function requireAdmin(req, _res, next) {
        requireAuth(req, _res, (error) => {
            if (error) {
                next(error);

                return;
            }

            if (req.role !== "admin") {
                next(createAuthForbiddenError());

                return;
            }

            next();
        });
    }

    return {
        optionalAuth,
        requireAuth,
        requireAdmin,
    };
}

