import { CATALOG_MODULE_NAME } from "../constants/index.js";
export {
    isValidObjectId,
    toObjectId,
    toObjectIdArray,
    toOptionalObjectId,
} from "./object-id.js";

export function createCatalogHealthPayload() {
    return {
        ok: true,
        module: CATALOG_MODULE_NAME,
    };
}
