const STRICT_INTEGER_PATTERN = /^[+-]?\d+$/;
const STRICT_NUMBER_PATTERN = /^[+-]?(?:\d+|\d+\.\d+)$/;

export function trimTextInput(value) {
    if (typeof value !== "string") {
        return value;
    }

    const trimmedValue = value.trim();

    return trimmedValue.length === 0 ? undefined : trimmedValue;
}

export function collapseWhitespaceTextInput(value) {
    if (typeof value !== "string") {
        return value;
    }

    const trimmedValue = value.trim();

    if (trimmedValue.length === 0) {
        return undefined;
    }

    return trimmedValue.replace(/\s+/g, " ");
}

export function trimNullableTextInput(value) {
    if (value === null) {
        return null;
    }

    return trimTextInput(value);
}

export function normalizeCsvStringArrayInput(value) {
    if (value === undefined || value === null || value === "") {
        return [];
    }

    if (Array.isArray(value)) {
        return normalizeStringArrayValues(value);
    }

    if (typeof value === "string") {
        return normalizeStringArrayValues(value.split(/[|,]/));
    }

    return value;
}

export function coerceNumberInput(value) {
    if (typeof value !== "string") {
        return value;
    }

    const trimmedValue = value.trim();

    if (trimmedValue.length === 0) {
        return undefined;
    }

    if (!STRICT_NUMBER_PATTERN.test(trimmedValue)) {
        return value;
    }

    return Number(trimmedValue);
}

export function coerceIntegerInput(value) {
    if (typeof value !== "string") {
        return value;
    }

    const trimmedValue = value.trim();

    if (trimmedValue.length === 0) {
        return undefined;
    }

    if (!STRICT_INTEGER_PATTERN.test(trimmedValue)) {
        return value;
    }

    return Number(trimmedValue);
}

export function coerceBooleanInput(value) {
    if (typeof value === "boolean") {
        return value;
    }

    if (typeof value !== "string") {
        return value;
    }

    const normalizedValue = value.trim().toLowerCase();

    if (["true", "1", "yes", "y"].includes(normalizedValue)) {
        return true;
    }

    if (["false", "0", "no", "n"].includes(normalizedValue)) {
        return false;
    }

    return value;
}

function normalizeStringArrayValues(values) {
    const uniqueValues = new Set();

    for (const value of values) {
        if (typeof value !== "string") {
            continue;
        }

        const trimmedValue = value.trim();

        if (trimmedValue.length > 0) {
            uniqueValues.add(trimmedValue);
        }
    }

    return [...uniqueValues];
}
