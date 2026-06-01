// ==========================================
// LIGHTHOUSE KEEPER - Full Game
// ==========================================

const gameCanvas = document.getElementById('gameCanvas');
const uiCanvas = document.getElementById('uiCanvas');
const ctx = gameCanvas.getContext('2d');
const uiCtx = uiCanvas.getContext('2d');
const cursor = document.getElementById('cursor');
const startScreen = document.getElementById('startScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');
const finalScoreEl = document.getElementById('finalScore');

let W, H;
function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    gameCanvas.width = uiCanvas.width = W;
    gameCanvas.height = uiCanvas.height = H;
}
resize();
window.addEventListener('resize', resize);

// ==========================================
// GAME STATE
// ==========================================
let mouseX = W / 2, mouseY = H / 2;
let gameRunning = false;
let score = 0;
let wave = 1;
let waveTimer = 0;
let difficulty = 1;
let time = 0;
let shakeX = 0, shakeY = 0;
let lightningFlash = 0;
let lightningTimer = 0;

// Lighthouse position
const lighthouse = { x: 0, y: 0, angle: 0, height: 180, baseWidth: 60 };

// Arrays
let ships = [];
let creatures = [];
let raindrops = [];
let particles = [];
let waves = [];
let clouds = [];
let stars = [];
let fogPatches = [];
let bubbles = [];


// ==========================================
// MOUSE TRACKING
// ==========================================
document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    cursor.style.left = e.clientX + 'px';
    cursor.style.top = e.clientY + 'px';
});

document.addEventListener('touchmove', (e) => {
    e.preventDefault();
    mouseX = e.touches[0].clientX;
    mouseY = e.touches[0].clientY;
    cursor.style.left = mouseX + 'px';
    cursor.style.top = mouseY + 'px';
});

// ==========================================
// INITIALIZATION
// ==========================================
function initGame() {
    score = 0;
    wave = 1;
    waveTimer = 0;
    difficulty = 1;
    time = 0;
    ships = [];
    creatures = [];
    raindrops = [];
    particles = [];
    waves = [];
    clouds = [];
    stars = [];
    fogPatches = [];
    bubbles = [];

    lighthouse.x = W * 0.15;
    lighthouse.y = H * 0.55;

    // Initialize stars
    for (let i = 0; i < 100; i++) {
        stars.push({
            x: Math.random() * W,
            y: Math.random() * H * 0.4,
            size: Math.random() * 2 + 0.5,
            twinkle: Math.random() * Math.PI * 2,
            speed: Math.random() * 0.02 + 0.01
        });
    }

    // Initialize clouds
    for (let i = 0; i < 8; i++) {
        clouds.push(createCloud());
    }

    // Initialize rain
    for (let i = 0; i < 200; i++) {
        raindrops.push(createRaindrop());
    }

    // Initialize waves
    for (let i = 0; i < 5; i++) {
        waves.push({ offset: i * 30, speed: 0.3 + i * 0.1, amplitude: 8 + i * 3, y: H * 0.6 + i * 25 });
    }

    // Initialize fog
    for (let i = 0; i < 6; i++) {
        fogPatches.push({
            x: Math.random() * W,
            y: H * 0.5 + Math.random() * H * 0.3,
            radius: 100 + Math.random() * 150,
            speed: 0.2 + Math.random() * 0.3,
            opacity: 0.1 + Math.random() * 0.15
        });
    }
}


// ==========================================
// FACTORY FUNCTIONS
// ==========================================
function createCloud() {
    return {
        x: Math.random() * W * 1.5 - W * 0.25,
        y: Math.random() * H * 0.35,
        width: 150 + Math.random() * 200,
        height: 40 + Math.random() * 40,
        speed: 0.1 + Math.random() * 0.2,
        opacity: 0.15 + Math.random() * 0.2
    };
}

function createRaindrop() {
    return {
        x: Math.random() * W * 1.2 - W * 0.1,
        y: Math.random() * H,
        speed: 12 + Math.random() * 8,
        length: 15 + Math.random() * 20,
        opacity: 0.2 + Math.random() * 0.4
    };
}

function createShip() {
    const side = Math.random() > 0.5 ? 'right' : 'top';
    let x, y, angle;
    if (side === 'right') {
        x = W + 50;
        y = H * 0.55 + Math.random() * (H * 0.3);
        angle = Math.PI + (Math.random() - 0.5) * 0.5;
    } else {
        x = W * 0.4 + Math.random() * (W * 0.5);
        y = H * 0.45;
        angle = Math.PI / 2 + (Math.random() - 0.5) * 0.3;
    }
    return {
        x, y, angle,
        speed: 0.4 + Math.random() * 0.3,
        size: 20 + Math.random() * 15,
        lit: 0,
        saved: false,
        sinking: false,
        sinkProgress: 0,
        bobOffset: Math.random() * Math.PI * 2,
        lanternFlicker: 0,
        health: 100,
        visible: false
    };
}

function createCreature() {
    const angle = Math.random() * Math.PI * 2;
    const dist = 200 + Math.random() * 300;
    return {
        x: W * 0.5 + Math.cos(angle) * dist,
        y: H * 0.65 + Math.random() * (H * 0.25),
        size: 25 + Math.random() * 20,
        eyeGlow: 0,
        awake: 0,
        anger: 0,
        bobOffset: Math.random() * Math.PI * 2,
        swimAngle: Math.random() * Math.PI * 2,
        swimSpeed: 0.5 + Math.random() * 0.5,
        tentacles: 4 + Math.floor(Math.random() * 3),
        pulsePhase: Math.random() * Math.PI * 2
    };
}

