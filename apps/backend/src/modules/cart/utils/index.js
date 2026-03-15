import { CART_MODULE_NAME } from "../constants/index.js";

export function createCartHealthPayload() {
    return {
        ok: true,
        module: CART_MODULE_NAME,
    };
}

export function toIdString(value) {
    if (value && typeof value.toHexString === "function") {
        return value.toHexString();
    }

    return typeof value === "string" ? value : null;
}

export function composeVariantLabel(variantAttributes) {
    if (
        typeof variantAttributes !== "object" ||
        variantAttributes === null ||
        Array.isArray(variantAttributes)
    ) {
        return null;
    }

    const segments = [
        variantAttributes.ram,
        variantAttributes.rom,
        variantAttributes.color,
    ].filter((segment) => typeof segment === "string" && segment.trim().length > 0);

    return segments.length > 0 ? segments.join(" / ") : null;
}

export function createCartOwnerKey(owner) {
    if (!owner || typeof owner !== "object") {
        return null;
    }

    const ownerType =
        typeof owner.ownerType === "string" ? owner.ownerType.trim() : "";
    const ownerValue =
        typeof owner.ownerKey === "string" ? owner.ownerKey.trim() : "";

    if (ownerType.length === 0 || ownerValue.length === 0) {
        return null;
    }

    return `${ownerType}:${ownerValue}`;
}
