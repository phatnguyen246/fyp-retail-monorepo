import re

file_path = "apps/frontend/src/store/compare.js"
with open(file_path, "r") as f:
    content = f.read()

# 1. Add productTypes tracking
if "const productTypes = ref(new Map())" not in content:
    content = content.replace(
        "const productIds = ref(new Set())",
        "const productIds = ref(new Set())\n  const productTypes = ref(new Map())"
    )

# 2. Update addProduct logic with type checking
old_add = """  function addProduct(productId) {
    if (productIds.value.size < 3) {
      productIds.value.add(productId)
    }
    // Maybe show a notification if the user tries to add more than 3
  }"""

new_add = """  function addProduct(product) {
    // Expect product object instead of just ID to check type
    const id = product.id || product.productId
    const type = product.productType || 'smartphone'

    if (productIds.value.has(id)) return

    if (productIds.value.size >= 3) {
      alert('Bạn chỉ có thể so sánh tối đa 3 sản phẩm.')
      return
    }

    // Check type consistency
    if (productIds.value.size > 0) {
      const existingTypes = Array.from(productTypes.value.values())
      if (!existingTypes.includes(type)) {
        alert('Chỉ có thể so sánh các sản phẩm cùng loại.')
        return
      }
    }

    productIds.value.add(id)
    productTypes.value.set(id, type)
  }"""

content = content.replace(old_add, new_add)

# 3. Update removeProduct logic
old_remove = """  function removeProduct(productId) {
    productIds.value.delete(productId)
  }"""

new_remove = """  function removeProduct(productId) {
    productIds.value.delete(productId)
    productTypes.value.delete(productId)
  }"""

content = content.replace(old_remove, new_remove)

# 4. Update clearCompare
content = content.replace("productIds.value.clear()", "productIds.value.clear(); productTypes.value.clear()")

with open(file_path, "w") as f:
    f.write(content)
