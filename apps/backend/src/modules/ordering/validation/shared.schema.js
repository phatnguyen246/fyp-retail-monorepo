import { ObjectId } from "mongodb";
import { z } from "zod";
import { trimTextInput } from "./ordering.normalizers.js";

export const objectIdStringSchema = (fieldName) =>
    z.preprocess(trimTextInput, z.string().min(1)).refine(
        (value) => ObjectId.isValid(value),
        {
            message: `Ordering requires ${fieldName} to be a valid ObjectId`,
        }
    );

export const requiredTextSchema = (fieldName) =>
    z.preprocess(trimTextInput, z.string().min(1, {
        message: `Ordering requires ${fieldName}`,
    }));
