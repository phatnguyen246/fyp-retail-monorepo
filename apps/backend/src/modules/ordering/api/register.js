// apps/backend/src/modules/ordering/api/register.js
export function registerOrderingModule(app) {
    app.get("/order/health", (req, res) => res.json({ ok: true }));
}
