// ======= Small helpers =======
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => Math.random() * (b - a) + a;

// ======= Canvas / HiDPI =======
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
function resizeCanvas() {
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    const baseW = 1280, baseH = 720;
    canvas.width = baseW * dpr;
    canvas.height = baseH * dpr;
    canvas.style.width = 'min(100vw - 24px, 1080px)';
    canvas.style.height = 'auto';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// ======= HUD refs =======
const hudScore = document.getElementById('score');
const hudCoins = document.getElementById('coins');
const hudCoinTotal = document.getElementById('coinTotal');
const hudLives = document.getElementById('lives');
const hudFps = document.getElementById('fps');
const hudAmmo = document.getElementById('ammo');
const hudWorld = document.getElementById('world');

// ======= Input =======
const keys = new Set();
window.addEventListener('keydown', (e) => {
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "Space", "KeyA", "KeyD", "KeyW", "KeyF"].includes(e.code)) e.preventDefault();
    keys.add(e.code);
    if (e.code === 'KeyR') restart();
    if (e.code === 'KeyF') shoot();
});
window.addEventListener('keyup', (e) => keys.delete(e.code));

// ======= Game State =======
const CAMERA = { x: 0, y: 0 };
const GRAVITY = 2000;
const MOVE_SPEED = 360;
const JUMP_VELOCITY = -760;

const WORLD = { w: 3800, h: 720 };

const STATE = {
    running: false,
    gameOver: false,
    win: false,
    level: 1,
    maxLevel: 3,
    score: 0,
    coins: 0,
    coinTotal: 0,
    lives: 3,
    ammo: 0,
    dt: 0,
    entities: [],
    platforms: [],
    slopes: [], // reserved for future
    coinsList: [],
    enemies: [],
    bullets: [],
    flag: { x: 3200, y: 480, w: 24, h: 200 },
};

// ======= Entities =======
function rect(x, y, w, h) { return { x, y, w, h }; }

function makePlayer() {
    return {
        type: 'player',
        x: 100, y: 200, w: 42, h: 58,
        vx: 0, vy: 0,
        onGround: false,
        facing: 1,
        dead: false,
        runT: 0, // run animation timer
        blinkT: 0,
        jumpT: 0
    };
}

function makeEnemy(x, left, right, kind = 'walker') {
    return {
        type: 'enemy', x, y: 600 - 48, w: 40, h: 40,
        vx: kind === 'walker' ? 90 : 120, vy: 0, left, right, alive: true, kind
    };
}

function makeCoin(x, y, lucky = false) { return { x, y, r: 10, taken: false, lucky }; }
function makeBullet(x, y, dir) { return { x, y, r: 6, vx: 700 * dir, alive: true, life: 1.8 }; }

let player = makePlayer();

