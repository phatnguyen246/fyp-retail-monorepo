// apps/backend/src/modules/catalog/domain/specs/computer.specs.js

export const computerSpecs = [
    { key: "brand", type: "string", label: "Brand", source: "main_specs" },
    { key: "model", type: "string", label: "Model", source: "main_specs" },
    { key: "os", type: "string", label: "Operating System", source: "main_specs" },
    { key: "cpu_brand", type: "string", label: "CPU Brand", source: "main_specs" },
    { key: "cpu_model", type: "string", label: "CPU Model", source: "main_specs" },
    {
        key: "ram_gb",
        type: "number",
        label: "RAM",
        unit: "GB",
        source: "either",
        strategy: "set",
        option_codes: ["ram", "ram_gb", "memory"],
    },
    {
        key: "storage_gb",
        type: "number",
        label: "Storage",
        unit: "GB",
        source: "either",
        strategy: "set",
        option_codes: ["storage", "storage_gb"],
    },
    {
        key: "storage_type",
        type: "string",
        label: "Storage Type",
        source: "either",
        strategy: "set",
        option_codes: ["storage_type", "storage"],
    },
    { key: "gpu_model", type: "string", label: "GPU Model", source: "main_specs" },
    { key: "screen_size_in", type: "number", label: "Screen Size", unit: "inch", source: "main_specs" },
    { key: "is_touchscreen", type: "boolean", label: "Touchscreen", source: "main_specs" },
];
