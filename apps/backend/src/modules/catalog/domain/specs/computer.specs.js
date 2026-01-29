// apps/backend/src/modules/catalog/domain/specs/computer.specs.js

export const computerSpecs = [
    { key: "brand", type: "string", label: "Brand" },
    { key: "model", type: "string", label: "Model" },
    { key: "os", type: "string", label: "Operating System" },
    { key: "cpu_brand", type: "string", label: "CPU Brand" },
    { key: "cpu_model", type: "string", label: "CPU Model" },
    { key: "ram_gb", type: "number", label: "RAM", unit: "GB" },
    { key: "storage_gb", type: "number", label: "Storage", unit: "GB" },
    { key: "storage_type", type: "string", label: "Storage Type" },
    { key: "gpu_model", type: "string", label: "GPU Model" },
    { key: "screen_size_in", type: "number", label: "Screen Size", unit: "inch" },
    { key: "is_touchscreen", type: "boolean", label: "Touchscreen" },
];
