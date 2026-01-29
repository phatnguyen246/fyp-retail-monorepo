// apps/backend/src/modules/catalog/application/usecases/createProduct.usecase.js
import { createProductCommand } from "../commands/createProduct.command.js";
import { productResult } from "../results/product.result.js";
import { Product } from "../../domain/product.aggregate.js";
import { getSpecDef } from "../../domain/specs/index.js";
import { normalizeMainSpecs } from "../helpers/normalizeMainSpecs.js";
import { buildSpecsKv } from "../helpers/buildSpecsKv.js";
import { CatalogErrors } from "../errors/index.js";

export function makeCreateProductUseCase({ productRepository }) {
    return async function createProduct(rawInput) {
        const cmd = createProductCommand(rawInput);
        const requestedType = String(cmd.product_type ?? "").trim() || "smartphone";
        const specDef = getSpecDef(requestedType);
        if (!specDef) throw CatalogErrors.PRODUCT_TYPE_INVALID();

        const product_type = specDef.product_type;
        const main_specs = normalizeMainSpecs(cmd.main_specs, specDef);
        const specs_kv = buildSpecsKv(
            {
                main_specs,
                options: cmd.options,
                variants: cmd.variants,
            },
            specDef
        );

        const product = Product.create({
            ...cmd,
            product_type,
            main_specs,
            specs_kv,
        });

        const saved = await productRepository.save(product);
        return productResult(saved);
    };
}
