import { createAuthHealthPayload } from "../utils/index.js";
import { createAuthValidation } from "../validation/index.js";
import { createGetCurrentUserService } from "./get-current-user.service.js";
import { createLoginService } from "./login.service.js";
import { createLogoutService } from "./logout.service.js";
import { createRegisterService } from "./register.service.js";

export { createGetCurrentUserService } from "./get-current-user.service.js";
export { createLoginService } from "./login.service.js";
export { createLogoutService } from "./logout.service.js";
export { createRegisterService } from "./register.service.js";

export function createAuthServices({
    accountReader,
    cartServices,
    jwtService,
    passwordHasher,
    validation = createAuthValidation(),
} = {}) {
    return {
        getHealth() {
            return createAuthHealthPayload();
        },
        register: createRegisterService({
            accountReader,
            cartServices,
            jwtService,
            passwordHasher,
            validation,
        }),
        login: createLoginService({
            accountReader,
            jwtService,
            passwordHasher,
            validation,
        }),
        logout: createLogoutService(),
        getCurrentUser: createGetCurrentUserService({
            accountReader,
        }),
    };
}

