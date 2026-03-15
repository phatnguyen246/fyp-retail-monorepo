import { ObjectId } from "mongodb";
import { z } from "zod";
import { coerceIntegerInput, trimTextInput } from "./cart.normalizers.js";

export const objectIdStringSchema = (fieldName) =>
    z.preprocess(trimTextInput, z.string().min(1)).refine(
        (value) => ObjectId.isValid(value),
        {
            message: `Cart requires ${fieldName} to be a valid ObjectId`,
        }
    );

export const positiveIntegerSchema = z.preprocess(
    coerceIntegerInput,
    z.number().int().positive()
);
