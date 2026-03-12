import removeAccents from "remove-accents";

function normalizeStringValue(value, { collapseWhitespace = false, transform } = {}) {
    if (typeof value !== "string") {
        return value;
    }

    const trimmedValue = value.trim();

    if (trimmedValue.length === 0) {
        return undefined;
    }

    const normalizedValue = collapseWhitespace
        ? trimmedValue.replace(/\s+/g, " ")
        : trimmedValue;

    return typeof transform === "function"
        ? transform(normalizedValue)
        : normalizedValue;
}

function normalizeUppercaseCodeValue(value) {
    return normalizeStringValue(value, {
        transform: (normalizedValue) => normalizedValue.toUpperCase(),
    });
}

function normalizeLowercaseCodeValue(value) {
    return normalizeStringValue(value, {
        transform: (normalizedValue) => normalizedValue.toLowerCase(),
    });
}

export function normalizeTitle(value) {
    return normalizeStringValue(value, { collapseWhitespace: true });
}

export function normalizeKeyword(value) {
    return normalizeStringValue(value, { collapseWhitespace: true });
}

export function normalizeSearchTitle(value) {
    const normalizedTitle = normalizeTitle(value);

    if (typeof normalizedTitle !== "string") {
        return normalizedTitle;
    }

    return removeAccents(normalizedTitle).toLowerCase();
}

export function normalizeSku(value) {
    return normalizeUppercaseCodeValue(value);
}

export function normalizeProductGroupCode(value) {
    return normalizeUppercaseCodeValue(value);
}

export function normalizeBrandCode(value) {
    return normalizeUppercaseCodeValue(value);
}

export function normalizeCategoryCode(value) {
    return normalizeUppercaseCodeValue(value);
}

export function normalizeTagCode(value) {
    return normalizeLowercaseCodeValue(value);
}

export function normalizeBadgeCode(value) {
    return normalizeLowercaseCodeValue(value);
}
