
// Categories cache
let categories = {};

// Load categories on init
async function initSearch() {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('order');

    if (error) throw error;

    const categoryFilter = document.getElementById('categoryFilter');
    data.forEach(cat => {
      categories[cat.id] = cat;
      const option = document.createElement('option');
      option.value = cat.id;
      option.textContent = cat.name;
      categoryFilter.appendChild(option);
    });

    // Check for category in URL
    const urlParams = new URLSearchParams(window.location.search);
    const catId = urlParams.get('category');
    if (catId) {
      categoryFilter.value = catId;
    }

    // Perform initial search if term or category exists
    const term = urlParams.get('q');
    if (term) {
      document.getElementById('searchInput').value = term;
    }

    if (term || catId) {
      performSearch();
    }

  } catch (error) {
    console.error('Error loading categories:', error);
  }
}

// Initialize
initSearch();

// Handle Enter key on search input
document.getElementById('searchInput').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    performSearch();
  }
});

// Perform search
async function performSearch() {
  const searchTerm = document.getElementById('searchInput').value.trim();
  const categoryId = document.getElementById('categoryFilter').value;
  const resultsDiv = document.getElementById('searchResults');

  resultsDiv.innerHTML = '<div class="flex items-center justify-center" style="grid-column: 1/-1; padding: 4rem;"><div class="spinner"></div></div>';

  try {
    let query = supabase
      .from('businesses')
      .select('*')
      .eq('status', 'approved');

    if (searchTerm) {
      query = query.or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,address.ilike.%${searchTerm}%`);
    }

    if (categoryId !== 'all') {
      query = query.eq('category_id', categoryId);
    }

    const { data: businesses, error: businessError } = await query;
    if (businessError) throw businessError;

    // Display results
    if (!businesses || businesses.length === 0) {
      resultsDiv.innerHTML = `
                <div class="search-placeholder" style="grid-column: 1 / -1; text-align: center; padding: var(--space-3xl); color: var(--text-tertiary);">
                    <div style="font-size: 4rem; margin-bottom: 1rem;">🔍</div>
                    <h3>No Results Found</h3>
                    <p>Try different keywords or filters</p>
                </div>
            `;
      return;
    }

    let resultsHTML = '';
    businesses.forEach(business => {
      resultsHTML += createBusinessCardHTML(business.id, business);
    });

    resultsDiv.innerHTML = resultsHTML;

  } catch (error) {
    console.error('Search error:', error);
    resultsDiv.innerHTML = '<p style="color: var(--error); text-align: center; grid-column: 1/-1;">Error performing search</p>';
  }
}

// Create business card HTML
function createBusinessCardHTML(id, business) {
  const imageUrl = business.images && business.images.length > 0
    ? business.images[0]
    : 'data:image/svg+xml;charset=UTF-8,%3Csvg width="400" height="200" xmlns="http://www.w3.org/2000/svg"%3E%3Crect width="100%25" height="100%25" fill="%2318181b"/%3E%3Ctext x="50%25" y="50%25" font-family="Arial, sans-serif" font-size="18" fill="%233f3f46" text-anchor="middle" dominant-baseline="middle"%3ENo Image%3C/text%3E%3C/svg%3E';

  const categoryName = categories[business.category_id]?.name || 'Business';

  return `
    <div class="card">
      <div class="card-img-wrapper">
        <img src="${imageUrl}" class="card-img" onerror="this.src='data:image/svg+xml;charset=UTF-8,%3Csvg width=\"400\" height=\"200\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Crect width=\"100%25\" height=\"100%25\" fill=\"%2318181b\"/%3E%3Ctext x=\"50%25\" y=\"50%25\" font-family=\"Arial, sans-serif\" font-size=\"18\" fill=\"%233f3f46\" text-anchor=\"middle\" dominant-baseline=\"middle\"%3ENo Image%3C/text%3E%3C/svg%3E'">
      </div>
      <div class="card-content">
        <span class="category-badge">${categoryName}</span>
        <h4>${business.name}</h4>
        <p>${business.description ? business.description.substring(0, 120) + '...' : 'No description available'}</p>
        <div class="card-actions">
          <button onclick="startChat('${business.owner_id}', '${id}')" class="btn btn-primary" style="background: var(--accent-gradient); color: #000; border: none;">Contact</button>
          <a href="business-detail.html?id=${id}" class="btn btn-outline">View Profile</a>
        </div>
      </div>
    </div>
  `;
}

// Create product card HTML (Simplified for now)
function createProductCardHTML(id, product) {
  // Similar structure if needed
  return '';
}
