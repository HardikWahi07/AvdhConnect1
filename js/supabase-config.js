
// Supabase Configuration
const SUPABASE_URL = 'https://qphgtdehhihobjfaaula.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwaGd0ZGVoaGlob2JqZmFhdWxhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwNTQ4NjksImV4cCI6MjA3OTYzMDg2OX0.hb-6JeRqs1NN-xyqRBEZDf_YiaZfsHpM0n3FnMi-1ro';

// Initialize Supabase client (use var to avoid redeclaration errors)
// Check if window.supabase (SDK) is available
if (typeof window.supabase === 'undefined') {
    console.error('❌ Supabase SDK not loaded! Make sure the Supabase CDN script is loaded before this file.');
}

// Use var instead of const to avoid "already declared" errors if script runs twice
var supabase = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

if (supabase) {
    console.log('✅ Supabase initialized successfully');
} else {
    console.error('❌ Failed to initialize Supabase client');
}

// Helper function to get user data from Supabase
async function getUserData(uid) {
    console.log('🔎 getUserData called with uid:', uid);
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', uid)
        .single();

    console.log('🔎 getUserData response - data:', data, 'error:', error);

    if (error) {
        console.error('❌ Error fetching user data:', error);
        return null;
    }
    console.log('✅ getUserData returning:', data);
    return data;
}


// Check if user has business account
async function isBusinessAccount(uid) {
    const userData = await getUserData(uid);
    return userData && userData.accountType === 'business';
}
