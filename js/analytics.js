// Analytics Page Logic

let currentBusinessId = null;
let charts = {};

document.addEventListener('DOMContentLoaded', async function () {
    const checkSupabase = setInterval(async () => {
        if (typeof supabase !== 'undefined') {
            clearInterval(checkSupabase);
            initAnalytics();
        }
    }, 100);
});

async function initAnalytics() {
    // 1. Get Business ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    currentBusinessId = urlParams.get('id');

    if (!currentBusinessId) {
        alert('No business specified');
        window.location.href = 'dashboard.html';
        return;
    }

    // 2. Check Auth
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        window.location.href = 'login.html';
        return;
    }

    // 3. Load Business Details (Name, etc)
    try {
        const { data: business, error } = await supabase
            .from('businesses')
            .select('*')
            .eq('id', currentBusinessId)
            .single();

        if (error || !business) throw new Error('Business not found or access denied');

        // Security check: Ensure owner matches (RLS does this too, but good for UI)
        if (business.owner_id !== session.user.id) {
            alert('You do not have permission to view stats for this business.');
            window.location.href = 'dashboard.html';
            return;
        }

        document.getElementById('businessName').textContent = business.name;
        document.getElementById('businessMeta').textContent = `Analytics for ${business.category || 'Business'}`;

        // 4. Initial Data Load (Last 7 Days)
        loadStats(7);

        // 5. Setup Listeners
        document.getElementById('dateRange').addEventListener('change', (e) => {
            loadStats(parseInt(e.target.value));
        });

    } catch (err) {
        console.error('Error initializing analytics:', err);
        showError('Could not load business details');
    }
}

async function loadStats(days) {
    // Show loading state if desired, or just update silently
    try {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - days);

        const { data: stats, error } = await supabase
            .from('business_stats')
            .select('*')
            .eq('business_id', currentBusinessId)
            .gte('date', startDate.toISOString().split('T')[0])
            .order('date', { ascending: true });

        if (error) throw error;

        processAndRender(stats || [], days);

    } catch (err) {
        console.error('Error fetching stats:', err);
        showError(err.message);
    }
}

function processAndRender(stats, days) {
    let totalViews = 0;
    let totalClicks = 0;
    let totalInquiries = 0;

    // Prepare chart data map
    const dateMap = {};
    const dateLabels = [];
    const now = new Date();

    // Initialize map with all dates in range (fill gaps with 0)
    for (let i = days - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(now.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        // Format label based on range
        const label = days > 30
            ? d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
            : d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' });

        dateLabels.push(label);
        dateMap[dateStr] = { views: 0, clicks: 0, inquiries: 0 };
    }

    // Aggregate real data
    stats.forEach(rec => {
        totalViews += rec.views;
        totalClicks += rec.clicks;
        totalInquiries += rec.inquiries;

        if (dateMap[rec.date]) {
            dateMap[rec.date].views += rec.views;
            dateMap[rec.date].clicks += rec.clicks;
            dateMap[rec.date].inquiries += rec.inquiries;
        }
    });

    // Update Cards
    animateValue('totalViews', totalViews);
    animateValue('totalClicks', totalClicks);
    animateValue('totalInquiries', totalInquiries);

    document.getElementById('viewsSub').textContent = `Last ${days} days`;
    document.getElementById('clicksSub').textContent = `Last ${days} days`;
    document.getElementById('inquiriesSub').textContent = `Last ${days} days`;

    // Flatten data for chart
    const viewData = Object.values(dateMap).map(d => d.views);
    const clickData = Object.values(dateMap).map(d => d.clicks);
    const inquiryData = Object.values(dateMap).map(d => d.inquiries);

    renderMainChart(dateLabels, viewData, clickData, inquiryData);
}

function renderMainChart(labels, views, clicks, inquiries) {
    const ctx = document.getElementById('mainChart');

    if (charts.main) {
        charts.main.destroy();
    }

    charts.main = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Views',
                    data: views,
                    borderColor: '#f59e0b', // Primary Yellow
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    borderWidth: 3,
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Clicks',
                    data: clicks,
                    borderColor: '#3b82f6', // Blue
                    backgroundColor: 'transparent',
                    borderWidth: 2,
                    tension: 0.4,
                    borderDash: [5, 5]
                },
                {
                    label: 'Inquiries',
                    data: inquiries,
                    borderColor: '#10b981', // Green
                    backgroundColor: 'transparent',
                    borderWidth: 2,
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: {
                    labels: { color: '#999' }
                },
                tooltip: {
                    backgroundColor: '#1a1a1a',
                    titleColor: '#fff',
                    bodyColor: '#ccc',
                    borderColor: '#333',
                    borderWidth: 1
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: '#333' },
                    ticks: { color: '#999', precision: 0 }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#999' }
                }
            }
        }
    });
}

function animateValue(id, end) {
    const obj = document.getElementById(id);
    const start = parseInt(obj.textContent) || 0;
    if (start === end) return;

    const duration = 1000;
    const range = end - start;
    let startTime;

    const step = (timestamp) => {
        if (!startTime) startTime = timestamp;
        const progress = Math.min((timestamp - startTime) / duration, 1);
        obj.textContent = Math.floor(progress * range + start).toLocaleString();
        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
}

function showError(msg) {
    document.querySelector('.analytics-grid').classList.add('hidden');
    document.querySelector('.chart-container').classList.add('hidden');
    const errDiv = document.getElementById('errorState');
    errDiv.classList.remove('hidden');
    document.getElementById('errorMessage').textContent = msg;
}
