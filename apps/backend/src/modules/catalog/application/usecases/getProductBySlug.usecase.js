import { CatalogErrors } from "../errors/index.js";

export function makeGetProductBySlugUseCase({ productRepository }) {
    return async function getProductBySlug({ slug }) {
        const normalizedSlug = String(slug ?? "").trim();
        if (!normalizedSlug) throw CatalogErrors.PRODUCT_SLUG_REQUIRED();

        const product = await productRepository.findBySlug(normalizedSlug);
        if (!product) throw CatalogErrors.PRODUCT_NOT_FOUND();

        // frontend cần đủ options/variants để render page => trả full product
        return product;
    };
}
