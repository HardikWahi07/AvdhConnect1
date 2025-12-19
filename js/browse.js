// Browse businesses logic with filters

let allBusinesses = [];
let categories = {};
let filteredBusinesses = [];

// Filter state
const filters = {
    search: '',
    category: '',
    openNow: false,
    offers: false,
    catalog: false,
    topRated: false
};

// Load categories
async function loadCategories() {
    const categoryFilter = document.getElementById('categoryFilter');

    try {
        const { data: categoriesData, error } = await supabase
            .from('categories')
            .select('*')
            .order('order', { ascending: true });

        if (error) throw error;

        categoriesData.forEach(category => {
            categories[category.id] = category;
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            categoryFilter.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

// Load all businesses
async function loadBusinesses() {
    const grid = document.getElementById('businessesGrid');
    grid.innerHTML = '<div class="flex items-center justify-center spinner"></div>';

    try {
        const { data: businesses, error } = await supabase
            .from('businesses')
            .select('*')
            .eq('status', 'approved');

        if (error) throw error;

        if (!businesses || businesses.length === 0) {
            grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-secondary);">No businesses found</p>';
            return;
        }

        allBusinesses = businesses;
        filteredBusinesses = [...businesses];
        renderBusinesses();

    } catch (error) {
        console.error('Error loading businesses:', error);
        grid.innerHTML = '<p style="grid-column: 1/-1; color: var(--error); text-align: center;">Error loading businesses</p>';
    }
}

// Apply filters
function applyFilters() {
    filteredBusinesses = allBusinesses.filter(business => {
        // Search filter
        if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            const matchesSearch =
                business.name.toLowerCase().includes(searchLower) ||
                (business.description && business.description.toLowerCase().includes(searchLower));
            if (!matchesSearch) return false;
        }

        // Category filter
        if (filters.category && business.category_id !== filters.category) {
            return false;
        }

        // Open Now filter (mock - you can implement actual hours check)
        if (filters.openNow) {
            // For now, randomly show some businesses as open (you can implement real logic)
            if (!business.is_open) return false;
        }

        // Offers filter
        if (filters.offers) {
            if (!business.has_offers) return false;
        }

        // Catalog filter
        if (filters.catalog) {
            if (!business.has_catalog) return false;
        }

        // Top Rated filter (mock - requires rating system)
        if (filters.topRated) {
            if (!business.rating || business.rating < 4) return false;
        }

        return true;
    });

    renderBusinesses();
}

// Render businesses
function renderBusinesses() {
    const grid = document.getElementById('businessesGrid');

    if (filteredBusinesses.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-secondary);">No businesses match your filters</p>';
        return;
    }

    grid.innerHTML = '';
    filteredBusinesses.forEach(business => {
        const card = createBusinessCard(business.id, business);
        grid.appendChild(card);
    });
}

// Create business card with new design
function createBusinessCard(id, business) {
    const card = document.createElement('div');
    card.className = 'business-card-browse';

    const imageUrl = business.images && business.images.length > 0
        ? business.images[0]
        : 'data:image/svg+xml;charset=UTF-8,%3Csvg width="400" height="200" xmlns="http://www.w3.org/2000/svg"%3E%3Crect width="100%25" height="100%25" fill="%232e3548"/%3E%3Ctext x="50%25" y="50%25" font-family="Arial, sans-serif" font-size="18" fill="%239ca3af" text-anchor="middle" dominant-baseline="middle"%3ENo Image%3C/text%3E%3C/svg%3E';

    const categoryName = business.category_id && categories[business.category_id]
        ? categories[business.category_id].name
        : 'Uncategorized';

    card.innerHTML = `
        <div class="card-img-wrapper">
            <img src="${imageUrl}" class="card-img" alt="${business.name}" onerror="this.src='data:image/svg+xml;charset=UTF-8,%3Csvg width=\\"100\\" height=\\"100\\" xmlns=\\"http://www.w3.org/2000/svg\\"%3E%3Crect width=\\"100%25\\" height=\\"100%25\\" fill=\\"%232e3548\\"/%3E%3Ctext x=\\"50%25\\" y=\\"50%25\\" font-family=\\"Arial, sans-serif\\" font-size=\\"10\\" fill=\\"%239ca3af\\" text-anchor=\\"middle\\" dominant-baseline=\\"middle\\"%3ENo Image%3C/text%3E%3C/svg%3E'">
        </div>
        <div class="business-card-content">
            <div class="business-category-badge">${categoryName.toUpperCase()}</div>
            <h3 class="business-card-title">${business.name}</h3>
            <p class="business-card-description">${business.description || 'No description available'}</p>
            <div class="business-card-actions">
                <button onclick="contactBusiness('${id}')" class="btn btn-primary">Contact</button>
                <a href="business-detail.html?id=${id}" class="btn btn-view-profile">View Profile</a>
            </div>
        </div>
    `;

    return card;
}

// Contact business (placeholder)
// Contact business
window.contactBusiness = function (businessId) {
    const business = allBusinesses.find(b => b.id === businessId);
    if (!business) return;

    const modal = document.getElementById('contactModal');
    const nameEl = document.getElementById('contactBusinessName');
    const phoneEl = document.getElementById('contactPhone');
    const emailEl = document.getElementById('contactEmail');
    const addressEl = document.getElementById('contactAddress');
    const callBtn = document.getElementById('callBtn');
    const emailBtn = document.getElementById('emailBtn');
    const chatBtn = document.getElementById('modalChatBtn');

    nameEl.textContent = business.name;

    // Phone
    if (business.phone) {
        phoneEl.textContent = business.phone;
        callBtn.href = `tel:${business.phone}`;
        callBtn.style.display = 'block';
    } else {
        phoneEl.textContent = 'Not available';
        callBtn.style.display = 'none';
    }

    // Email
    if (business.email) {
        emailEl.textContent = business.email;
        emailBtn.href = `mailto:${business.email}`;
        emailBtn.style.display = 'block';
    } else {
        emailEl.textContent = 'Not available';
        emailBtn.style.display = 'none';
    }

    // Address
    addressEl.textContent = business.address || 'No address provided';

    // Chat
    if (chatBtn) {
        chatBtn.onclick = () => {
            // Assuming startChat is available via common.js
            if (window.startChat) {
                window.startChat(business.owner_id, business.id);
            } else {
                console.error("startChat function not found. Make sure common.js is loaded.");
                if (window.showToast) window.showToast("Chat feature unavailable", "error");
                else alert("Chat feature unavailable");
            }
        };
    }

    modal.classList.remove('hidden');
};

window.closeContactModal = function () {
    document.getElementById('contactModal').classList.add('hidden');
};

// Close modal when clicking outside
window.onclick = function (event) {
    const modal = document.getElementById('contactModal');
    if (event.target == modal) {
        modal.classList.add('hidden');
    }
    // Also handle theme dropdown closing
    if (!event.target.closest('.theme-switcher')) {
        const dropdown = document.getElementById('themeDropdown');
        if (dropdown && dropdown.classList.contains('active')) {
            dropdown.classList.remove('active');
        }
    }
};

// Search input (only if element exists)
const searchInput = document.getElementById('searchInput');
if (searchInput) {
    searchInput.addEventListener('input', (e) => {
        filters.search = e.target.value.trim();
    });
}

// Category filter
const categoryFilter = document.getElementById('categoryFilter');
if (categoryFilter) {
    categoryFilter.addEventListener('change', (e) => {
        filters.category = e.target.value;
        applyFilters(); // Auto-apply when category changes
    });
}

// Checkbox filters (only if elements exist)
const filterOpenNow = document.getElementById('filterOpenNow');
if (filterOpenNow) {
    filterOpenNow.addEventListener('change', (e) => {
        filters.openNow = e.target.checked;
    });
}

const filterOffers = document.getElementById('filterOffers');
if (filterOffers) {
    filterOffers.addEventListener('change', (e) => {
        filters.offers = e.target.checked;
    });
}

const filterCatalog = document.getElementById('filterCatalog');
if (filterCatalog) {
    filterCatalog.addEventListener('change', (e) => {
        filters.catalog = e.target.checked;
    });
}

const filterTopRated = document.getElementById('filterTopRated');
if (filterTopRated) {
    filterTopRated.addEventListener('change', (e) => {
        filters.topRated = e.target.checked;
    });
}

// Apply filters button (only if element exists)
const applyFiltersBtn = document.getElementById('applyFilters');
if (applyFiltersBtn) {
    applyFiltersBtn.addEventListener('click', () => {
        applyFilters();
    });
}

// Clear filters button (only if element exists)
const clearFiltersBtn = document.getElementById('clearFilters');
if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener('click', () => {
        // Reset all filters
        filters.search = '';
        filters.category = '';
        filters.openNow = false;
        filters.offers = false;
        filters.catalog = false;
        filters.topRated = false;

        // Reset UI
        if (searchInput) searchInput.value = '';
        if (categoryFilter) categoryFilter.value = '';
        if (filterOpenNow) filterOpenNow.checked = false;
        if (filterOffers) filterOffers.checked = false;
        if (filterCatalog) filterCatalog.checked = false;
        if (filterTopRated) filterTopRated.checked = false;

        // Reload all businesses
        filteredBusinesses = [...allBusinesses];
        renderBusinesses();
    });
}

// Initialize
loadCategories();
loadBusinesses();

// Check for category in URL
const urlParams = new URLSearchParams(window.location.search);
const categoryParam = urlParams.get('category');
if (categoryParam) {
    setTimeout(() => {
        document.getElementById('categoryFilter').value = categoryParam;
        filters.category = categoryParam;
        applyFilters();
    }, 500);
}
