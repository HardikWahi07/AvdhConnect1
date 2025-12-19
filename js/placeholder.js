// Placeholder image generator
// Creates a simple SVG placeholder when images are missing

function getPlaceholderImage(width = 400, height = 200, text = 'No Image') {
    // Create an inline SVG data URI
    const svg = `
        <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
            <rect width="100%" height="100%" fill="#e0e7ff"/>
            <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="18" fill="#6366f1" 
                  text-anchor="middle" dominant-baseline="middle">${text}</text>
        </svg>
    `;

    return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
}

// Export for use in other files
window.getPlaceholderImage = getPlaceholderImage;
