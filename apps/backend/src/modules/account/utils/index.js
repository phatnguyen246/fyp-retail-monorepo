import { ACCOUNT_MODULE_NAME } from "../constants/index.js";

export function createAccountHealthPayload() {
    return {
        ok: true,
        module: ACCOUNT_MODULE_NAME,
    };
}

