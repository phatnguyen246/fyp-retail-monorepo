import { CatalogErrors } from "../errors/index.js";

/**
 * Business rules:
 * - allowed transitions: draft->active, active->archived
 * - forbid: archived->active (and any other not explicitly allowed)
 */
const ALLOWED_TRANSITIONS = new Map([
    ["draft", new Set(["active"])],
    ["active", new Set(["archived"])],
    ["archived", new Set([])],
]);

function assertValidStatus(status) {
    if (!["draft", "active", "archived"].includes(status)) {
        throw CatalogErrors.PRODUCT_STATUS_INVALID();
    }
}

function assertTransition(from, to) {
    const allowed = ALLOWED_TRANSITIONS.get(from);
    if (!allowed || !allowed.has(to)) {
        throw CatalogErrors.PRODUCT_STATUS_TRANSITION_INVALID({
            from,
            to,
            allowed: Array.from(allowed ?? []),
        });
    }
}

export function makeUpdateProductStatusUseCase({ productRepository }) {
    return async function updateProductStatus(input = {}) {
        const productId = String(input.productId ?? "").trim();
        const nextStatus = String(input.status ?? "").trim();

        if (!productId) throw CatalogErrors.PRODUCT_ID_REQUIRED();
        if (!nextStatus) throw CatalogErrors.PRODUCT_STATUS_REQUIRED();

        assertValidStatus(nextStatus);

        const product = await productRepository.findById(productId);
        if (!product) throw CatalogErrors.PRODUCT_NOT_FOUND();

        const currentStatus = product.status;
        assertValidStatus(currentStatus);

        if (currentStatus === nextStatus) {
            // idempotent update: ok, return current product
            return product;
        }

        assertTransition(currentStatus, nextStatus);

        const updated = await productRepository.updateStatus(productId, nextStatus);
        return updated;
    };
}
