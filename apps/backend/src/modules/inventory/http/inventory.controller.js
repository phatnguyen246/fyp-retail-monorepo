export function createInventoryController({ services }) {
    return {
        getHealth(_req, res) {
            return res.status(200).json(services.getHealth());
        },

        async getInventoryRecord(req, res) {
            const inventoryRecord = await services.readInventoryByVariantId({
                variantId: req.params.variantId,
            });

            return res.status(200).json(inventoryRecord);
        },

        async readInventoryRecords(req, res) {
            const inventoryRecords = await services.readInventoryByVariantIds({
                variantIds: req.body?.variantIds,
            });

            return res.status(200).json(inventoryRecords);
        },
    };
}
