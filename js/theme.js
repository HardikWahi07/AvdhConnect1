// Dedicated theme switching logic

// Theme management
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
    console.log('🎨 Theme attribute set to:', document.documentElement.getAttribute('data-theme'));
}

function updateThemeUI(theme) {
    const themeIcon = document.getElementById('themeIcon');
    const themeOptions = document.querySelectorAll('.theme-option');

    if (themeIcon) {
        themeIcon.textContent = themeIcons[theme];
    }

    themeOptions.forEach(option => {
        if (option.dataset.theme === theme) {
            option.classList.add('active');
        } else {
            option.classList.remove('active');
        }
    });
}

// Initialize theme immediately
initTheme();

// Setup theme dropdown toggle
document.addEventListener('DOMContentLoaded', () => {
    const themeBtn = document.getElementById('themeBtn');
    const themeDropdown = document.getElementById('themeDropdown');

    if (themeBtn && themeDropdown) {
        themeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            themeDropdown.classList.toggle('active');
        });

        document.addEventListener('click', () => {
            themeDropdown.classList.remove('active');
        });

        themeDropdown.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }

    // Add click handlers to theme options
    const themeOptions = document.querySelectorAll('.theme-option');
    console.log('🎨 Found theme options:', themeOptions.length);

    themeOptions.forEach(option => {
        option.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();

            const selectedTheme = this.dataset.theme;
            console.log('🎨 Theme clicked:', selectedTheme);

            applyTheme(selectedTheme);
            updateThemeUI(selectedTheme);

            if (themeDropdown) {
                themeDropdown.classList.remove('active');
            }
        });
    });
});
