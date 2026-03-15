import { ObjectId } from "mongodb";
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
        throw new Error(`Inventory requires ${fieldName} to be a valid date`);
    }

    return normalizedDate;
}

export function normalizeNonNegativeInteger(value, fieldName, fallbackValue) {
    if (value === undefined || value === null) {
        if (fallbackValue !== undefined) {
            return fallbackValue;
        }

        throw new Error(`Inventory requires ${fieldName}`);
    }

    if (!Number.isInteger(value) || value < 0) {
        throw new Error(
            `Inventory requires ${fieldName} to be a non-negative integer`
        );
    }

    return value;
}

export function normalizeRequiredObjectId(value, fieldName) {
    if (value === undefined || value === null) {
        throw new Error(`Inventory requires ${fieldName}`);
    }

    return toObjectId(value, fieldName);
}
