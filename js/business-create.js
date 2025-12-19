// Business creation logic

let currentUser = null;
let selectedFiles = [];

// Protect page - business accounts only
(async function initPage() {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        window.location.href = 'login.html';
        return;
    }

    currentUser = session.user;

    // Fetch user data directly
    const { data: userData, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', currentUser.id)
        .single();

    if (!userData || userData.account_type !== 'business') {
        alert('Only business accounts can create listings');
        window.location.href = 'dashboard.html';
        return;
    }

    loadCategories();
})();

// Load categories
async function loadCategories() {
    const categorySelect = document.getElementById('category');

    try {
        const { data: categories, error } = await supabase
            .from('categories')
            .select('*')
            .order('order', { ascending: true });

        if (error) throw error;

        if (!categories || categories.length === 0) {
            console.log('No categories found');
            return;
        }

        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = `${category.icon} ${category.name}`;
            categorySelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

// Handle file selection
const imagesInput = document.getElementById('images');
if (imagesInput) {
    imagesInput.addEventListener('change', (e) => {
        selectedFiles = Array.from(e.target.files).slice(0, 5); // Max 5 images
        displayImagePreviews();
    });
}

// Display image previews
function displayImagePreviews() {
    const previewDiv = document.getElementById('imagePreview');

    if (selectedFiles.length === 0) {
        previewDiv.classList.add('hidden');
        return;
    }

    previewDiv.classList.remove('hidden');
    previewDiv.innerHTML = '';

    selectedFiles.forEach((file, index) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            const previewItem = document.createElement('div');
            previewItem.className = 'preview-item';
            previewItem.innerHTML = `
                <img src="${e.target.result}" alt="Preview">
                <button type="button" class="remove-preview" onclick="removeImage(${index})" aria-label="Remove image">×</button>
            `;
            previewDiv.appendChild(previewItem);
        };

        reader.readAsDataURL(file);
    });
}

// Remove image from selection
window.removeImage = function (index) {
    selectedFiles.splice(index, 1);
    // Note: We can't easily remove a single file from the input[type=file]
    // So we just clear it. The user will have to re-select if they want to add more.
    // A better way would be to keep track of files in an array (which we do in selectedFiles)
    // and use that for the final upload.
    displayImagePreviews();
};

// Handle form submission
const form = document.getElementById('createBusinessForm') || document.getElementById('businessForm');
if (form) {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const submitBtn = document.getElementById('submitBtn');
        const errorDiv = document.getElementById('errorMessage');

        submitBtn.disabled = true;
        submitBtn.textContent = 'Processing...';
        errorDiv.classList.add('hidden');

        try {
            // 1. Gather Data
            const name = document.getElementById('businessName').value;
            const description = document.getElementById('description').value;
            const categorySelect = document.getElementById('category');
            const categoryName = categorySelect.options[categorySelect.selectedIndex].text;

            // 2. AI Evaluation
            submitBtn.textContent = 'AI Reviewing...';
            // Assuming window.aiService is available
            const aiResult = await window.aiService.evaluateBusinessListing(name, description, categoryName);
            console.log("AI Review Result:", aiResult);

            if (!aiResult.approved) {
                // Reject immediately
                throw new Error(`Submission rejected by AI: ${aiResult.reason} (Score: ${aiResult.score})`);
            }

            // If approved, proceed to upload
            submitBtn.textContent = 'Uploading...';

            // 3. Upload Images
            const imageUrls = [];
            if (selectedFiles.length > 0) {
                for (const file of selectedFiles) {
                    const url = await uploadFile(file, 'images');
                    if (url) imageUrls.push(url);
                }
            }

            // 4. Upload Brochure
            let brochureUrl = null;
            const brochureInput = document.getElementById('brochure');
            if (brochureInput && brochureInput.files.length > 0) {
                brochureUrl = await uploadFile(brochureInput.files[0], 'brochures');
            }

            // 5. Create Database Entry
            const businessData = {
                name: name,
                description: description,
                category_id: categorySelect.value,
                phone: document.getElementById('phone').value,
                email: document.getElementById('email').value || null,
                address: document.getElementById('address').value,
                website: document.getElementById('website').value || null,
                images: imageUrls,
                brochure_url: brochureUrl, // Add brochure URL
                owner_id: currentUser.id,
                status: 'approved', // AI approved it
                ai_score: aiResult.score, // Optional: if we want to store it (requires DB col)
                // For now, minimal schema
            };

            const { error } = await supabase
                .from('businesses')
                .insert([businessData]);

            if (error) throw error;

            alert('Business created successfully!');
            window.location.href = 'dashboard.html';

        } catch (error) {
            console.error('Error creating business:', error);
            errorDiv.textContent = error.message; // Show specific AI error
            errorDiv.classList.remove('hidden');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Create Business Listing';
        }
    });
}


// Generic Upload Function
async function uploadFile(file, bucket) {
    try {
        const timestamp = Date.now();
        // Sanitize filename
        const safeName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
        const filename = `${currentUser.id}/${timestamp}_${safeName}`;

        const { data, error } = await supabase.storage
            .from(bucket)
            .upload(filename, file);

        if (error) throw error;

        // Get public URL
        const { data: urlData } = supabase.storage
            .from(bucket)
            .getPublicUrl(filename);

        return urlData.publicUrl;
    } catch (error) {
        console.error(`Error uploading to ${bucket}:`, error);
        return null; // Don't fail entire flow if one file fails? Or simpler: fail
    }
}
