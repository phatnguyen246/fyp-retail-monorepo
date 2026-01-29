// apps/backend/src/modules/catalog/domain/specs/smartphone.specs.js

export const smartphoneSpecs = [
    { key: "brand", type: "string", label: "Brand" },
    { key: "model", type: "string", label: "Model" },
    { key: "os", type: "string", label: "Operating System" },
    { key: "screen_size_in", type: "number", label: "Screen Size", unit: "inch" },
    { key: "battery_mah", type: "number", label: "Battery", unit: "mAh" },
    { key: "ram_gb", type: "number", label: "RAM", unit: "GB" },
    { key: "storage_gb", type: "number", label: "Storage", unit: "GB" },
    { key: "cpu_brand", type: "string", label: "CPU Brand" },
    { key: "cpu_model", type: "string", label: "CPU Model" },
    { key: "camera_mp", type: "number", label: "Camera", unit: "MP" },
    { key: "has_5g", type: "boolean", label: "5G" },
];
