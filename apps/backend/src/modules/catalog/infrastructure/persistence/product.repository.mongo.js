import { ProductCollection } from "./product.collection.js";
import { Product } from "../../domain/product.aggregate.js";

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
         *   page, page_size,
         *   sort: { field, direction }
         * }
         */
        async list({ filter = {}, page = 1, page_size = 20, sort = { field: "createdAt", direction: "desc" } } = {}) {
            const query = buildListQuery(filter);

            const skip = Math.max(0, (page - 1) * page_size);
            const limit = Math.max(1, page_size);

            const sortSpec = buildSortSpec(sort);

            // projection: trả về dữ liệu nhẹ cho listing (không cần options/variants đầy đủ)
            const projection = {
                _id: 0,
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

            const [items, total] = await Promise.all([
                ProductCollection.find(query)
                    .select(projection)
                    .sort(sortSpec)
                    .skip(skip)
                    .limit(limit)
                    .lean(),
                ProductCollection.countDocuments(query),
            ]);

            return {
                items: items.map(Product.fromPersistence),
                page,
                page_size: limit,
                total,
            };
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
