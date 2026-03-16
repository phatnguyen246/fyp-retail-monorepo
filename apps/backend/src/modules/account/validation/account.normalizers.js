export function normalizeEmailInput(value) {
    if (typeof value !== "string") {
        return value;
    }

    const normalizedValue = value.trim().toLowerCase();

    return normalizedValue.length > 0 ? normalizedValue : undefined;
}

export function trimTextInput(value) {
    if (typeof value !== "string") {
        return value;
    }

    const normalizedValue = value.trim();

    return normalizedValue.length > 0 ? normalizedValue : undefined;
}