// ======= Levels =======
function buildLevel(level = 1) {
    const P = STATE.platforms = [];
    const C = STATE.coinsList = [];
    const E = STATE.enemies = [];
    STATE.bullets = [];
    STATE.flag = { x: 3200, y: 460, w: 24, h: 200 };
    WORLD.w = 3600 + level * 200;

    // ground (3 big strips)
    P.push(rect(0, 640, 1400, 120));
    P.push(rect(1400, 640, 1400, 120));
    P.push(rect(2800, 640, 1600, 120));

    if (level === 1) {
        // gentle intro platforms
        P.push(rect(280, 520, 220, 24));
        P.push(rect(560, 460, 180, 24));
        P.push(rect(820, 420, 200, 24));
        P.push(rect(1120, 520, 220, 24));
        P.push(rect(1460, 480, 200, 24));
        P.push(rect(1760, 420, 180, 24));
        P.push(rect(2060, 380, 180, 24));
        P.push(rect(2360, 340, 220, 24));
        P.push(rect(2660, 520, 220, 24));

        // coins (one lucky)
        const coinPos = [
            [320, 480], [360, 480], [400, 480],
            [600, 420], [640, 420],
            [860, 380], [900, 380],
            [1140, 480], [1180, 480],
            [1460, 440], [1500, 440],
            [1740, 380],
        ];
        const luckyIndex = 2; // deterministic for level 1
        coinPos.forEach(([x, y], i) => C.push(makeCoin(x, y, i === luckyIndex)));

        // enemies
        E.push(makeEnemy(700, 640, 980));
        E.push(makeEnemy(1600, 1540, 1880));
        E.push(makeEnemy(2500, 2460, 2760));

        STATE.flag = { x: 3200, y: 460, w: 24, h: 200 };
    } else if (level === 2) {
        // more verticality + moving gaps style
        P.push(rect(340, 540, 180, 24));
        P.push(rect(620, 500, 160, 24));
        P.push(rect(900, 460, 160, 24));
        P.push(rect(1180, 420, 180, 24));
        P.push(rect(1500, 380, 200, 24));
        P.push(rect(1840, 420, 180, 24));
        P.push(rect(2140, 460, 160, 24));
        P.push(rect(2440, 500, 160, 24));
        P.push(rect(2740, 540, 160, 24));
        P.push(rect(2920, 420, 220, 24));

        // coins
        const coinPos = [];
        for (let i = 0; i < 14; i++) coinPos.push([420 + i * 200, 360 + ((i % 2) ? 20 : -20)]);
        const luckyIndex = 8;
        coinPos.forEach(([x, y], i) => C.push(makeCoin(x, y, i === luckyIndex)));

        // enemies (faster)
        E.push(makeEnemy(520, 480, 760, 'runner'));
        E.push(makeEnemy(1320, 360, 1700, 'runner'));
        E.push(makeEnemy(2100, 440, 2500, 'runner'));
        E.push(makeEnemy(3000, 600, 3300, 'walker'));

        STATE.flag = { x: 3400, y: 460, w: 24, h: 200 };
    } else if (level === 3) {
        // tricky platforms
        P.push(rect(260, 560, 160, 20));
        P.push(rect(520, 520, 140, 20));
        P.push(rect(760, 480, 140, 20));
        P.push(rect(1000, 440, 140, 20));
        P.push(rect(1240, 400, 160, 20));
        P.push(rect(1500, 360, 140, 20));
        P.push(rect(1760, 400, 140, 20));
        P.push(rect(2020, 440, 160, 20));
        P.push(rect(2320, 500, 180, 24));
        P.push(rect(2640, 540, 180, 24));
        P.push(rect(2920, 500, 180, 24));
        P.push(rect(3180, 460, 200, 26));

        // coins (more)
        const coinPos = [];
        for (let i = 0; i < 18; i++) coinPos.push([300 + i * 160, 320 + Math.sin(i * 0.7) * 40]);
        // 2 lucky coins
        const luckySet = new Set([3, 13]);
        coinPos.forEach(([x, y], i) => C.push(makeCoin(x, y, luckySet.has(i))));

        // enemies dense
        E.push(makeEnemy(620, 520, 900, 'runner'));
        E.push(makeEnemy(1100, 580, 1400, 'walker'));
        E.push(makeEnemy(1700, 350, 2050, 'runner'));
        E.push(makeEnemy(2300, 500, 2600, 'walker'));
        E.push(makeEnemy(2900, 480, 3250, 'runner'));

        STATE.flag = { x: 3500, y: 460, w: 24, h: 200 };
    }

    STATE.coinTotal = C.length;
    hudCoinTotal.textContent = STATE.coinTotal;
}

