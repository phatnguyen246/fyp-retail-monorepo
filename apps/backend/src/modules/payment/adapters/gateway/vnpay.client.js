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
