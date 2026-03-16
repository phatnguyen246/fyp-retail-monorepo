import { z } from "zod";
import { normalizeEmailInput, trimTextInput } from "./auth.normalizers.js";

export const REGISTER_INPUT_SCHEMA = z
    .object({
        email: z.preprocess(normalizeEmailInput, z.string().email()),
        password: z.preprocess(trimTextInput, z.string().min(6)),
        confirmPassword: z.preprocess(trimTextInput, z.string().min(6)).optional(),
    })
    .strict()
    .superRefine((value, ctx) => {
        if (
            typeof value.confirmPassword === "string" &&
            value.confirmPassword !== value.password
        ) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["confirmPassword"],
                message: "Confirm password must match password",
            });
        }
    });

export function parseRegisterInput(input) {
    return REGISTER_INPUT_SCHEMA.parse(input);
}

