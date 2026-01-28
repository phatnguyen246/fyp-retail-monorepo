import { CatalogErrors } from "../../application/errors/index.js";

export function createMoney({ amount, currency } = {}) {
    const normalizedAmount = Number(amount);
    if (!Number.isFinite(normalizedAmount) || normalizedAmount < 0) {
        throw CatalogErrors.VARIANT_PRICE_INVALID();
    }

    const normalizedCurrency = String(currency ?? "VND").trim() || "VND";

    return {
        amount: normalizedAmount,
        currency: normalizedCurrency,
    };
}
