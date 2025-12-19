// ============ ANIMATED WAVE BACKGROUND ============
// This creates an interactive wave animation that responds to mouse movement

const canvas = document.getElementById('waveCanvas');
if (canvas) {
    const ctx = canvas.getContext('2d');
    let width, height;
    let mouseX = 0;
    let mouseY = 0;
    let targetMouseX = 0;
    let targetMouseY = 0;

    // Function to get wave colors based on theme
    function getWaveColors() {
        const theme = document.documentElement.getAttribute('data-theme');
        const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

        if (isDark) {
            // Light waves for dark mode
            return [
                'rgba(255, 255, 255, 0.08)',
                'rgba(255, 255, 255, 0.06)',
                'rgba(255, 255, 255, 0.04)'
            ];
        } else {
            // Dark/colored waves for light mode - using primary brand color
            return [
                'rgba(99, 102, 241, 0.12)',  // Primary color with transparency
                'rgba(79, 70, 229, 0.08)',
                'rgba(124, 58, 237, 0.06)'
            ];
        }
    }

    // Wave parameters
    const waves = [
        { amplitude: 30, frequency: 0.015, speed: 0.02, offset: 0 },
        { amplitude: 40, frequency: 0.012, speed: 0.025, offset: 100 },
        { amplitude: 35, frequency: 0.018, speed: 0.018, offset: 200 }
    ];

    function resize() {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    }

    function drawWave(wave, time) {
        ctx.beginPath();
        ctx.moveTo(0, height);

        // Calculate wave path
        for (let x = 0; x <= width; x += 5) {
            // Mouse influence - creates distortion based on mouse position
            const distanceToMouse = Math.sqrt(
                Math.pow(x - mouseX, 2) + Math.pow(height / 2 - mouseY, 2)
            );
            const mouseInfluence = Math.max(0, 1 - distanceToMouse / 300) * 50;

            const y =
                height / 2 +
                Math.sin(x * wave.frequency + time * wave.speed + wave.offset) * wave.amplitude +
                mouseInfluence;

            ctx.lineTo(x, y);
        }

        ctx.lineTo(width, height);
        ctx.closePath();

        // Get current color from waveColors array (set in animate)
        ctx.fillStyle = wave.color;
        ctx.fill();
    }

    function animate() {
        ctx.clearRect(0, 0, width, height);

        // Get current theme colors
        const waveColors = getWaveColors();

        // Smooth mouse movement
        mouseX += (targetMouseX - mouseX) * 0.1;
        mouseY += (targetMouseY - mouseY) * 0.1;

        const time = Date.now() * 0.001;

        // Draw all waves with theme-appropriate colors
        waves.forEach((wave, index) => {
            wave.color = waveColors[index];
            drawWave(wave, time);
        });

        requestAnimationFrame(animate);
    }

    // Mouse tracking
    document.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        targetMouseX = e.clientX - rect.left;
        targetMouseY = e.clientY - rect.top;
    });

    // Touch support for mobile
    document.addEventListener('touchmove', (e) => {
        const rect = canvas.getBoundingClientRect();
        const touch = e.touches[0];
        targetMouseX = touch.clientX - rect.left;
        targetMouseY = touch.clientY - rect.top;
    });

    // Initialize
    window.addEventListener('resize', resize);
    resize();

    // Set initial mouse position to center
    mouseX = targetMouseX = width / 2;
    mouseY = targetMouseY = height / 2;

    animate();
}
