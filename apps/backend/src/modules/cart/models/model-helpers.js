import { ObjectId } from "mongodb";
import { CART_OWNER_TYPES } from "../constants/index.js";
import { toObjectId } from "../utils/object-id.js";

export function createDocumentId(value, fieldName = "_id") {
    if (value === undefined || value === null) {
        return new ObjectId();
    }

    return toObjectId(value, fieldName);
}

export function createTimestampPair(input = {}) {
    const createdAt = normalizeDate(input.createdAt, "createdAt", new Date());
    const updatedAt = normalizeDate(input.updatedAt, "updatedAt", createdAt);

    return {
        createdAt,
        updatedAt,
    };
}

export function normalizeDate(value, fieldName, fallbackValue) {
    if (value === undefined || value === null) {
        return fallbackValue;
    }

    const normalizedDate = value instanceof Date ? value : new Date(value);

    if (Number.isNaN(normalizedDate.getTime())) {
        throw new Error(`Cart requires ${fieldName} to be a valid date`);
    }

    return normalizedDate;
}

export function normalizeRequiredObjectId(value, fieldName) {
    if (value === undefined || value === null) {
        throw new Error(`Cart requires ${fieldName}`);
    }

    return toObjectId(value, fieldName);
}

export function normalizePositiveInteger(value, fieldName, fallbackValue) {
    if (value === undefined || value === null) {
        if (fallbackValue !== undefined) {
            return fallbackValue;
        }

        throw new Error(`Cart requires ${fieldName}`);
    }

    if (!Number.isInteger(value) || value < 1) {
        throw new Error(`Cart requires ${fieldName} to be a positive integer`);
    }

    return value;
}

export function normalizeBoolean(value, fieldName, fallbackValue) {
    if (value === undefined || value === null) {
        return fallbackValue;
    }

    if (typeof value !== "boolean") {
        throw new Error(`Cart requires ${fieldName} to be a boolean`);
    }

    return value;
}

export function normalizeOwnerType(value, fieldName = "ownerType") {
    if (typeof value !== "string") {
        throw new Error(`Cart requires ${fieldName}`);
    }

    const normalizedValue = value.trim();

    if (!CART_OWNER_TYPES.includes(normalizedValue)) {
        throw new Error(`Cart requires ${fieldName} to be one of: ${CART_OWNER_TYPES.join(", ")}`);
    }

    return normalizedValue;
}

export function normalizeRequiredString(value, fieldName) {
    if (typeof value !== "string") {
        throw new Error(`Cart requires ${fieldName}`);
    }

    const normalizedValue = value.trim();

    if (normalizedValue.length === 0) {
        throw new Error(`Cart requires ${fieldName}`);
    }

    return normalizedValue;
}
