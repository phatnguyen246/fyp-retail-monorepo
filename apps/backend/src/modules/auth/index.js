import { createAccountAuthReader } from "./adapters/internal/account-auth.reader.js";
import { createAuthCookieService } from "./adapters/cookies/auth-cookie.service.js";
import { createJwtService } from "./adapters/security/jwt.service.js";
import { createPasswordHasher } from "./adapters/security/password-hasher.service.js";
import { AUTH_BASE_PATH } from "./constants/index.js";
import { createAuthController } from "./http/auth.controller.js";
import { createAuthMiddleware } from "./http/auth.middleware.js";
import { createAuthRouter } from "./http/auth.routes.js";
import { createAuthServices } from "./services/index.js";
import { createAuthValidation } from "./validation/index.js";

export function registerAuthModule({
    app,
    accountServices,
    cartServices,
} = {}) {
    const validation = createAuthValidation();
    const accountReader = createAccountAuthReader({
        accountServices,
    });
    const jwtService = createJwtService();
    const passwordHasher = createPasswordHasher();
    const cookieService = createAuthCookieService();
    const services = createAuthServices({
        accountReader,
        cartServices,
        jwtService,
        passwordHasher,
        validation,
    });
    const middlewares = createAuthMiddleware({
        cookieService,
        jwtService,
    });
    const controller = createAuthController({
        services,
        cookieService,
    });
    const router = createAuthRouter({
        controller,
        middlewares,
    });

    app.use(AUTH_BASE_PATH, router);

    return {
        adapters: {
            cookies: cookieService,
            security: {
                jwtService,
                passwordHasher,
            },
            internal: {
                accountReader,
            },
        },
        services,
        middlewares,
        validation,
        controller,
        router,
    };
}
