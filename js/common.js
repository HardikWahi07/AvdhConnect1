// Common logic for BizHub (Theme, Mobile Menu, Auth Listener)

console.log('✨ Common script initializing...');

// ============================================
// THEME SWITCHING
// ============================================

const themeIcons = {
    light: '💻',
    dark: '🌙',
    system: '☀️'
};

function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    applyTheme(savedTheme);
    updateThemeUI(savedTheme);
}

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
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

    if (!themeBtn || !themeDropdown) return;

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
    themeOptions.forEach(option => {
        option.addEventListener('click', function (e) {
            e.preventDefault();
            const selectedTheme = this.dataset.theme;
            applyTheme(selectedTheme);
            updateThemeUI(selectedTheme);
            themeDropdown.classList.remove('active');
        });
    });
}

// ============================================
// MOBILE HAMBURGER MENU
// ============================================

function initMobileMenu() {
    const navToggle = document.getElementById('navToggle');
    const navMenu = document.getElementById('navMenu');

    if (!navToggle || !navMenu) return;

    navToggle.addEventListener('click', function (e) {
        e.stopPropagation();
        navMenu.classList.toggle('active');
        navToggle.classList.toggle('active');
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
// AUTHENTICATION NAVBAR
// ============================================

async function updateNavbarAuth() {
    const authLinks = document.getElementById('authLinks');
    if (!authLinks) return;

    if (typeof supabase === 'undefined') {
        // Wait for Supabase to load
        setTimeout(updateNavbarAuth, 500);
        return;
    }

    try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session || !session.user) {
            authLinks.innerHTML = '<a href="login.html" class="btn btn-primary btn-sm">Login</a>';
            return;
        }

        // We have a session, try to get user details
        // Optimization: Use session metadata if available, or fetch from DB
        const { data: userData, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single();

        const displayName = userData ? userData.name : 'User';

        authLinks.innerHTML = `
            <div class="flex items-center gap-md">
                <span class="text-sm hidden-mobile" style="color: var(--text-secondary);">Hey, ${displayName}!</span>
                <a href="dashboard.html" class="btn btn-secondary btn-sm">Dashboard</a>
                <a href="chat.html" class="btn btn-outline btn-sm">Messages</a>
                <button onclick="handleLogout()" class="btn btn-outline btn-sm">Logout</button>
            </div>
        `;
    } catch (err) {
        console.error('Error updating navbar auth:', err);
    }
}

// Global logout
window.handleLogout = async function () {
    if (typeof supabase !== 'undefined') {
        await supabase.auth.signOut();
    }
    window.location.href = 'index.html';
};

// ============================================
// INITIALIZATION
// ============================================

// Run immediately
initTheme();

// Run when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initMobileMenu();
    initThemeSwitcher();
    updateNavbarAuth();
});

// Listen for auth changes
if (typeof supabase !== 'undefined') {
    supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
            updateNavbarAuth();
        }
    });
} else {
    // If supabase isn't loaded yet, check periodically or rely on window load
    window.addEventListener('load', () => {
        if (typeof supabase !== 'undefined') {
            supabase.auth.onAuthStateChange((event, session) => {
                if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
                    updateNavbarAuth();
                }
            });
        }
    });
}
// Toast Notification
window.showToast = function (message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    document.body.appendChild(toast);

    // Remove after 3 seconds
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, 3000);
};

// ============================================
// CHAT FUNCTIONALITY
// ============================================

// Start a chat with a user (e.g. business owner)
window.startChat = async function (targetUserId, businessId) {
    if (!targetUserId) return;

    // Check auth
    if (typeof supabase === 'undefined') {
        console.error("Supabase not loaded");
        return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        // Redirect to login with return URL
        const returnUrl = encodeURIComponent(window.location.href);
        window.location.href = `login.html?returnUrl=${returnUrl}`;
        return;
    }
    const currentUserId = session.user.id;

    if (currentUserId === targetUserId) {
        showToast("You cannot chat with yourself", "error");
        return;
    }

    // Check for existing conversation
    try {
        let query = supabase
            .from('conversations')
            .select('id')
            .or(`and(participant1_id.eq.${currentUserId},participant2_id.eq.${targetUserId}),and(participant1_id.eq.${targetUserId},participant2_id.eq.${currentUserId})`);

        if (businessId) {
            query = query.eq('business_id', businessId);
        } else {
            query = query.is('business_id', null);
        }

        const { data: existingConvs, error: fetchError } = await query;

        if (fetchError) {
            console.error("Error finding conversation:", fetchError);
            showToast("Error starting chat", "error");
            return;
        }

        if (existingConvs && existingConvs.length > 0) {
            window.location.href = `chat.html?conversation_id=${existingConvs[0].id}`;
        } else {
            // Create new
            const { data: newConv, error: createError } = await supabase
                .from('conversations')
                .insert({
                    participant1_id: currentUserId,
                    participant2_id: targetUserId,
                    business_id: businessId
                })
                .select()
                .single();

            if (createError) {
                console.error("Error creating conversation:", createError);
                showToast("Error creating chat", "error");
            } else {
                window.location.href = `chat.html?conversation_id=${newConv.id}`;
            }
        }
    } catch (err) {
        console.error("Unexpected error starting chat:", err);
        showToast("Unexpected error", "error");
    }
};