// ======= Collision =======
function aabb(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function resolvePlayerVsPlatforms(p, dt) {
    p.onGround = false;
    // Horizontal
    p.x += p.vx * dt;
    for (const s of STATE.platforms) {
        if (aabb(p, s)) {
            if (p.vx > 0) p.x = s.x - p.w; else if (p.vx < 0) p.x = s.x + s.w;
            p.vx = 0;
        }
    }
    // Vertical
    p.vy += GRAVITY * dt;
    p.y += p.vy * dt;
    for (const s of STATE.platforms) {
        if (aabb(p, s)) {
            if (p.vy > 0) { p.y = s.y - p.h; p.vy = 0; p.onGround = true; p.jumpT = 0; }
            else if (p.vy < 0) { p.y = s.y + s.h; p.vy = 0; }
        }
    }
    // clamp world
    p.x = clamp(p.x, 0, WORLD.w - p.w);
    if (p.y > 2000 && !STATE.gameOver && !STATE.win) loseLife();
}

// ======= Shooting =======
function shoot() {
    if (!STATE.running || STATE.ammo <= 0) return;
    const dir = player.facing >= 0 ? 1 : -1;
    STATE.bullets.push(makeBullet(player.x + player.w / 2 + dir * 20, player.y + player.h * 0.55, dir));
    STATE.ammo--; updateHud();
}

// ======= Update =======
function update(dt) {
    // Input
    let move = 0;
    if (keys.has('ArrowLeft') || keys.has('KeyA')) move -= 1;
    if (keys.has('ArrowRight') || keys.has('KeyD')) move += 1;
    player.vx = move * MOVE_SPEED;
    if (move) player.facing = move;

    const wantJump = keys.has('Space') || keys.has('ArrowUp') || keys.has('KeyW');
    if (wantJump && player.onGround) {
        player.vy = JUMP_VELOCITY;
        player.onGround = false;
        player.jumpT = 0.2;
    }

    // Integrate and collide
    resolvePlayerVsPlatforms(player, dt);

    // Run animation timer
    if (Math.abs(player.vx) > 1 && player.onGround) player.runT += dt * 10;
    else player.runT = lerp(player.runT, 0, dt * 10);
    player.blinkT += dt;
    player.jumpT = Math.max(0, player.jumpT - dt);

    // Coins
    for (const c of STATE.coinsList) {
        if (!c.taken) {
            const dx = (player.x + player.w / 2) - c.x;
            const dy = (player.y + player.h / 2) - c.y;
            if (Math.hypot(dx, dy) < 28) {
                c.taken = true; STATE.coins++; STATE.score += c.lucky ? 250 : 100;
                if (c.lucky) STATE.ammo += 5; // Lucky coin reward
                updateHud();
            }
        }
    }

    // Enemies
    for (const e of STATE.enemies) {
        if (!e.alive) continue;
        e.x += e.vx * dt * (e.kind === 'runner' ? 1.2 : 1.0);
        if (e.x < e.left) { e.x = e.left; e.vx = Math.abs(e.vx); }
        if (e.x + e.w > e.right) { e.x = e.right - e.w; e.vx = -Math.abs(e.vx); }
        // ground stick
        e.vy += GRAVITY * dt; e.y += e.vy * dt;
        for (const s of STATE.platforms) {
            if (aabb(e, s)) {
                if (e.vy > 0) { e.y = s.y - e.h; e.vy = 0; }
            }
        }
        // Player vs enemy
        if (aabb(player, e)) {
            const isStomp = player.vy > 0 && (player.y + player.h) - e.y < 24;
            if (isStomp) { e.alive = false; STATE.score += 200; player.vy = -520; updateHud(); }
            else loseLife();
        }
    }

    // Bullets
    for (const b of STATE.bullets) {
        if (!b.alive) continue;
        b.x += b.vx * dt;
        b.life -= dt;
        if (b.life <= 0) b.alive = false;
        // hit platform walls (optional: let bullets pass)
        for (const s of STATE.platforms) {
            if (b.x > s.x - 4 && b.x < s.x + s.w + 4 && b.y > s.y - 200 && b.y < s.y + s.h + 40) {
                // minimal coarse cull – skip detailed hit with platforms
            }
        }
        // hit enemies
        for (const e of STATE.enemies) {
            if (!e.alive || !b.alive) continue;
            if (b.x > e.x && b.x < e.x + e.w && b.y > e.y && b.y < e.y + e.h) {
                e.alive = false; b.alive = false; STATE.score += 250; updateHud();
            }
        }
    }

    // Reached flag
    if (aabb(player, STATE.flag) && !STATE.win) {
        if (STATE.level < STATE.maxLevel) {
            STATE.level++;
            showOverlay(`✅ Level ${STATE.level - 1} Complete!`, `Score: ${STATE.score}\nCoins: ${STATE.coins}/${STATE.coinTotal}\nNext: Level ${STATE.level}`, true, "Next Level");
        } else {
            STATE.win = true; STATE.running = false; STATE.score += 500; updateHud();
            showOverlay("🏆 You Beat All Levels!", `Final Score: ${STATE.score}\nCoins: ${STATE.coins}/${STATE.coinTotal}`, true, "Play Again");
        }
    }

    // Camera
    CAMERA.x = clamp(player.x - 540, 0, WORLD.w - 1280 + 80);
    CAMERA.y = 0;
}

function loseLife() {
    if (STATE.gameOver || STATE.win) return;
    STATE.lives--; updateHud();
    if (STATE.lives < 0) {
        STATE.gameOver = true; STATE.running = false;
        showOverlay("💀 Game Over", `Score: ${STATE.score}\nCoins: ${STATE.coins}/${STATE.coinTotal}`, true, "Restart");
    } else {
        player = makePlayer();
    }
}

function updateHud() {
    hudScore.textContent = STATE.score;
    hudCoins.textContent = STATE.coins;
    hudLives.textContent = Math.max(0, STATE.lives);
    hudAmmo.textContent = STATE.ammo;
    hudWorld.textContent = `${STATE.level}-${STATE.level}`;
}

// ======= Render (Faux-3D & polish) =======
function draw() {
    const w = 1280, h = 720;
    ctx.clearRect(0, 0, w, h);

    // Sky gradient
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#66c5ff');
    sky.addColorStop(0.4, '#9dd7ff');
    sky.addColorStop(0.41, '#7ab3f0');
    sky.addColorStop(1, '#83b5ff');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);

    // Far parallax mountains
    ctx.save();
    const parX1 = -CAMERA.x * 0.15;
    drawMountains(parX1, 0.85);
    ctx.restore();

    // Clouds parallax
    ctx.save();
    const parX = -CAMERA.x * 0.25;
    for (let i = 0; i < 7; i++) {
        const x = (i * 420 + parX) % 1800 - 200;
        drawCloud(x, 120 + (i % 2) * 40, 1.0 - (i % 3) * 0.1);
    }
    ctx.restore();

    ctx.save();
    ctx.translate(-CAMERA.x, -CAMERA.y);

    // Ground with subtle perspective stripes
    drawGround(0, 640, WORLD.w, 120);

    // Platforms
    for (const s of STATE.platforms) drawPlatform3D(s);

    // Flag
    drawFlag(STATE.flag);

    // Coins
    for (const c of STATE.coinsList) if (!c.taken) drawCoin(c);

    // Enemies
    for (const e of STATE.enemies) if (e.alive) drawEnemy(e);

    // Bullets
    for (const b of STATE.bullets) if (b.alive) drawBullet(b);

    // Player
    drawPlayer(player);

    ctx.restore();
}

