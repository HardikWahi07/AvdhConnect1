// Authentication handler for BizHub
// Handles login, registration, and user session management

// Login Form Handler
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const errorDiv = document.getElementById('errorMessage');

        try {
            // Sign in with Supabase
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password,
            });

            if (error) throw error;

            const user = data.user;

            // Get user data from Supabase
            const userData = await getUserData(user.id);

            if (!userData) {
                // If user data missing, try to fetch again or handle error
                // For now, just proceed or show error
                console.warn('User data not found in users table');
            }

            // Show success toast
            showToast('Login successful! Redirecting...', 'success');

            // Redirect based on role
            setTimeout(() => {
                if (userData && (userData.account_type === 'business' || userData.accountType === 'business')) {
                    window.location.href = 'dashboard.html';
                } else {
                    window.location.href = 'index.html';
                }
            }, 1000);

        } catch (error) {
            console.error('Login error:', error);
            errorDiv.textContent = error.message;
            errorDiv.classList.remove('hidden');
        }
    });
}

// Business Form Handler
const businessForm = document.getElementById('businessForm');
if (businessForm) {
    businessForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const ownerName = document.getElementById('ownerName').value;
        const email = document.getElementById('businessEmail').value;
        const phone = document.getElementById('businessPhone').value;
        const password = document.getElementById('businessPassword').value;
        const errorDiv = document.getElementById('errorMessage');

        try {
            // Sign up with Supabase
            const { data, error } = await supabase.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: {
                        name: ownerName,
                        account_type: 'business'
                    }
                }
            });

            if (error) throw error;

            const user = data.user;

            if (user) {
                // Save user data to Supabase users table
                const { error: insertError } = await supabase
                    .from('users')
                    .insert([
                        {
                            id: user.id,
                            name: ownerName,
                            email: email,
                            phone: phone,
                            account_type: 'business',
                            role: 'user',
                            is_approved: true, // Auto-approve for MVP
                            created_at: new Date().toISOString()
                        }
                    ]);

                if (insertError) throw insertError;

                showToast('Registration successful! Redirecting...', 'success');

                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 1000);
            }

        } catch (error) {
            console.error('Registration error:', error);
            errorDiv.textContent = error.message;
            errorDiv.classList.remove('hidden');
        }
    });
}

// Normal Account Form Handler
const normalForm = document.getElementById('normalForm');
if (normalForm) {
    normalForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = document.getElementById('normalName').value;
        const email = document.getElementById('normalEmail').value;
        const phone = document.getElementById('normalPhone').value;
        const password = document.getElementById('normalPassword').value;
        const errorDiv = document.getElementById('errorMessage');

        try {
            // Sign up with Supabase
            const { data, error } = await supabase.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: {
                        name: name,
                        account_type: 'normal'
                    }
                }
            });

            if (error) throw error;

            const user = data.user;

            if (user) {
                // Save user data to Supabase users table
                const { error: insertError } = await supabase
                    .from('users')
                    .insert([
                        {
                            id: user.id,
                            name: name,
                            email: email,
                            phone: phone,
                            account_type: 'normal',
                            role: 'user',
                            is_approved: true,
                            created_at: new Date().toISOString()
                        }
                    ]);

                if (insertError) throw insertError;

                showToast('Registration successful! Redirecting...', 'success');

                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1000);
            }

        } catch (error) {
            console.error('Registration error:', error);
            errorDiv.textContent = error.message;
            errorDiv.classList.remove('hidden');
        }
    });
}

// Toast notification function
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Logout function (can be called from anywhere)
async function logout() {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        showToast('Logged out successfully', 'success');
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Logout error:', error);
        showToast('Error logging out', 'error');
    }
}
