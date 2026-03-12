import { ObjectId } from "mongodb";
import { toObjectId, toObjectIdArray, toOptionalObjectId } from "../utils/object-id.js";

export function normalizeRequiredString(value, fieldName) {
    if (typeof value !== "string" || value.trim().length === 0) {
        throw new Error(`Catalog requires a non-empty ${fieldName}`);
    }

    return value.trim();
}

export function normalizeOptionalString(value, fieldName) {
    if (value === undefined || value === null) {
        return null;
    }

    return normalizeRequiredString(value, fieldName);
}

export function normalizeStringArray(values, fieldName, { defaultValue = [] } = {}) {
    if (values === undefined || values === null) {
        return [...defaultValue];
    }

    if (!Array.isArray(values)) {
        throw new Error(`Catalog requires ${fieldName} to be an array of strings`);
    }

    const normalizedValues = [];
    const seenValues = new Set();

    for (const value of values) {
        const normalizedValue = normalizeRequiredString(value, fieldName);

        if (!seenValues.has(normalizedValue)) {
            seenValues.add(normalizedValue);
            normalizedValues.push(normalizedValue);
        }
    }

    return normalizedValues;
}

export function normalizeBoolean(value, fieldName, defaultValue = false) {
    if (value === undefined) {
        return defaultValue;
    }

    if (typeof value !== "boolean") {
        throw new Error(`Catalog requires ${fieldName} to be a boolean`);
    }

    return value;
}

export function normalizeInteger(value, fieldName, defaultValue = 0) {
    if (value === undefined) {
        return defaultValue;
    }

    if (!Number.isInteger(value)) {
        throw new Error(`Catalog requires ${fieldName} to be an integer`);
    }

    return value;
}

export function normalizeNonNegativeInteger(value, fieldName, defaultValue = 0) {
    const normalizedValue = normalizeInteger(value, fieldName, defaultValue);

    if (normalizedValue < 0) {
        throw new Error(`Catalog requires ${fieldName} to be a non-negative integer`);
    }

    return normalizedValue;
}

export function normalizeNonNegativeNumber(value, fieldName, defaultValue) {
    if (value === undefined) {
        if (defaultValue === undefined) {
            throw new Error(`Catalog requires ${fieldName}`);
        }

        return defaultValue;
    }

    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
        throw new Error(`Catalog requires ${fieldName} to be a non-negative number`);
    }

    return value;
}

export function normalizeDate(value, fieldName, defaultValue = new Date()) {
    const candidateValue = value === undefined ? defaultValue : value;
    const normalizedDate =
        candidateValue instanceof Date
            ? new Date(candidateValue)
            : new Date(candidateValue);

    if (Number.isNaN(normalizedDate.getTime())) {
        throw new Error(`Catalog requires ${fieldName} to be a valid date`);
    }

    return normalizedDate;
}

export function normalizeOptionalDate(value, fieldName) {
    if (value === undefined || value === null) {
        return null;
    }

    return normalizeDate(value, fieldName);
}

export function normalizeAuditActor(value, fieldName) {
    return normalizeOptionalString(value, fieldName);
}

export function normalizeDocumentId(value, fieldName = "_id") {
    if (value === undefined) {
        return new ObjectId();
    }

    return toObjectId(value, fieldName);
}

export function createDocumentId(value, fieldName = "_id") {
    if (value === undefined) {
        return new ObjectId();
    }

    return toObjectId(value, fieldName);
}

export function normalizeRequiredObjectId(value, fieldName) {
    return toObjectId(value, fieldName);
}

export function normalizeOptionalObjectId(value, fieldName) {
    return toOptionalObjectId(value, fieldName);
}

export function normalizeObjectIdList(values, fieldName) {
    return toObjectIdArray(values, fieldName);
}

export function createTimestampPair({ createdAt, updatedAt } = {}) {
    const normalizedCreatedAt = normalizeDate(createdAt, "createdAt", new Date());

    return {
        createdAt: normalizedCreatedAt,
        updatedAt: normalizeDate(updatedAt, "updatedAt", normalizedCreatedAt),
    };
}

export function createSoftDeleteState({
    isDeleted,
    deletedAt,
    fallbackDeletedAt,
} = {}) {
    const normalizedDeleted = normalizeBoolean(isDeleted, "isDeleted", false);

    if (!normalizedDeleted) {
        return {
            isDeleted: false,
            deletedAt: null,
        };
    }

    return {
        isDeleted: true,
        deletedAt: normalizeDate(
            deletedAt,
            "deletedAt",
            fallbackDeletedAt ?? new Date()
        ),
    };
}
