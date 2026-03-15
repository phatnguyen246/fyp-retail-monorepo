import { ObjectId } from "mongodb";
import { z } from "zod";
import { coerceIntegerInput, trimTextInput } from "./inventory.normalizers.js";

export const objectIdStringSchema = (fieldName) =>
    z.preprocess(trimTextInput, z.string().min(1)).refine(
        (value) => ObjectId.isValid(value),
        {
            message: `Inventory requires ${fieldName} to be a valid ObjectId`,
        }
    );

export const nonNegativeIntegerSchema = z.preprocess(
    coerceIntegerInput,
    z.number().int().nonnegative()
);
