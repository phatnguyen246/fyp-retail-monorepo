// apps/backend/src/modules/catalog/api/facets.controllers.js
import { parseFiltersQuery } from "../validators/filters.validator.js";
import { getProductFacetsQuery } from "../../application/usecases/queries/getProductFacets.query.js";

export function makeFacetsController({ usecases }) {
    if (!usecases) throw new Error("MISSING_USECASES");

    return {
        async getProductFacets(req, res, next) {
            try {
                const parsedFilters = parseFiltersQuery({
                    product_type: req.query?.product_type,
                    filters: req.query?.filters,
                });

                const query = getProductFacetsQuery({
                    ...req.query,
                    filters: parsedFilters.filters,
                });

                const result = await usecases.getProductFacets(query);
                res.json(result);
            } catch (err) {
                next(err);
            }
        },
    };
}
