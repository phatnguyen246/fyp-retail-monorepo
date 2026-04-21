import re

file_path = "apps/frontend/src/pages/admin/AdminProductDetailPage.vue"
with open(file_path, "r") as f:
    content = f.read()

# 1. Remove const variantMediaModalOpen = ref(false)
content = re.sub(r"const variantMediaModalOpen = ref\(false\)\n", "", content)

# 2. Remove function openVariantMediaGallery
open_variant_media_gallery_pattern = r"function openVariantMediaGallery\(variantId\) \{\n\s*hydrateSelectedVariant\(variantId\)\n\s*variantMediaModalOpen\.value = true\n\}\n\n"
content = re.sub(open_variant_media_gallery_pattern, "", content)

# 3. Add 'Edit selected variant' button
button_row_old = """            <div class="admin-button-row">
              <button
                type="button"
                class="admin-button admin-button-primary"
                @click="createVariantModalOpen = true"
              >
                Create variant
              </button>
            </div>"""

button_row_new = """            <div class="admin-button-row">
              <button
                v-if="selectedVariantId"
                type="button"
                class="admin-button admin-button-secondary"
                @click="openVariantWorkshop(selectedVariantId)"
              >
                Edit selected variant
              </button>
              <button
                type="button"
                class="admin-button admin-button-primary"
                @click="createVariantModalOpen = true"
              >
                Create variant
              </button>
            </div>"""
content = content.replace(button_row_old, button_row_new)

# 4. Replace variant list with variant grid
variant_list_old = """          <div v-else class="admin-variant-list">
            <div
              v-for="variant in detail.variants"
              :key="variant.id"
              class="admin-variant-list-item"
              :class="{ 'admin-variant-list-item-active': selectedVariantId === variant.id }"
            >
              <div class="admin-variant-list-main">
                <div class="admin-variant-list-summary">
                  <p class="admin-table-title">{{ variant.sku }}</p>
                  <p class="admin-table-subtitle">
                    {{ variant.variantAttributes.ram }} / {{ variant.variantAttributes.rom }} /
                    {{ variant.variantAttributes.color }}
                  </p>
                </div>

                <div class="admin-variant-list-meta">
                  <span class="admin-variant-meta-chip">
                    RAM {{ variant.variantAttributes.ram || 'N/A' }}
                  </span>
                  <span class="admin-variant-meta-chip">
                    ROM {{ variant.variantAttributes.rom || 'N/A' }}
                  </span>
                  <span class="admin-variant-meta-chip">
                    {{ variant.variantAttributes.colorFullName || variant.variantAttributes.color || 'N/A' }}
                  </span>
                </div>
              </div>

              <div class="admin-variant-list-side">
                <div class="admin-variant-list-status">
                  <span class="admin-status-pill" :data-tone="variant.status">{{ getVariantStatusLabel(variant.status) }}</span>
                  <span class="admin-status-pill" :data-tone="variant.isInStock ? 'success' : 'muted'">
                    {{ variant.isInStock ? 'In stock' : 'Out of stock' }}
                  </span>
                </div>

                <div class="admin-variant-list-actions">
                  <button
                    type="button"
                    class="admin-button admin-button-secondary admin-button-compact"
                    @click="openVariantMediaGallery(variant.id)"
                  >
                    Media gallery
                  </button>
                  <button
                    type="button"
                    class="admin-button admin-button-secondary admin-button-compact"
                    @click="openVariantWorkshop(variant.id)"
                  >
                    Edit
                  </button>
                </div>
              </div>
            </div>
          </div>"""

variant_list_new = """          <div v-else class="admin-variant-grid">
            <div
              v-for="variant in detail.variants"
              :key="variant.id"
              class="admin-variant-card"
              :class="{ 'admin-variant-card-active': selectedVariantId === variant.id }"
              @click="hydrateSelectedVariant(variant.id)"
            >
              <div class="admin-variant-card-header">
                <div>
                  <p class="admin-table-title">{{ variant.sku }}</p>
                  <p class="admin-table-subtitle">
                    {{ variant.variantAttributes.ram }} / {{ variant.variantAttributes.rom }} /
                    {{ variant.variantAttributes.color }}
                  </p>
                </div>
              </div>

              <div class="admin-variant-card-meta">
                <span class="admin-variant-meta-chip">
                  RAM {{ variant.variantAttributes.ram || 'N/A' }}
                </span>
                <span class="admin-variant-meta-chip">
                  ROM {{ variant.variantAttributes.rom || 'N/A' }}
                </span>
                <span class="admin-variant-meta-chip">
                  {{ variant.variantAttributes.colorFullName || variant.variantAttributes.color || 'N/A' }}
                </span>
              </div>

              <div class="admin-variant-card-status">
                <span class="admin-status-pill" :data-tone="variant.status">{{ getVariantStatusLabel(variant.status) }}</span>
                <span class="admin-status-pill" :data-tone="variant.isInStock ? 'success' : 'muted'">
                  {{ variant.isInStock ? 'In stock' : 'Out of stock' }}
                </span>
              </div>
            </div>
          </div>"""

content = content.replace(variant_list_old, variant_list_new)

