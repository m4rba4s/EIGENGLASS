/* ============================================================
   AXIOM Engine — Core Rendering & Math Engine (JavaScript)
   ============================================================
   This is the interactive front-end that mirrors the C++ backend
   concepts: matrix transforms, eigenanalysis, vector fields.
   All math here is educational-grade and mirrors the SIMD backend.
   ============================================================ */

(function () {
    'use strict';

    // ─── DOM References ───
    const canvas = document.getElementById('main-canvas');
    const webglCanvas = document.getElementById('webgl-canvas');
    const ctx = canvas.getContext('2d');

    const mInputs = {
        m00: document.getElementById('m00'),
        m01: document.getElementById('m01'),
        m10: document.getElementById('m10'),
        m11: document.getElementById('m11'),
    };

    const m3dInputs = {
        m00: document.getElementById('m3d00'), m01: document.getElementById('m3d01'), m02: document.getElementById('m3d02'),
        m10: document.getElementById('m3d10'), m11: document.getElementById('m3d11'), m12: document.getElementById('m3d12'),
        m20: document.getElementById('m3d20'), m21: document.getElementById('m3d21'), m22: document.getElementById('m3d22'),
    };

    const detValue = document.getElementById('det-value');
    const traceValue = document.getElementById('trace-value');
    const singularityWarning = document.getElementById('singularity-warning');

    const eigenVal1 = document.getElementById('eigen-val1');
    const eigenVal2 = document.getElementById('eigen-val2');
    const eigenVec1 = document.getElementById('eigen-vec1');
    const eigenVec2 = document.getElementById('eigen-vec2');

    const propType = document.getElementById('prop-type');
    const propArea = document.getElementById('prop-area');
    const propOrient = document.getElementById('prop-orient');

    const hudFps = document.getElementById('hud-fps');
    const hudPoints = document.getElementById('hud-points');
    const hudFrame = document.getElementById('hud-frame');

    const sliderT = document.getElementById('slider-t');
    const sliderTValue = document.getElementById('slider-t-value');

    const btnAnimate = document.getElementById('btn-animate');
    const btnReset = document.getElementById('btn-reset');

    const coordTooltip = document.getElementById('coord-tooltip');

    const formulaDx = document.getElementById('formula-dx');
    const formulaDy = document.getElementById('formula-dy');

    const sectionMatrix = document.getElementById('section-matrix');
    const sectionFormula = document.getElementById('section-formula');
    const sectionMatrix3d = document.getElementById('section-matrix-3d');
    const sectionAttractor = document.getElementById('section-attractor');

    const attrInputs = {
        sigma: document.getElementById('attr-sigma'),
        rho: document.getElementById('attr-rho'),
        beta: document.getElementById('attr-beta'),
        dt: document.getElementById('attr-dt')
    };

    // ─── State ───
    let currentMode = 'transform'; // 'transform' | 'field' | 'eigen'
    let animating = false;
    let animT = 1.0;
    let animDir = 1;
    let frameCount = 0;
    let lastFpsTime = performance.now();
    let fps = 60;
    let dpr = 1;

    // Grid configuration
    const GRID_RANGE = 6;
    const GRID_STEP = 0.5;

    // Interaction State
    let draggingVector = null; // 'i' or 'j'
    let nanPoisoned = false;

    // Vector field particles
    let fieldParticles = [];
    const NUM_FIELD_PARTICLES = 800;

    // Attractor State
    const MAX_ATTRACTOR_POINTS = 10000;
    let attractorPoints = [];
    let attractorPos = {x: 0.1, y: 0, z: 0};

    // ─── Attractor (RK4 Integrator) ───
    function lorenzDeriv(p, sigma, rho, beta) {
        return {
            x: sigma * (p.y - p.x),
            y: p.x * (rho - p.z) - p.y,
            z: p.x * p.y - beta * p.z
        };
    }

    function stepRK4() {
        const sigma = parseFloat(attrInputs.sigma.value) || 10;
        const rho = parseFloat(attrInputs.rho.value) || 28;
        const beta = parseFloat(attrInputs.beta.value) || 2.666;
        const dt = parseFloat(attrInputs.dt.value) || 0.01;

        const p = attractorPos;

        const k1 = lorenzDeriv(p, sigma, rho, beta);
        
        const p2 = { x: p.x + k1.x * dt/2, y: p.y + k1.y * dt/2, z: p.z + k1.z * dt/2 };
        const k2 = lorenzDeriv(p2, sigma, rho, beta);

        const p3 = { x: p.x + k2.x * dt/2, y: p.y + k2.y * dt/2, z: p.z + k2.z * dt/2 };
        const k3 = lorenzDeriv(p3, sigma, rho, beta);

        const p4 = { x: p.x + k3.x * dt, y: p.y + k3.y * dt, z: p.z + k3.z * dt };
        const k4 = lorenzDeriv(p4, sigma, rho, beta);

        attractorPos.x += (dt / 6) * (k1.x + 2*k2.x + 2*k3.x + k4.x);
        attractorPos.y += (dt / 6) * (k1.y + 2*k2.y + 2*k3.y + k4.y);
        attractorPos.z += (dt / 6) * (k1.z + 2*k2.z + 2*k3.z + k4.z);

        attractorPoints.push(attractorPos.x, attractorPos.y, attractorPos.z);
        if (attractorPoints.length > MAX_ATTRACTOR_POINTS * 3) {
            // Remove oldest point (3 coordinates)
            attractorPoints.splice(0, 3);
        }
    }

    function resetAttractor() {
        attractorPoints = [];
        attractorPos = {x: 0.1, y: 0.1, z: 0.1}; // Slightly offset to avoid origin trap
    }

    // ─── Math Functions ───
    function getMatrix() {
        return [
            parseFloat(mInputs.m00.value) || 0,
            parseFloat(mInputs.m01.value) || 0,
            parseFloat(mInputs.m10.value) || 0,
            parseFloat(mInputs.m11.value) || 0,
        ];
    }

    function getMatrix3D() {
        return [
            parseFloat(m3dInputs.m00.value) || 0, parseFloat(m3dInputs.m01.value) || 0, parseFloat(m3dInputs.m02.value) || 0,
            parseFloat(m3dInputs.m10.value) || 0, parseFloat(m3dInputs.m11.value) || 0, parseFloat(m3dInputs.m12.value) || 0,
            parseFloat(m3dInputs.m20.value) || 0, parseFloat(m3dInputs.m21.value) || 0, parseFloat(m3dInputs.m22.value) || 0,
        ];
    }

    function setMatrix(a, b, c, d) {
        mInputs.m00.value = a;
        mInputs.m01.value = b;
        mInputs.m10.value = c;
        mInputs.m11.value = d;
        updateMatrixInfo();
    }

    function det2x2(m) {
        return m[0] * m[3] - m[1] * m[2];
    }

    function trace2x2(m) {
        return m[0] + m[3];
    }

    function transformPoint(m, x, y) {
        return [m[0] * x + m[1] * y, m[2] * x + m[3] * y];
    }

    // Eigenvalues of 2x2: λ = (trace ± sqrt(trace² - 4·det)) / 2
    function eigenvalues2x2(m) {
        const tr = trace2x2(m);
        const d = det2x2(m);
        const disc = tr * tr - 4 * d;

        if (disc >= 0) {
            const sqrtDisc = Math.sqrt(disc);
            return {
                real: true,
                l1: (tr + sqrtDisc) / 2,
                l2: (tr - sqrtDisc) / 2,
                l1i: 0, l2i: 0
            };
        } else {
            const sqrtDisc = Math.sqrt(-disc);
            return {
                real: false,
                l1: tr / 2,
                l2: tr / 2,
                l1i: sqrtDisc / 2,
                l2i: -sqrtDisc / 2
            };
        }
    }

    // Eigenvector for eigenvalue λ: (A - λI)v = 0
    function eigenvector2x2(m, lambda) {
        // Try first row: (a - λ)v1 + b·v2 = 0 => v = [b, λ - a] or [-b, a - λ]
        const a = m[0] - lambda;
        const b = m[1];

        if (Math.abs(b) > 1e-10) {
            const len = Math.sqrt(b * b + a * a);
            return [b / len, -a / len];
        }
        // Try second row
        const c = m[2];
        const d = m[3] - lambda;
        if (Math.abs(c) > 1e-10) {
            const len = Math.sqrt(d * d + c * c);
            return [-d / len, c / len];
        }
        return [1, 0]; // fallback (identity-like)
    }

    // ─── Simple expression evaluator for vector fields ───
    function makeFieldFunc(expr) {
        try {
            // Sanitize: only allow math operations and variables x, y, t
            const sanitized = expr.replace(/[^0-9xy t+\-*/().^sincotaqrlgepMPI]/g, '');
            const jsExpr = sanitized
                .replace(/\^/g, '**')
                .replace(/sin/g, 'Math.sin')
                .replace(/cos/g, 'Math.cos')
                .replace(/tan/g, 'Math.tan')
                .replace(/sqrt/g, 'Math.sqrt')
                .replace(/log/g, 'Math.log')
                .replace(/PI/g, 'Math.PI')
                .replace(/exp/g, 'Math.exp');
            return new Function('x', 'y', 't', `"use strict"; try { return ${jsExpr}; } catch(e) { return 0; }`);
        } catch {
            return () => 0;
        }
    }

    // ─── Canvas Setup ───
    function resizeCanvas() {
        const container = document.getElementById('canvas-container');
        const rect = container.getBoundingClientRect();
        dpr = window.devicePixelRatio || 1;
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        canvas.style.width = rect.width + 'px';
        canvas.style.height = rect.height + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function worldToScreen(x, y) {
        const w = canvas.width / dpr;
        const h = canvas.height / dpr;
        const scale = Math.min(w, h) / (GRID_RANGE * 2 + 2);
        return [w / 2 + x * scale, h / 2 - y * scale];
    }

    function screenToWorld(sx, sy) {
        const w = canvas.width / dpr;
        const h = canvas.height / dpr;
        const scale = Math.min(w, h) / (GRID_RANGE * 2 + 2);
        return [(sx - w / 2) / scale, (h / 2 - sy) / scale];
    }

    function getScale() {
        const w = canvas.width / dpr;
        const h = canvas.height / dpr;
        return Math.min(w, h) / (GRID_RANGE * 2 + 2);
    }

    // ─── Drawing Primitives ───
    function drawLine(x1, y1, x2, y2, color, width = 1) {
        const [sx1, sy1] = worldToScreen(x1, y1);
        const [sx2, sy2] = worldToScreen(x2, y2);
        ctx.beginPath();
        ctx.moveTo(sx1, sy1);
        ctx.lineTo(sx2, sy2);
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.stroke();
    }

    function drawCircle(x, y, r, color) {
        const [sx, sy] = worldToScreen(x, y);
        ctx.beginPath();
        ctx.arc(sx, sy, r, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
    }

    function drawArrow(x1, y1, x2, y2, color, width = 2, headLen = 8) {
        const [sx1, sy1] = worldToScreen(x1, y1);
        const [sx2, sy2] = worldToScreen(x2, y2);
        const angle = Math.atan2(sy2 - sy1, sx2 - sx1);

        ctx.beginPath();
        ctx.moveTo(sx1, sy1);
        ctx.lineTo(sx2, sy2);
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(sx2, sy2);
        ctx.lineTo(sx2 - headLen * Math.cos(angle - 0.4), sy2 - headLen * Math.sin(angle - 0.4));
        ctx.lineTo(sx2 - headLen * Math.cos(angle + 0.4), sy2 - headLen * Math.sin(angle + 0.4));
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
    }

    // ─── Grid Drawing ───
    function drawGrid() {
        const w = canvas.width / dpr;
        const h = canvas.height / dpr;

        // Background subtle gradient
        const grad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) / 2);
        grad.addColorStop(0, '#0d1321');
        grad.addColorStop(1, '#080c14');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        // Grid lines (untransformed)
        for (let i = -GRID_RANGE; i <= GRID_RANGE; i++) {
            const alpha = (i === 0) ? 0.25 : 0.07;
            const color = `rgba(100, 140, 200, ${alpha})`;
            drawLine(i, -GRID_RANGE, i, GRID_RANGE, color, i === 0 ? 1.5 : 0.5);
            drawLine(-GRID_RANGE, i, GRID_RANGE, i, color, i === 0 ? 1.5 : 0.5);
        }

        // Axis labels
        ctx.font = '10px "JetBrains Mono"';
        ctx.fillStyle = 'rgba(100, 140, 200, 0.4)';
        const [xLabelX, xLabelY] = worldToScreen(GRID_RANGE + 0.3, 0);
        const [yLabelX, yLabelY] = worldToScreen(0, GRID_RANGE + 0.3);
        ctx.fillText('x', xLabelX, xLabelY + 4);
        ctx.fillText('y', yLabelX - 4, yLabelY);
    }

    // ─── Transform Mode ───
    function drawTransformMode() {
        const m = getMatrix();
        const t = animating ? animT : parseFloat(sliderT.value);

        const hasNaN = isNaN(m[0]) || isNaN(m[1]) || isNaN(m[2]) || isNaN(m[3]);
        if (hasNaN) nanPoisoned = true;

        if (nanPoisoned) {
            // NaN Poison Glitch Effect
            const w = canvas.width / dpr;
            const h = canvas.height / dpr;
            ctx.fillStyle = `rgba(239, 68, 68, ${0.1 + Math.random() * 0.2})`;
            ctx.fillRect(0, 0, w, h);
            ctx.font = 'bold 24px "JetBrains Mono"';
            ctx.fillStyle = '#fca5a5';
            for(let i=0; i<30; i++) {
                ctx.fillText('NaN', Math.random()*w, Math.random()*h);
            }
            return;
        }

        const d = det2x2(m);
        const isSingular = Math.abs(d) < 1e-6;
        let glitchX = 0, glitchY = 0;
        
        if (isSingular) {
            // Singularity Collapse Effect (Screen Shake)
            glitchX = (Math.random() - 0.5) * 4;
            glitchY = (Math.random() - 0.5) * 4;
        }

        // Interpolated matrix: I + t*(M - I)
        const mt = [
            1 + t * (m[0] - 1),
            t * m[1],
            t * m[2],
            1 + t * (m[3] - 1),
        ];

        let pointCount = 0;

        // Draw transformed grid
        for (let i = -GRID_RANGE; i <= GRID_RANGE; i += GRID_STEP) {
            // Vertical lines
            const pts = [];
            for (let j = -GRID_RANGE; j <= GRID_RANGE; j += 0.25) {
                const pt = transformPoint(mt, i, j);
                pts.push([pt[0] + (isSingular ? (Math.random()-0.5)*0.1 : 0), pt[1] + (isSingular ? (Math.random()-0.5)*0.1 : 0)]);
            }
            for (let k = 0; k < pts.length - 1; k++) {
                const hue = ((i + GRID_RANGE) / (GRID_RANGE * 2)) * 60 + 180;
                const [sx1, sy1] = worldToScreen(pts[k][0], pts[k][1]);
                const [sx2, sy2] = worldToScreen(pts[k+1][0], pts[k+1][1]);
                ctx.beginPath();
                ctx.moveTo(sx1 + glitchX, sy1 + glitchY);
                ctx.lineTo(sx2 + glitchX, sy2 + glitchY);
                ctx.strokeStyle = `hsla(${hue}, 70%, 55%, 0.35)`;
                ctx.lineWidth = 0.8;
                ctx.stroke();
            }

            // Horizontal lines
            const pts2 = [];
            for (let j = -GRID_RANGE; j <= GRID_RANGE; j += 0.25) {
                const pt = transformPoint(mt, j, i);
                pts2.push([pt[0] + (isSingular ? (Math.random()-0.5)*0.1 : 0), pt[1] + (isSingular ? (Math.random()-0.5)*0.1 : 0)]);
            }
            for (let k = 0; k < pts2.length - 1; k++) {
                const hue = ((i + GRID_RANGE) / (GRID_RANGE * 2)) * 60 + 260;
                const [sx1, sy1] = worldToScreen(pts2[k][0], pts2[k][1]);
                const [sx2, sy2] = worldToScreen(pts2[k+1][0], pts2[k+1][1]);
                ctx.beginPath();
                ctx.moveTo(sx1 + glitchX, sy1 + glitchY);
                ctx.lineTo(sx2 + glitchX, sy2 + glitchY);
                ctx.strokeStyle = `hsla(${hue}, 70%, 55%, 0.35)`;
                ctx.lineWidth = 0.8;
                ctx.stroke();
            }
        }

        // Draw grid dots at intersections
        for (let i = -GRID_RANGE; i <= GRID_RANGE; i += 1) {
            for (let j = -GRID_RANGE; j <= GRID_RANGE; j += 1) {
                const [tx, ty] = transformPoint(mt, i, j);
                const dist = Math.sqrt(tx * tx + ty * ty);
                const hue = (dist / GRID_RANGE) * 120 + 180;
                const [sx, sy] = worldToScreen(tx, ty);
                ctx.beginPath();
                ctx.arc(sx + glitchX, sy + glitchY, 2.5, 0, Math.PI * 2);
                ctx.fillStyle = `hsla(${hue}, 80%, 60%, 0.7)`;
                ctx.fill();
                pointCount++;
            }
        }

        // Basis vectors (thick, bright)
        const [ix, iy] = transformPoint(mt, 1, 0);
        const [jx, jy] = transformPoint(mt, 0, 1);

        // Custom draw arrow to include glitch
        const drawArrowGlitch = (x, y, color, label) => {
            const [sx, sy] = worldToScreen(x, y);
            const [ox, oy] = worldToScreen(0, 0);
            const gx = sx + glitchX;
            const gy = sy + glitchY;
            const gox = ox + glitchX;
            const goy = oy + glitchY;
            
            const angle = Math.atan2(gy - goy, gx - gox);
            const headLen = 12;

            ctx.beginPath();
            ctx.moveTo(gox, goy);
            ctx.lineTo(gx, gy);
            ctx.strokeStyle = color;
            ctx.lineWidth = 3;
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(gx, gy);
            ctx.lineTo(gx - headLen * Math.cos(angle - 0.4), gy - headLen * Math.sin(angle - 0.4));
            ctx.lineTo(gx - headLen * Math.cos(angle + 0.4), gy - headLen * Math.sin(angle + 0.4));
            ctx.closePath();
            ctx.fillStyle = color;
            ctx.fill();

            // Hover circle highlight
            if (!animating && t === 1.0) {
                ctx.beginPath();
                ctx.arc(gx, gy, 8, 0, Math.PI*2);
                ctx.strokeStyle = 'rgba(255,255,255,0.4)';
                ctx.lineWidth = 1;
                ctx.stroke();
            }

            ctx.font = 'bold 13px "JetBrains Mono"';
            ctx.fillText(label, gx + 8, gy - 8);
        };

        drawArrowGlitch(ix, iy, draggingVector === 'i' ? '#fca5a5' : '#ef4444', 'î');
        drawArrowGlitch(jx, jy, draggingVector === 'j' ? '#67e8f9' : '#22d3ee', 'ĵ');

        // Origin marker
        const [ox, oy] = worldToScreen(0, 0);
        ctx.beginPath(); ctx.arc(ox + glitchX, oy + glitchY, 5, 0, Math.PI*2); ctx.fillStyle = '#ffffff'; ctx.fill();
        ctx.beginPath(); ctx.arc(ox + glitchX, oy + glitchY, 3, 0, Math.PI*2); ctx.fillStyle = '#0a0e17'; ctx.fill();

        hudPoints.textContent = pointCount;
    }

    // ─── Eigen Mode ───
    function drawEigenMode() {
        drawTransformMode(); // draw the transform first

        const m = getMatrix();
        const eig = eigenvalues2x2(m);

        if (eig.real) {
            const v1 = eigenvector2x2(m, eig.l1);
            const v2 = eigenvector2x2(m, eig.l2);
            const len = GRID_RANGE;

            // Draw eigenvector lines (extended)
            drawLine(-v1[0] * len, -v1[1] * len, v1[0] * len, v1[1] * len,
                'rgba(245, 158, 11, 0.5)', 2);
            drawLine(-v2[0] * len, -v2[1] * len, v2[0] * len, v2[1] * len,
                'rgba(139, 92, 246, 0.5)', 2);

            // Draw eigenvector arrows
            drawArrow(0, 0, v1[0] * 2, v1[1] * 2, '#f59e0b', 3, 12);
            drawArrow(0, 0, v2[0] * 2, v2[1] * 2, '#8b5cf6', 3, 12);

            // Labels
            const [v1sx, v1sy] = worldToScreen(v1[0] * 2.3, v1[1] * 2.3);
            const [v2sx, v2sy] = worldToScreen(v2[0] * 2.3, v2[1] * 2.3);
            ctx.font = 'bold 12px "JetBrains Mono"';
            ctx.fillStyle = '#f59e0b';
            ctx.fillText(`v₁ (λ=${eig.l1.toFixed(2)})`, v1sx, v1sy - 6);
            ctx.fillStyle = '#8b5cf6';
            ctx.fillText(`v₂ (λ=${eig.l2.toFixed(2)})`, v2sx, v2sy - 6);
        }
    }

    // ─── Vector Field Mode ───
    function initFieldParticles() {
        fieldParticles = [];
        for (let i = 0; i < NUM_FIELD_PARTICLES; i++) {
            fieldParticles.push({
                x: (Math.random() - 0.5) * GRID_RANGE * 2,
                y: (Math.random() - 0.5) * GRID_RANGE * 2,
                age: Math.random() * 200,
                maxAge: 150 + Math.random() * 100,
            });
        }
    }

    function drawVectorField() {
        const dxFunc = makeFieldFunc(formulaDx.value);
        const dyFunc = makeFieldFunc(formulaDy.value);
        const t = performance.now() / 1000;
        const dt = 0.02;

        // Draw field arrows on grid
        for (let x = -GRID_RANGE; x <= GRID_RANGE; x += 1) {
            for (let y = -GRID_RANGE; y <= GRID_RANGE; y += 1) {
                let dx = dxFunc(x, y, t);
                let dy = dyFunc(x, y, t);

                // Clamp & check NaN
                if (isNaN(dx) || isNaN(dy) || !isFinite(dx) || !isFinite(dy)) {
                    drawCircle(x, y, 3, 'rgba(239, 68, 68, 0.8)'); // Red NaN indicator
                    continue;
                }

                const mag = Math.sqrt(dx * dx + dy * dy);
                if (mag < 1e-6) continue;

                const maxLen = 0.8;
                const scale = Math.min(maxLen, mag) / mag;
                dx *= scale;
                dy *= scale;

                const hue = (mag / 3) * 120 + 180;
                drawArrow(x, y, x + dx, y + dy, `hsla(${hue}, 80%, 55%, 0.6)`, 1.5, 5);
            }
        }

        // Update & draw particles (RK4-style, simplified to Euler for JS perf)
        for (let p of fieldParticles) {
            let dx = dxFunc(p.x, p.y, t);
            let dy = dyFunc(p.x, p.y, t);

            if (isNaN(dx) || isNaN(dy) || !isFinite(dx) || !isFinite(dy)) {
                p.age = p.maxAge; // kill poisoned particle
            } else {
                p.x += dx * dt;
                p.y += dy * dt;
            }

            p.age++;

            // Respawn if out of bounds or too old
            if (p.age > p.maxAge || Math.abs(p.x) > GRID_RANGE + 1 || Math.abs(p.y) > GRID_RANGE + 1) {
                p.x = (Math.random() - 0.5) * GRID_RANGE * 2;
                p.y = (Math.random() - 0.5) * GRID_RANGE * 2;
                p.age = 0;
            }

            const alpha = Math.min(1, (p.maxAge - p.age) / 30);
            drawCircle(p.x, p.y, 2, `rgba(34, 211, 238, ${alpha * 0.8})`);
        }

        hudPoints.textContent = fieldParticles.length;
    }

    // ─── Update Matrix Info Panel ───
    function updateMatrixInfo() {
        const m = getMatrix();
        const d = det2x2(m);
        const tr = trace2x2(m);

        detValue.textContent = d.toFixed(3);
        traceValue.textContent = tr.toFixed(3);

        const isSingular = Math.abs(d) < 1e-6;
        singularityWarning.style.display = isSingular ? 'flex' : 'none';

        // Color matrix cells if singular
        Object.values(mInputs).forEach(input => {
            input.classList.toggle('singular', isSingular);
        });

        // Eigenvalues
        const eig = eigenvalues2x2(m);
        if (eig.real) {
            eigenVal1.textContent = eig.l1.toFixed(4);
            eigenVal2.textContent = eig.l2.toFixed(4);
            eigenVal1.style.color = '';
            eigenVal2.style.color = '';

            const v1 = eigenvector2x2(m, eig.l1);
            const v2 = eigenvector2x2(m, eig.l2);
            eigenVec1.textContent = `[${v1[0].toFixed(3)}, ${v1[1].toFixed(3)}]`;
            eigenVec2.textContent = `[${v2[0].toFixed(3)}, ${v2[1].toFixed(3)}]`;
        } else {
            eigenVal1.textContent = `${eig.l1.toFixed(3)} + ${eig.l1i.toFixed(3)}i`;
            eigenVal2.textContent = `${eig.l2.toFixed(3)} + ${eig.l2i.toFixed(3)}i`;
            eigenVal1.style.color = '#f59e0b';
            eigenVal2.style.color = '#f59e0b';
            eigenVec1.textContent = 'complex';
            eigenVec2.textContent = 'complex';
        }

        // Properties
        propArea.textContent = `|det| = ${Math.abs(d).toFixed(3)}`;
        propOrient.textContent = d >= 0 ? 'Preserved' : 'Reversed';

        if (isSingular) {
            propType.textContent = 'Singular (collapse)';
            propType.style.color = '#ef4444';
        } else if (Math.abs(d - 1) < 1e-4 && eig.real && Math.abs(eig.l1) > 0.99 && Math.abs(eig.l2) > 0.99) {
            propType.textContent = 'Rotation / Isometry';
            propType.style.color = '#10b981';
        } else if (m[1] === 0 && m[2] === 0) {
            propType.textContent = 'Diagonal (Scale)';
            propType.style.color = '#60a5fa';
        } else {
            propType.textContent = 'General Linear';
            propType.style.color = '#e2e8f0';
        }
    }

    // ─── Main Render Loop ───
    function render() {
        const frameStart = performance.now();

        if (currentMode === '3d') {
            const m3d = getMatrix3D();
            WebGLApp.render(m3d);
        } else if (currentMode === 'attractor') {
            // Step multiple times per frame for faster drawing
            for(let i=0; i<5; i++) {
                stepRK4();
            }

            const positions = new Float32Array(attractorPoints);
            const colors = new Float32Array(attractorPoints.length / 3 * 4);
            
            // Map coordinates to colors
            for (let i = 0; i < attractorPoints.length / 3; i++) {
                const z = attractorPoints[i*3 + 2];
                // Map Z from approx 0-50 to color
                colors[i*4 + 0] = Math.min(1.0, Math.max(0.2, z / 40.0)); // R
                colors[i*4 + 1] = 0.5; // G
                colors[i*4 + 2] = Math.min(1.0, Math.max(0.2, 1.0 - z / 40.0)); // B
                colors[i*4 + 3] = 1.0; // A
            }

            WebGLApp.renderAttractor(positions, colors);
        } else {
            const w = canvas.width / dpr;
            const h = canvas.height / dpr;
            ctx.clearRect(0, 0, w, h);

            drawGrid();

            switch (currentMode) {
                case 'transform':
                    drawTransformMode();
                    break;
                case 'eigen':
                    drawEigenMode();
                    break;
                case 'field':
                    drawVectorField();
                    break;
            }
        }

        // Animation logic
        if (animating) {
            animT += 0.008 * animDir;
            if (animT >= 1) { animT = 1; animDir = -1; }
            if (animT <= 0) { animT = 0; animDir = 1; }
            sliderT.value = animT;
            sliderTValue.textContent = animT.toFixed(2);
        }

        // FPS counter
        frameCount++;
        const now = performance.now();
        if (now - lastFpsTime >= 500) {
            fps = Math.round(frameCount / ((now - lastFpsTime) / 1000));
            hudFps.textContent = fps;
            frameCount = 0;
            lastFpsTime = now;
        }

        const frameTime = performance.now() - frameStart;
        hudFrame.textContent = frameTime.toFixed(1) + 'ms';

        requestAnimationFrame(render);
    }

    // ─── Presets ───
    const PRESETS = {
        identity: [1, 0, 0, 1],
        rotate45: [0.707, -0.707, 0.707, 0.707],
        shear: [1, 1, 0, 1],
        scale: [2, 0, 0, 2],
        reflect: [1, 0, 0, -1],
        singular: [1, 2, 0.5, 1],
    };

    // ─── Event Bindings ───
    Object.values(mInputs).forEach(input => {
        input.addEventListener('input', updateMatrixInfo);
    });
    // For 3d we just render on next frame, no info updates needed yet

    document.getElementById('presets-grid').addEventListener('click', (e) => {
        const btn = e.target.closest('.preset-btn');
        if (!btn) return;
        const preset = PRESETS[btn.dataset.preset];
        if (preset) setMatrix(...preset);
    });

    sliderT.addEventListener('input', () => {
        sliderTValue.textContent = parseFloat(sliderT.value).toFixed(2);
    });

    btnAnimate.addEventListener('click', () => {
        animating = !animating;
        btnAnimate.textContent = animating ? '⏸ Pause' : '▶ Animate';
    });

    btnReset.addEventListener('click', () => {
        animating = false;
        animT = 0;
        sliderT.value = 0;
        sliderTValue.textContent = '0.00';
        btnAnimate.textContent = '▶ Animate';
    });

    document.getElementById('btn-reset-attractor').addEventListener('click', resetAttractor);

    const btnInjectNan = document.getElementById('btn-inject-nan');
    if (btnInjectNan) {
        btnInjectNan.addEventListener('click', () => {
            mInputs.m00.value = 'NaN';
            updateMatrixInfo();
        });
    }

    // Mode switching
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentMode = btn.dataset.mode;

            sectionMatrix.style.display = (currentMode === 'transform' || currentMode === 'eigen') ? 'block' : 'none';
            sectionFormula.style.display = (currentMode === 'field') ? 'block' : 'none';
            sectionMatrix3d.style.display = (currentMode === '3d') ? 'block' : 'none';
            sectionAttractor.style.display = (currentMode === 'attractor') ? 'block' : 'none';

            canvas.style.display = (currentMode === '3d' || currentMode === 'attractor') ? 'none' : 'block';
            webglCanvas.style.display = (currentMode === '3d' || currentMode === 'attractor') ? 'block' : 'none';

            if (currentMode === 'field') {
                initFieldParticles();
            } else if (currentMode === 'attractor') {
                resetAttractor();
            }
        });
    });

    // Mouse coordinate tooltip and Interaction
    canvas.addEventListener('mousedown', (e) => {
        if (currentMode !== 'transform' && currentMode !== 'eigen') return;
        if (animating) return;

        const rect = canvas.getBoundingClientRect();
        const sx = e.clientX - rect.left;
        const sy = e.clientY - rect.top;
        const [wx, wy] = screenToWorld(sx, sy);

        const m = getMatrix();
        // Check distance to i-hat [m00, m10]
        const distI = Math.hypot(wx - m[0], wy - m[2]);
        if (distI < 0.5) {
            draggingVector = 'i';
            return;
        }
        // Check distance to j-hat [m01, m11]
        const distJ = Math.hypot(wx - m[1], wy - m[3]);
        if (distJ < 0.5) {
            draggingVector = 'j';
            return;
        }
    });

    window.addEventListener('mouseup', () => {
        draggingVector = null;
    });

    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        const sx = e.clientX - rect.left;
        const sy = e.clientY - rect.top;
        const [wx, wy] = screenToWorld(sx, sy);

        if (draggingVector) {
            nanPoisoned = false; // Dragging fixes poison potentially
            const snap = (v) => Math.round(v * 10) / 10;
            if (draggingVector === 'i') {
                mInputs.m00.value = snap(wx);
                mInputs.m10.value = snap(wy);
            } else if (draggingVector === 'j') {
                mInputs.m01.value = snap(wx);
                mInputs.m11.value = snap(wy);
            }
            updateMatrixInfo();
        }

        coordTooltip.style.display = 'block';
        coordTooltip.style.left = (e.clientX - rect.left + 15) + 'px';
        coordTooltip.style.top = (e.clientY - rect.top - 10) + 'px';
        coordTooltip.textContent = `(${wx.toFixed(2)}, ${wy.toFixed(2)})`;
    });

    canvas.addEventListener('mouseleave', () => {
        coordTooltip.style.display = 'none';
    });

    // ─── Init ───
    window.addEventListener('resize', resizeCanvas);
    WebGLApp.init(webglCanvas);
    resizeCanvas();
    updateMatrixInfo();
    initFieldParticles();
    render();

})();
