// Business detail page logic

const urlParams = new URLSearchParams(window.location.search);
const businessId = urlParams.get('id');

if (!businessId) {
  alert('Business not found');
  window.location.href = 'browse.html';
}

// Load business details
async function loadBusinessDetails() {
  const contentDiv = document.getElementById('businessContent');
  const messageBtn = document.getElementById('messageOwnerBtn');

  try {
    const { data: business, error } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', businessId)
      .single();

    if (error || !business) {
      contentDiv.innerHTML = '<p style="color: var(--error);">Business not found</p>';
      return;
    }

    document.title = `${business.name} - BizHub`;

    // Handle "Message Owner" button visibility
    const { data: { session } } = await supabase.auth.getSession();
    const currentUser = session ? session.user : null;

    if (currentUser && currentUser.id !== business.owner_id) {
      if (messageBtn) {
        messageBtn.style.display = 'inline-block';
        messageBtn.onclick = () => startChat(business.owner_id, business.id);
      }
    } else if (!currentUser) {
      if (messageBtn) {
        messageBtn.style.display = 'inline-block';
        messageBtn.onclick = () => window.location.href = 'login.html';
        messageBtn.textContent = 'Login to Message';
      }
    } else {
      // User is owner
      if (messageBtn) messageBtn.style.display = 'none';
    }

    // Handle Brochure Button
    const brochureBtn = document.getElementById('downloadBrochureBtn');
    if (business.brochure_url && brochureBtn) {
      brochureBtn.href = business.brochure_url;
      brochureBtn.style.display = 'inline-block';
    }

    // Create image slider
    let galleryHTML = '';
    if (business.images && business.images.length > 0) {
      if (business.images.length === 1) {
        // Single image - no slider needed
        galleryHTML = `
          <div class="slider-container">
            <div class="slider-wrapper">
              <div class="slide">
                 <img src="${business.images[0]}" alt="${business.name}" onerror="this.src='data:image/svg+xml;charset=UTF-8,%3Csvg width=\'800\' height=\'450\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Crect width=\'100%25\' height=\'100%25\' fill=\'#e0e7ff\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' font-family=\'Arial\' font-size=\'24\' fill=\'#6366f1\' text-anchor=\'middle\' dominant-baseline=\'middle\'%3ENo Image%3C/text%3E%3C/svg%3E'">
              </div>
            </div>
          </div>
        `;
      } else {
        // Multiple images - create slider
        const slidesHTML = business.images.map((img, index) => `
          <div class="slide">
            <img src="${img}" alt="${business.name} ${index + 1}" onerror="this.style.display='none'">
          </div>
        `).join('');

        const dotsHTML = business.images.map((_, index) => `
          <span class="dot ${index === 0 ? 'active' : ''}" onclick="goToSlide(${index})"></span>
        `).join('');

        galleryHTML = `
          <div class="slider-container" id="businessSlider">
            <div class="slider-wrapper" id="sliderWrapper">
              ${slidesHTML}
            </div>
            
            <button class="slider-btn prev-btn" onclick="moveSlide(-1)">&#10094;</button>
            <button class="slider-btn next-btn" onclick="moveSlide(1)">&#10095;</button>
            
            <div class="slider-dots">
              ${dotsHTML}
            </div>
          </div>
        `;

        // Initialize slider functionality
        setTimeout(() => initSlider(business.images.length), 100);
      }
    }

    // Contact info
    const contactHTML = `
      <div class="contact-grid">
        ${business.phone ? `
          <div class="contact-card">
            <p style="color: var(--text-tertiary); font-size: 0.875rem; margin-bottom: 0.25rem;">📞 Phone</p>
            <p style="font-weight: 600;"><a href="tel:${business.phone}" onclick="trackEvent('click')">${business.phone}</a></p>
          </div>
        ` : ''}
        ${business.email ? `
          <div class="contact-card">
            <p style="color: var(--text-tertiary); font-size: 0.875rem; margin-bottom: 0.25rem;">✉️ Email</p>
            <p style="font-weight: 600;"><a href="mailto:${business.email}" onclick="trackEvent('click')">${business.email}</a></p>
          </div>
        ` : ''}
        ${business.address ? `
          <div class="contact-card">
            <p style="color: var(--text-tertiary); font-size: 0.875rem; margin-bottom: 0.25rem;">📍 Address</p>
            <p style="font-weight: 600;">${business.address}</p>
          </div>
        ` : ''}
        ${business.website ? `
          <div class="contact-card">
            <p style="color: var(--text-tertiary); font-size: 0.875rem; margin-bottom: 0.25rem;">🌐 Website</p>
            <p style="font-weight: 600;"><a href="${business.website}" target="_blank" onclick="trackEvent('click')">Visit Website</a></p>
          </div>
        ` : ''}
      </div>
    `;

    contentDiv.innerHTML = `
      <h1>${business.name}</h1>
      <p style="font-size: 1.125rem; color: var(--text-secondary); margin-bottom: var(--space-xl);">
        ${business.description || 'No description available'}
      </p>
      
      ${galleryHTML}
      
      <div class="card mt-xl">
        <h2>Contact Information</h2>
        ${contactHTML}
      </div>
      
      <div id="productsSection" class="mt-xl">
        <!-- Products will be loaded here -->
      </div>
    `;

    loadProducts();

    // TRACKING: Increment view count
    trackEvent('view');

  } catch (error) {
    console.error('Error loading business:', error);
    contentDiv.innerHTML = '<p style="color: var(--error);">Error loading business details</p>';
  }
}

