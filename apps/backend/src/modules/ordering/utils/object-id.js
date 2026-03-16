import { ObjectId } from "mongodb";

export function isValidObjectId(value) {
    if (value instanceof ObjectId) {
        return true;
    }

    return typeof value === "string" && ObjectId.isValid(value);
}

export function toObjectId(value, fieldName = "_id") {
    if (!isValidObjectId(value)) {
        throw new Error(`Ordering requires ${fieldName} to be a valid ObjectId`);
    }

    if (value instanceof ObjectId) {
        return new ObjectId(value.toHexString());
    }

    return new ObjectId(value);
}
