import { createInventoryController } from "./inventory.controller.js";
import { sendInventorySuccess } from "./inventory-response.js";

export function createInventoryAdminController({ services }) {
    const legacyController = createInventoryController({ services });

    return {
        ...legacyController,

        async createInventoryRecord(req, res) {
            const inventoryRecord = await services.createInventoryRecord({
                input: req.body,
            });

            return sendInventorySuccess(res, {
                status: 201,
                data: inventoryRecord,
            });
        },

        async getInventoryRecord(req, res) {
            const inventoryRecord = await services.getInventoryRecord({
                variantId: req.params.variantId,
            });

            return sendInventorySuccess(res, {
                data: inventoryRecord,
            });
        },

        async updateInventoryRecord(req, res) {
            const inventoryRecord = await services.updateInventoryRecord({
                variantId: req.params.variantId,
                input: req.body,
            });

            return sendInventorySuccess(res, {
                data: inventoryRecord,
            });
        },

        async readInventoryRecords(req, res) {
            const inventoryRecords = await services.readInventoryByVariantIds({
                variantIds: req.body?.variantIds,
            });

            return sendInventorySuccess(res, {
                data: inventoryRecords,
            });
        },

        async listLowStockInventory(req, res) {
            const result = await services.listLowStockInventory({
                query: req.query,
            });

            return sendInventorySuccess(res, {
                data: result.data,
                meta: result.meta,
            });
        },
    };
}
