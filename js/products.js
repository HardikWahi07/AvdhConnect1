// Product management logic

let currentUser = null;
let businessId = null;
let editingProductId = null;

// Get business ID from URL
const urlParams = new URLSearchParams(window.location.search);
businessId = urlParams.get('id');

// Wait for DOM
document.addEventListener('DOMContentLoaded', async () => {
    if (!businessId) {
        alert('Business ID not provided');
        window.location.href = 'dashboard.html';
        return;
    }

    // Wait for Supabase
    const checkSupabase = setInterval(async () => {
        if (typeof supabase !== 'undefined') {
            clearInterval(checkSupabase);
            initProductPage();
        }
    }, 100);
});

async function initProductPage() {
    // Get session
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        window.location.href = 'login.html';
        return;
    }

    currentUser = session.user;
    await verifyOwnership();
    loadProducts();
}

async function verifyOwnership() {
    try {
        const { data: business, error } = await supabase
            .from('businesses')
            .select('*')
            .eq('id', businessId)
            .single();

        if (error || !business) throw new Error('Business not found');

        if (business.owner_id !== currentUser.id) {
            throw new Error('Unauthorized');
        }

        document.getElementById('businessName').textContent = business.name || 'Business';

    } catch (e) {
        console.error('Ownership verification failed:', e);
        // alert('You do not have permission to manage this business');
        // window.location.href = 'dashboard.html';

        // Show debug info on page
        document.body.innerHTML = `
            <div style="padding: 2rem; color: red;">
                <h1>Access Denied / Error</h1>
                <p><strong>Error:</strong> ${e.message}</p>
                <p><strong>Business ID:</strong> ${businessId}</p>
                <p><strong>User ID:</strong> ${currentUser ? currentUser.id : 'Not logged in'}</p>
                <button onclick="window.location.reload()">Retry</button>
                <button onclick="window.location.href='dashboard.html'">Back to Dashboard</button>
            </div>
        `;
    }
}

// Load products
async function loadProducts() {
    const grid = document.getElementById('productsGrid');

    try {
        const { data: products, error } = await supabase
            .from('products')
            .select('*')
            .eq('business_id', businessId);

        if (error) throw error;

        if (!products || products.length === 0) {
            grid.innerHTML = '<p style="grid-column: 1/-1; text-center;">No products yet. Add your first product!</p>';
            return;
        }

        grid.innerHTML = '';

        products.forEach(product => {
            const card = createProductCard(product.id, product);
            grid.appendChild(card);
        });

    } catch (error) {
        console.error('Error loading products:', error);
        grid.innerHTML = '<p style="grid-column: 1/-1; color: var(--error);">Error loading products</p>';
    }
}

// Create product card
function createProductCard(id, product) {
    const card = document.createElement('div');
    card.className = 'card';

    const imageUrl = product.images && product.images.length > 0
        ? product.images[0]
        : 'data:image/svg+xml;charset=UTF-8,%3Csvg width="300" height="200" xmlns="http://www.w3.org/2000/svg"%3E%3Crect width="100%25" height="100%25" fill="%23e0e7ff"/%3E%3Ctext x="50%25" y="50%25" font-family="Arial, sans-serif" font-size="18" fill="%236366f1" text-anchor="middle" dominant-baseline="middle"%3ENo Image%3C/text%3E%3C/svg%3E';

    card.innerHTML = `
    <img src="${imageUrl}" class="card-img" onerror="this.src='data:image/svg+xml;charset=UTF-8,%3Csvg width=\"300\" height=\"200\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Crect width=\"100%25\" height=\"100%25\" fill=\"%23e0e7ff\"/%3E%3Ctext x=\"50%25\" y=\"50%25\" font-family=\"Arial, sans-serif\" font-size=\"18\" fill=\"%236366f1\" text-anchor=\"middle\" dominant-baseline=\"middle\"%3ENo Image%3C/text%3E%3C/svg%3E'">
    <h4>${product.name}</h4>
    <p>${product.description || 'No description'}</p>
    ${product.price ? `<p style="font-weight: 700; color: var(--primary-500); font-size: 1.25rem;">₹${product.price}</p>` : ''}
    <div class="flex gap-sm mt-md">
      <button class="btn btn-outline btn-sm" onclick="editProduct('${id}')">Edit</button>
      <button class="btn btn-secondary btn-sm" style="background: var(--error); border-color: var(--error); color: white;" onclick="deleteProduct('${id}')">Delete</button>
    </div>
  `;

    return card;
}

// Open add product modal
function openProductModal() {
    document.getElementById('modalTitle').textContent = 'Add Product';
    document.getElementById('productForm').reset();
    editingProductId = null;
    document.getElementById('productModal').classList.remove('hidden');
}

// Close modal
function closeProductModal() {
    document.getElementById('productModal').classList.add('hidden');
}

// Edit product
async function editProduct(productId) {
    try {
        const { data: product, error } = await supabase
            .from('products')
            .select('*')
            .eq('id', productId)
            .single();

        if (error) throw error;

        document.getElementById('modalTitle').textContent = 'Edit Product';
        document.getElementById('productName').value = product.name;
        document.getElementById('productDesc').value = product.description || '';
        document.getElementById('productPrice').value = product.price || '';

        editingProductId = productId;
        document.getElementById('productModal').classList.remove('hidden');
    } catch (error) {
        console.error('Error loading product:', error);
        showToast('Error loading product', 'error');
    }
}

// Delete product
async function deleteProduct(productId) {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
        const { error } = await supabase
            .from('products')
            .delete()
            .eq('id', productId);

        if (error) throw error;

        showToast('Product deleted successfully', 'success');
        loadProducts();
    } catch (error) {
        console.error('Error deleting product:', error);
        showToast('Error deleting product', 'error');
    }
}

// Handle form submission
document.getElementById('productForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';

    try {
        // Upload images
        const imageInput = document.getElementById('productImages');
        const imageUrls = [];

        if (imageInput.files.length > 0) {
            const files = Array.from(imageInput.files).slice(0, 3);
            for (const file of files) {
                const url = await uploadProductImage(file);
                if (url) imageUrls.push(url);
            }
        }

        const productData = {
            name: document.getElementById('productName').value,
            description: document.getElementById('productDesc').value,
            price: parseFloat(document.getElementById('productPrice').value) || null,
            business_id: businessId,
            is_active: true,
            updated_at: new Date().toISOString()
        };

        if (imageUrls.length > 0) {
            productData.images = imageUrls;
        }

        if (editingProductId) {
            // Update existing product
            const { error } = await supabase
                .from('products')
                .update(productData)
                .eq('id', editingProductId);

            if (error) throw error;
            showToast('Product updated successfully', 'success');
        } else {
            // Create new product
            productData.created_at = new Date().toISOString();
            const { error } = await supabase
                .from('products')
                .insert([productData]);

            if (error) throw error;
            showToast('Product added successfully', 'success');
        }

        closeProductModal();
        loadProducts();

    } catch (error) {
        console.error('Error saving product:', error);
        showToast('Error saving product', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Save Product';
    }
});

// Upload product image
async function uploadProductImage(file) {
    try {
        const timestamp = Date.now();
        const filename = `products/${businessId}/${timestamp}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;

        const { data, error } = await supabase.storage
            .from('images')
            .upload(filename, file);

        if (error) throw error;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
            .from('images')
            .getPublicUrl(filename);

        return publicUrl;
    } catch (error) {
        console.error('Error uploading image:', error);
        return null;
    }
}
