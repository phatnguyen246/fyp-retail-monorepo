export function trimTextInput(value) {
    return typeof value === "string" ? value.trim() : value;
}

export function coerceIntegerInput(value) {
    if (value === "" || value === null || value === undefined) {
        return value;
    }

    if (typeof value === "number") {
        return value;
    }

    if (typeof value === "string") {
        const trimmedValue = value.trim();

        if (trimmedValue.length === 0) {
            return value;
        }

        const parsedValue = Number(trimmedValue);

        return Number.isFinite(parsedValue) ? parsedValue : value;
    }

    return value;
}
