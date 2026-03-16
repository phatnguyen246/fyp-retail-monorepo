import { ObjectId } from "mongodb";

export function createDocumentId(value, fieldName = "_id") {
    if (value === undefined) {
        return new ObjectId();
    }

    if (value instanceof ObjectId) {
        return new ObjectId(value.toHexString());
    }

    if (typeof value === "string" && ObjectId.isValid(value)) {
        return new ObjectId(value);
    }

    throw new Error(`Account requires ${fieldName} to be a valid ObjectId`);
}

export function normalizeRequiredString(value, fieldName) {
    if (typeof value !== "string" || value.trim().length === 0) {
        throw new Error(`Account requires a non-empty ${fieldName}`);
    }

    return value.trim();
}

export function normalizeDate(value, fieldName, defaultValue = new Date()) {
    const candidateValue = value === undefined ? defaultValue : value;
    const normalizedDate =
        candidateValue instanceof Date
            ? new Date(candidateValue)
            : new Date(candidateValue);

    if (Number.isNaN(normalizedDate.getTime())) {
        throw new Error(`Account requires ${fieldName} to be a valid date`);
    }

    return normalizedDate;
}

export function createTimestampPair({ createdAt, updatedAt } = {}) {
    const normalizedCreatedAt = normalizeDate(createdAt, "createdAt", new Date());

    return {
        createdAt: normalizedCreatedAt,
        updatedAt: normalizeDate(updatedAt, "updatedAt", normalizedCreatedAt),
    };
}

