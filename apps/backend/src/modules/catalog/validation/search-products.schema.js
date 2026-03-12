import { PRODUCT_DISCOVERY_QUERY_SCHEMA } from "./product-discovery-query.schema.js";

export const SEARCH_PRODUCTS_QUERY_SCHEMA = PRODUCT_DISCOVERY_QUERY_SCHEMA.refine(
    (value) => typeof value.keyword === "string" && value.keyword.length > 0,
    {
        path: ["q"],
        message: "Catalog search query requires q or keyword",
    }
);

export function parseSearchProductsQuery(input) {
    return SEARCH_PRODUCTS_QUERY_SCHEMA.parse(input);
}
