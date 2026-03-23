import {
    E2E_VNPAY_SALE_PRICE,
    E2E_VNPAY_VARIANT_ID,
} from "../src/modules/catalog/seeds/e2e-vnpay.constants.js";

function getRequiredJson(responseBody, fieldName) {
    if (!responseBody || typeof responseBody !== "object") {
        throw new Error("Expected a JSON object response body");
    }

    if (!(fieldName in responseBody)) {
        throw new Error(`Response body is missing "${fieldName}"`);
    }

    return responseBody[fieldName];
}

async function parseJson(response) {
    const text = await response.text();

    if (!text) {
        return null;
    }

    try {
        return JSON.parse(text);
    } catch (error) {
        throw new Error(
            `Failed to parse JSON from ${response.url}: ${error.message}\nBody: ${text}`
        );
    }
}

async function requestJson({
    baseUrl,
    method,
    path,
    body,
    cookie,
    expectedStatus,
} = {}) {
    const response = await fetch(`${baseUrl}${path}`, {
        method,
        headers: {
            ...(body ? { "content-type": "application/json" } : {}),
            ...(cookie ? { cookie } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const parsedBody = await parseJson(response);

    if (expectedStatus !== undefined && response.status !== expectedStatus) {
        throw new Error(
            [
                `${method} ${path} returned ${response.status}, expected ${expectedStatus}.`,
                `Response body: ${JSON.stringify(parsedBody, null, 2)}`,
            ].join("\n")
        );
    }

    return {
        response,
        body: parsedBody,
    };
}

function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}

function logStep(message, details) {
    console.log(`\n[step] ${message}`);

    if (details) {
        console.log(details);
    }
}

async function main() {
    const baseUrl = (process.env.E2E_BASE_URL ?? "http://localhost:3000").replace(
        /\/+$/,
        ""
    );
    const variantId = process.env.E2E_VNPAY_VARIANT_ID ?? E2E_VNPAY_VARIANT_ID;
    const quantity = Number(process.env.E2E_VNPAY_QUANTITY ?? 1);
    const phoneNumber = process.env.E2E_PHONE_NUMBER ?? "0900000000";
    const shippingAddressLine =
        process.env.E2E_SHIPPING_ADDRESS ?? "123 Nguyen Trai, Quan 1, TP.HCM";
    const bankCode = process.env.E2E_VNPAY_BANK_CODE ?? "";

    assert(Number.isInteger(quantity) && quantity >= 1, "Quantity must be >= 1");

    logStep("Checking module health endpoints");
    await requestJson({
        baseUrl,
        method: "GET",
        path: "/cart/health",
        expectedStatus: 200,
    });
    await requestJson({
        baseUrl,
        method: "GET",
        path: "/orders/health",
        expectedStatus: 200,
    });
    await requestJson({
        baseUrl,
        method: "GET",
        path: "/payments/health",
        expectedStatus: 200,
    });

    logStep("Adding seeded variant into guest cart", `variantId=${variantId}`);
    const addItemResult = await requestJson({
        baseUrl,
        method: "POST",
        path: "/cart/items",
        body: {
            variantId,
            quantity,
        },
        expectedStatus: 200,
    });
    const guestCookie = addItemResult.response.headers.get("set-cookie")?.split(";")[0];

    assert(guestCookie, "Guest cart cookie was not returned by POST /cart/items");

    const addItemData = getRequiredJson(addItemResult.body, "data");
    assert(addItemData.item?.variantId === variantId, "Cart item variantId mismatch");
    assert(addItemData.item?.quantity === quantity, "Cart item quantity mismatch");
    assert(
        addItemData.item?.availabilityStatus === "available",
        "Cart item is not available for checkout"
    );

    logStep("Creating VNPAY order from guest cart", guestCookie);
    const createOrderResult = await requestJson({
        baseUrl,
        method: "POST",
        path: "/orders",
        cookie: guestCookie,
        body: {
            cartVariantIds: [variantId],
            phoneNumber,
            shippingAddressLine,
            paymentMethod: "vnpay",
        },
        expectedStatus: 201,
    });
    const orderData = getRequiredJson(createOrderResult.body, "data");
    const expectedGrandTotal = E2E_VNPAY_SALE_PRICE * quantity;

    assert(orderData.paymentMethod === "vnpay", "Order paymentMethod should be vnpay");
    assert(orderData.paymentStatus === "pending", "Order paymentStatus should be pending");
    assert(orderData.orderStatus === "pending", "Order orderStatus should be pending");
    assert(orderData.grandTotal === expectedGrandTotal, "Order grandTotal mismatch");
    assert(orderData.itemCount === 1, "Order should contain exactly one line item");

    logStep(
        "Requesting VNPAY payment URL",
        JSON.stringify(
            {
                orderId: orderData.id,
                orderCode: orderData.orderCode,
                bankCode: bankCode || null,
            },
            null,
            2
        )
    );
    const createUrlResult = await requestJson({
        baseUrl,
        method: "POST",
        path: "/payments/vnpay/create-url",
        body: {
            orderCode: orderData.orderCode,
            ...(bankCode ? { bankCode } : {}),
        },
        expectedStatus: 200,
    });
    const paymentData = getRequiredJson(createUrlResult.body, "data");
    const paymentUrl = new URL(paymentData.paymentUrl);

    assert(paymentData.orderId === orderData.id, "Payment response orderId mismatch");
    assert(
        paymentData.orderCode === orderData.orderCode,
        "Payment response orderCode mismatch"
    );
    assert(
        paymentUrl.searchParams.get("vnp_TxnRef") === paymentData.paymentCode,
        "Payment URL vnp_TxnRef mismatch"
    );
    assert(
        Number(paymentUrl.searchParams.get("vnp_Amount")) === expectedGrandTotal * 100,
        "Payment URL vnp_Amount mismatch"
    );
    assert(
        paymentUrl.searchParams.get("vnp_Command") === "pay",
        "Payment URL vnp_Command should be pay"
    );
    assert(
        paymentUrl.searchParams.get("vnp_ReturnUrl"),
        "Payment URL is missing vnp_ReturnUrl"
    );
    assert(
        paymentUrl.searchParams.get("vnp_SecureHash"),
        "Payment URL is missing vnp_SecureHash"
    );

    console.log("\n[result] E2E checkout -> VNPAY URL flow passed");
    console.log(
        JSON.stringify(
            {
                baseUrl,
                guestCookie,
                orderId: orderData.id,
                orderCode: orderData.orderCode,
                paymentCode: paymentData.paymentCode,
                paymentUrl: paymentData.paymentUrl,
            },
            null,
            2
        )
    );
}

main().catch((error) => {
    console.error("\n[result] E2E checkout -> VNPAY URL flow failed");
    console.error(error?.stack ?? error?.message ?? error);
    process.exitCode = 1;
});
