/**
 * ProductRepository Port (Application -> Infrastructure)
 *
 * Required methods:
 * - findById(productId): Promise<Product|null>
 * - findBySlug(slug): Promise<Product|null>
 * - save(product): Promise<Product>
 * - findPage({ filter, limit, cursor, sort }): Promise<{ items, nextCursor }>
 */

export function assertProductRepositoryPort(repo, name = "productRepository") {
    const required = ["findById", "findBySlug", "save", "findPage"];
    const missing = required.filter((key) => typeof repo?.[key] !== "function");
    if (missing.length) {
        throw new Error(
            `INVALID_${name.toUpperCase()}_PORT: missing ${missing.join(", ")}`
        );
    }
    return repo;
}