# 5. Remove media gallery modal
media_gallery_modal_pattern = r"\s*<div\n\s*v-if=\"variantMediaModalOpen && selectedVariant\"\n\s*class=\"admin-modal-backdrop\"\n\s*@click\.self=\"variantMediaModalOpen = false\"\n\s*>\n\s*<div class=\"admin-modal-panel admin-modal-panel-wide\" role=\"dialog\" aria-modal=\"true\">\n\s*<div class=\"admin-card-header\">\n\s*<div>\n\s*<p class=\"admin-section-kicker\">Media Gallery</p>\n\s*<h2 class=\"admin-card-title\">Variant Images: \{\{ selectedVariant\.sku \}\}</h2>\n\s*</div>\n\n\s*<button\n\s*type=\"button\"\n\s*class=\"admin-button admin-button-secondary\"\n\s*@click=\"variantMediaModalOpen = false\"\n\s*>\n\s*Close\n\s*</button>\n\s*</div>\n\n\s*<div class=\"admin-form-grid\">\n\s*<label class=\"admin-field\">\n\s*<FieldLabel label=\"Upload image\" :hint=\"fieldHints\.uploadImage\" />\n\s*<input\n\s*class=\"admin-input\"\n\s*type=\"file\"\n\s*accept=\"image/jpeg,image/png,image/webp\"\n\s*@change=\"uploadImage\"\n\s*/>\n\s*</label>\n\n\s*<div v-if=\"loadingVariantAssets \|\| uploadingImage\" class=\"admin-empty-state\">\n\s*Syncing media gallery\.\.\.\n\s*</div>\n\n\s*<div v-else-if=\"variantImages\.length === 0\" class=\"admin-empty-state\">\n\s*This variant has no images yet\.\n\s*</div>\n\n\s*<div v-else class=\"admin-media-grid\">\n\s*<article v-for=\"media in variantImages\" :key=\"media\.id\" class=\"admin-media-card\">\n\s*<img :src=\"media\.url\" :alt=\"media\.fileName\" class=\"admin-media-preview\" />\n\s*<div class=\"admin-media-meta\">\n\s*<p class=\"admin-table-title\">\{\{ media\.fileName \}\}</p>\n\s*<p class=\"admin-table-subtitle\">\n\s*Sort \{\{ formatNumber\(media\.sortOrder\) \}\} • \{\{ formatNumber\(media\.size\) \}\} bytes\n\s*</p>\n\s*</div>\n\s*<button type=\"button\" class=\"admin-inline-link\" @click=\"removeImage\(media\.id\)\">\n\s*Remove image\n\s*</button>\n\s*</article>\n\s*</div>\n\s*</div>\n\s*</div>\n\s*</div>\n"

content = re.sub(media_gallery_modal_pattern, "", content)

# 6. Add new media gallery section after the variant list section
new_media_gallery_section = """
        </section>

        <section v-if="selectedVariantId && selectedVariant" class="admin-card">
          <div class="admin-card-header">
            <div>
              <p class="admin-section-kicker">Media Gallery</p>
              <h2 class="admin-card-title">Variant Images: {{ selectedVariant.sku }}</h2>
            </div>
          </div>

          <div class="admin-form-grid">
            <label class="admin-field">
              <FieldLabel label="Upload image" :hint="fieldHints.uploadImage" />
              <input
                class="admin-input"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                @change="uploadImage"
              />
            </label>

            <div v-if="loadingVariantAssets || uploadingImage" class="admin-empty-state">
              Syncing media gallery...
            </div>

            <div v-else-if="variantImages.length === 0" class="admin-empty-state">
              This variant has no images yet.
            </div>

            <div v-else class="admin-media-grid">
              <article v-for="media in variantImages" :key="media.id" class="admin-media-card">
                <img :src="media.url" :alt="media.fileName" class="admin-media-preview" />
                <div class="admin-media-meta">
                  <p class="admin-table-title">{{ media.fileName }}</p>
                  <p class="admin-table-subtitle">
                    Sort {{ formatNumber(media.sortOrder) }} • {{ formatNumber(media.size) }} bytes
                  </p>
                  <button type="button" class="admin-inline-link" @click="removeImage(media.id)">
                    Remove image
                  </button>
                </div>
              </article>
            </div>
          </div>
        </section>"""

content = content.replace("        </section>\n\n      </div>", new_media_gallery_section + "\n      </div>")

# 7. Add scoped styles to the end of the file
styles = """
<style scoped>
.admin-variant-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 1rem;
}

@media (max-width: 1280px) {
  .admin-variant-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

@media (max-width: 1024px) {
  .admin-variant-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .admin-variant-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 480px) {
  .admin-variant-grid {
    grid-template-columns: 1fr;
  }
}

.admin-variant-card {
  border: 1px solid var(--admin-border-color, #e2e8f0);
  border-radius: 0.5rem;
  padding: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
  background: #fff;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.admin-variant-card:hover {
  border-color: var(--admin-primary-color, #3b82f6);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

.admin-variant-card-active {
  border-color: var(--admin-primary-color, #3b82f6);
  background-color: #f8fafc;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}

.admin-variant-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.5rem;
}

.admin-variant-card-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.admin-variant-card-status {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
</style>
"""
if "<style scoped>" not in content:
    content += styles

with open(file_path, "w") as f:
    f.write(content)
