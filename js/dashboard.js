// Dashboard logic for BizHub

let currentUser = null;
let userData = null;

// Wait for DOM to load before initializing
// Wait for DOM to load before initializing
document.addEventListener('DOMContentLoaded', async function () {
  console.log('🚀 Dashboard starting...');

  // Give common.js a moment to do its thing? Actually not needed if we manage auth here.
  // But we should rely on supabase being ready.

  const checkSupabase = setInterval(async () => {
    if (typeof supabase !== 'undefined') {
      clearInterval(checkSupabase);
      initDashboard();
    }
  }, 100);
});

async function initDashboard() {
  try {
    // Get current session
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      window.location.href = 'login.html';
      return;
    }

    currentUser = session.user;

    // Fetch user data
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', currentUser.id)
      .single();

    if (error || !data) {
      throw error || new Error('User data not found');
    }

    userData = data;

    // Load dashboard
    loadUserInfo();
    await checkBusinessAccount();

    console.log('✅ Dashboard loaded');
  } catch (err) {
    console.error('Fatal error loading dashboard:', err);
    document.getElementById('userInfo').innerHTML = `
        <div class="card bg-error-light text-error">
            <p><strong>Error loading dashboard:</strong> ${err.message}</p>
            <button onclick="window.location.reload()" class="btn btn-sm btn-outline mt-sm">Retry</button>
        </div>
    `;
  }
}

// Load user info
function loadUserInfo() {
  const userInfoDiv = document.getElementById('userInfo');
  userInfoDiv.innerHTML = `
    <div class="grid grid-2" style="gap: var(--space-lg);">
      <div>
        <p style="color: var(--text-tertiary); font-size: 0.875rem; margin-bottom: 0.25rem;">Name</p>
        <p style="font-weight: 600;">${userData.name}</p>
      </div>
      <div>
        <p style="color: var(--text-tertiary); font-size: 0.875rem; margin-bottom: 0.25rem;">Email</p>
        <p style="font-weight: 600;">${userData.email}</p>
      </div>
      <div>
        <p style="color: var(--text-tertiary); font-size: 0.875rem; margin-bottom: 0.25rem;">Phone</p>
        <p style="font-weight: 600;">${userData.phone || 'Not provided'}</p>
      </div>
      <div>
        <p style="color: var(--text-tertiary); font-size: 0.875rem; margin-bottom: 0.25rem;">Account Type</p>
        <p style="font-weight: 600; text-transform: capitalize;">${userData.account_type}</p>
      </div>
    </div>
  `;
}

// Check business account
async function checkBusinessAccount() {
  const businessSection = document.getElementById('businessSection');
  const businessContent = document.getElementById('businessContent');
  const createBtn = document.getElementById('createBusinessBtn');

  if (userData.account_type !== 'business') {
    return;
  }

  businessSection.classList.remove('hidden');

  try {
    const { data: businesses, error } = await supabase
      .from('businesses')
      .select('*')
      .eq('owner_id', currentUser.id);

    if (error) throw error;

    if (!businesses || businesses.length === 0) {
      businessContent.innerHTML = `
        <div class="card text-center">
          <div style="font-size: 3rem; margin-bottom: 1rem;">🏪</div>
          <h3>No Business Yet</h3>
          <p>Create your first business listing to get started</p>
        </div>
      `;
    } else {
      businessContent.innerHTML = '';
      createBtn.textContent = '+ Add Another Business';

      // Load analytics
      loadBusinessAnalytics();

      businesses.forEach(business => {
        businessContent.appendChild(createBusinessDashboardCard(business.id, business));
      });
    }
  } catch (error) {
    console.error('Error loading businesses:', error);
    businessContent.innerHTML = '<p style="color: var(--error);">Error loading businesses</p>';
  }
}

// Create business card
function createBusinessDashboardCard(id, business) {
  const card = document.createElement('div');
  card.className = 'card mb-lg';

  const statusColors = {
    'pending': 'var(--warning)',
    'approved': 'var(--success)',
    'rejected': 'var(--error)'
  };

  const statusColor = statusColors[business.status] || 'var(--gray-500)';
  const imageUrl = business.images && business.images.length > 0
    ? business.images[0]
    : 'data:image/svg+xml;charset=UTF-8,%3Csvg width=\"400\" height=\"200\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Crect width=\"100%25\" height=\"100%25\" fill=\"%23e0e7ff\"/%3E%3Ctext x=\"50%25\" y=\"50%25\" font-family=\"Arial, sans-serif\" font-size=\"18\" fill=\"%236366f1\" text-anchor=\"middle\" dominant-baseline=\"middle\"%3ENo Image%3C/text%3E%3C/svg%3E';

  card.innerHTML = `
    <div class="grid grid-2" style="gap: var(--space-lg); align-items: center;">
      <div>
        <img src="${imageUrl}" alt="${business.name}" style="width: 100%; height: 150px; object-fit: cover; border-radius: var(--radius-md);">
      </div>
      <div>
        <div class="flex justify-between items-start mb-md">
          <h3 style="margin: 0;">${business.name}</h3>
          <span style="background: ${statusColor}; color: white; padding: 0.25rem 0.75rem; border-radius: var(--radius-full); font-size: 0.875rem; font-weight: 600;">
            ${business.status || 'pending'}
          </span>
        </div>
        <p>${business.description ? business.description.substring(0, 150) + '...' : 'No description'}</p>
        <div class="flex gap-sm mt-md">
          <a href="analytics.html?id=${id}" class="btn btn-primary btn-sm">View Analytics</a>
          <a href="manage-products.html?id=${id}" class="btn btn-secondary btn-sm">Products</a>
          <a href="business-detail.html?id=${id}" class="btn btn-outline btn-sm">View Public</a>
          <button onclick="deleteBusiness('${id}')" class="btn btn-outline btn-sm" style="color: var(--error); border-color: var(--error);">Delete</button>
        </div>
      </div>
    </div>
  `;

  return card;
}

