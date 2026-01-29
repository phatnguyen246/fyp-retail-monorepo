// apps/backend/src/modules/catalog/domain/specs/computer.filters.js

export const computerFilters = {
    product_type: "computer",
    groups: [
        {
            id: "processor",
            label: "Processor",
            filters: [
                {
                    key: "cpu_brand",
                    label: "CPU Brand",
                    type: "string",
                    control: "select",
                    operators: ["in", "eq"],
                    options: [
                        { label: "Intel", value: "intel" },
                        { label: "AMD", value: "amd" },
                        { label: "Apple", value: "apple" },
                    ],
                },
            ],
        },
        {
            id: "memory",
            label: "Memory",
            filters: [
                {
                    key: "ram_gb",
                    label: "RAM",
                    type: "number",
                    unit: "GB",
                    control: "range",
                    operators: ["eq", "gte", "lte", "between"],
                    buckets: [
                        { label: "8 GB", min: 8, max: 8 },
                        { label: "16 GB", min: 16, max: 16 },
                        { label: "32 GB", min: 32, max: 32 },
                        { label: "64 GB+", min: 64 },
                    ],
                },
            ],
        },
        {
            id: "storage",
            label: "Storage",
            filters: [
                {
                    key: "storage_gb",
                    label: "Storage",
                    type: "number",
                    unit: "GB",
                    control: "range",
                    operators: ["eq", "gte", "lte", "between"],
                    buckets: [
                        { label: "256 GB", min: 256, max: 256 },
                        { label: "512 GB", min: 512, max: 512 },
                        { label: "1 TB", min: 1024, max: 1024 },
                        { label: "2 TB+", min: 2048 },
                    ],
                },
                {
                    key: "storage_type",
                    label: "Storage Type",
                    type: "string",
                    control: "select",
                    operators: ["in", "eq"],
                    options: [
                        { label: "SSD", value: "ssd" },
                        { label: "HDD", value: "hdd" },
                        { label: "Hybrid", value: "hybrid" },
                    ],
                },
            ],
        },
        {
            id: "graphics",
            label: "Graphics",
            filters: [
                {
                    key: "gpu_model",
                    label: "GPU",
                    type: "string",
                    control: "select",
                    operators: ["in", "eq"],
                    options: [
                        { label: "NVIDIA", value: "nvidia" },
                        { label: "AMD", value: "amd" },
                        { label: "Intel", value: "intel" },
                    ],
                },
            ],
        },
        {
            id: "display",
            label: "Display",
            filters: [
                {
                    key: "screen_size_in",
                    label: "Screen Size",
                    type: "number",
                    unit: "inch",
                    control: "range",
                    operators: ["gte", "lte", "between"],
                    buckets: [
                        { label: "<= 13\"", max: 13 },
                        { label: "14\"-15.6\"", min: 14, max: 15.6 },
                        { label: ">= 16\"", min: 16 },
                    ],
                },
                {
                    key: "is_touchscreen",
                    label: "Touchscreen",
                    type: "boolean",
                    control: "toggle",
                    operators: ["eq"],
                    options: [
                        { label: "Yes", value: true },
                        { label: "No", value: false },
                    ],
                },
            ],
        },
        {
            id: "os",
            label: "Operating System",
            filters: [
                {
                    key: "os",
                    label: "OS",
                    type: "string",
                    control: "select",
                    operators: ["in", "eq"],
                    options: [
                        { label: "Windows", value: "windows" },
                        { label: "macOS", value: "macos" },
                        { label: "Linux", value: "linux" },
                    ],
                },
            ],
        },
    ],
};
