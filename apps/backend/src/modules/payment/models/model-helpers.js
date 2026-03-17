import { ObjectId } from "mongodb";
import { toObjectId } from "../utils/object-id.js";

export function normalizeRequiredString(value, fieldName) {
    if (typeof value !== "string" || value.trim().length === 0) {
        throw new Error(`Payment requires a non-empty ${fieldName}`);
    }

    return value.trim();
}

export function normalizeOptionalString(value, fieldName) {
    if (value === undefined || value === null) {
        return null;
    }

    return normalizeRequiredString(value, fieldName);
}

export function normalizeDate(value, fieldName, defaultValue = new Date()) {
    const candidateValue = value === undefined ? defaultValue : value;
    const normalizedDate =
        candidateValue instanceof Date
            ? new Date(candidateValue)
            : new Date(candidateValue);

    if (Number.isNaN(normalizedDate.getTime())) {
        throw new Error(`Payment requires ${fieldName} to be a valid date`);
    }

    return normalizedDate;
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

export function normalizeNonNegativeNumber(value, fieldName, defaultValue) {
    if (value === undefined) {
        if (defaultValue === undefined) {
            throw new Error(`Payment requires ${fieldName}`);
        }

        return defaultValue;
    }

    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
        throw new Error(`Payment requires ${fieldName} to be a non-negative number`);
    }

    return value;
}

export function normalizeOptionalObject(value, fieldName) {
    if (value === undefined || value === null) {
        return null;
    }

    if (typeof value !== "object" || Array.isArray(value)) {
        throw new Error(`Payment requires ${fieldName} to be an object`);
    }

    return value;
}

export function createTimestampPair({ createdAt, updatedAt } = {}) {
    const normalizedCreatedAt = normalizeDate(createdAt, "createdAt", new Date());

    return {
        createdAt: normalizedCreatedAt,
        updatedAt: normalizeDate(updatedAt, "updatedAt", normalizedCreatedAt),
    };
}
