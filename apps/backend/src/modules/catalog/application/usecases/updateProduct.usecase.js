// apps/backend/src/modules/catalog/application/usecases/updateProduct.usecase.js
import { CatalogErrors } from "../errors/index.js";
import { productResult } from "../results/product.result.js";
import { getSpecDef } from "../../domain/specs/index.js";
import { normalizeMainSpecs } from "../helpers/normalizeMainSpecs.js";
import { buildSpecsKv } from "../helpers/buildSpecsKv.js";

export function makeUpdateProductUseCase({ productRepository }) {
    return async function updateProduct(input = {}) {
        const productId = String(input.productId ?? "").trim();
        if (!productId) throw CatalogErrors.PRODUCT_ID_REQUIRED();

        const product = await productRepository.findById(productId);
        if (!product) throw CatalogErrors.PRODUCT_NOT_FOUND();

        const requestedType = String(
            input.product_type ?? product.product_type ?? ""
        ).trim();
        if (!requestedType) throw CatalogErrors.PRODUCT_TYPE_REQUIRED();

        const specDef = getSpecDef(requestedType);
        if (!specDef) throw CatalogErrors.PRODUCT_TYPE_INVALID();

        const nextProductType = specDef.product_type;
        const rawSpecs = input.main_specs ?? product.main_specs ?? {};
        const main_specs = normalizeMainSpecs(rawSpecs, specDef);
        const specs_kv = buildSpecsKv(
            {
                main_specs,
                options: product.options ?? [],
                variants: product.variants ?? [],
            },
            specDef
        );

        product.product_type = nextProductType;
        product.main_specs = main_specs;
        product.specs_kv = specs_kv;

        const saved = await productRepository.save(product);
        return productResult(saved);
    };
}
