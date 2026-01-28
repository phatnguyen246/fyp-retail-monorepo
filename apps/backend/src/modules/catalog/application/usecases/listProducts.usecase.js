// apps/backend/src/modules/catalog/application/usecases/listProducts.usecase.js
import { listProductsCommand } from "../commands/listProducts.command.js";
import { listProductsResult } from "../results/listProducts.result.js";
import { CatalogErrors } from "../errors/index.js";

const VALID_STATUS = ["draft", "active", "archived"];

export function makeListProductsUseCase({ productRepository }) {
    return async function listProducts(rawInput = {}) {
        const cmd = listProductsCommand(rawInput);

        if (cmd.filter.status && !VALID_STATUS.includes(cmd.filter.status)) {
            throw CatalogErrors.PRODUCT_STATUS_INVALID();
        }

        // Nếu bạn muốn tối giản nhưng có ý nghĩa: whitelist product_type (nếu bạn có enum)
        // Ví dụ: smartphone/laptop... hoặc bỏ hẳn validate nếu chưa có rule.
        if (cmd.sort.direction == null) {
            throw CatalogErrors.SORT_DIRECTION_INVALID?.(cmd.sort.direction, ["asc", "desc"])
                ?? CatalogErrors.BAD_REQUEST?.("Sort direction is required");
        }

        const result = await productRepository.list(cmd);
        // giả sử repo trả shape: { items, total, page, page_size }
        return listProductsResult(result);
    };
}
