export function createCatalogController({ services }) {
    return {
        getHealth(_req, res) {
            return res.status(200).json(services.getHealth());
        },
    };
}
