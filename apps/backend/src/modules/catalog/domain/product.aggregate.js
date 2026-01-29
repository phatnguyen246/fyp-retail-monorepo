import crypto from "node:crypto";
import { CatalogDomainErrors } from "./errors/index.js";
import { createMoney } from "./valueObjects/money.vo.js";
import { createSku } from "./valueObjects/sku.vo.js";
import { buildVariantSignature } from "./services/variantSignature.js";

const VALID_STATUS = ["draft", "active", "archived"];

const ALLOWED_TRANSITIONS = new Map([
    ["draft", new Set(["active"])],
    ["active", new Set(["archived"])],
    ["archived", new Set([])],
]);

export class Product {
    constructor({
        id,
        name,
        slug,
        product_type,
        status,
        main_specs,
        images,
        options,
        variants,
        createdAt,
        updatedAt,
    } = {}) {
        this.id = id;
        this.name = name;
        this.slug = slug;
        this.product_type = product_type;
        this.status = status;
        this.main_specs = isPlainObject(main_specs) ? main_specs : {};
        this.images = Array.isArray(images) ? images : [];
        this.options = Array.isArray(options) ? options : [];
        this.variants = Array.isArray(variants) ? variants : [];
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    static create(input = {}) {
        const name = String(input.name ?? "").trim();
        if (!name) throw CatalogDomainErrors.PRODUCT_NAME_REQUIRED();

        const slug = String(input.slug ?? "").trim();
        if (!slug) throw CatalogDomainErrors.PRODUCT_SLUG_REQUIRED();

        const status = String(input.status ?? "draft").trim();
        if (!Product.isValidStatus(status)) {
            throw CatalogDomainErrors.PRODUCT_STATUS_INVALID();
        }

        const product_type = String(input.product_type ?? "smartphone").trim() || "smartphone";
        const main_specs = isPlainObject(input.main_specs) ? input.main_specs : {};
        const images = normalizeImages(input.images);
        const options = normalizeOptions(input.options);

        return new Product({
            name,
            slug,
            product_type,
            status,
            main_specs,
            images,
            options,
            variants: [],
            createdAt: input.createdAt,
            updatedAt: input.updatedAt,
        });
    }

    static fromPersistence(raw) {
        if (!raw) return null;
        const p = typeof raw.toJSON === "function" ? raw.toJSON() : raw;
        return new Product({
            id: p.id ?? p._id,
            name: p.name,
            slug: p.slug,
            product_type: p.product_type,
            status: p.status,
            main_specs: p.main_specs ?? {},
            images: Array.isArray(p.images) ? p.images : [],
            options: Array.isArray(p.options) ? p.options : [],
            variants: Array.isArray(p.variants) ? p.variants : [],
            createdAt: p.createdAt,
            updatedAt: p.updatedAt,
        });
    }

    static isValidStatus(status) {
        return VALID_STATUS.includes(String(status ?? "").trim());
    }

    static allowedTransitions(from) {
        return Array.from(ALLOWED_TRANSITIONS.get(from) ?? []);
    }

    static canTransition(from, to) {
        const allowed = ALLOWED_TRANSITIONS.get(from);
        return Boolean(allowed && allowed.has(to));
    }

    toPrimitives() {
        return {
            id: this.id,
            name: this.name,
            slug: this.slug,
            product_type: this.product_type,
            status: this.status,
            main_specs: this.main_specs ?? {},
            images: Array.isArray(this.images) ? this.images : [],
            options: Array.isArray(this.options) ? this.options : [],
            variants: Array.isArray(this.variants) ? this.variants : [],
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
        };
    }

    toPersistence({ includeTimestamps = false } = {}) {
        const data = {
            id: this.id,
            name: this.name,
            slug: this.slug,
            product_type: this.product_type,
            status: this.status,
            main_specs: this.main_specs ?? {},
            images: Array.isArray(this.images) ? this.images : [],
            options: Array.isArray(this.options) ? this.options : [],
            variants: Array.isArray(this.variants) ? this.variants : [],
        };

        if (includeTimestamps) {
            data.createdAt = this.createdAt;
            data.updatedAt = this.updatedAt;
        }

        return data;
    }

    addVariant(input = {}) {
        const sku = createSku(input.sku);
        const money = createMoney({
            amount: input.price_amount,
            currency: input.currency,
        });

        const stock_on_hand = normalizeStock(input.stock_on_hand);
        const variant_name = String(input.variant_name ?? "").trim();

        const selections = normalizeSelections(input.selections);
        const resolved = resolveSelectionsFromProduct({
            options: this.options,
            selections,
        });

        const signature = buildVariantSignature(
            resolved.map((s) => ({ option_code: s.option_code, value_code: s.value_code }))
        );

        const variants = Array.isArray(this.variants) ? this.variants : [];
        if (variants.some((v) => v.variant_signature === signature)) {
            throw CatalogDomainErrors.VARIANT_COMBINATION_EXISTS();
        }
        if (variants.some((v) => v.sku === sku)) {
            throw CatalogDomainErrors.VARIANT_SKU_EXISTS();
        }

        let nextVariants = variants;
        if (input.is_default) {
            nextVariants = nextVariants.map((v) => ({ ...v, is_default: false }));
        }

        const newVariant = {
            id: String(input.id ?? "").trim() || crypto.randomUUID(),
            sku,
            is_default: Boolean(input.is_default),
            variant_name,
            price_amount: money.amount,
            currency: money.currency,
            stock_on_hand,
            variant_signature: signature,
            selections: resolved.map((s) => ({
                option_id: s.option_id,
                option_value_id: s.option_value_id,
            })),
        };

        this.variants = [...nextVariants, newVariant];
        return newVariant;
    }

    updateStatus(nextStatus) {
        const normalized = String(nextStatus ?? "").trim();
        if (!normalized) throw CatalogDomainErrors.PRODUCT_STATUS_REQUIRED();
        if (!Product.isValidStatus(normalized)) {
            throw CatalogDomainErrors.PRODUCT_STATUS_INVALID();
        }

        const currentStatus = String(this.status ?? "").trim();
        if (!Product.isValidStatus(currentStatus)) {
            throw CatalogDomainErrors.PRODUCT_STATUS_INVALID();
        }

        if (currentStatus === normalized) {
            return this;
        }

        if (!Product.canTransition(currentStatus, normalized)) {
            throw CatalogDomainErrors.PRODUCT_STATUS_TRANSITION_INVALID({
                from: currentStatus,
                to: normalized,
                allowed: Product.allowedTransitions(currentStatus),
            });
        }

        this.status = normalized;
        return this;
    }
}

function normalizeImages(raw) {
    if (!Array.isArray(raw)) return [];
    return raw
        .map((x) => String(x ?? "").trim())
        .filter(Boolean);
}

function normalizeOptions(raw) {
    if (!Array.isArray(raw)) return [];

    return raw.map((opt) => {
        const id = String(opt?.id ?? "").trim() || crypto.randomUUID();
        const code = String(opt?.code ?? "").trim();
        const name = String(opt?.name ?? "").trim();
        const sort_order = toInt(opt?.sort_order, 0);
        const values = normalizeOptionValues(opt?.values);

        return { id, code, name, sort_order, values };
    });
}

function normalizeOptionValues(raw) {
    if (!Array.isArray(raw)) return [];

    return raw.map((v) => {
        const id = String(v?.id ?? "").trim() || crypto.randomUUID();
        const value_code = String(v?.value_code ?? "").trim();
        const value_name = String(v?.value_name ?? "").trim();
        const sort_order = toInt(v?.sort_order, 0);
        const meta = isPlainObject(v?.meta) ? v.meta : {};

        return { id, value_code, value_name, sort_order, meta };
    });
}

function normalizeSelections(raw) {
    if (!Array.isArray(raw)) return [];
    return raw.map((s) => ({
        option_code: String(s?.option_code ?? "").trim(),
        value_code: String(s?.value_code ?? "").trim(),
    }));
}

function resolveSelectionsFromProduct({ options, selections }) {
    const opts = Array.isArray(options) ? options : [];
    if (opts.length === 0) throw CatalogDomainErrors.PRODUCT_OPTIONS_EMPTY();

    if (selections.some((s) => !s.option_code || !s.value_code)) {
        throw CatalogDomainErrors.VARIANT_SELECTION_INVALID();
    }

    const seen = new Set();
    for (const s of selections) {
        if (seen.has(s.option_code)) throw CatalogDomainErrors.VARIANT_SELECTION_DUPLICATE_OPTION();
        seen.add(s.option_code);
    }

    if (selections.length !== opts.length) {
        throw CatalogDomainErrors.VARIANT_SELECTION_INCOMPLETE();
    }

    const optionByCode = new Map(
        opts.map((o) => [String(o.code ?? "").trim(), o])
    );

    const resolved = selections.map((s) => {
        const option = optionByCode.get(s.option_code);
        if (!option) throw CatalogDomainErrors.VARIANT_OPTION_NOT_FOUND(s.option_code);

        const values = Array.isArray(option.values) ? option.values : [];
        const value = values.find(
            (v) => String(v.value_code ?? "").trim() === s.value_code
        );
        if (!value) {
            throw CatalogDomainErrors.VARIANT_OPTION_VALUE_NOT_FOUND(
                s.option_code,
                s.value_code
            );
        }

        return {
            option_code: s.option_code,
            value_code: s.value_code,
            option_id: option.id,
            option_value_id: value.id,
        };
    });

    for (const opt of opts) {
        const code = String(opt.code ?? "").trim();
        if (!seen.has(code)) {
            throw CatalogDomainErrors.VARIANT_SELECTION_INCOMPLETE();
        }
    }

    return resolved;
}

function normalizeStock(raw) {
    const stock = Number(raw ?? 0);
    if (!Number.isFinite(stock) || stock < 0) {
        throw CatalogDomainErrors.VARIANT_STOCK_INVALID();
    }
    return stock;
}

function toInt(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

function isPlainObject(x) {
    return x !== null && typeof x === "object" && !Array.isArray(x);
}
