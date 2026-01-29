import { describe, it, expect } from "vitest";
import { listProductsQuery } from "../application/usecases/queries/listProducts.query.js";
import { encodeCursor, decodeCursor } from "../infrastructure/persistence/cursor.codec.js";
import { parseFiltersQuery } from "../api/validators/filters.validator.js";
import { buildListQuery } from "../infrastructure/persistence/product.repository.mongo.js";

describe("catalog listProducts query", () => {
    it("applies default limit and sort", () => {
        const q = listProductsQuery({});
        expect(q.limit).toBe(20);
        expect(q.cursor).toBeNull();
        expect(q.sort.field).toBe("createdAt");
        expect(q.sort.direction).toBe("desc");
    });

    it("rejects invalid sort field", () => {
        try {
            listProductsQuery({ sort_field: "price" });
            throw new Error("expected to throw");
        } catch (err) {
            expect(err?.code).toBe("SORT_FIELD_INVALID");
        }
    });
});

describe("cursor codec", () => {
    it("encodes and decodes payload", () => {
        const token = encodeCursor({
            f: "createdAt",
            d: "desc",
            v: "2026-01-29T10:00:00.000Z",
            id: "65b1234567890abcdef1234",
        });

        const decoded = decodeCursor(token);
        expect(decoded).toEqual({
            f: "createdAt",
            d: "desc",
            v: "2026-01-29T10:00:00.000Z",
            id: "65b1234567890abcdef1234",
        });
    });

    it("throws on invalid token", () => {
        expect(() => decodeCursor("not-a-valid-token")).toThrow();
    });
});

describe("filters validator", () => {
    it("parses numeric filter with gte operator", () => {
        const result = parseFiltersQuery({
            product_type: "computer",
            filters: [{ key: "ram_gb", op: "gte", value: "16" }],
        });

        expect(result.filters[0]).toEqual({
            key: "ram_gb",
            type: "number",
            op: "gte",
            value: 16,
        });
    });

    it("rejects unknown filter key", () => {
        try {
            parseFiltersQuery({
                product_type: "computer",
                filters: [{ key: "not_allowed", op: "eq", value: "x" }],
            });
            throw new Error("expected to throw");
        } catch (err) {
            expect(err?.code).toBe("FILTER_KEY_INVALID");
        }
    });
});

describe("specs_kv filtering", () => {
    it("applies OR within a field and AND across fields", () => {
        const filters = parseFiltersQuery({
            product_type: "computer",
            filters: [
                { key: "ram_gb", op: "eq", value: 8 },
                { key: "ram_gb", op: "eq", value: 16 },
            ],
        }).filters;

        const query = buildListQuery({ product_type: "computer" }, filters);

        const productA = {
            product_type: "computer",
            specs_kv: [
                { k: "spec.ram_gb", n: 8 },
                { k: "spec.ram_gb", n: 16 },
            ],
        };
        const productB = {
            product_type: "computer",
            specs_kv: [{ k: "spec.ram_gb", n: 12 }],
        };

        expect(matchesQuery(productA, query)).toBe(true);
        expect(matchesQuery(productB, query)).toBe(false);
    });

    it("filters price buckets using agg.price_min/max", () => {
        const filters = parseFiltersQuery({
            product_type: "computer",
            filters: [{ key: "price", op: "gte", value: 20000000 }],
        }).filters;

        const query = buildListQuery({ product_type: "computer" }, filters);

        const productA = {
            product_type: "computer",
            specs_kv: [
                { k: "agg.price_min", n: 18000000 },
                { k: "agg.price_max", n: 22000000 },
            ],
        };
        const productB = {
            product_type: "computer",
            specs_kv: [
                { k: "agg.price_min", n: 15000000 },
                { k: "agg.price_max", n: 15000000 },
            ],
        };

        expect(matchesQuery(productA, query)).toBe(true);
        expect(matchesQuery(productB, query)).toBe(false);
    });

    it("matches single-value filters from main_specs fallback", () => {
        const filters = parseFiltersQuery({
            product_type: "computer",
            filters: [{ key: "ram_gb", op: "eq", value: 12 }],
        }).filters;

        const query = buildListQuery({ product_type: "computer" }, filters);

        const productA = {
            product_type: "computer",
            specs_kv: [{ k: "spec.ram_gb", n: 16 }],
        };
        const productB = {
            product_type: "computer",
            specs_kv: [{ k: "spec.ram_gb", n: 12 }],
        };

        expect(matchesQuery(productA, query)).toBe(false);
        expect(matchesQuery(productB, query)).toBe(true);
    });
});

function matchesQuery(doc, query) {
    if (!query || typeof query !== "object") return true;

    for (const [key, value] of Object.entries(query)) {
        if (key === "$and") {
            if (!Array.isArray(value)) return false;
            if (!value.every((clause) => matchesQuery(doc, clause))) return false;
            continue;
        }

        if (key === "$or") {
            if (!Array.isArray(value)) return false;
            if (!value.some((clause) => matchesQuery(doc, clause))) return false;
            continue;
        }

        if (key === "specs_kv" && value?.$elemMatch) {
            const list = Array.isArray(doc.specs_kv) ? doc.specs_kv : [];
            const matched = list.some((item) => matchesElemMatch(item, value.$elemMatch));
            if (!matched) return false;
            continue;
        }

        if (doc[key] !== value) return false;
    }

    return true;
}

function matchesElemMatch(item, match) {
    for (const [field, cond] of Object.entries(match)) {
        if (cond && typeof cond === "object" && !Array.isArray(cond)) {
            if (!matchesCondition(item[field], cond)) return false;
        } else {
            if (item[field] !== cond) return false;
        }
    }
    return true;
}

function matchesCondition(actual, cond) {
    for (const [op, value] of Object.entries(cond)) {
        if (op === "$in") {
            if (!Array.isArray(value) || !value.includes(actual)) return false;
            continue;
        }
        if (op === "$gte" && !(actual >= value)) return false;
        if (op === "$lte" && !(actual <= value)) return false;
        if (op === "$gt" && !(actual > value)) return false;
        if (op === "$lt" && !(actual < value)) return false;
    }
    return true;
}
