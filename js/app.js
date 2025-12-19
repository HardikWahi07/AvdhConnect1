// Main application logic for BizHub
// Navbar handling is done inline in HTML files now

// Load featured businesses on homepage
async function loadFeaturedBusinesses() {
    const featuredGrid = document.getElementById('featuredGrid');
    if (!featuredGrid) return;

    try {
        const { data: businesses, error } = await supabase
            .from('businesses')
            .select('*')
            .eq('status', 'approved')
            .limit(6);

        if (error) throw error;

        if (!businesses || businesses.length === 0) {
            featuredGrid.innerHTML = '<p class="text-center" style="grid-column: 1/-1;">No businesses yet. Be the first to register!</p>';
            return;
        }

        featuredGrid.innerHTML = '';
        businesses.forEach(business => {
            const card = createBusinessCard(business.id, business);
            featuredGrid.appendChild(card);
        });
    } catch (error) {
        console.error('Error loading businesses:', error);
        featuredGrid.innerHTML = '<p class="text-center" style="grid-column: 1/-1; color: var(--error);">Error loading businesses.</p>';
    }
}

// Create business card
function createBusinessCard(id, business) {
    const card = document.createElement('div');
    card.className = 'card';

    const imageUrl = business.images && business.images.length > 0
        ? business.images[0]
        : 'data:image/svg+xml;charset=UTF-8,%3Csvg width="400" height="200" xmlns="http://www.w3.org/2000/svg"%3E%3Crect width="100%25" height="100%25" fill="%23e0e7ff"/%3E%3Ctext x="50%25" y="50%25" font-family="Arial, sans-serif" font-size="18" fill="%236366f1" text-anchor="middle" dominant-baseline="middle"%3ENo Image%3C/text%3E%3C/svg%3E';

    card.innerHTML = `
    <div class="card-img-wrapper">
        <img src="${imageUrl}" alt="${business.name}" class="card-img" onerror="this.src='data:image/svg+xml;charset=UTF-8,%3Csvg width=\\"100\\" height=\\"100\\" xmlns=\\"http://www.w3.org/2000/svg\\"%3E%3Crect width=\\"100%25\\" height=\\"100%25\\" fill=\\"%23e0e7ff\\"/%3E%3Ctext x=\\"50%25\\" y=\\"50%25\\" font-family=\\"Arial, sans-serif\\" font-size=\\"10\\" fill=\\"%236366f1\\" text-anchor=\\"middle\\" dominant-baseline=\\"middle\\"%3ENo Image%3C/text%3E%3C/svg%3E'">
    </div>
    <h4>${business.name}</h4>
    <p>${business.description ? business.description.substring(0, 100) + '...' : 'No description available'}</p>
    <div class="flex justify-between items-center mt-md">
      <span style="color: var(--text-tertiary); font-size: 0.875rem;">📞 ${business.phone || 'N/A'}</span>
      <a href="business-detail.html?id=${id}" class="btn btn-outline btn-sm">View Details</a>
    </div>
  `;

    return card;
}

// Load categories
async function loadCategories() {
    const categoriesGrid = document.getElementById('categoriesGrid');
    if (!categoriesGrid) return;

    try {
        const { data: categories, error } = await supabase
            .from('categories')
            .select('*')
            .order('order', { ascending: true })
            .limit(8);

        if (error) throw error;

        if (categories && categories.length > 0) {
            categoriesGrid.innerHTML = '';
            categories.forEach(category => {
                const card = createCategoryCard(category.id, category);
                categoriesGrid.appendChild(card);
            });
        }
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

// Create category card
function createCategoryCard(id, category) {
    const card = document.createElement('div');
    card.className = 'card text-center';
    card.style.cursor = 'pointer';

    card.innerHTML = `
    <div style="font-size: 3rem; margin-bottom: 1rem;">${category.icon || '📁'}</div>
    <h4>${category.name}</h4>
    <p>${category.description || ''}</p>
  `;

    card.addEventListener('click', () => {
        window.location.href = `browse.html?category=${id}`;
    });

    return card;
}

// Initialize homepage
if (window.location.pathname.endsWith('index.html') || window.location.pathname.endsWith('/')) {
    loadFeaturedBusinesses();
    loadCategories();
}