function createParticle(x, y, type) {
    return {
        x, y, type,
        vx: (Math.random() - 0.5) * 3,
        vy: -Math.random() * 3 - 1,
        life: 1,
        decay: 0.01 + Math.random() * 0.02,
        size: 2 + Math.random() * 4,
        rotation: Math.random() * Math.PI * 2
    };
}


// ==========================================
// UPDATE FUNCTIONS
// ==========================================
function update(dt) {
    time += dt;
    waveTimer += dt;

    // Increase difficulty over time
    difficulty = 1 + Math.floor(time / 30) * 0.3;

    // Wave system
    if (waveTimer > 20 / difficulty) {
        wave++;
        waveTimer = 0;
    }

    // Spawn ships
    if (Math.random() < 0.005 * difficulty && ships.length < 5 + wave) {
        ships.push(createShip());
    }

    // Spawn creatures
    if (Math.random() < 0.002 * difficulty && creatures.length < 3 + wave) {
        creatures.push(createCreature());
    }

    // Calculate lighthouse beam angle
    const dx = mouseX - lighthouse.x;
    const dy = mouseY - (lighthouse.y - lighthouse.height);
    lighthouse.angle = Math.atan2(dy, dx);

    // Update screen shake
    shakeX *= 0.9;
    shakeY *= 0.9;

    // Lightning
    lightningTimer -= dt;
    if (lightningTimer <= 0 && Math.random() < 0.002 * difficulty) {
        lightningFlash = 1;
        lightningTimer = 5 + Math.random() * 15;
        shakeX = (Math.random() - 0.5) * 5;
        shakeY = (Math.random() - 0.5) * 3;
    }
    lightningFlash *= 0.92;

    updateStars(dt);
    updateClouds(dt);
    updateRain(dt);
    updateWaves(dt);
    updateFog(dt);
    updateShips(dt);
    updateCreatures(dt);
    updateParticles(dt);
}

function updateStars(dt) {
    stars.forEach(s => {
        s.twinkle += s.speed;
    });
}

function updateClouds(dt) {
    clouds.forEach(c => {
        c.x += c.speed;
        if (c.x > W + c.width) c.x = -c.width;
    });
}

function updateRain(dt) {
    raindrops.forEach(r => {
        r.x -= 2;
        r.y += r.speed;
        if (r.y > H) {
            r.y = -r.length;
            r.x = Math.random() * W * 1.2 - W * 0.1;
            // Splash particle
            if (r.y + r.speed > H * 0.58 && Math.random() < 0.3) {
                particles.push(createParticle(r.x, H * 0.58, 'splash'));
            }
        }
    });
}

function updateWaves(dt) {
    waves.forEach(w => {
        w.offset += w.speed;
    });
}

function updateFog(dt) {
    fogPatches.forEach(f => {
        f.x += f.speed;
        if (f.x > W + f.radius) f.x = -f.radius;
    });
}


function updateShips(dt) {
    const beamOriginX = lighthouse.x;
    const beamOriginY = lighthouse.y - lighthouse.height;
    const beamAngle = lighthouse.angle;
    const beamSpread = 0.18;
    const beamRange = W * 0.9;

    ships.forEach((ship, i) => {
        if (ship.sinking) {
            ship.sinkProgress += 0.005;
            if (ship.sinkProgress > 1) ships.splice(i, 1);
            return;
        }

        // Move ship
        ship.x += Math.cos(ship.angle) * ship.speed;
        ship.y += Math.sin(ship.angle) * ship.speed * 0.3;
        ship.bobOffset += 0.03;

        // Check if in beam
        const sdx = ship.x - beamOriginX;
        const sdy = ship.y - beamOriginY;
        const shipAngle = Math.atan2(sdy, sdx);
        const shipDist = Math.sqrt(sdx * sdx + sdy * sdy);
        let angleDiff = Math.abs(shipAngle - beamAngle);
        if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;

        if (angleDiff < beamSpread && shipDist < beamRange) {
            ship.lit = Math.min(ship.lit + 0.02, 1);
            ship.visible = true;
        } else {
            ship.lit = Math.max(ship.lit - 0.01, 0);
        }

        // Guide ship if lit
        if (ship.lit > 0.5 && !ship.saved) {
            // Steer toward safe harbor (left side)
            const targetAngle = Math.atan2(lighthouse.y - ship.y, lighthouse.x - 100 - ship.x);
            ship.angle += (targetAngle - ship.angle) * 0.01;
            ship.lanternFlicker = Math.sin(time * 5) * 0.3 + 0.7;
        }

        // Check if saved
        if (ship.x < lighthouse.x + 50 && Math.abs(ship.y - lighthouse.y) < 80 && ship.lit > 0.3) {
            ship.saved = true;
            score++;
            // Victory particles
            for (let p = 0; p < 15; p++) {
                particles.push(createParticle(ship.x, ship.y, 'save'));
            }
            ships.splice(i, 1);
        }

        // Ship lost (went off screen without being saved)
        if (ship.x < -100 && !ship.saved) {
            ships.splice(i, 1);
        }

        // Health decreases if not lit and creature nearby
        if (ship.lit < 0.2) {
            creatures.forEach(c => {
                if (c.awake > 0.5) {
                    const cdx = ship.x - c.x;
                    const cdy = ship.y - c.y;
                    const cdist = Math.sqrt(cdx * cdx + cdy * cdy);
                    if (cdist < 120) {
                        ship.health -= 0.3 * c.awake;
                        if (Math.random() < 0.05) {
                            particles.push(createParticle(ship.x, ship.y, 'damage'));
                        }
                    }
                }
            });
        }

        // Ship sinks
        if (ship.health <= 0) {
            ship.sinking = true;
            shakeX = (Math.random() - 0.5) * 8;
            shakeY = (Math.random() - 0.5) * 5;
            for (let p = 0; p < 20; p++) {
                particles.push(createParticle(ship.x, ship.y, 'wreck'));
            }
        }
    });

    // Game over if too many ships sunk
    const sunkCount = ships.filter(s => s.sinking).length;
    if (sunkCount >= 3) {
        endGame();
    }
}


