import crypto from "node:crypto";
import qs from "qs";

const VNPAY_QS_OPTIONS = Object.freeze({
    encode: true,
    format: "RFC1738",
});

function sortObject(input = {}) {
    const sorted = {};
    const keys = Object.keys(input).sort();

    for (const key of keys) {
        sorted[key] = input[key];
    }

    return sorted;
}

function hmacSha512(secret, data) {
    return crypto
        .createHmac("sha512", secret)
        .update(Buffer.from(data, "utf-8"))
        .digest("hex");
}

function normalizeSignatureValue(value) {
    if (value === undefined || value === null) {
        return "";
    }

    return String(value);
}

export function createVnpayPaymentUrl({
    paymentUrl,
    tmnCode,
    hashSecret,
    version,
    returnUrl,
    txnRef,
    amount,
    orderInfo,
    orderType,
    ipAddr,
    locale,
    currency,
    createDate,
    expireDate,
    bankCode,
}) {
    let params = {
        vnp_Version: version,
        vnp_Command: "pay",
        vnp_TmnCode: tmnCode,
        vnp_Locale: locale,
        vnp_CurrCode: currency,
        vnp_TxnRef: txnRef,
        vnp_OrderInfo: orderInfo,
        vnp_OrderType: orderType,
        vnp_Amount: amount * 100,
        vnp_ReturnUrl: returnUrl,
        vnp_IpAddr: ipAddr,
        vnp_CreateDate: createDate,
        vnp_ExpireDate: expireDate,
    };

    if (bankCode) {
        params.vnp_BankCode = bankCode;
    }

    params = sortObject(params);

    const signData = qs.stringify(params, VNPAY_QS_OPTIONS);
    const secureHash = hmacSha512(hashSecret, signData);

    params.vnp_SecureHash = secureHash;

    return `${paymentUrl}?${qs.stringify(params, VNPAY_QS_OPTIONS)}`;
}

export function createVnpayQueryDrPayload({
    requestId,
    version,
    tmnCode,
    txnRef,
    transactionDate,
    createDate,
    ipAddr,
    orderInfo,
    hashSecret,
} = {}) {
    const payload = {
        vnp_RequestId: requestId,
        vnp_Version: version,
        vnp_Command: "querydr",
        vnp_TmnCode: tmnCode,
        vnp_TxnRef: txnRef,
        vnp_OrderInfo: orderInfo,
        vnp_TransactionDate: transactionDate,
        vnp_CreateDate: createDate,
        vnp_IpAddr: ipAddr,
    };

    const signData = [
        payload.vnp_RequestId,
        payload.vnp_Version,
        payload.vnp_Command,
        payload.vnp_TmnCode,
        payload.vnp_TxnRef,
        payload.vnp_TransactionDate,
        payload.vnp_CreateDate,
        payload.vnp_IpAddr,
        payload.vnp_OrderInfo,
    ]
        .map(normalizeSignatureValue)
        .join("|");

    return {
        ...payload,
        vnp_SecureHash: hmacSha512(hashSecret, signData),
    };
}

export async function executeVnpayQueryDr({
    apiUrl,
    payload,
    fetchFn = globalThis.fetch,
} = {}) {
    if (typeof fetchFn !== "function") {
        throw new Error("VNPAY query requires a fetch implementation");
    }

    const response = await fetchFn(apiUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
        },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        throw new Error(`VNPAY query failed with HTTP ${response.status}`);
    }

    return response.json();
}

export function verifyVnpayCallback(query = {}, hashSecret) {
    const payload = { ...query };
    const receivedHash = payload.vnp_SecureHash;

    delete payload.vnp_SecureHash;
    delete payload.vnp_SecureHashType;

    const sortedPayload = sortObject(payload);
    const signData = qs.stringify(sortedPayload, VNPAY_QS_OPTIONS);
    const calculatedHash = hmacSha512(hashSecret, signData);

    return {
        isValid: receivedHash === calculatedHash,
        payload: sortedPayload,
        receivedHash,
        calculatedHash,
    };
}

export function verifyVnpayQueryDrResponse(response = {}, hashSecret) {
    const receivedHash = response?.vnp_SecureHash ?? null;
    const payload = { ...response };
    delete payload.vnp_SecureHash;
    const signData = [
        response?.vnp_ResponseId,
        response?.vnp_Command,
        response?.vnp_ResponseCode,
        response?.vnp_Message,
        response?.vnp_TmnCode,
        response?.vnp_TxnRef,
        response?.vnp_Amount,
        response?.vnp_BankCode,
        response?.vnp_PayDate,
        response?.vnp_TransactionNo,
        response?.vnp_TransactionType,
        response?.vnp_TransactionStatus,
        response?.vnp_OrderInfo,
        response?.vnp_PromotionCode,
        response?.vnp_PromotionAmount,
    ]
        .map(normalizeSignatureValue)
        .join("|");

    const calculatedHash = hmacSha512(hashSecret, signData);

    return {
        isValid: receivedHash === calculatedHash,
        payload,
        receivedHash,
        calculatedHash,
    };
}
