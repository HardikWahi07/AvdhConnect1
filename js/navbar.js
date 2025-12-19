// Comprehensive Navbar Management
// Handles mobile menu, theme switching, and authentication

console.log('🔧 Navbar script loaded');

// ============================================
// MOBILE HAMBURGER MENU
// ============================================

function initMobileMenu() {
    const navToggle = document.getElementById('navToggle');
    const navMenu = document.getElementById('navMenu');

    if (!navToggle || !navMenu) {
        console.warn('⚠️ Nav elements not found');
        return;
    }

    console.log('✅ Mobile menu initialized');

    navToggle.addEventListener('click', function (e) {
        e.stopPropagation();
        navMenu.classList.toggle('active');
        navToggle.classList.toggle('active');
        console.log('🍔 Menu toggled:', navMenu.classList.contains('active'));
    });

    // Close menu when clicking outside
    document.addEventListener('click', function (e) {
        if (!navMenu.contains(e.target) && !navToggle.contains(e.target)) {
            navMenu.classList.remove('active');
            navToggle.classList.remove('active');
        }
    });
}

// ============================================
// THEME SWITCHING
// ============================================

const themeIcons = {
    light: '☀️',
    dark: '🌙',
    system: '💻'
};

function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    console.log('🎨 Initializing theme:', savedTheme);
    applyTheme(savedTheme);
    updateThemeUI(savedTheme);
}

function applyTheme(theme) {
    console.log('🎨 Applying theme:', theme);
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);

    // Sync with Tailwind dark class
    if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
}

function updateThemeUI(theme) {
    const themeIcon = document.getElementById('themeIcon');
    const themeOptions = document.querySelectorAll('.theme-option');

    if (themeIcon) {
        themeIcon.textContent = themeIcons[theme] || '🌙';
    }

    themeOptions.forEach(option => {
        if (option.dataset.theme === theme) {
            option.classList.add('active');
        } else {
            option.classList.remove('active');
        }
    });
}

function initThemeSwitcher() {
    const themeBtn = document.getElementById('themeBtn');
    const themeDropdown = document.getElementById('themeDropdown');

    if (!themeBtn || !themeDropdown) {
        console.warn('⚠️ Theme elements not found');
        return;
    }

    console.log('✅ Theme switcher initialized');

    // Toggle dropdown
    themeBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        themeDropdown.classList.toggle('active');
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', function () {
        themeDropdown.classList.remove('active');
    });

    // Prevent dropdown from closing when clicking inside
    themeDropdown.addEventListener('click', function (e) {
        e.stopPropagation();
    });

    // Handle theme option clicks
    const themeOptions = document.querySelectorAll('.theme-option');
    console.log('🎨 Found', themeOptions.length, 'theme options');

    themeOptions.forEach(option => {
        option.addEventListener('click', function (e) {
            e.preventDefault();
            const selectedTheme = this.dataset.theme;
            console.log('🎨 Theme selected:', selectedTheme);

            applyTheme(selectedTheme);
            updateThemeUI(selectedTheme);
            themeDropdown.classList.remove('active');
        });
    });
}

// ============================================
// AUTHENTICATION STATE
// ============================================

async function updateNavbar() {
    const authLinks = document.getElementById('authLinks');
    if (!authLinks) return;

    // Check if supabase is available
    if (typeof supabase === 'undefined') {
        console.warn('⚠️ Supabase not loaded yet');
        return;
    }

    try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session || !session.user) {
            authLinks.innerHTML = '<a href="login.html" class="btn btn-primary btn-sm">Login</a>';
            return;
        }

        // Fetch user data
        const { data: userData, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single();

        if (error || !userData) {
            console.error('Error fetching user:', error);
            authLinks.innerHTML = '<a href="login.html" class="btn btn-primary btn-sm">Login</a>';
            return;
        }

        // Update navbar with user info
        authLinks.innerHTML = `
            <div class="flex items-center gap-md">
                <span style="color: var(--text-secondary);">Hey, ${userData.name}!</span>
                <a href="dashboard.html" class="btn btn-secondary btn-sm">Dashboard</a>
                <a href="chat.html" class="btn btn-outline btn-sm">Messages</a>
                <button onclick="handleLogout()" class="btn btn-outline btn-sm">Logout</button>
            </div>
        `;

        console.log('✅ Navbar updated for user:', userData.name);
    } catch (err) {
        console.error('Error in updateNavbar:', err);
    }
}

// Global logout function
window.handleLogout = async function () {
    if (typeof supabase !== 'undefined') {
        await supabase.auth.signOut();
    }
    window.location.href = 'index.html';
};

// ============================================
// INITIALIZE EVERYTHING
// ============================================

// Initialize immediately what we can
initTheme();

// Initialize after DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
        console.log('📱 DOM Ready - Initializing navbar...');
        initMobileMenu();
        initThemeSwitcher();

        // Update navbar after a short delay to ensure supabase is loaded
        setTimeout(updateNavbar, 100);
    });
} else {
    console.log('📱 DOM Already Ready - Initializing navbar...');
    initMobileMenu();
    initThemeSwitcher();
    setTimeout(updateNavbar, 100);
}

// Listen for auth state changes if supabase is available
if (typeof supabase !== 'undefined') {
    supabase.auth.onAuthStateChange(() => {
        updateNavbar();
    });
}

console.log('✅ Navbar script fully loaded');
initTheme();
