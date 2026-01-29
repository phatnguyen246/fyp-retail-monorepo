// apps/backend/src/modules/catalog/api/filterDefs.controllers.js

export function makeFilterDefsController({ usecases }) {
    if (!usecases) throw new Error("MISSING_USECASES");

    return {
        async getFilterDefs(req, res, next) {
            try {
                const input = { product_type: req.query?.product_type };
                const result = await usecases.getFilterDef(input);
                res.json(result);
            } catch (err) {
                next(err);
            }
        },
    };
}