function updateCreatures(dt) {
    const beamOriginX = lighthouse.x;
    const beamOriginY = lighthouse.y - lighthouse.height;
    const beamAngle = lighthouse.angle;
    const beamSpread = 0.18;
    const beamRange = W * 0.9;

    creatures.forEach((c, i) => {
        // Swimming movement
        c.swimAngle += 0.01;
        c.x += Math.cos(c.swimAngle) * c.swimSpeed;
        c.y += Math.sin(c.swimAngle * 0.5) * 0.3;
        c.bobOffset += 0.04;
        c.pulsePhase += 0.05;

        // Check if beam is on creature
        const cdx = c.x - beamOriginX;
        const cdy = c.y - beamOriginY;
        const cAngle = Math.atan2(cdy, cdx);
        const cDist = Math.sqrt(cdx * cdx + cdy * cdy);
        let angleDiff = Math.abs(cAngle - beamAngle);
        if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;

        if (angleDiff < beamSpread && cDist < beamRange) {
            c.awake = Math.min(c.awake + 0.008 * difficulty, 1);
            c.anger = Math.min(c.anger + 0.005, 1);
            c.eyeGlow = Math.min(c.eyeGlow + 0.03, 1);
        } else {
            c.awake = Math.max(c.awake - 0.003, 0);
            c.anger = Math.max(c.anger - 0.002, 0);
            c.eyeGlow = Math.max(c.eyeGlow - 0.01, 0);
        }

        // Awake creature moves toward ships
        if (c.awake > 0.5) {
            let closest = null;
            let closestDist = Infinity;
            ships.forEach(s => {
                if (!s.sinking) {
                    const d = Math.sqrt((s.x - c.x) ** 2 + (s.y - c.y) ** 2);
                    if (d < closestDist) {
                        closestDist = d;
                        closest = s;
                    }
                }
            });
            if (closest) {
                const targetAngle = Math.atan2(closest.y - c.y, closest.x - c.x);
                c.swimAngle += (targetAngle - c.swimAngle) * 0.02 * c.awake;
                c.swimSpeed = 0.5 + c.awake * 1.5;
            }
            // Emit bubbles
            if (Math.random() < 0.1 * c.awake) {
                bubbles.push({
                    x: c.x + (Math.random() - 0.5) * c.size,
                    y: c.y,
                    vy: -1 - Math.random() * 2,
                    size: 2 + Math.random() * 4,
                    life: 1
                });
            }
        }

        // Remove if calmed down and far away
        if (c.awake < 0.01 && (c.x < -100 || c.x > W + 100)) {
            creatures.splice(i, 1);
        }
    });

    // Update bubbles
    bubbles.forEach((b, i) => {
        b.y += b.vy;
        b.life -= 0.015;
        b.x += Math.sin(time * 3 + b.y * 0.1) * 0.3;
        if (b.life <= 0) bubbles.splice(i, 1);
    });
}

function updateParticles(dt) {
    particles.forEach((p, i) => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= p.decay;
        p.rotation += 0.05;

        if (p.type === 'splash') {
            p.vy += 0.1;
        } else if (p.type === 'save') {
            p.vy -= 0.02;
        }

        if (p.life <= 0) particles.splice(i, 1);
    });
}


// ==========================================
// RENDER FUNCTIONS
// ==========================================
function render() {
    ctx.save();
    ctx.translate(shakeX, shakeY);

    drawSky();
    drawStars();
    drawClouds();
    drawMoon();
    drawSea();
    drawWavesEffect();
    drawFog();
    drawShips();
    drawCreatures();
    drawBubbles();
    drawLighthouse();
    drawBeam();
    drawRain();
    drawParticles();
    drawLightningOverlay();

    ctx.restore();

    drawUI();
}

