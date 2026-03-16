import { LOGIN_INPUT_SCHEMA, parseLoginInput } from "./login.schema.js";
import { REGISTER_INPUT_SCHEMA, parseRegisterInput } from "./register.schema.js";
import {
    normalizeEmailInput,
    trimTextInput,
} from "./auth.normalizers.js";

export { LOGIN_INPUT_SCHEMA, parseLoginInput } from "./login.schema.js";
export { REGISTER_INPUT_SCHEMA, parseRegisterInput } from "./register.schema.js";

export function createAuthValidation() {
    return {
        loginSchema: LOGIN_INPUT_SCHEMA,
        registerSchema: REGISTER_INPUT_SCHEMA,
        parseLoginInput,
        parseRegisterInput,
        normalizers: {
            normalizeEmailInput,
            trimTextInput,
        },
    };
}