// Track analytic events
async function trackEvent(type) {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    // Validate we have businessId
    if (!businessId) return;

    // Optional: Avoid tracking owner's own actions
    // if (session && business.owner_id === session.user.id) return; 

    // Use RPC to increment atomically
    const { error } = await supabase.rpc('increment_business_stat', {
      p_business_id: businessId,
      p_metric_type: type
    });

    if (error) {
      console.warn('Analytics RPC failed:', error.message);
      // Fallback: If RPC fails (e.g. function missing), we could try a direct INSERT
      // But for security/correctness, we should rely on the RPC.
      // We'll just log it for now as "Analytics unavailable".
    } else {
      console.log(`Tracked ${type} successfully`);
    }

  } catch (e) {
    console.error('Tracking error:', e);
  }
}

// Load products
async function loadProducts() {
  const productsSection = document.getElementById('productsSection');

  try {
    const { data: products, error } = await supabase
      .from('products')
      .select('*')
      .eq('business_id', businessId)
      .eq('is_active', true);

    if (error) throw error;

    if (!products || products.length === 0) {
      productsSection.innerHTML = '';
      return;
    }

    let productsHTML = '<h2>Products & Services</h2><div class="grid grid-3 mt-lg">';

    products.forEach(product => {
      const imageUrl = product.images && product.images.length > 0
        ? product.images[0]
        : 'data:image/svg+xml;charset=UTF-8,%3Csvg width="300" height="200" xmlns="http://www.w3.org/2000/svg"%3E%3Crect width="100%25" height="100%25" fill="%23e0e7ff"/%3E%3Ctext x="50%25" y="50%25" font-family="Arial, sans-serif" font-size="18" fill="%236366f1" text-anchor="middle" dominant-baseline="middle"%3ENo Image%3C/text%3E%3C/svg%3E';

      productsHTML += `
        <div class="card">
          <img src="${imageUrl}" class="card-img" onerror="this.src='data:image/svg+xml;charset=UTF-8,%3Csvg width=\"300\" height=\"200\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Crect width=\"100%25\" height=\"100%25\" fill=\"%23e0e7ff\"/%3E%3Ctext x=\"50%25\" y=\"50%25\" font-family=\"Arial, sans-serif\" font-size=\"18\" fill=\"%236366f1\" text-anchor=\"middle\" dominant-baseline=\"middle\"%3ENo Image%3C/text%3E%3C/svg%3E'">
          <h4>${product.name}</h4>
          <p>${product.description || ''}</p>
          ${product.price ? `<p style="font-weight: 700; color: var(--primary-500); font-size: 1.25rem;">₹${product.price}</p>` : ''}
        </div>
      `;
    });

    productsHTML += '</div>';
    productsSection.innerHTML = productsHTML;

  } catch (error) {
    console.error('Error loading products:', error);
  }
}

// Start Chat
// startChat is now provided by common.js

// Initialize
loadBusinessDetails();

// Slider Logic
let currentSlide = 0;
let totalSlides = 0;
let slideInterval;

function initSlider(count) {
  totalSlides = count;
  currentSlide = 0;
  startSlideShow();
}

window.moveSlide = function (direction) {
  goToSlide(currentSlide + direction);
  resetSlideTimer();
}

window.goToSlide = function (index) {
  if (totalSlides === 0) return;

  // Wrap around
  if (index >= totalSlides) {
    currentSlide = 0;
  } else if (index < 0) {
    currentSlide = totalSlides - 1;
  } else {
    currentSlide = index;
  }

  updateSliderUI();
}

function updateSliderUI() {
  const wrapper = document.getElementById('sliderWrapper');
  const dots = document.querySelectorAll('.dot');

  if (wrapper) {
    wrapper.style.transform = `translateX(-${currentSlide * 100}%)`;
  }

  dots.forEach((dot, idx) => {
    if (idx === currentSlide) {
      dot.classList.add('active');
    } else {
      dot.classList.remove('active');
    }
  });
}

function startSlideShow() {
  stopSlideShow();
  slideInterval = setInterval(() => {
    moveSlide(1);
  }, 5000); // 5 seconds
}

function stopSlideShow() {
  if (slideInterval) clearInterval(slideInterval);
}

function resetSlideTimer() {
  stopSlideShow();
  startSlideShow();
}