function drawSky() {
    const gradient = ctx.createLinearGradient(0, 0, 0, H * 0.6);
    gradient.addColorStop(0, '#050a14');
    gradient.addColorStop(0.4, '#0d1b2a');
    gradient.addColorStop(0.7, '#1b2838');
    gradient.addColorStop(1, '#1a3a4a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, W, H);
}

function drawStars() {
    stars.forEach(s => {
        const alpha = 0.3 + Math.sin(s.twinkle) * 0.3;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 230, ${alpha})`;
        ctx.fill();
    });
}

function drawMoon() {
    const moonX = W * 0.8;
    const moonY = H * 0.12;
    const moonR = 30;

    // Moon glow
    const glow = ctx.createRadialGradient(moonX, moonY, moonR * 0.5, moonX, moonY, moonR * 4);
    glow.addColorStop(0, 'rgba(200, 220, 255, 0.15)');
    glow.addColorStop(0.5, 'rgba(150, 180, 220, 0.05)');
    glow.addColorStop(1, 'rgba(100, 150, 200, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(moonX - moonR * 4, moonY - moonR * 4, moonR * 8, moonR * 8);

    // Moon body
    ctx.beginPath();
    ctx.arc(moonX, moonY, moonR, 0, Math.PI * 2);
    ctx.fillStyle = '#dde8f0';
    ctx.fill();

    // Moon craters
    ctx.beginPath();
    ctx.arc(moonX - 8, moonY - 5, 6, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(180, 195, 210, 0.5)';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(moonX + 10, moonY + 8, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(moonX + 3, moonY - 12, 3, 0, Math.PI * 2);
    ctx.fill();
}

function drawClouds() {
    clouds.forEach(c => {
        ctx.save();
        ctx.globalAlpha = c.opacity;
        const grad = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.width * 0.5);
        grad.addColorStop(0, 'rgba(30, 40, 60, 0.8)');
        grad.addColorStop(1, 'rgba(20, 30, 50, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(c.x, c.y, c.width * 0.5, c.height * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    });
}


function drawSea() {
    // Deep sea gradient
    const seaGrad = ctx.createLinearGradient(0, H * 0.55, 0, H);
    seaGrad.addColorStop(0, '#0a2a3a');
    seaGrad.addColorStop(0.3, '#061a28');
    seaGrad.addColorStop(1, '#030d15');
    ctx.fillStyle = seaGrad;
    ctx.fillRect(0, H * 0.55, W, H * 0.45);

    // Water surface shimmer
    for (let i = 0; i < 30; i++) {
        const x = (i * W / 30 + time * 20) % W;
        const y = H * 0.56 + Math.sin(time + i * 0.5) * 3;
        const alpha = 0.03 + Math.sin(time * 2 + i) * 0.02;
        ctx.beginPath();
        ctx.ellipse(x, y, 30 + Math.sin(time + i) * 10, 2, 0, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(100, 180, 220, ${alpha})`;
        ctx.fill();
    }
}

function drawWavesEffect() {
    waves.forEach((w, idx) => {
        ctx.beginPath();
        ctx.moveTo(0, w.y);
        for (let x = 0; x <= W; x += 5) {
            const y = w.y + Math.sin((x + w.offset * 50 + time * 30) / 80) * w.amplitude +
                      Math.sin((x + w.offset * 30) / 40) * w.amplitude * 0.5;
            ctx.lineTo(x, y);
        }
        ctx.lineTo(W, H);
        ctx.lineTo(0, H);
        ctx.closePath();

        const alpha = 0.08 - idx * 0.01;
        ctx.fillStyle = `rgba(10, 35, 55, ${alpha + 0.3})`;
        ctx.fill();

        // Wave crest foam
        if (idx < 2) {
            for (let x = 0; x <= W; x += 80) {
                const y = w.y + Math.sin((x + w.offset * 50 + time * 30) / 80) * w.amplitude;
                const foamAlpha = 0.1 + Math.sin(time + x * 0.01) * 0.05;
                ctx.beginPath();
                ctx.ellipse(x, y - 2, 20, 3, 0, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(200, 230, 255, ${foamAlpha})`;
                ctx.fill();
            }
        }
    });
}

function drawFog() {
    fogPatches.forEach(f => {
        const grad = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.radius);
        grad.addColorStop(0, `rgba(150, 170, 190, ${f.opacity})`);
        grad.addColorStop(1, 'rgba(150, 170, 190, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.radius, 0, Math.PI * 2);
        ctx.fill();
    });
}

function drawRain() {
    ctx.strokeStyle = 'rgba(150, 180, 220, 0.3)';
    ctx.lineWidth = 1;
    raindrops.forEach(r => {
        ctx.globalAlpha = r.opacity;
        ctx.beginPath();
        ctx.moveTo(r.x, r.y);
        ctx.lineTo(r.x - 2, r.y + r.length);
        ctx.stroke();
    });
    ctx.globalAlpha = 1;
}


function drawLighthouse() {
    const lx = lighthouse.x;
    const ly = lighthouse.y;
    const lh = lighthouse.height;
    const lw = lighthouse.baseWidth;

    // Rocky island base
    ctx.beginPath();
    ctx.moveTo(lx - 80, ly + 20);
    ctx.quadraticCurveTo(lx - 60, ly - 10, lx - 40, ly + 5);
    ctx.quadraticCurveTo(lx - 20, ly - 5, lx, ly);
    ctx.quadraticCurveTo(lx + 20, ly - 5, lx + 40, ly + 5);
    ctx.quadraticCurveTo(lx + 60, ly - 10, lx + 80, ly + 20);
    ctx.quadraticCurveTo(lx + 70, ly + 50, lx + 50, ly + 60);
    ctx.lineTo(lx - 50, ly + 60);
    ctx.quadraticCurveTo(lx - 70, ly + 50, lx - 80, ly + 20);
    ctx.closePath();
    const rockGrad = ctx.createLinearGradient(lx, ly - 10, lx, ly + 60);
    rockGrad.addColorStop(0, '#2a3040');
    rockGrad.addColorStop(1, '#15202a');
    ctx.fillStyle = rockGrad;
    ctx.fill();
    ctx.strokeStyle = 'rgba(60, 80, 100, 0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Rock details
    for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        const rx = lx - 40 + Math.sin(i * 2.5) * 50;
        const ry = ly + 10 + Math.cos(i * 1.7) * 15;
        ctx.arc(rx, ry, 5 + i * 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(40, 55, 70, ${0.3 + i * 0.1})`;
        ctx.fill();
    }

    // Tower body
    const topWidth = lw * 0.55;
    ctx.beginPath();
    ctx.moveTo(lx - lw / 2, ly);
    ctx.lineTo(lx - topWidth / 2, ly - lh + 30);
    ctx.lineTo(lx + topWidth / 2, ly - lh + 30);
    ctx.lineTo(lx + lw / 2, ly);
    ctx.closePath();
    const towerGrad = ctx.createLinearGradient(lx - lw / 2, ly, lx + lw / 2, ly);
    towerGrad.addColorStop(0, '#e8e0d0');
    towerGrad.addColorStop(0.3, '#f5f0e8');
    towerGrad.addColorStop(0.7, '#f5f0e8');
    towerGrad.addColorStop(1, '#c8c0b0');
    ctx.fillStyle = towerGrad;
    ctx.fill();
    ctx.strokeStyle = '#8a8070';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Red stripes
    for (let i = 0; i < 4; i++) {
        const stripeY = ly - 20 - i * 38;
        const stripeH = 15;
        const progress = (ly - stripeY) / lh;
        const sw = lw * (1 - progress * 0.4);
        ctx.beginPath();
        ctx.moveTo(lx - sw / 2, stripeY);
        ctx.lineTo(lx - sw / 2 + 2, stripeY - stripeH);
        ctx.lineTo(lx + sw / 2 - 2, stripeY - stripeH);
        ctx.lineTo(lx + sw / 2, stripeY);
        ctx.closePath();
        ctx.fillStyle = '#cc3333';
        ctx.fill();
    }

    // Lantern room
    const lanternY = ly - lh + 20;
    const lanternW = topWidth * 1.2;
    const lanternH = 30;

    // Gallery (walkway)
    ctx.fillStyle = '#333';
    ctx.fillRect(lx - lanternW * 0.7, lanternY + lanternH * 0.8, lanternW * 1.4, 4);

    // Railing
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1;
    for (let i = -3; i <= 3; i++) {
        ctx.beginPath();
        ctx.moveTo(lx + i * (lanternW * 0.18), lanternY + lanternH * 0.8);
        ctx.lineTo(lx + i * (lanternW * 0.2), lanternY + lanternH * 0.5);
        ctx.stroke();
    }

    // Glass enclosure
    ctx.beginPath();
    ctx.rect(lx - lanternW / 2, lanternY, lanternW, lanternH);
    ctx.fillStyle = 'rgba(255, 240, 180, 0.3)';
    ctx.fill();
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Inner light glow
    const glowGrad = ctx.createRadialGradient(lx, lanternY + lanternH / 2, 2, lx, lanternY + lanternH / 2, lanternW);
    glowGrad.addColorStop(0, 'rgba(255, 230, 100, 0.9)');
    glowGrad.addColorStop(0.5, 'rgba(255, 200, 50, 0.4)');
    glowGrad.addColorStop(1, 'rgba(255, 180, 30, 0)');
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(lx, lanternY + lanternH / 2, lanternW * 0.8, 0, Math.PI * 2);
    ctx.fill();

    // Dome top
    ctx.beginPath();
    ctx.arc(lx, lanternY, lanternW * 0.5, Math.PI, 0);
    ctx.fillStyle = '#2a2a2a';
    ctx.fill();

    // Finial
    ctx.beginPath();
    ctx.moveTo(lx, lanternY - 15);
    ctx.lineTo(lx - 3, lanternY - 5);
    ctx.lineTo(lx + 3, lanternY - 5);
    ctx.closePath();
    ctx.fillStyle = '#444';
    ctx.fill();
}


function drawBeam() {
    const originX = lighthouse.x;
    const originY = lighthouse.y - lighthouse.height + 35;
    const angle = lighthouse.angle;
    const beamLength = W * 0.85;
    const spread = 0.15;

    ctx.save();

    // Main beam cone
    const x1 = originX + Math.cos(angle - spread) * beamLength;
    const y1 = originY + Math.sin(angle - spread) * beamLength;
    const x2 = originX + Math.cos(angle + spread) * beamLength;
    const y2 = originY + Math.sin(angle + spread) * beamLength;

    const beamGrad = ctx.createRadialGradient(originX, originY, 5, originX, originY, beamLength);
    beamGrad.addColorStop(0, 'rgba(255, 240, 150, 0.6)');
    beamGrad.addColorStop(0.2, 'rgba(255, 230, 100, 0.25)');
    beamGrad.addColorStop(0.5, 'rgba(255, 220, 80, 0.1)');
    beamGrad.addColorStop(1, 'rgba(255, 210, 60, 0)');

    ctx.beginPath();
    ctx.moveTo(originX, originY);
    ctx.lineTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.closePath();
    ctx.fillStyle = beamGrad;
    ctx.fill();

    // Inner bright core
    const coreSpread = 0.04;
    const cx1 = originX + Math.cos(angle - coreSpread) * beamLength * 0.7;
    const cy1 = originY + Math.sin(angle - coreSpread) * beamLength * 0.7;
    const cx2 = originX + Math.cos(angle + coreSpread) * beamLength * 0.7;
    const cy2 = originY + Math.sin(angle + coreSpread) * beamLength * 0.7;

    const coreGrad = ctx.createRadialGradient(originX, originY, 2, originX, originY, beamLength * 0.7);
    coreGrad.addColorStop(0, 'rgba(255, 255, 200, 0.5)');
    coreGrad.addColorStop(0.3, 'rgba(255, 245, 150, 0.15)');
    coreGrad.addColorStop(1, 'rgba(255, 240, 100, 0)');

    ctx.beginPath();
    ctx.moveTo(originX, originY);
    ctx.lineTo(cx1, cy1);
    ctx.lineTo(cx2, cy2);
    ctx.closePath();
    ctx.fillStyle = coreGrad;
    ctx.fill();

    // Dust particles in beam
    for (let i = 0; i < 15; i++) {
        const dist = Math.random() * beamLength * 0.6;
        const angleOffset = (Math.random() - 0.5) * spread * 1.5;
        const px = originX + Math.cos(angle + angleOffset) * dist;
        const py = originY + Math.sin(angle + angleOffset) * dist;
        const pAlpha = 0.2 * (1 - dist / beamLength) * (0.5 + Math.sin(time * 3 + i) * 0.5);
        ctx.beginPath();
        ctx.arc(px, py, 1 + Math.random() * 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 240, 180, ${pAlpha})`;
        ctx.fill();
    }

    ctx.restore();
}


function drawShips() {
    ships.forEach(ship => {
        ctx.save();
        const bobY = Math.sin(ship.bobOffset) * 4;
        const tiltAngle = Math.sin(ship.bobOffset * 0.7) * 0.05;
        ctx.translate(ship.x, ship.y + bobY);
        ctx.rotate(tiltAngle);

        if (ship.sinking) {
            ctx.globalAlpha = 1 - ship.sinkProgress;
            ctx.translate(0, ship.sinkProgress * 40);
            ctx.rotate(ship.sinkProgress * 0.3);
        }

        const s = ship.size;

        // Hull
        ctx.beginPath();
        ctx.moveTo(-s, 0);
        ctx.quadraticCurveTo(-s * 0.8, s * 0.4, 0, s * 0.35);
        ctx.quadraticCurveTo(s * 0.8, s * 0.4, s, 0);
        ctx.quadraticCurveTo(s * 0.6, -s * 0.15, 0, -s * 0.1);
        ctx.quadraticCurveTo(-s * 0.6, -s * 0.15, -s, 0);
        ctx.closePath();
        ctx.fillStyle = '#4a3020';
        ctx.fill();
        ctx.strokeStyle = '#2a1810';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Hull details
        ctx.beginPath();
        ctx.moveTo(-s * 0.7, s * 0.05);
        ctx.lineTo(s * 0.7, s * 0.05);
        ctx.strokeStyle = '#3a2518';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Mast
        ctx.beginPath();
        ctx.moveTo(0, -s * 0.1);
        ctx.lineTo(0, -s * 1.2);
        ctx.strokeStyle = '#5a4030';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Sail
        ctx.beginPath();
        ctx.moveTo(0, -s * 1.1);
        ctx.quadraticCurveTo(s * 0.6 + Math.sin(time * 2) * 3, -s * 0.65, 0, -s * 0.2);
        ctx.fillStyle = ship.lit > 0.3 ? `rgba(240, 235, 220, ${0.7 + ship.lit * 0.3})` : 'rgba(180, 175, 165, 0.6)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(100, 90, 80, 0.5)';
        ctx.lineWidth = 0.5;
        ctx.stroke();

        // Ship lantern
        if (ship.lit > 0.3) {
            const lanternGlow = ctx.createRadialGradient(0, -s * 0.5, 0, 0, -s * 0.5, s * 0.8);
            lanternGlow.addColorStop(0, `rgba(255, 200, 80, ${0.4 * ship.lanternFlicker})`);
            lanternGlow.addColorStop(1, 'rgba(255, 180, 50, 0)');
            ctx.fillStyle = lanternGlow;
            ctx.beginPath();
            ctx.arc(0, -s * 0.5, s * 0.8, 0, Math.PI * 2);
            ctx.fill();

            // Small lantern dot
            ctx.beginPath();
            ctx.arc(s * 0.3, -s * 0.3, 3, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 200, 100, ${ship.lanternFlicker})`;
            ctx.fill();
        }

        // Visibility indicator
        if (ship.visible && !ship.sinking) {
            ctx.beginPath();
            ctx.arc(0, -s * 1.4, 4, 0, Math.PI * 2);
            ctx.fillStyle = ship.lit > 0.5 ? 'rgba(100, 255, 100, 0.8)' : 'rgba(255, 200, 50, 0.6)';
            ctx.fill();
        }

        ctx.restore();

        // Health bar for damaged ships
        if (ship.health < 100 && !ship.sinking) {
            const barWidth = ship.size * 1.5;
            const barHeight = 3;
            const barX = ship.x - barWidth / 2;
            const barY = ship.y - ship.size * 1.6 + bobY;
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(barX, barY, barWidth, barHeight);
            const healthColor = ship.health > 50 ? '#44ff44' : ship.health > 25 ? '#ffaa00' : '#ff4444';
            ctx.fillStyle = healthColor;
            ctx.fillRect(barX, barY, barWidth * (ship.health / 100), barHeight);
        }
    });
}


function drawCreatures() {
    creatures.forEach(c => {
        ctx.save();
        const bobY = Math.sin(c.bobOffset) * 5;
        ctx.translate(c.x, c.y + bobY);

        const pulse = 0.9 + Math.sin(c.pulsePhase) * 0.1;

        // Body shadow under water
        ctx.beginPath();
        ctx.ellipse(0, 5, c.size * pulse * 1.2, c.size * pulse * 0.4, 0, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 10, 20, ${0.2 + c.awake * 0.3})`;
        ctx.fill();

        // Main body
        ctx.beginPath();
        ctx.ellipse(0, 0, c.size * pulse, c.size * pulse * 0.6, 0, 0, Math.PI * 2);
        const bodyGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, c.size * pulse);
        bodyGrad.addColorStop(0, `rgba(20, ${60 + c.awake * 40}, ${80 + c.awake * 30}, ${0.3 + c.awake * 0.5})`);
        bodyGrad.addColorStop(1, `rgba(10, 30, 50, ${0.1 + c.awake * 0.3})`);
        ctx.fillStyle = bodyGrad;
        ctx.fill();

        // Tentacles
        for (let t = 0; t < c.tentacles; t++) {
            const tAngle = (t / c.tentacles) * Math.PI * 2 + time * 0.5;
            const tLen = c.size * (0.8 + c.awake * 0.5);
            ctx.beginPath();
            ctx.moveTo(Math.cos(tAngle) * c.size * 0.4, Math.sin(tAngle) * c.size * 0.3);
            const cx1 = Math.cos(tAngle + 0.3) * tLen * 0.6;
            const cy1 = Math.sin(tAngle + 0.3) * tLen * 0.4 + Math.sin(time * 2 + t) * 5;
            const ex = Math.cos(tAngle + Math.sin(time + t) * 0.3) * tLen;
            const ey = Math.sin(tAngle + Math.sin(time + t) * 0.3) * tLen * 0.5;
            ctx.quadraticCurveTo(cx1, cy1, ex, ey);
            ctx.strokeStyle = `rgba(30, ${80 + c.awake * 60}, ${100 + c.awake * 50}, ${0.3 + c.awake * 0.5})`;
            ctx.lineWidth = 2 + c.awake;
            ctx.stroke();
        }

        // Eyes
        const eyeSpacing = c.size * 0.25;
        const eyeSize = 4 + c.awake * 3;
        for (let e = -1; e <= 1; e += 2) {
            ctx.beginPath();
            ctx.arc(e * eyeSpacing, -c.size * 0.1, eyeSize, 0, Math.PI * 2);

            if (c.eyeGlow > 0.1) {
                const eyeGlowGrad = ctx.createRadialGradient(
                    e * eyeSpacing, -c.size * 0.1, 0,
                    e * eyeSpacing, -c.size * 0.1, eyeSize * 3
                );
                eyeGlowGrad.addColorStop(0, `rgba(255, ${100 - c.anger * 80}, ${50 - c.anger * 50}, ${c.eyeGlow})`);
                eyeGlowGrad.addColorStop(0.5, `rgba(255, ${60 - c.anger * 40}, 0, ${c.eyeGlow * 0.3})`);
                eyeGlowGrad.addColorStop(1, 'rgba(255, 0, 0, 0)');
                ctx.fillStyle = eyeGlowGrad;
                ctx.beginPath();
                ctx.arc(e * eyeSpacing, -c.size * 0.1, eyeSize * 3, 0, Math.PI * 2);
                ctx.fill();
            }

            // Eye core
            ctx.beginPath();
            ctx.arc(e * eyeSpacing, -c.size * 0.1, eyeSize * 0.6, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, ${150 - c.anger * 100}, ${50 - c.anger * 50}, ${0.2 + c.eyeGlow * 0.8})`;
            ctx.fill();

            // Pupil
            ctx.beginPath();
            ctx.arc(e * eyeSpacing, -c.size * 0.1, eyeSize * 0.25, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(20, 0, 0, ${0.5 + c.awake * 0.5})`;
            ctx.fill();
        }

        // Awakening indicator
        if (c.awake > 0.3) {
            ctx.beginPath();
            ctx.arc(0, -c.size * 0.8, 6, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, ${100 - c.anger * 80}, 50, ${c.awake * 0.7})`;
            ctx.fill();

            // Warning pulse
            const warnSize = 8 + Math.sin(time * 5) * 3;
            ctx.beginPath();
            ctx.arc(0, -c.size * 0.8, warnSize, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(255, 100, 50, ${c.awake * 0.4})`;
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }

        ctx.restore();
    });
}

function drawBubbles() {
    bubbles.forEach(b => {
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(100, 200, 255, ${b.life * 0.3})`;
        ctx.fill();
        ctx.strokeStyle = `rgba(150, 220, 255, ${b.life * 0.5})`;
        ctx.lineWidth = 0.5;
        ctx.stroke();
    });
}


function drawParticles() {
    particles.forEach(p => {
        ctx.save();
        ctx.globalAlpha = p.life;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);

        if (p.type === 'splash') {
            ctx.beginPath();
            ctx.arc(0, 0, p.size, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(150, 200, 255, 0.6)';
            ctx.fill();
        } else if (p.type === 'save') {
            ctx.beginPath();
            ctx.arc(0, 0, p.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 215, 0, 0.8)`;
            ctx.fill();
            // Star shape for save particles
            ctx.beginPath();
            for (let i = 0; i < 5; i++) {
                const a = (i * Math.PI * 2) / 5 - Math.PI / 2;
                const r = p.size * 0.8;
                if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
                else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
                const a2 = a + Math.PI / 5;
                ctx.lineTo(Math.cos(a2) * r * 0.4, Math.sin(a2) * r * 0.4);
            }
            ctx.closePath();
            ctx.fillStyle = 'rgba(255, 240, 100, 0.9)';
            ctx.fill();
        } else if (p.type === 'damage') {
            ctx.beginPath();
            ctx.arc(0, 0, p.size, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 80, 50, 0.7)';
            ctx.fill();
        } else if (p.type === 'wreck') {
            ctx.fillStyle = 'rgba(100, 60, 30, 0.8)';
            ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.5);
        }

        ctx.restore();
    });
}

function drawLightningOverlay() {
    if (lightningFlash > 0.01) {
        ctx.fillStyle = `rgba(220, 230, 255, ${lightningFlash * 0.3})`;
        ctx.fillRect(0, 0, W, H);

        // Lightning bolt
        if (lightningFlash > 0.5) {
            const lx = W * 0.3 + Math.random() * W * 0.5;
            ctx.beginPath();
            ctx.moveTo(lx, 0);
            let cy = 0;
            while (cy < H * 0.5) {
                cy += 20 + Math.random() * 30;
                ctx.lineTo(lx + (Math.random() - 0.5) * 40, cy);
            }
            ctx.strokeStyle = `rgba(200, 220, 255, ${lightningFlash})`;
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.strokeStyle = `rgba(255, 255, 255, ${lightningFlash * 0.5})`;
            ctx.lineWidth = 4;
            ctx.stroke();
        }
    }
}


function drawUI() {
    uiCtx.clearRect(0, 0, W, H);

    // Score
    uiCtx.font = '24px Georgia';
    uiCtx.fillStyle = '#ffd700';
    uiCtx.textAlign = 'left';
    uiCtx.shadowColor = 'rgba(255, 215, 0, 0.5)';
    uiCtx.shadowBlur = 10;
    uiCtx.fillText(`Ships Saved: ${score}`, 20, 40);

    // Wave indicator
    uiCtx.font = '18px Georgia';
    uiCtx.fillStyle = '#8899aa';
    uiCtx.shadowColor = 'rgba(100, 150, 200, 0.3)';
    uiCtx.shadowBlur = 5;
    uiCtx.fillText(`Wave ${wave}`, 20, 70);

    // Instructions hint (fades out)
    if (time < 10) {
        const alpha = Math.max(0, 1 - time / 8);
        uiCtx.font = '16px Georgia';
        uiCtx.fillStyle = `rgba(150, 180, 200, ${alpha})`;
        uiCtx.textAlign = 'center';
        uiCtx.shadowBlur = 0;
        uiCtx.fillText('Move your mouse to direct the lighthouse beam', W / 2, H - 40);
        uiCtx.fillText('Light up ships to guide them. Avoid waking the creatures!', W / 2, H - 18);
    }

    // Creature warning
    const awakeCreatures = creatures.filter(c => c.awake > 0.5).length;
    if (awakeCreatures > 0) {
        uiCtx.font = '16px Georgia';
        uiCtx.fillStyle = `rgba(255, 100, 80, ${0.6 + Math.sin(time * 4) * 0.4})`;
        uiCtx.textAlign = 'right';
        uiCtx.shadowColor = 'rgba(255, 50, 30, 0.5)';
        uiCtx.shadowBlur = 8;
        uiCtx.fillText(`${awakeCreatures} creature${awakeCreatures > 1 ? 's' : ''} awakened!`, W - 20, 40);
    }

    uiCtx.shadowBlur = 0;
}

// ==========================================
// GAME LOOP
// ==========================================
let lastTime = 0;

function gameLoop(timestamp) {
    if (!gameRunning) return;

    const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
    lastTime = timestamp;

    update(dt);
    render();

    requestAnimationFrame(gameLoop);
}

// ==========================================
// GAME CONTROLS
// ==========================================
function startGame() {
    startScreen.style.display = 'none';
    gameOverScreen.style.display = 'none';
    gameRunning = true;
    initGame();
    lastTime = performance.now();
    requestAnimationFrame(gameLoop);
}

function endGame() {
    gameRunning = false;
    finalScoreEl.textContent = score;
    gameOverScreen.style.display = 'flex';
}

startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);

// Prevent context menu
document.addEventListener('contextmenu', e => e.preventDefault());

// Handle window focus
document.addEventListener('visibilitychange', () => {
    if (!document.hidden && gameRunning) {
        lastTime = performance.now();
        requestAnimationFrame(gameLoop);
    }
});
