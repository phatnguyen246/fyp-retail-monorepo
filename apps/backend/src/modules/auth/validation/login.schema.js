import { z } from "zod";
import { normalizeEmailInput, trimTextInput } from "./auth.normalizers.js";

export const LOGIN_INPUT_SCHEMA = z
    .object({
        email: z.preprocess(normalizeEmailInput, z.string().email()),
        password: z.preprocess(trimTextInput, z.string().min(1)),
    })
    .strict();

export function parseLoginInput(input) {
    return LOGIN_INPUT_SCHEMA.parse(input);
}

