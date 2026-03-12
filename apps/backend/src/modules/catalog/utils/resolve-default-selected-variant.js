import { filterActiveCatalogVariants } from "./filter-active-catalog-variants.js";

export function resolveDefaultSelectedVariant(variants = []) {
    const activeVariants = filterActiveCatalogVariants(variants);

    if (activeVariants.length === 0) {
        return null;
    }

    const inStockActiveVariants = activeVariants.filter(
        (variant) => variant?.isInStock === true
    );
    const candidateVariants =
        inStockActiveVariants.length > 0 ? inStockActiveVariants : activeVariants;

    return [...candidateVariants].sort(compareVariantsForDefaultSelection)[0] ?? null;
}

function compareVariantsForDefaultSelection(leftVariant, rightVariant) {
    return (
        compareAscending(leftVariant?.ramSort, rightVariant?.ramSort) ||
        compareAscending(leftVariant?.romSort, rightVariant?.romSort) ||
        compareDescendingBoolean(
            leftVariant?.isPrimaryColor,
            rightVariant?.isPrimaryColor
        ) ||
        compareAscending(
            leftVariant?.colorPriority,
            rightVariant?.colorPriority
        ) ||
        compareAscending(
            leftVariant?.variantSortOrder,
            rightVariant?.variantSortOrder
        ) ||
        compareAscendingObjectId(leftVariant?._id, rightVariant?._id)
    );
}

function compareAscending(leftValue, rightValue) {
    const normalizedLeftValue =
        typeof leftValue === "number" && Number.isFinite(leftValue) ? leftValue : 0;
    const normalizedRightValue =
        typeof rightValue === "number" && Number.isFinite(rightValue) ? rightValue : 0;

    if (normalizedLeftValue < normalizedRightValue) {
        return -1;
    }

    if (normalizedLeftValue > normalizedRightValue) {
        return 1;
    }

    return 0;
}

function compareDescendingBoolean(leftValue, rightValue) {
    const normalizedLeftValue = leftValue === true ? 1 : 0;
    const normalizedRightValue = rightValue === true ? 1 : 0;

    if (normalizedLeftValue > normalizedRightValue) {
        return -1;
    }

    if (normalizedLeftValue < normalizedRightValue) {
        return 1;
    }

    return 0;
}

function compareAscendingObjectId(leftValue, rightValue) {
    const normalizedLeftValue = normalizeObjectIdForCompare(leftValue);
    const normalizedRightValue = normalizeObjectIdForCompare(rightValue);

    if (normalizedLeftValue < normalizedRightValue) {
        return -1;
    }

    if (normalizedLeftValue > normalizedRightValue) {
        return 1;
    }

    return 0;
}

function normalizeObjectIdForCompare(value) {
    if (value && typeof value.toHexString === "function") {
        return value.toHexString();
    }

    if (typeof value === "string") {
        return value;
    }

    return "";
}
