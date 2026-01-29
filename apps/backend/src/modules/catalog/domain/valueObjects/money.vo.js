import { CatalogDomainErrors } from "../errors/index.js";

export function createMoney({ amount, currency } = {}) {
    const normalizedAmount = Number(amount);
    if (!Number.isFinite(normalizedAmount) || normalizedAmount < 0) {
        throw CatalogDomainErrors.VARIANT_PRICE_INVALID();
    }

    const normalizedCurrency = String(currency ?? "VND").trim() || "VND";

    return {
        amount: normalizedAmount,
        currency: normalizedCurrency,
    };
}
