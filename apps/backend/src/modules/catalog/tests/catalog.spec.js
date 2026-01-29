import { describe, it, expect } from "vitest";
import { listProductsQuery } from "../application/usecases/queries/listProducts.query.js";
import { encodeCursor, decodeCursor } from "../infrastructure/persistence/cursor.codec.js";
import { parseFiltersQuery } from "../api/validators/filters.validator.js";

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
