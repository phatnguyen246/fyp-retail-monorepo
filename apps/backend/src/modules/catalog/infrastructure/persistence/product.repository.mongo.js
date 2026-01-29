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
         *   filters: [{ key, type, op, value }],
         *   limit,
         *   cursor,
         *   sort: { field, direction }
         * }
         */
        async findPage({
            filter = {},
            filters = [],
            limit = 20,
            cursor = null,
            sort = { field: "createdAt", direction: "desc" },
        } = {}) {
            const baseQuery = buildListQuery(filter, filters);
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

        async getFacets({ filter = {}, filters = [], filterDef } = {}) {
            const baseQuery = buildListQuery(filter, filters);
            const facetPipelines = buildFacetPipelines(filterDef);

            if (!Object.keys(facetPipelines).length) {
                return {
                    product_type: filterDef?.product_type,
                    groups: [],
                };
            }

            const pipeline = [{ $match: baseQuery }, { $facet: facetPipelines }];
            const [raw] = await ProductCollection.aggregate(pipeline);

            return mapFacetResults({ filterDef, raw: raw ?? {} });
        },
    };
}

function buildListQuery(filter, filters = []) {
    const q = {};
    if (filter.status) q.status = String(filter.status).trim();
    if (filter.product_type) q.product_type = String(filter.product_type).trim().toLowerCase();

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

    const specClauses = buildSpecsKvClauses(filters);
    return mergeWithFilters(q, specClauses);
}

function buildSpecsKvClauses(filters) {
    if (!Array.isArray(filters) || filters.length === 0) return [];
    const clauses = [];

    for (const filter of filters) {
        const clause = buildSpecsKvClause(filter);
        if (clause) clauses.push(clause);
    }

    return clauses;
}

function buildSpecsKvClause(filter) {
    const key = String(filter?.key ?? "").trim();
    if (!key) return null;

    const type = filter?.type;
    const op = String(filter?.op ?? "").trim().toLowerCase();
    const value = filter?.value;

    if (type === "number") {
        if (!Number.isFinite(value) && op !== "between") return null;
        if (op === "between" && value && Number.isFinite(value.min) && Number.isFinite(value.max)) {
            return {
                specs_kv: {
                    $elemMatch: {
                        k: key,
                        n: { $gte: value.min, $lte: value.max },
                    },
                },
            };
        }
        const numberFilter = buildNumericOperator(op, value);
        if (!numberFilter) return null;
        return { specs_kv: { $elemMatch: { k: key, n: numberFilter } } };
    }

    if (type === "string") {
        if (op === "in") {
            if (!Array.isArray(value) || value.length === 0) return null;
            return { specs_kv: { $elemMatch: { k: key, s: { $in: value } } } };
        }
        if (op === "eq") {
            if (typeof value !== "string" || !value) return null;
            return { specs_kv: { $elemMatch: { k: key, s: value } } };
        }
        return null;
    }

    if (type === "boolean") {
        if (typeof value !== "boolean") return null;
        return { specs_kv: { $elemMatch: { k: key, b: value } } };
    }

    return null;
}

function buildNumericOperator(op, value) {
    switch (op) {
        case "eq":
            return value;
        case "gte":
            return { $gte: value };
        case "lte":
            return { $lte: value };
        case "gt":
            return { $gt: value };
        case "lt":
            return { $lt: value };
        default:
            return null;
    }
}

function mergeWithFilters(baseQuery, clauses) {
    if (!clauses || clauses.length === 0) return baseQuery;
    if (!baseQuery || Object.keys(baseQuery).length === 0) {
        return clauses.length === 1 ? clauses[0] : { $and: clauses };
    }
    return { $and: [baseQuery, ...clauses] };
}

function buildFacetPipelines(filterDef) {
    const groups = Array.isArray(filterDef?.groups) ? filterDef.groups : [];
    const pipelines = {};

    for (const group of groups) {
        const filters = Array.isArray(group?.filters) ? group.filters : [];
        for (const filter of filters) {
            const key = filter?.key;
            const field = facetFieldByType(filter?.type);
            if (!key || !field) continue;

            pipelines[key] = [
                { $unwind: "$specs_kv" },
                { $match: { "specs_kv.k": key, [`specs_kv.${field}`]: { $exists: true } } },
                { $group: { _id: `$specs_kv.${field}`, count: { $sum: 1 } } },
            ];
        }
    }

    return pipelines;
}

export function mapFacetResults({ filterDef, raw }) {
    const groups = Array.isArray(filterDef?.groups) ? filterDef.groups : [];
    const normalizedRaw = raw && typeof raw === "object" ? raw : {};

    const resultGroups = groups.map((group) => {
        const filters = Array.isArray(group?.filters) ? group.filters : [];
        const mappedFilters = filters.map((filter) => {
            const items = Array.isArray(normalizedRaw?.[filter.key]) ? normalizedRaw[filter.key] : [];
            return mapFilterCounts(filter, items);
        });

        return {
            id: group.id,
            label: group.label,
            filters: mappedFilters,
        };
    });

    return {
        product_type: filterDef?.product_type,
        groups: resultGroups,
    };
}

function mapFilterCounts(filter, rawItems) {
    const base = {
        key: filter.key,
        label: filter.label,
        type: filter.type,
        control: filter.control,
        unit: filter.unit,
        operators: filter.operators,
    };

    const counts = buildCountMap(rawItems, filter.type);

    if (filter.type === "number" && Array.isArray(filter.buckets)) {
        const buckets = filter.buckets.map((bucket) => ({
            ...bucket,
            count: countInRange(counts, bucket.min, bucket.max),
        }));
        return { ...base, buckets };
    }

    if ((filter.type === "string" || filter.type === "boolean") && Array.isArray(filter.options)) {
        const options = filter.options.map((option) => ({
            ...option,
            count: counts.get(option.value) ?? 0,
        }));
        return { ...base, options };
    }

    const values = rawItems.map((item) => ({
        value: item._id,
        count: item.count,
    }));

    return { ...base, values };
}

function buildCountMap(rawItems, type) {
    const map = new Map();
    for (const item of rawItems) {
        let key = item?._id;
        if (type === "number") {
            key = Number(key);
            if (!Number.isFinite(key)) continue;
        } else if (type === "boolean") {
            if (typeof key === "boolean") {
                // keep as-is
            } else if (typeof key === "number") {
                if (key === 1) key = true;
                else if (key === 0) key = false;
                else continue;
            } else if (typeof key === "string") {
                const normalized = key.trim().toLowerCase();
                if (normalized === "true") key = true;
                else if (normalized === "false") key = false;
                else continue;
            } else {
                continue;
            }
        } else {
            key = key == null ? "" : String(key);
        }
        const prev = map.get(key) ?? 0;
        map.set(key, prev + (item?.count ?? 0));
    }
    return map;
}

function countInRange(counts, min, max) {
    let total = 0;
    for (const [value, count] of counts.entries()) {
        if (min != null && value < min) continue;
        if (max != null && value > max) continue;
        total += count;
    }
    return total;
}

function facetFieldByType(type) {
    if (type === "number") return "n";
    if (type === "boolean") return "b";
    if (type === "string") return "s";
    return null;
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
