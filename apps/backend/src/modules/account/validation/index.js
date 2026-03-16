import {
    CREATE_ACCOUNT_INPUT_SCHEMA,
    parseCreateAccountInput,
} from "./create-account.schema.js";
import {
    normalizeEmailInput,
    trimTextInput,
} from "./account.normalizers.js";

export {
    CREATE_ACCOUNT_INPUT_SCHEMA,
    parseCreateAccountInput,
} from "./create-account.schema.js";

export function createAccountValidation() {
    return {
        createAccountSchema: CREATE_ACCOUNT_INPUT_SCHEMA,
        parseCreateAccountInput,
        normalizers: {
            normalizeEmailInput,
            trimTextInput,
        },
    };
}

