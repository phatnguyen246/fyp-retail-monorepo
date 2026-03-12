import { ObjectId } from "mongodb";

export function isValidObjectId(value) {
    if (value instanceof ObjectId) {
        return true;
    }

    return typeof value === "string" && ObjectId.isValid(value);
}

export function toObjectId(value, fieldName = "_id") {
    if (!isValidObjectId(value)) {
        throw new Error(`Catalog requires ${fieldName} to be a valid ObjectId`);
    }

    if (value instanceof ObjectId) {
        return new ObjectId(value.toHexString());
    }

    return new ObjectId(value);
}

export function toOptionalObjectId(value, fieldName = "_id") {
    if (value === undefined || value === null) {
        return null;
    }

    return toObjectId(value, fieldName);
}

export function toObjectIdArray(values, fieldName = "ids") {
    if (values === undefined || values === null) {
        return [];
    }

    if (!Array.isArray(values)) {
        throw new Error(`Catalog requires ${fieldName} to be an array of ObjectId values`);
    }

    const uniqueIds = new Map();

    for (const value of values) {
        const objectId = toObjectId(value, fieldName);
        uniqueIds.set(objectId.toHexString(), objectId);
    }

    return [...uniqueIds.values()];
}
