import { z } from "zod";
import { ACCOUNT_ROLES } from "../models/index.js";
import {
    normalizeEmailInput,
    trimTextInput,
} from "./account.normalizers.js";

export const CREATE_ACCOUNT_INPUT_SCHEMA = z
    .object({
        accountId: z.preprocess(trimTextInput, z.string().min(1)),
        email: z.preprocess(normalizeEmailInput, z.string().email()),
        passwordHash: z.preprocess(trimTextInput, z.string().min(1)),
        role: z.enum(ACCOUNT_ROLES),
    })
    .strict();

export function parseCreateAccountInput(input) {
    return CREATE_ACCOUNT_INPUT_SCHEMA.parse(input);
}

