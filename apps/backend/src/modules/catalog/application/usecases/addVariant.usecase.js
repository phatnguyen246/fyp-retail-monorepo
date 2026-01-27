import { buildVariantSignature } from "../helpers/variantSignature.js";

/**
 * Business rules (Aggregate invariants):
 * - Client gửi selections bằng code: [{ option_code, value_code }]
 * - Use case resolve -> { option_id, option_value_id }
 * - Mỗi option_code xuất hiện đúng 1 lần
 * - Selections phải đủ tất cả options của product (không thiếu option)
 * - value_code phải thuộc option_code của chính product
 * - variant_signature unique trong cùng product
 * - Nếu is_default=true -> chỉ 1 default
 */
export function makeAddVariantUseCase({ productRepository }) {
    return async function addVariant(input = {}) {
        const productId = String(input.productId ?? "").trim();
        if (!productId) throw new Error("PRODUCT_ID_REQUIRED");

        const product = await productRepository.findById(productId);
        if (!product) throw new Error("PRODUCT_NOT_FOUND");

        // 1) Validate basic fields
        const sku = String(input.sku ?? "").trim();
        if (!sku) throw new Error("VARIANT_SKU_REQUIRED");

        const price_amount = Number(input.price_amount);
        if (!Number.isFinite(price_amount) || price_amount < 0) {
            throw new Error("VARIANT_PRICE_INVALID");
        }

        const currency = String(input.currency ?? "VND").trim() || "VND";
        const stock_on_hand = Number(input.stock_on_hand ?? 0);
        if (!Number.isFinite(stock_on_hand) || stock_on_hand < 0) {
            throw new Error("VARIANT_STOCK_INVALID");
        }

        // 2) Resolve selections from aggregate (codes -> ids)
        const rawSelections = Array.isArray(input.selections) ? input.selections : [];
        const resolved = resolveSelectionsFromProduct({
            product,
            selections: rawSelections,
        });

        // 3) Build signature from resolved "codes" (stable by option_code)
        const signature = buildVariantSignature(
            resolved.map((s) => ({ option_code: s.option_code, value_code: s.value_code }))
        );

        // 4) Enforce unique combination in this product
        const existsCombo = (product.variants || []).some(
            (v) => v.variant_signature === signature
        );
        if (existsCombo) throw new Error("VARIANT_COMBINATION_EXISTS");

        // Optional: friendly check for sku duplicate within loaded product snapshot
        // (Mongo unique index vẫn là source of truth)
        const existsSku = (product.variants || []).some((v) => v.sku === sku);
        if (existsSku) throw new Error("VARIANT_SKU_EXISTS");

        // 5) Enforce single default
        let variants = product.variants || [];
        if (input.is_default) {
            variants = variants.map((v) => ({ ...v, is_default: false }));
        }

        const newVariant = {
            sku,
            is_default: Boolean(input.is_default),
            variant_name: String(input.variant_name ?? "").trim(),
            price_amount,
            currency,
            stock_on_hand,

            variant_signature: signature,

            // Persist selections by ids (stable references inside embedded aggregate)
            selections: resolved.map((s) => ({
                option_id: s.option_id,
                option_value_id: s.option_value_id,
            })),
        };

        const updated = await productRepository.replaceVariants(product.id, [
            ...variants,
            newVariant,
        ]);

        return updated;
    };
}

/**
 * Resolve selections codes into ids using product aggregate.
 * Enforce:
 * - option exists
 * - value exists in option
 * - no duplicate option_code
 * - selections cover ALL product.options
 */
function resolveSelectionsFromProduct({ product, selections }) {
    const options = Array.isArray(product.options) ? product.options : [];
    if (options.length === 0) throw new Error("PRODUCT_OPTIONS_EMPTY");

    // normalize input selections
    const normalized = selections.map((s) => ({
        option_code: String(s?.option_code ?? "").trim(),
        value_code: String(s?.value_code ?? "").trim(),
    }));

    // validate empty codes
    if (normalized.some((s) => !s.option_code || !s.value_code)) {
        throw new Error("VARIANT_SELECTION_INVALID");
    }

    // validate duplicates by option_code
    const seen = new Set();
    for (const s of normalized) {
        if (seen.has(s.option_code)) throw new Error("VARIANT_SELECTION_DUPLICATE_OPTION");
        seen.add(s.option_code);
    }

    // enforce coverage: selections must match exactly all options
    if (normalized.length !== options.length) {
        throw new Error("VARIANT_SELECTION_INCOMPLETE");
    }

    // index product options by code
    const optionByCode = new Map(options.map((o) => [String(o.code ?? "").trim(), o]));

    // resolve each selection
    const resolved = normalized.map((s) => {
        const option = optionByCode.get(s.option_code);
        if (!option) throw new Error("VARIANT_OPTION_NOT_FOUND");

        const values = Array.isArray(option.values) ? option.values : [];
        const value = values.find((v) => String(v.value_code ?? "").trim() === s.value_code);
        if (!value) throw new Error("VARIANT_OPTION_VALUE_NOT_FOUND");

        return {
            option_code: s.option_code,
            value_code: s.value_code,
            option_id: option.id,
            option_value_id: value.id,
        };
    });

    // enforce no missing option: every product option must be present
    // (vì normalized.length == options.length, chỉ cần check set code trùng khớp)
    for (const opt of options) {
        const code = String(opt.code ?? "").trim();
        if (!seen.has(code)) throw new Error("VARIANT_SELECTION_INCOMPLETE");
    }

    return resolved;
}

