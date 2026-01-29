import mongoose from "mongoose";
import { ProductCollection } from "./product.collection.js";
import { Product } from "../../domain/product.aggregate.js";
import { CatalogErrors } from "../../application/errors/index.js";
import { decodeCursor, encodeCursor } from "./cursor.codec.js";

export function makeProductRepositoryMongo() {
    return {
        async findById(productId) {
            const doc = await ProductCollection.findOne({ id: productId }).lean();
            return Product.fromPersistence(doc);
        },

        async findBySlug(slug) {
            const doc = await ProductCollection.findOne({ slug }).lean();
            return Product.fromPersistence(doc);
        },

        async save(product) {
            const aggregate =
                product instanceof Product ? product : Product.fromPersistence(product);
            if (!aggregate) return null;

            const payload = aggregate.toPersistence();
            const { id, createdAt, updatedAt, ...data } = payload;

            if (!id) {
                const doc = await ProductCollection.create(payload);
                return Product.fromPersistence(doc.toJSON());
            }

            const doc = await ProductCollection.findOneAndUpdate(
                { id },
                { $set: data },
                { new: true }
            );
            return doc ? Product.fromPersistence(doc.toJSON()) : null;
        },

        /**
         * List products for catalog/admin listing
         * params: {
         *   filter: { status?, product_type?, q? },
         *   limit,
         *   cursor,
         *   sort: { field, direction }
         * }
         */
        async findPage({
            filter = {},
            limit = 20,
            cursor = null,
            sort = { field: "createdAt", direction: "desc" },
        } = {}) {
            const baseQuery = buildListQuery(filter);
            const pageSize = clamp(toInt(limit, 20), 1, 100);

            const { sortSpec, cursorQuery } = buildCursorQuery({ sort, cursor });
            const query =
                cursorQuery
                    ? mergeWithCursor(baseQuery, cursorQuery)
                    : baseQuery;

            // projection: trả về dữ liệu nhẹ cho listing (không cần options/variants đầy đủ)
            const projection = {
                _id: 1,
                id: 1,
                name: 1,
                slug: 1,
                product_type: 1,
                status: 1,
                images: 1,
                main_specs: 1,
                createdAt: 1,
                updatedAt: 1,
                // không include options/variants để listing nhẹ
            };

            const docs = await ProductCollection.find(query)
                .select(projection)
                .sort(sortSpec)
                .limit(pageSize + 1)
                .lean();

            const hasNext = docs.length > pageSize;
            const pageDocs = hasNext ? docs.slice(0, pageSize) : docs;
            const items = pageDocs.map(Product.fromPersistence);

            let nextCursor = null;
            if (hasNext && pageDocs.length > 0) {
                const last = pageDocs[pageDocs.length - 1];
                const payload = buildCursorPayload(sort, last);
                nextCursor = encodeCursor(payload);
            }

            return { items, nextCursor };
        },
    };
}

function buildListQuery(filter) {
    const q = {};
    if (filter.status) q.status = String(filter.status).trim();
    if (filter.product_type) q.product_type = String(filter.product_type).trim();

    // Simple search by name/slug (basic)
    if (filter.q) {
        const keyword = String(filter.q).trim();
        if (keyword) {
            // NOTE: regex search tối giản; production nên cân nhắc text index
            q.$or = [
                { name: { $regex: escapeRegex(keyword), $options: "i" } },
                { slug: { $regex: escapeRegex(keyword), $options: "i" } },
            ];
        }
    }
    return q;
}

function buildSortSpec(sort) {
    const field = String(sort?.field ?? "createdAt").trim();
    const direction = String(sort?.direction ?? "desc").trim().toLowerCase() === "asc" ? 1 : -1;

    // allowlist sort field để tránh sort bừa
    const allowed = new Set(["createdAt", "updatedAt", "name", "status", "product_type"]);
    const safeField = allowed.has(field) ? field : "createdAt";

    return { [safeField]: direction };
}

function escapeRegex(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildCursorQuery({ sort, cursor }) {
    const sortSpec = buildSortSpec(sort);
    const field = String(sort?.field ?? "createdAt").trim();
    const direction = String(sort?.direction ?? "desc").trim().toLowerCase() === "asc" ? "asc" : "desc";

    const effectiveSort = {
        field,
        direction,
        spec: { [field]: sortSpec[field], _id: sortSpec[field] },
    };

    if (!cursor) {
        return { sortSpec: effectiveSort.spec, cursorQuery: null };
    }

    let decoded;
    try {
        decoded = decodeCursor(cursor);
    } catch {
        throw CatalogErrors.INVALID_CURSOR();
    }

    if (decoded.f !== field || decoded.d !== direction) {
        throw CatalogErrors.CURSOR_MISMATCH({
            expected: { f: field, d: direction },
            actual: { f: decoded.f, d: decoded.d },
        });
    }

    const cursorValue = coerceCursorValue(field, decoded.v);
    const cursorId = coerceObjectId(decoded.id);

    const compare = direction === "asc" ? "$gt" : "$lt";
    const cursorQuery = {
        $or: [
            { [field]: { [compare]: cursorValue } },
            { [field]: cursorValue, _id: { [compare]: cursorId } },
        ],
    };

    return { sortSpec: effectiveSort.spec, cursorQuery };
}

function buildCursorPayload(sort, lastDoc) {
    const field = String(sort?.field ?? "createdAt").trim();
    const direction = String(sort?.direction ?? "desc").trim().toLowerCase() === "asc" ? "asc" : "desc";
    const value = lastDoc?.[field];
    const serializedValue = serializeCursorValue(field, value);
    if (!serializedValue) {
        throw CatalogErrors.INVALID_CURSOR();
    }
    return {
        f: field,
        d: direction,
        v: serializedValue,
        id: String(lastDoc?._id ?? ""),
    };
}

function mergeWithCursor(baseQuery, cursorQuery) {
    if (!baseQuery || Object.keys(baseQuery).length === 0) return cursorQuery;
    return { $and: [baseQuery, cursorQuery] };
}

function coerceCursorValue(field, value) {
    if (isDateField(field)) {
        const date = value instanceof Date ? value : new Date(value);
        if (!Number.isFinite(date.getTime())) {
            throw CatalogErrors.INVALID_CURSOR();
        }
        return date;
    }
    return String(value);
}

function serializeCursorValue(field, value) {
    if (isDateField(field)) {
        const date = value instanceof Date ? value : new Date(value);
        if (!Number.isFinite(date.getTime())) return null;
        return date.toISOString();
    }
    const s = value == null ? "" : String(value);
    return s.length ? s : null;
}

function isDateField(field) {
    return field === "createdAt" || field === "updatedAt";
}

function coerceObjectId(id) {
    const str = String(id ?? "");
    if (!mongoose.Types.ObjectId.isValid(str)) {
        throw CatalogErrors.INVALID_CURSOR();
    }
    return new mongoose.Types.ObjectId(str);
}

function toInt(value, fallback) {
    const n = Number(value);
    return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
}