function drawGround(x, y, w, h) {
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, '#7fc35c');
    g.addColorStop(1, '#4f7e33');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
    // top highlight
    ctx.fillStyle = 'rgba(255,255,255,.1)';
    ctx.fillRect(x, y, w, 6);
    // perspective stripes
    ctx.save();
    ctx.globalAlpha = 0.15;
    for (let i = 0; i < 50; i++) {
        ctx.fillRect(x + i * 80, y + 16 + (i % 2) * 6, 50, 6);
    }
    ctx.restore();
}

function drawPlatform3D(s) {
    // top face
    const topGrad = ctx.createLinearGradient(0, s.y, 0, s.y + s.h);
    topGrad.addColorStop(0, '#ca9e7a');
    topGrad.addColorStop(1, '#9d7255');
    ctx.fillStyle = topGrad;
    roundRect(s.x, s.y, s.w, s.h, 8, true, false);

    // front face (faux depth)
    ctx.fillStyle = '#7a5a45';
    roundRect(s.x, s.y + s.h - 8, s.w, 16, 6, true, false);

    // studs
    ctx.fillStyle = 'rgba(0,0,0,.18)';
    for (let x = s.x + 10; x < s.x + s.w; x += 32) ctx.fillRect(x, s.y + 6, 14, 3);

    // shadow
    ctx.fillStyle = 'rgba(0,0,0,.18)';
    ctx.fillRect(s.x, s.y + s.h + 2, s.w, 6);
}

function roundRect(x, y, w, h, r, fill, stroke) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
}

