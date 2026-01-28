/**
 * ProductRepository Port (Application -> Infrastructure)
 *
 * Required methods:
 * - findById(productId): Promise<Product|null>
 * - findBySlug(slug): Promise<Product|null>
 * - save(product): Promise<Product>
 * - list({ filter, page, page_size, sort }): Promise<{ items, total, page, page_size }>
 */

export function assertProductRepositoryPort(repo, name = "productRepository") {
    const required = ["findById", "findBySlug", "save", "list"];
    const missing = required.filter((key) => typeof repo?.[key] !== "function");
    if (missing.length) {
        throw new Error(
            `INVALID_${name.toUpperCase()}_PORT: missing ${missing.join(", ")}`
        );
    }
    return repo;
}
