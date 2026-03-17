function formatPaymentCodeDate(timestamp) {
    const year = timestamp.getUTCFullYear().toString();
    const month = `${timestamp.getUTCMonth() + 1}`.padStart(2, "0");
    const day = `${timestamp.getUTCDate()}`.padStart(2, "0");

    return `${year}${month}${day}`;
}

export function generatePaymentCode({
    timestamp = new Date(),
    random = Math.random,
} = {}) {
    const dateCode = formatPaymentCodeDate(timestamp);
    const suffix = `${Math.floor(random() * 1000000)}`.padStart(6, "0");

    return `PAY-${dateCode}-${suffix}`;
}