function drawCoin(c) {
    ctx.save();
    ctx.translate(c.x, c.y);
    const t = performance.now() / 400;
    const bob = Math.sin(t + c.x * 0.01) * 4;
    ctx.translate(0, bob);
    // glow
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = c.lucky ? '#ffd166' : '#ffd54f';
    ctx.beginPath(); ctx.arc(0, 0, c.r + 8, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;

    // coin body
    const grad = ctx.createRadialGradient(-4, -6, 4, 0, 0, c.r);
    grad.addColorStop(0, c.lucky ? '#ffe28a' : '#ffe082');
    grad.addColorStop(1, c.lucky ? '#f9a72b' : '#f9a825');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(0, 0, c.r, 0, Math.PI * 2); ctx.fill();

    // edge
    ctx.lineWidth = 2; ctx.strokeStyle = '#b2781e'; ctx.stroke();

    // shine
    ctx.fillStyle = 'rgba(255,255,255,.65)';
    ctx.fillRect(-2, -c.r + 4, 4, c.r * 1.2);

    // star mark for lucky
    if (c.lucky) {
        ctx.fillStyle = '#fff';
        drawStar(-1, 0, 5, 5, 2.5);
    }
    ctx.restore();
}

function drawStar(x, y, spikes, outerR, innerR) {
    let rot = Math.PI / 2 * 3;
    let cx = x, cy = y;
    ctx.beginPath();
    ctx.moveTo(cx, cy - outerR);
    for (let i = 0; i < spikes; i++) {
        let x1 = cx + Math.cos(rot) * outerR;
        let y1 = cy + Math.sin(rot) * outerR;
        ctx.lineTo(x1, y1);
        rot += Math.PI / spikes;
        x1 = cx + Math.cos(rot) * innerR;
        y1 = cy + Math.sin(rot) * innerR;
        ctx.lineTo(x1, y1);
        rot += Math.PI / spikes;
    }
    ctx.lineTo(cx, cy - outerR);
    ctx.closePath();
    ctx.fill();
}

function drawEnemy(e) {
    ctx.save(); ctx.translate(e.x, e.y);
    // shadow
    ctx.fillStyle = 'rgba(0,0,0,.25)';
    ctx.beginPath(); ctx.ellipse(e.w / 2, e.h, e.w * 0.6, 6, 0, 0, Math.PI * 2); ctx.fill();

    // body (rounded)
    const g = ctx.createLinearGradient(0, 0, 0, e.h);
    g.addColorStop(0, '#ff7b7b');
    g.addColorStop(1, '#d94545');
    ctx.fillStyle = g;
    roundRect(0, 0, e.w, e.h, 8, true, false);

    // eyes
    ctx.fillStyle = '#fff';
    roundRect(8, 10, 10, 12, 3, true, false);
    roundRect(e.w - 18, 10, 10, 12, 3, true, false);
    ctx.fillStyle = '#000';
    ctx.fillRect(12, 14, 4, 6);
    ctx.fillRect(e.w - 14, 14, 4, 6);

    // feet
    ctx.fillStyle = '#8a1c1c';
    roundRect(4, e.h - 8, 14, 8, 3, true, false);
    roundRect(e.w - 18, e.h - 8, 14, 8, 3, true, false);
    ctx.restore();
}

function drawBullet(b) {
    ctx.save(); ctx.translate(b.x, b.y);
    // glow
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = '#ffd166';
    ctx.beginPath(); ctx.arc(0, 0, b.r + 6, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    // core
    const g = ctx.createRadialGradient(-2, -2, 1, 0, 0, b.r);
    g.addColorStop(0, '#fff7cc');
    g.addColorStop(1, '#f3b83b');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, b.r, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
}
// ======= Player drawing (side-profile with arms/legs, flips when facing left) =======
function drawPlayer(p) {
    ctx.save();
    ctx.translate(p.x, p.y);

    // flip horizontally if facing left
    const faceRight = p.facing >= 0;
    if (!faceRight) {
        ctx.translate(p.w / 2, 0);
        ctx.scale(-1, 1);
        ctx.translate(-p.w / 2, 0);
    }

    const runPhase = Math.sin(p.runT) * (Math.abs(p.vx) > 1 ? 1 : 0);

    // === Determine state ===
    const isJumping = p.jumpT > 0;
    const isCrouching = keys.has('ArrowDown') || keys.has('KeyS');

    // === Head ===
    ctx.save();
    ctx.translate(p.w / 2, 10);
    ctx.fillStyle = "#fcd7b6"; // skin
    ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI * 2); ctx.fill();

    // nose
    ctx.beginPath(); ctx.arc(5, 2, 4, 0, Math.PI * 2); ctx.fill();

    // mustache
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.ellipse(3, 6, 8, 3, 0, 0, Math.PI);
    ctx.fill();

    // eyes
    ctx.fillStyle = "#fff"; ctx.beginPath();
    ctx.arc(-4, -2, 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#000"; ctx.beginPath();
    ctx.arc(-4, -2, 1.5, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = "#fff"; ctx.beginPath();
    ctx.arc(0, -2, 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#000"; ctx.beginPath();
    ctx.arc(0, -2, 1.5, 0, Math.PI * 2); ctx.fill();

    // cap
    ctx.fillStyle = "#b91c1c";
    ctx.beginPath();
    ctx.arc(0, -6, 13, Math.PI, 2 * Math.PI);
    ctx.fill();
    ctx.fillRect(-12, -6, 24, 4);

    // M logo
    ctx.fillStyle = "#fff";
    ctx.font = "bold 6px sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("M", 0, -8);
    ctx.restore();

    // === Torso ===
    ctx.save();
    ctx.translate(p.w / 2, 28);

    if (isCrouching) {
        ctx.fillStyle = "#1d4ed8"; // overalls crouch
        roundRect(-12, 0, 24, 18, 6, true, false); // shorter torso
    } else {
        ctx.fillStyle = "#1d4ed8"; // overalls normal
        roundRect(-12, 0, 24, 30, 6, true, false);
    }

    if (!isCrouching) {
        // straps & buttons only if not crouching
        ctx.fillRect(-10, -12, 6, 14);
        ctx.fillRect(4, -12, 6, 14);
        ctx.fillStyle = "gold";
        ctx.beginPath(); ctx.arc(-7, -4, 3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(7, -4, 3, 0, Math.PI * 2); ctx.fill();
    }

    ctx.restore();

    // === Arms ===
    if (!isCrouching) {
        const armSwing = runPhase * 0.5;
        function drawArm(offsetX, swingDir) {
            ctx.save();
            ctx.translate(p.w / 2 + offsetX, 30);
            if (!isJumping) ctx.rotate(armSwing * swingDir);
            ctx.fillStyle = "#dc2626"; // red shirt sleeve
            ctx.fillRect(-3, 0, 8, 20);
            ctx.fillStyle = "#fff"; // glove
            ctx.beginPath(); ctx.arc(1, 20, 6, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        }
        drawArm(-14, 1);
        drawArm(14, -1);
    }

    // === Legs ===
    const legSwing = runPhase * 0.6;
    function drawLeg(offsetX, swingDir) {
        ctx.save();
        ctx.translate(p.w / 2 + offsetX, isCrouching ? 48 : 58);
        if (!isJumping && !isCrouching) ctx.rotate(legSwing * swingDir);
        ctx.fillStyle = "#1d4ed8"; // pants
        ctx.fillRect(-3, 0, 10, isCrouching ? 12 : 20);
        ctx.fillStyle = "#7f1d1d"; // shoes
        ctx.beginPath(); ctx.ellipse(2, isCrouching ? 12 : 20, 10, 6, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    }
    drawLeg(-8, 1);
    drawLeg(8, -1);

    ctx.restore();
}


function drawFlag(f) {
    ctx.save();
    ctx.fillStyle = '#cfd8dc'; ctx.fillRect(f.x, f.y - 20, 6, f.h + 20);
    ctx.fillStyle = '#ffd166'; ctx.beginPath(); ctx.arc(f.x + 3, f.y - 20, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#00c853';
    const wave = Math.sin(performance.now() / 300) * 6;
    ctx.beginPath();
    ctx.moveTo(f.x + 6, f.y);
    ctx.quadraticCurveTo(f.x + 40 + wave, f.y + 10, f.x + 70 + wave, f.y + 18);
    ctx.lineTo(f.x + 6, f.y + 36);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,.15)';
    ctx.fillRect(f.x - 4, f.y + f.h, 24, 6);
    ctx.restore();
}

function drawCloud(x, y, scale) {
    ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
    ctx.fillStyle = 'rgba(255,255,255,.9)';
    const p = [[0, 10, 30, 20], [20, 0, 40, 30], [50, 12, 36, 22], [24, 18, 60, 24]];
    for (const r of p) { ctx.beginPath(); ctx.ellipse(r[0], r[1], r[2], r[3], 0, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
}

function drawMountains(offsetX, scaleY) {
    ctx.save(); ctx.translate(offsetX, 0); ctx.globalAlpha = 0.5;
    const baseY = 560;
    drawMountain(100, baseY, 220, scaleY);
    drawMountain(520, baseY + 10, 260, scaleY);
    drawMountain(980, baseY - 6, 240, scaleY);
    drawMountain(1380, baseY + 4, 280, scaleY);
    drawMountain(1800, baseY - 10, 240, scaleY);
    drawMountain(2200, baseY + 6, 260, scaleY);
    drawMountain(2600, baseY - 8, 280, scaleY);
    ctx.restore();
}
function drawMountain(x, baseY, width, scaleY) {
    const height = width * 0.8 * scaleY;
    const grad = ctx.createLinearGradient(0, baseY - height, 0, baseY);
    grad.addColorStop(0, '#b6c7de'); grad.addColorStop(1, '#7ea0c9');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(x - width / 2, baseY);
    ctx.lineTo(x, baseY - height);
    ctx.lineTo(x + width / 2, baseY);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.8)';
    ctx.beginPath();
    ctx.moveTo(x, baseY - height);
    ctx.lineTo(x - width * 0.12, baseY - height + 24);
    ctx.lineTo(x + width * 0.12, baseY - height + 24);
    ctx.closePath(); ctx.fill();
}

// ======= Loop =======
let last = performance.now();
function loop(now) {
    const dt = Math.min(1 / 30, (now - last) / 1000);
    last = now; STATE.dt = dt; hudFps.textContent = (1 / dt | 0);
    if (STATE.running) update(dt);
    draw();
    requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// ======= Overlay / Start & Restart =======
const overlay = document.getElementById('overlay');

function hideOverlay() { overlay.style.display = 'none'; }
function showOverlay(title, subtitle, showRestart, buttonLabel = "Start Game") {
    overlay.style.display = 'grid';
    const card = overlay.querySelector('.card');
    card.innerHTML = `
    <h1>${title}</h1>
    <p>${subtitle.replace(/\n/g, '<br>')}</p>
    <div class="row">${showRestart ? '<button id="restartBtn">' + buttonLabel + '</button>' : '<button id="play">Start Game</button>'}</div>
    <p class="footer">Controls: ← → move · Space / W / ↑ jump · F shoot · R restart</p>
  `;
    const r = document.getElementById('restartBtn');
    if (r) r.addEventListener('click', () => {
        hideOverlay();
        if (STATE.gameOver || STATE.win) start(); else nextLevel();
    });
    const p = document.getElementById('play');
    if (p) p.addEventListener('click', () => { hideOverlay(); start(); });
}

// start/next/restart
function start() {
    STATE.running = true; STATE.gameOver = false; STATE.win = false;
    STATE.score = 0; STATE.coins = 0; STATE.lives = 3; STATE.ammo = 0;
    STATE.level = 1;
    player = makePlayer();
    buildLevel(STATE.level);
    updateHud();
}

function nextLevel() {
    if (STATE.level > STATE.maxLevel) { start(); return; }
    STATE.running = true; STATE.gameOver = false; STATE.win = false;
    STATE.coins = 0;
    player = makePlayer();
    buildLevel(STATE.level);
    updateHud();
}

function restart() {
    STATE.gameOver = false; STATE.win = false; STATE.running = true;
    player = makePlayer(); buildLevel(STATE.level); updateHud();
}

// initial wiring for original overlay buttons
const initialPlay = document.getElementById('play');
if (initialPlay) initialPlay.addEventListener('click', () => { hideOverlay(); start(); });
const initialHow = document.getElementById('how');
if (initialHow) initialHow.addEventListener('click', () => {
    showOverlay('🎯 Controls', '← → move\nSpace / W / ↑ jump\nF shoot (need ammo from Lucky Coin)\nR restart', false);
});
