// apps/backend/src/modules/catalog/application/usecases/getFilterDef.usecase.js
import { getFilterDefQuery } from "./queries/getFilterDef.query.js";

export function makeGetFilterDefUseCase() {
    return async function getFilterDef(input = {}) {
        return getFilterDefQuery(input);
    };
}
