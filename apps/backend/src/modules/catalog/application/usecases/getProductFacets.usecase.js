// apps/backend/src/modules/catalog/application/usecases/getProductFacets.usecase.js
import { getProductFacetsQuery } from "./queries/getProductFacets.query.js";
import { getFilterDef } from "../../domain/specs/index.js";
import { CatalogErrors } from "../errors/index.js";

export function makeGetProductFacetsUseCase({ productRepository }) {
    return async function getProductFacets(input = {}) {
        const query = getProductFacetsQuery(input);
        const filterDef = getFilterDef(query.filter.product_type);
        if (!filterDef) throw CatalogErrors.PRODUCT_TYPE_INVALID();

        return productRepository.getFacets({
            filter: query.filter,
            filters: query.filters,
            filterDef,
        });
    };
}
