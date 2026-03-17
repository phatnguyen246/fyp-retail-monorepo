import { z } from "zod";

const OBJECT_ID_REGEX = /^[a-f\d]{24}$/i;

function optionalTrimmedString(value) {
    return typeof value === "string" ? value.trim() : value;
}

export const CREATE_VNPAY_PAYMENT_URL_INPUT_SCHEMA = z
    .object({
        orderId: z.preprocess(
            optionalTrimmedString,
            z
                .string()
                .regex(OBJECT_ID_REGEX, "orderId must be a valid ObjectId")
                .nullable()
                .optional()
        ),
        orderCode: z.preprocess(
            optionalTrimmedString,
            z.string().min(1).nullable().optional()
        ),
        bankCode: z.preprocess(
            optionalTrimmedString,
            z.string().min(1).max(32).nullable().optional()
        ),
    })
    .strict()
    .transform((value) => ({
        orderId: value.orderId ?? null,
        orderCode: value.orderCode ?? null,
        bankCode: value.bankCode ?? null,
    }))
    .superRefine((value, context) => {
        const referenceCount = [value.orderId, value.orderCode].filter(Boolean).length;

        if (referenceCount !== 1) {
            context.addIssue({
                code: "custom",
                message: "Exactly one of orderId or orderCode is required",
                path: ["orderId"],
            });
        }
    });

export function parseCreateVnpayPaymentUrlInput(input) {
    return CREATE_VNPAY_PAYMENT_URL_INPUT_SCHEMA.parse(input);
}
