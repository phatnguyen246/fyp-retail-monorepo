// apps/backend/src/modules/catalog/api/register.js
export function registerCatalogModule(app) {
    app.get("/catalog/health", (req, res) => res.json({ ok: true }));
}
