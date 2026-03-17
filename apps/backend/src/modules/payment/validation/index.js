import {
    CREATE_VNPAY_PAYMENT_URL_INPUT_SCHEMA,
    parseCreateVnpayPaymentUrlInput,
} from "./create-vnpay-payment-url.schema.js";

export {
    CREATE_VNPAY_PAYMENT_URL_INPUT_SCHEMA,
    parseCreateVnpayPaymentUrlInput,
} from "./create-vnpay-payment-url.schema.js";

export function createPaymentValidation() {
    return {
        createVnpayPaymentUrlInputSchema: CREATE_VNPAY_PAYMENT_URL_INPUT_SCHEMA,
        parseCreateVnpayPaymentUrlInput,
    };
}
