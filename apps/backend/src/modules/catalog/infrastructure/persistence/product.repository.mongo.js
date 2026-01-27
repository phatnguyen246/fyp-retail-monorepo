import { ProductCollection } from "./product.collection.js";

export function makeProductRepositoryMongo() {
    return {
        async findById(productId) {
            return ProductCollection.findOne({ id: productId }).lean();
        },

        async findBySlug(slug) {
            return ProductCollection.findOne({ slug }).lean();
        },

        async create(product) {
            // product: { name, slug, product_type, status, main_specs, images, options, variants }
            const doc = await ProductCollection.create(product);
            return doc.toJSON();
        },

        async replaceVariants(productId, variants) {
            const doc = await ProductCollection.findOneAndUpdate(
                { id: productId },
                { $set: { variants } },
                { new: true }
            );
            return doc ? doc.toJSON() : null;
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
                ProductCollection.find(query).select(projection).sort(sortSpec).skip(skip).limit(limit).lean(),
                ProductCollection.countDocuments(query),
            ]);

            return {
                items,
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
