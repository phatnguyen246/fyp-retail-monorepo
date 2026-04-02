import { z } from "zod";
import { composeShippingAddressLine } from "../utils/index.js";
import {
    objectIdStringSchema,
    positiveIntegerSchema,
    requiredTextSchema,
} from "./shared.schema.js";

const baseCreateOrderInputShape = {
    cartVariantIds: z.array(objectIdStringSchema("cartVariantIds")).min(1),
    recipientName: requiredTextSchema("recipientName"),
    phoneNumber: requiredTextSchema("phoneNumber"),
    paymentMethod: z.enum(["cod", "vnpay"]).optional().default("cod"),
};

const structuredCreateOrderInputSchema = z
    .object({
        ...baseCreateOrderInputShape,
        street: requiredTextSchema("street"),
        provinceCode: positiveIntegerSchema("provinceCode"),
        provinceName: requiredTextSchema("provinceName"),
        districtCode: positiveIntegerSchema("districtCode"),
        districtName: requiredTextSchema("districtName"),
        wardCode: positiveIntegerSchema("wardCode"),
        wardName: requiredTextSchema("wardName"),
        shippingAddressLine: requiredTextSchema("shippingAddressLine").optional(),
    })
    .strict()
    .transform((value) => ({
        ...value,
        shippingAddressLine: composeShippingAddressLine({
            street: value.street,
            wardName: value.wardName,
            districtName: value.districtName,
            provinceName: value.provinceName,
        }),
        cartVariantIds: [...new Set(value.cartVariantIds)],
    }));

const legacyCreateOrderInputSchema = z
    .object({
        ...baseCreateOrderInputShape,
        shippingAddressLine: requiredTextSchema("shippingAddressLine"),
    })
    .strict()
    .transform((value) => ({
        ...value,
        cartVariantIds: [...new Set(value.cartVariantIds)],
    }));

export const CREATE_ORDER_INPUT_SCHEMA = z.union([
    structuredCreateOrderInputSchema,
    legacyCreateOrderInputSchema,
]);

export function parseCreateOrderInput(input) {
    const hasStructuredAddressFields =
        typeof input === "object" &&
        input !== null &&
        ["street", "provinceCode", "provinceName", "districtCode", "districtName", "wardCode", "wardName"].some(
            (fieldName) => Object.prototype.hasOwnProperty.call(input, fieldName)
        );

    if (hasStructuredAddressFields) {
        return structuredCreateOrderInputSchema.parse(input);
    }

    return legacyCreateOrderInputSchema.parse(input);
}
