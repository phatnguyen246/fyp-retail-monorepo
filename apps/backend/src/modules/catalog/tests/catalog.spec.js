import { describe, it, expect } from "vitest";
import { listProductsQuery } from "../application/usecases/listProducts.query.js";
import { encodeCursor, decodeCursor } from "../infrastructure/persistence/cursor.codec.js";

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
