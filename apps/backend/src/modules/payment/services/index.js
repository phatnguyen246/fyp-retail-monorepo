import { createPaymentAdapters } from "../adapters/index.js";
import { createPaymentHealthPayload, createPaymentRequester } from "../utils/index.js";
import { createPaymentValidation } from "../validation/index.js";
import { createCreateVnpayPaymentUrlService } from "./create-vnpay-payment-url.service.js";
import { createHandleVnpayIpnService } from "./handle-vnpay-ipn.service.js";
import { createHandleVnpayReturnService } from "./handle-vnpay-return.service.js";

export { createCreateVnpayPaymentUrlService } from "./create-vnpay-payment-url.service.js";
export { createHandleVnpayIpnService } from "./handle-vnpay-ipn.service.js";
export { createHandleVnpayReturnService } from "./handle-vnpay-return.service.js";

export function createPaymentServices({
    adapters = createPaymentAdapters(),
    env = process.env,
    logger = console,
    validation = createPaymentValidation(),
} = {}) {
    const checkoutAdapter = adapters?.checkout;
    const inventoryAdapter = adapters?.inventory;
    const orderAdapter = adapters?.order;
    const paymentRepository = adapters?.persistence?.paymentRepository;

    return {
        getHealth() {
            return createPaymentHealthPayload();
        },
        createVnpayPaymentUrl: createCreateVnpayPaymentUrlService({
            checkoutAdapter,
            env,
            orderAdapter,
            paymentRepository,
            validation,
        }),
        handleVnpayIpn: createHandleVnpayIpnService({
            env,
            inventoryAdapter,
            logger,
            orderAdapter,
            paymentRepository,
        }),
        handleVnpayReturn: createHandleVnpayReturnService({
            env,
        }),
        createRequester,
    };

    function createRequester(request) {
        return createPaymentRequester(request);
    }
}