// Delete business
// Delete business
window.deleteBusiness = async function (id) {
  console.log('Attempting to delete business:', id);
  if (!confirm('Are you sure you want to delete this business? This action cannot be undone.')) {
    return;
  }

  try {
    const { error } = await supabase
      .from('businesses')
      .delete()
      .eq('id', id);

    if (error) throw error;

    alert('Business deleted successfully');
    window.location.reload();
  } catch (error) {
    console.error('Error deleting business:', error);
    alert('Error deleting business: ' + error.message);
  }
}


// ---------------------------------------------------------
// BUSINESS ANALYTICS (Real Data)
// ---------------------------------------------------------

let viewsChart = null;

async function loadBusinessAnalytics() {
  const analyticsSection = document.getElementById('analyticsSection');
  analyticsSection.classList.remove('hidden');

  // Calculate totals and fetch historical data
  try {
    const { data: businesses } = await supabase
      .from('businesses')
      .select('id')
      .eq('owner_id', currentUser.id);

    if (!businesses || businesses.length === 0) return;

    const businessIds = businesses.map(b => b.id);
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);

    // Fetch stats for all user's businesses for the last 7 days
    const { data: stats, error } = await supabase
      .from('business_stats')
      .select('*')
      .in('business_id', businessIds)
      .gte('date', sevenDaysAgo.toISOString().split('T')[0]);

    if (error) throw error;

    const aggregated = processAnalyticsData(stats || []);

    updateAnalyticsUI(aggregated);
    renderViewsChart(aggregated.dailyViews);

  } catch (err) {
    console.error('Error loading analytics:', err);
  }
}

function processAnalyticsData(stats) {
  let totalViews = 0, totalClicks = 0, totalInquiries = 0;

  // Initialize last 7 days map
  const dailyMap = {};
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const labels = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    dailyMap[dateStr] = 0;
    labels.push(days[d.getDay()]);
  }

  // Aggregate data
  stats.forEach(row => {
    totalViews += row.views;
    totalClicks += row.clicks;
    totalInquiries += row.inquiries;

    // Add to daily total if within range (it should be due to query)
    const dateStr = row.date; // already YYYY-MM-DD from DB date type
    if (dailyMap.hasOwnProperty(dateStr)) {
      dailyMap[dateStr] += row.views;
    }
  });

  return {
    views: totalViews,
    clicks: totalClicks,
    inquiries: totalInquiries,
    dailyViews: {
      labels: labels,
      data: Object.values(dailyMap)
    }
  };
}

function updateAnalyticsUI(data) {
  document.getElementById('analyticsViews').textContent = data.views.toLocaleString();
  document.getElementById('analyticsClicks').textContent = data.clicks.toLocaleString();
  document.getElementById('analyticsInquiries').textContent = data.inquiries.toLocaleString();

  // Trends are temporarily hardcoded to "New" or 0% as we build history
  // In a full implementation, we'd fetch previous week's data to compare
  const els = ['analyticsTrendViews', 'analyticsTrendClicks', 'analyticsTrendInquiries'];
  els.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = `<span class="trend-indicator" style="color: var(--text-tertiary);">Data collection started</span>`;
  });
}

function renderViewsChart(chartInfo) {
  const ctx = document.getElementById('viewsChart');

  if (viewsChart) {
    viewsChart.destroy();
  }

  viewsChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: chartInfo.labels,
      datasets: [{
        label: 'Profile Views',
        data: chartInfo.data,
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#f59e0b',
        pointBorderColor: '#fff',
        pointRadius: 4,
        pointHoverRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1a1a1a',
          titleColor: '#fff',
          bodyColor: '#ccc',
          borderColor: '#333',
          borderWidth: 1,
          padding: 10,
          displayColors: false,
          callbacks: {
            label: function (context) {
              return Math.round(context.parsed.y) + ' views';
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          suggestedMax: 5, // minimum height for empty chart
          grid: { color: '#333', drawBorder: false },
          ticks: { color: '#999', precision: 0 }
        },
        x: {
          grid: { display: false, drawBorder: false },
          ticks: { color: '#999' }
        }
      }
    }
  });
}
