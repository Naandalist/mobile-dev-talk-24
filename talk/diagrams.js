/*
 * Animated canvas diagrams for "Scrape Data from Mobile Apps".
 * Usage: <canvas class="viz" data-scene="api" data-w="1100" data-h="300"></canvas>
 * Animations only run for canvases on the current slide and restart each time
 * the slide is entered.
 */
(function () {
	const FONT = '"Open Sans", "Helvetica Neue", Helvetica, sans-serif';
	const HEAD = 'Montserrat, "Helvetica Neue", Helvetica, sans-serif';
	const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';
	const C = {};
	const DPR = Math.max(2, window.devicePixelRatio || 1);
	const reduceMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

	function loadColors() {
		const cs = getComputedStyle(document.documentElement);
		for (const k of ['bg', 'panel', 'line', 'text', 'muted', 'accent', 'warn', 'danger', 'info', 'ink2', 'ink3', 'ink4']) {
			C[k] = cs.getPropertyValue('--' + k).trim();
		}
	}

	// ------------------------------------------------------------------ helpers
	const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
	const lerp = (a, b, t) => a + (b - a) * t;
	const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
	const rnd = (i, s) => {
		const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453;
		return x - Math.floor(x);
	};
	function rgba(hex, a) {
		const h = hex.replace('#', '');
		const n = parseInt(h.length === 3 ? h.replace(/./g, '$&$&') : h, 16);
		return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
	}
	function along(a, b, p, eased = true) {
		p = clamp(p, 0, 1);
		if (eased) p = ease(p);
		return [lerp(a[0], b[0], p), lerp(a[1], b[1], p)];
	}
	function rr(ctx, x, y, w, h, r) {
		ctx.beginPath();
		if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
		else ctx.rect(x, y, w, h);
	}
	function text(ctx, s, x, y, o = {}) {
		ctx.save();
		ctx.globalAlpha *= o.alpha ?? 1;
		ctx.font = `${o.weight || 400} ${o.size || 16}px ${o.font || FONT}`;
		ctx.fillStyle = o.color || C.text;
		ctx.textAlign = o.align || 'center';
		ctx.textBaseline = o.base || 'middle';
		ctx.fillText(s, x, y);
		ctx.restore();
	}
	function box(ctx, cx, cy, w, h, o = {}) {
		ctx.save();
		const stroke = o.stroke || C.line;
		if (o.glow) {
			ctx.shadowColor = stroke;
			ctx.shadowBlur = 28 * o.glow;
		}
		rr(ctx, cx - w / 2, cy - h / 2, w, h, o.r ?? 4);
		ctx.fillStyle = o.fill || C.panel;
		ctx.fill();
		ctx.shadowBlur = 0;
		ctx.lineWidth = o.lw || 1.5;
		ctx.strokeStyle = stroke;
		ctx.stroke();
		ctx.restore();
	}
	function wire(ctx, x1, y1, x2, y2, t, color, o = {}) {
		ctx.save();
		ctx.strokeStyle = color || C.line;
		ctx.lineWidth = o.width || 2;
		ctx.setLineDash([6, 8]);
		ctx.lineDashOffset = -t * (o.speed ?? 30);
		ctx.beginPath();
		ctx.moveTo(x1, y1);
		ctx.lineTo(x2, y2);
		ctx.stroke();
		ctx.restore();
	}
	function pill(ctx, s, x, y, color, o = {}) {
		ctx.save();
		ctx.globalAlpha = o.alpha ?? 1;
		const size = o.size || 13;
		ctx.font = `600 ${size}px ${MONO}`;
		const w = ctx.measureText(s).width + 22;
		const h = size + 14;
		ctx.shadowColor = color;
		ctx.shadowBlur = 16;
		rr(ctx, x - w / 2, y - h / 2, w, h, h / 2);
		ctx.fillStyle = C.bg;
		ctx.fill();
		ctx.shadowBlur = 0;
		ctx.fillStyle = rgba(color, 0.14);
		ctx.fill();
		ctx.strokeStyle = color;
		ctx.lineWidth = 1.5;
		ctx.stroke();
		ctx.fillStyle = color;
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.fillText(s, x, y + 1);
		ctx.restore();
	}
	function mark(ctx, x, y, kind, o = {}) {
		// kind: 'ok' | 'no' | 'warn'
		const color = kind === 'ok' ? C.accent : kind === 'warn' ? C.warn : C.danger;
		const s = o.scale ?? 1;
		ctx.save();
		ctx.globalAlpha = o.alpha ?? 1;
		ctx.translate(x, y);
		ctx.scale(s, s);
		ctx.beginPath();
		ctx.arc(0, 0, 13, 0, Math.PI * 2);
		ctx.fillStyle = color;
		ctx.fill();
		ctx.strokeStyle = C.bg;
		ctx.lineWidth = 3;
		ctx.lineCap = 'round';
		ctx.beginPath();
		if (kind === 'ok') {
			ctx.moveTo(-6, 0);
			ctx.lineTo(-1.5, 5);
			ctx.lineTo(6.5, -5);
		} else if (kind === 'no') {
			ctx.moveTo(-5, -5);
			ctx.lineTo(5, 5);
			ctx.moveTo(5, -5);
			ctx.lineTo(-5, 5);
		} else {
			ctx.moveTo(0, -6);
			ctx.lineTo(0, 2);
			ctx.moveTo(0, 6.5);
			ctx.lineTo(0, 6.6);
		}
		ctx.stroke();
		ctx.restore();
	}
	function burst(ctx, x, y, age, color, dur = 0.7) {
		if (age < 0 || age > dur) return;
		const k = age / dur;
		ctx.save();
		ctx.strokeStyle = color;
		ctx.globalAlpha = 1 - k;
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.arc(x, y, 10 + k * 40, 0, Math.PI * 2);
		ctx.stroke();
		for (let i = 0; i < 8; i++) {
			const a = (i / 8) * Math.PI * 2;
			const r1 = 14 + k * 30;
			const r2 = r1 + 6;
			ctx.beginPath();
			ctx.moveTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1);
			ctx.lineTo(x + Math.cos(a) * r2, y + Math.sin(a) * r2);
			ctx.stroke();
		}
		ctx.restore();
	}
	// pop-in factor for something that appears at time `at`
	const pop = (t, at, d = 0.25) => clamp((t - at) / d, 0, 1);

	// ------------------------------------------------------------- illustrations
	function phone(ctx, cx, cy, rows, newP, o = {}) {
		const w = o.w || 110;
		const h = o.h || 200;
		const x = cx - w / 2;
		const y = cy - h / 2;
		ctx.save();
		ctx.shadowColor = rgba(C.text, 0.15);
		ctx.shadowBlur = 20;
		rr(ctx, x, y, w, h, 18);
		ctx.fillStyle = C.bg;
		ctx.fill();
		ctx.shadowBlur = 0;
		ctx.strokeStyle = C.text;
		ctx.lineWidth = 2.5;
		ctx.stroke();
		// notch
		rr(ctx, cx - 18, y + 8, 36, 7, 4);
		ctx.fillStyle = C.text;
		ctx.fill();
		// screen cards
		const sx = x + 10;
		const sw = w - 20;
		const total = rows + (newP > 0 ? 1 : 0);
		for (let i = 0; i < total; i++) {
			const a = i < rows ? 1 : newP;
			const cy0 = y + 26 + i * 34 + (1 - a) * 10;
			ctx.globalAlpha = a;
			rr(ctx, sx, cy0, sw, 28, 6);
			ctx.fillStyle = C.panel;
			ctx.fill();
			ctx.strokeStyle = i === total - 1 && newP > 0 ? C.accent : C.line;
			ctx.lineWidth = 1;
			ctx.stroke();
			rr(ctx, sx + 5, cy0 + 5, 18, 18, 4);
			ctx.fillStyle = rgba(C.text, [0.9, 0.55, 0.3][i % 3]);
			ctx.fill();
			ctx.fillStyle = C.ink3;
			ctx.fillRect(sx + 28, cy0 + 8, sw - 40, 4);
			ctx.fillRect(sx + 28, cy0 + 16, (sw - 40) * 0.6, 4);
		}
		ctx.restore();
	}

	function rack(ctx, cx, cy, t, flash = 0) {
		for (let i = 0; i < 3; i++) {
			const y = cy - 50 + i * 36;
			box(ctx, cx, y + 14, 140, 30, { r: 6, stroke: flash > 0 ? C.accent : C.line, glow: flash * 0.6 });
			for (let j = 0; j < 3; j++) {
				const on = Math.sin(t * 5 + i * 2.1 + j * 1.3) > 0.2 || flash > 0.3;
				ctx.beginPath();
				ctx.arc(cx - 52 + j * 12, y + 14, 3.5, 0, Math.PI * 2);
				ctx.fillStyle = on ? (j === 0 ? C.text : C.muted) : C.ink4;
				ctx.fill();
			}
			ctx.fillStyle = C.ink3;
			ctx.fillRect(cx - 10, y + 11, 66, 3);
			ctx.fillRect(cx - 10, y + 17, 46, 3);
		}
	}

	function chip(ctx, cx, cy, label, glow) {
		ctx.save();
		ctx.strokeStyle = C.accent;
		ctx.lineWidth = 2;
		for (let i = 0; i < 4; i++) {
			const y = cy - 27 + i * 18;
			ctx.beginPath();
			ctx.moveTo(cx - 82, y);
			ctx.lineTo(cx - 70, y);
			ctx.moveTo(cx + 70, y);
			ctx.lineTo(cx + 82, y);
			ctx.stroke();
		}
		ctx.restore();
		box(ctx, cx, cy, 140, 90, { stroke: C.accent, glow: 0.25 + glow, r: 12 });
		text(ctx, label, cx, cy + 1, { size: 28, weight: 700, font: HEAD, color: C.accent });
	}

	function eye(ctx, cx, cy, color, t) {
		ctx.save();
		ctx.strokeStyle = color;
		ctx.lineWidth = 2.5;
		ctx.beginPath();
		ctx.moveTo(cx - 18, cy);
		ctx.quadraticCurveTo(cx, cy - 16, cx + 18, cy);
		ctx.quadraticCurveTo(cx, cy + 16, cx - 18, cy);
		ctx.stroke();
		const look = Math.sin(t * 1.7) * 4;
		ctx.beginPath();
		ctx.arc(cx + look, cy, 5.5, 0, Math.PI * 2);
		ctx.fillStyle = color;
		ctx.fill();
		ctx.restore();
	}

	function lock(ctx, cx, cy, color) {
		ctx.save();
		ctx.strokeStyle = color;
		ctx.fillStyle = C.bg;
		ctx.lineWidth = 2.5;
		ctx.beginPath();
		ctx.arc(cx, cy - 5, 7, Math.PI, 0);
		ctx.stroke();
		rr(ctx, cx - 11, cy - 5, 22, 17, 4);
		ctx.fill();
		ctx.stroke();
		ctx.beginPath();
		ctx.arc(cx, cy + 3, 2.5, 0, Math.PI * 2);
		ctx.fillStyle = color;
		ctx.fill();
		ctx.restore();
	}

	function namedNode(ctx, cx, cy, title, sub, o = {}) {
		const w = o.w || 210;
		box(ctx, cx, cy, w, o.h || 72, { stroke: o.stroke, glow: o.glow });
		const left = cx - w / 2;
		if (o.icon) o.icon(left + 30, cy);
		const tx = left + (o.icon ? 56 : 18);
		text(ctx, title, tx, cy - 11, { size: 17, weight: 700, font: HEAD, color: o.titleColor || C.text, align: 'left' });
		text(ctx, sub, tx, cy + 13, { size: 12.5, color: C.muted, font: MONO, align: 'left' });
	}

	function miniPhone(ctx, x, y) {
		rr(ctx, x - 10, y - 17, 20, 34, 5);
		ctx.strokeStyle = C.text;
		ctx.lineWidth = 2;
		ctx.stroke();
		ctx.fillStyle = C.accent;
		ctx.fillRect(x - 6, y - 10, 12, 4);
		ctx.fillRect(x - 6, y - 3, 12, 4);
		ctx.fillRect(x - 6, y + 4, 8, 4);
	}
	function miniServer(ctx, x, y, t) {
		for (let i = 0; i < 3; i++) {
			rr(ctx, x - 14, y - 16 + i * 11, 28, 9, 2);
			ctx.strokeStyle = C.text;
			ctx.lineWidth = 1.5;
			ctx.stroke();
			ctx.beginPath();
			ctx.arc(x - 8, y - 11.5 + i * 11, 1.8, 0, Math.PI * 2);
			ctx.fillStyle = Math.sin(t * 6 + i * 2) > 0 ? C.accent : C.muted;
			ctx.fill();
		}
	}

	function logPanel(ctx, cx, cy, w, h, title, lines, o = {}) {
		const x = cx - w / 2;
		const y = cy - h / 2;
		box(ctx, cx, cy, w, h, { stroke: o.stroke || C.line, glow: o.glow, r: 4, fill: C.bg });
		ctx.save();
		rr(ctx, x, y, w, 30, [4, 4, 0, 0]);
		ctx.fillStyle = C.panel;
		ctx.fill();
		[C.ink2, C.ink2, C.ink2].forEach((c, i) => {
			ctx.beginPath();
			ctx.arc(x + 16 + i * 14, y + 15, 4.5, 0, Math.PI * 2);
			ctx.fillStyle = c;
			ctx.fill();
		});
		ctx.restore();
		text(ctx, title, x + 62, y + 15, { size: 12.5, font: MONO, color: C.muted, align: 'left' });
		const lh = o.lh || 22;
		const max = Math.floor((h - 44) / lh);
		const shown = lines.slice(-max);
		shown.forEach((ln, i) => {
			const ly = y + 46 + i * lh;
			const newest = i === shown.length - 1 && ln.fresh;
			if (newest) {
				ctx.fillStyle = rgba(ln.color || C.accent, 0.12);
				ctx.fillRect(x + 6, ly - lh / 2 + 1, w - 12, lh - 2);
			}
			let s = ln.text;
			if (ln.typed != null) s = s.slice(0, Math.floor(ln.typed * s.length));
			text(ctx, s, x + 14, ly, { size: 12.5, font: MONO, color: ln.dim ? C.muted : C.text, align: 'left' });
			if (ln.status && (ln.typed == null || ln.typed >= 1)) {
				text(ctx, ln.status, x + w - 14, ly, {
					size: 12.5,
					font: MONO,
					weight: 700,
					color: ln.color || C.accent,
					align: 'right',
				});
			}
		});
	}

	// ------------------------------------------------------------------ scenes
	const scenes = {};

	// 0. Cover: orbit ala Sol. Server = "matahari", app & bot mengorbit sambil mengirim request.
	scenes.orbit = {
		still: 4,
		draw(ctx, t, W, H) {
			const k = H / 800;
			ctx.save();
			ctx.scale(k, k);
			W = W / k;
			H = 800;
			const cx = -40;
			const cy = H / 2;
			const SUN = 250;
			// sun
			ctx.save();
			ctx.beginPath();
			ctx.arc(cx, cy, SUN, 0, Math.PI * 2);
			ctx.fillStyle = C.text;
			ctx.shadowColor = rgba(C.text, 0.25);
			ctx.shadowBlur = 60;
			ctx.fill();
			ctx.restore();
			// tick marks around the sun
			ctx.save();
			ctx.strokeStyle = rgba(C.text, 0.5);
			ctx.lineWidth = 1.5;
			for (let i = -14; i <= 14; i++) {
				const a = i * 0.075;
				const r1 = SUN + 22;
				const r2 = r1 + (i % 4 === 0 ? 16 : 8);
				ctx.beginPath();
				ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
				ctx.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2);
				ctx.stroke();
			}
			ctx.restore();
			ctx.save();
			ctx.translate(cx + SUN - 40, cy);
			ctx.rotate(Math.PI / 2);
			text(ctx, 'S E R V E R', 0, 0, { size: 10, weight: 600, color: C.bg });
			ctx.restore();

			const bodies = [
				{ r: 330, s: 0.11, a0: -0.35, size: 6, label: 'APP' },
				{ r: 410, s: 0.08, a0: 0.42, size: 4 },
				{ r: 495, s: 0.062, a0: -0.12, size: 9, ring: true, label: 'BOT', bad: true },
				{ r: 590, s: 0.05, a0: 0.3, size: 5 },
				{ r: 700, s: 0.04, a0: -0.42, size: 12, label: 'SCRAPER', bad: true },
				{ r: 820, s: 0.032, a0: 0.18, size: 7 },
				{ r: 950, s: 0.026, a0: -0.25, size: 5 },
				{ r: 1090, s: 0.02, a0: 0.33, size: 4 },
			];
			// orbits
			bodies.forEach((b, i) => {
				ctx.save();
				ctx.beginPath();
				ctx.arc(cx, cy, b.r, 0, Math.PI * 2);
				ctx.strokeStyle = rgba(C.text, 0.13);
				ctx.lineWidth = 1;
				if (i === 3) {
					ctx.setLineDash([1.5, 5]);
					ctx.lineWidth = 6;
					ctx.strokeStyle = rgba(C.text, 0.12);
				}
				ctx.stroke();
				ctx.restore();
			});
			// bodies + packets towards the server
			bodies.forEach((b, i) => {
				const a = b.a0 + Math.sin(t * b.s * 2) * 0.05 + t * b.s * 0.25;
				const x = cx + Math.cos(a) * b.r;
				const y = cy + Math.sin(a) * b.r;
				// packets
				const period = b.bad ? 0.55 : 2.2;
				if (b.label) {
					for (let k = 0; k < 4; k++) {
						const ph = ((t + k * period) % (period * 4)) / (period * 4);
						if (ph > 0.6) continue;
						const q = ph / 0.6;
						const px = lerp(x, cx + Math.cos(a) * (SUN + 4), q);
						const py = lerp(y, cy + Math.sin(a) * (SUN + 4), q);
						ctx.beginPath();
						ctx.arc(px, py, 2.2, 0, Math.PI * 2);
						ctx.fillStyle = b.bad ? rgba(C.danger, 0.9 * (1 - q * 0.5)) : rgba(C.text, 0.9);
						ctx.fill();
					}
				}
				ctx.save();
				ctx.beginPath();
				ctx.arc(x, y, b.size, 0, Math.PI * 2);
				ctx.fillStyle = b.bad ? C.danger : C.text;
				ctx.fill();
				if (b.ring) {
					ctx.beginPath();
					ctx.ellipse(x, y, b.size * 2.1, b.size * 0.6, -0.35, 0, Math.PI * 2);
					ctx.strokeStyle = C.danger;
					ctx.lineWidth = 1.5;
					ctx.stroke();
				}
				if (b.label) {
					ctx.beginPath();
					ctx.arc(x, y, b.size + 7, 0, Math.PI * 2);
					ctx.strokeStyle = b.bad ? rgba(C.danger, 0.6) : rgba(C.text, 0.6);
					ctx.lineWidth = 1;
					ctx.stroke();
					text(ctx, b.label.split('').join(' '), x + b.size + 14, y + 1, {
						size: 10,
						weight: 600,
						align: 'left',
						color: b.bad ? C.danger : rgba(C.text, 0.75),
					});
				}
				ctx.restore();
			});
			// fade the right side so orbits never fight with the title text
			const g = ctx.createLinearGradient(W * 0.4, 0, W * 0.56, 0);
			g.addColorStop(0, rgba(C.bg, 0));
			g.addColorStop(1, rgba(C.bg, 0.88));
			ctx.fillStyle = g;
			ctx.fillRect(W * 0.4, 0, W * 0.6, H);
			ctx.restore();
		},
	};

	// 1. App hanya menggambar data dari API
	scenes.api = {
		still: 2.6,
		draw(ctx, t) {
			const REQ = ['GET /products', 'GET /banner', 'GET /promo', 'GET /profile', 'GET /feed'];
			const T = 3.2;
			const n = Math.floor(t / T);
			const p = t - n * T;
			const Y = 140;
			wire(ctx, 205, Y, 478, Y, t);
			wire(ctx, 622, Y, 878, Y, t);
			text(ctx, 'HTTPS', 342, Y - 24, { size: 12, font: MONO, color: C.muted });
			text(ctx, 'HTTPS', 750, Y - 24, { size: 12, font: MONO, color: C.muted });

			const req = REQ[n % REQ.length];
			let pos = null;
			if (p < 0.8) pos = [req, along([215, Y], [478, Y], p / 0.8), C.accent];
			else if (p < 1.4) pos = [req, along([622, Y], [880, Y], (p - 0.8) / 0.6), C.accent];
			else if (p >= 1.6 && p < 2.2) pos = ['{ json }', along([880, Y], [622, Y], (p - 1.6) / 0.6), C.info];
			else if (p >= 2.2 && p < 3.0) pos = ['{ json }', along([478, Y], [215, Y], (p - 2.2) / 0.8), C.info];
			if (pos) pill(ctx, pos[0], pos[1][0], pos[1][1], pos[2]);

			const rows = n % 5;
			const newP = p > 3.0 ? clamp((p - 3.0) / 0.2, 0, 1) : 0;
			phone(ctx, 140, Y, rows, newP);
			const apiGlow = (p > 0.75 && p < 0.95) || (p > 2.1 && p < 2.3) ? 0.8 : 0;
			chip(ctx, 550, Y, 'API', apiGlow);
			rack(ctx, 960, Y, t, p > 1.4 && p < 1.65 ? 1 : 0);

			text(ctx, 'App', 140, 262, { size: 16, weight: 700, font: HEAD });
			text(ctx, 'menggambar UI', 140, 284, { size: 13, color: C.muted, font: MONO });
			text(ctx, 'API', 550, 262, { size: 16, weight: 700, font: HEAD, color: C.accent });
			text(ctx, 'JSON / protobuf', 550, 284, { size: 13, color: C.muted, font: MONO });
			text(ctx, 'Backend', 960, 262, { size: 16, weight: 700, font: HEAD });
			text(ctx, 'DB, services', 960, 284, { size: 13, color: C.muted, font: MONO });

			if (p >= 3.0) text(ctx, 'render!', 140, 26, { size: 14, weight: 700, color: C.accent, alpha: 1 - (p - 3.0) / 0.2 });
		},
	};

	// 2. MITM proxy di tengah
	scenes.proxy = {
		still: 1.0,
		draw(ctx, t) {
			const LOG = [
				['GET  /v2/products?page=1', '200'],
				['GET  /v2/banner', '200'],
				['POST /v1/auth/refresh', '200'],
				['GET  /v2/products?page=2', '200'],
				['GET  /v2/promo/active', '200'],
				['GET  /v1/me', '200'],
				['POST /v2/cart', '201'],
			];
			const T = 2.6;
			const n = Math.floor(t / T);
			const p = t - n * T;
			const Y = 140;
			wire(ctx, 200, Y, 383, Y, t, rgba(C.warn, 0.7));
			wire(ctx, 717, Y, 895, Y, t, rgba(C.accent, 0.7));
			lock(ctx, 291, Y - 34, C.warn);
			text(ctx, 'TLS · CA proxy', 291, Y + 34, { size: 12, font: MONO, color: C.warn });
			lock(ctx, 806, Y - 34, C.accent);
			text(ctx, 'TLS · cert asli', 806, Y + 34, { size: 12, font: MONO, color: C.accent });

			const req = LOG[n % LOG.length][0].replace(/\s+/, ' ').replace(/\?.*/, '');
			let pos = null;
			if (p < 0.7) pos = [req, along([205, Y], [383, Y], p / 0.7), C.accent];
			else if (p >= 1.0 && p < 1.6) pos = [req, along([717, Y], [900, Y], (p - 1.0) / 0.6), C.accent];
			else if (p >= 1.8 && p < 2.2) pos = ['200 { json }', along([900, Y], [717, Y], (p - 1.8) / 0.4), C.info];
			else if (p >= 2.2) pos = ['200 { json }', along([383, Y], [205, Y], (p - 2.2) / 0.4), C.info];
			if (pos) pill(ctx, pos[0], pos[1][0], pos[1][1], pos[2], { size: 12 });

			phone(ctx, 130, Y, 4, 0);
			text(ctx, 'App', 130, 262, { size: 16, weight: 700, font: HEAD });
			text(ctx, 'proxy Wi-Fi → laptop', 130, 284, { size: 13, color: C.muted, font: MONO });

			const inside = p > 0.7 && p < 1.0;
			const lines = [];
			const done = n + (p >= 0.75 ? 1 : 0);
			for (let i = Math.max(0, done - 7); i < done; i++) {
				const [l, s] = LOG[i % LOG.length];
				const fresh = i === n && p >= 0.75;
				lines.push({ text: l, status: s, fresh, typed: fresh ? clamp((p - 0.75) / 0.3, 0, 1) : null });
			}
			logPanel(ctx, 550, Y, 334, 220, 'mitmproxy · 127.0.0.1:8080', lines, {
				stroke: inside ? C.warn : C.line,
				glow: inside ? 0.7 : 0,
			});
			text(ctx, 'Proxy', 550, 272, { size: 16, weight: 700, font: HEAD, color: C.warn });

			rack(ctx, 975, Y, t, p > 1.55 && p < 1.8 ? 1 : 0);
			text(ctx, 'Server', 975, 262, { size: 16, weight: 700, font: HEAD });
			text(ctx, 'api.app.com', 975, 284, { size: 13, color: C.muted, font: MONO });

		},
	};

	// 3. Static API key: disadap sekali, dipakai selamanya
	scenes.staticKey = {
		still: 7,
		draw(ctx, t) {
			const L = 18;
			t = t % L;
			const APP = [150, 70];
			const SRV = [950, 70];
			const ATK = [550, 230];
			wire(ctx, 245, 70, 855, 70, t);
			const captured = t > 1.3;
			wire(ctx, 650, 214, 880, 107, t, rgba(C.danger, captured ? 0.8 : 0.25), { speed: 50 });

			// app packets
			const okHits = [];
			for (let k = 0; k * 2.2 <= t; k++) {
				const s = k * 2.2;
				const p = (t - s) / 1.4;
				if (p < 1) pill(ctx, 'X-API-Key: abc123', ...along([250, 70], [850, 70], p, false), C.accent, { size: 12 });
				else okHits.push(s + 1.4);
			}
			// copy
			if (t > 0.65 && t < 1.35) {
				const q = (t - 0.65) / 0.7;
				pill(ctx, 'abc123', ...along([550, 70], [550, 195], q), C.danger, { size: 12, alpha: 0.9 });
				text(ctx, 'copy!', 600, lerp(70, 195, ease(q)), { size: 14, weight: 700, color: C.danger });
			}
			// replays
			let accepted = 0;
			const replayHits = [];
			for (let k = 0; 2.4 + k * 0.5 <= t; k++) {
				const s = 2.4 + k * 0.5;
				const p = (t - s) / 1.0;
				if (p < 1) pill(ctx, 'abc123', ...along([660, 205], [885, 103], p, false), C.danger, { size: 11 });
				else {
					accepted++;
					replayHits.push(s + 1.0);
				}
			}

			namedNode(ctx, ...APP, 'App', 'X-API-Key statis', {
				w: 220, icon: (x, y) => miniPhone(ctx, x, y) });
			const lastHit = Math.max(-9, ...okHits, ...replayHits);
			namedNode(ctx, ...SRV, 'Server', 'cek key → OK', {
				w: 200,
				icon: (x, y) => miniServer(ctx, x, y, t),
				stroke: t - lastHit < 0.3 ? C.accent : C.line,
			});
			namedNode(ctx, ...ATK, 'Penyadap', captured ? 'key abc123 tersimpan' : 'menunggu…', {
				w: 240,
				stroke: C.danger,
				glow: captured ? 0.35 + 0.15 * Math.sin(t * 4) : 0,
				titleColor: C.danger,
				icon: (x, y) => eye(ctx, x, y, C.danger, t),
			});
			for (const h of okHits.concat(replayHits)) burst(ctx, 860, 70, t - h, C.accent);
			if (lastHit > 0 && t - lastHit < 0.35) mark(ctx, 1035, 38, 'ok', { scale: 0.9 });

			if (accepted > 0) {
				text(ctx, `replay diterima: ${accepted}`, 950, 150, { size: 22, weight: 700, color: C.warn });
				text(ctx, 'tidak pernah expired ∞', 950, 178, { size: 14, color: C.muted, font: MONO });
			}
		},
	};

	// 4. Time-based HMAC: replay & tamper ditolak
	scenes.hmac = {
		still: 7.6,
		draw(ctx, t) {
			const L = 13;
			t = t % L;
			const BASE = 10 * 3600;
			const RATE = 12; // 1 detik nyata = 12 detik simulasi
			const clock = (s) => {
				const v = BASE + Math.floor(s);
				const hh = String(Math.floor(v / 3600)).padStart(2, '0');
				const mm = String(Math.floor((v % 3600) / 60)).padStart(2, '0');
				const ss = String(v % 60).padStart(2, '0');
				return `${hh}:${mm}:${ss}`;
			};
			const sim = t * RATE;
			const APP = [140, 70];
			const ATK = [430, 262];
			const SRV = [880, 170];
			const TRAVEL = 1.0;

			wire(ctx, 235, 70, 712, 70, t);
			wire(ctx, 545, 262, 712, 262, t, rgba(C.danger, t > 1.3 ? 0.8 : 0.25), { speed: 50 });

			const ev = [];
			for (let s = 0; s < L; s += 3) {
				const sig = 'sig@' + clock(s * RATE).slice(3);
				ev.push({ s, who: 'app', label: sig, res: 'ok', log: ['APP    ' + sig, '200'] });
			}
			const cap = 'sig@' + clock(0).slice(3);
			ev.push({ s: 2.0, who: 'atk', label: 'replay ' + cap, res: 'warn', note: 'lolos: masih < 60 dtk', log: ['REPLAY ' + cap, '200 ⚠'] });
			ev.push({ s: 4.2, who: 'atk', label: 'page=999 + ' + cap, res: 'no', note: 'signature tidak cocok', log: ['TAMPER page=999', '401'] });
			for (const s of [6.4, 8.6, 10.8]) {
				const age = Math.round((s + TRAVEL) * RATE);
				ev.push({ s, who: 'atk', label: 'replay ' + cap, res: 'no', note: `kedaluwarsa (${age} dtk)`, log: ['REPLAY ' + cap, '401 basi'] });
			}

			const lines = [];
			const arrived = ev.filter((e) => t >= e.s + TRAVEL).sort((a, b) => a.s + TRAVEL - (b.s + TRAVEL));
			arrived.forEach((e, i) => {
				const color = e.res === 'ok' ? C.accent : e.res === 'warn' ? C.warn : C.danger;
				lines.push({ text: e.log[0], status: e.log[1], color, fresh: i === arrived.length - 1 && t - (e.s + TRAVEL) < 0.8 });
			});

			// moving packets
			for (const e of ev) {
				const p = (t - e.s) / TRAVEL;
				if (p < 0 || p >= 1) continue;
				if (e.who === 'app') pill(ctx, e.label, ...along([245, 70], [705, 70], p, false), C.accent, { size: 12 });
				else pill(ctx, e.label, ...along([555, 262], [705, 262], p, false), e.res === 'warn' ? C.warn : C.danger, { size: 11 });
			}
			// copy of first app packet
			if (t > 0.5 && t < 1.2) {
				const q = (t - 0.5) / 0.7;
				pill(ctx, cap, ...along([430, 70], [430, 222], q), C.danger, { size: 11, alpha: 0.9 });
				text(ctx, 'copy!', 480, lerp(70, 222, ease(q)), { size: 14, weight: 700, color: C.danger });
			}

			namedNode(ctx, ...APP, 'App', 'sign(epoch+url+body)', {
				w: 260,
				icon: (x, y) => miniPhone(ctx, x, y),
			});
			const captured = t > 1.2;
			namedNode(ctx, ...ATK, 'Penyadap', captured ? 'pegang ' + cap : 'menunggu…', {
				w: 240,
				stroke: C.danger,
				titleColor: C.danger,
				icon: (x, y) => eye(ctx, x, y, C.danger, t),
			});

			// signature age bar
			if (captured) {
				const age = sim;
				const k = clamp(age / 60, 0, 1);
				const color = age < 40 ? C.accent : age < 60 ? C.warn : C.danger;
				const bx = ATK[0] - 115;
				const by = 312;
				rr(ctx, bx, by, 230, 8, 4);
				ctx.fillStyle = C.panel;
				ctx.fill();
				rr(ctx, bx, by, 230 * k, 8, 4);
				ctx.fillStyle = color;
				ctx.fill();
				text(ctx, age < 60 ? `umur signature: ${Math.floor(age)} / 60 dtk` : `BASI · ${Math.floor(age)} dtk`, ATK[0], 330, {
					size: 12.5,
					font: MONO,
					color,
					weight: 700,
				});
			}

			logPanel(ctx, ...SRV, 330, 300, 'server · ' + clock(sim), lines, { lh: 24 });

			// verdict near server
			for (const e of ev) {
				const age = t - (e.s + TRAVEL);
				if (age < 0 || age > 1.4) continue;
				const y = e.who === 'app' ? 70 : 262;
				mark(ctx, 712, y, e.res, { scale: 0.6 + 0.4 * pop(t, e.s + TRAVEL, 0.15) });
				burst(ctx, 712, y, age, e.res === 'ok' ? C.accent : e.res === 'warn' ? C.warn : C.danger);
				if (e.note) {
					text(ctx, e.note, 628, y - 30, {
						size: 14,
						weight: 700,
						color: e.res === 'warn' ? C.warn : C.danger,
						alpha: 1 - clamp((age - 1.0) / 0.4, 0, 1),
					});
				}
			}
		},
	};

	// 5. Defense in depth: lapisan menghentikan serangan
	scenes.layers = {
		still: 9,
		draw(ctx, t, W, H) {
			const L = 30;
			t = t % L;
			const cx = W / 2;
			const cy = H / 2 - 10;
			const R = [195, 170, 145, 120, 95, 70];
			const CORE = 44;
			const TH = [0.3, 0.45, 0.65, 0.8, 0.9, 0.97];
			const START = 235;
			const SPEED = 150;
			const EVERY = 0.22;
			const lastHit = [-9, -9, -9, -9, -9, -9, -9];
			let blocked = 0;
			let passed = 0;
			const flying = [];
			const bursts = [];
			for (let k = 0; k * EVERY <= t; k++) {
				const s = k * EVERY;
				const r0 = rnd(k, 2);
				let stop = TH.findIndex((v) => r0 < v);
				if (stop < 0) stop = 6;
				const rStop = stop < 6 ? R[stop] : CORE;
				const tHit = s + (START - rStop) / SPEED;
				const a = rnd(k, 1) * Math.PI * 2;
				if (t < tHit) {
					flying.push([a, START - (t - s) * SPEED]);
				} else {
					if (stop < 6) blocked++;
					else passed++;
					lastHit[stop] = Math.max(lastHit[stop], tHit);
					if (t - tHit < 0.6) bursts.push([cx + Math.cos(a) * rStop, cy + Math.sin(a) * rStop, t - tHit, stop]);
				}
			}
			// rings
			R.forEach((r, i) => {
				const g = clamp(1 - (t - lastHit[i]) / 0.5, 0, 1);
				ctx.save();
				ctx.beginPath();
				ctx.arc(cx, cy, r, 0, Math.PI * 2);
				const base = i === 2 ? C.accent : C.info;
				ctx.strokeStyle = rgba(base, 0.28 + 0.6 * g);
				ctx.lineWidth = i === 2 ? 3 : 2;
				if (g > 0) {
					ctx.shadowColor = base;
					ctx.shadowBlur = 14 * g;
				}
				ctx.stroke();
				ctx.restore();
				const ly = cy - r + 12.5;
				rr(ctx, cx - 15, ly - 9, 30, 18, 9);
				ctx.fillStyle = C.bg;
				ctx.fill();
				text(ctx, 'L' + (i + 1), cx, ly + 1, { size: 12, font: MONO, weight: 700, color: i === 2 ? C.accent : C.info });
			});
			// core
			const cg = clamp(1 - (t - lastHit[6]) / 0.6, 0, 1);
			ctx.save();
			ctx.beginPath();
			ctx.arc(cx, cy, CORE, 0, Math.PI * 2);
			ctx.fillStyle = C.panel;
			ctx.shadowColor = C.danger;
			ctx.shadowBlur = 24 * cg;
			ctx.fill();
			ctx.strokeStyle = cg > 0 ? C.danger : C.warn;
			ctx.lineWidth = 2;
			ctx.stroke();
			ctx.restore();
			text(ctx, 'API', cx, cy + 1, { size: 20, font: MONO, weight: 700, color: C.warn });
			// projectiles
			for (const [a, r] of flying) {
				const x = cx + Math.cos(a) * r;
				const y = cy + Math.sin(a) * r;
				ctx.save();
				ctx.globalAlpha = clamp((START - r) / 30, 0, 1);
				ctx.strokeStyle = rgba(C.danger, 0.5);
				ctx.lineWidth = 2;
				ctx.beginPath();
				ctx.moveTo(x, y);
				ctx.lineTo(cx + Math.cos(a) * (r + 16), cy + Math.sin(a) * (r + 16));
				ctx.stroke();
				ctx.beginPath();
				ctx.arc(x, y, 4, 0, Math.PI * 2);
				ctx.fillStyle = C.danger;
				ctx.fill();
				ctx.restore();
			}
			for (const [x, y, age, stop] of bursts) burst(ctx, x, y, age, stop < 6 ? C.info : C.danger, 0.6);

			text(ctx, `diblok ${blocked}`, cx - 70, H - 14, { size: 15, weight: 700, color: C.info });
			text(ctx, `tembus ${passed}`, cx + 70, H - 14, { size: 15, weight: 700, color: C.danger });
		},
	};

	// 6. Restriksi ala Google Maps API key: package name + SHA-1 dikirim sebagai header
	scenes.fingerprint = {
		still: 7.4,
		draw(ctx, t) {
			const L = 10;
			t = t % L;
			const SRV = [880, 165];
			const senders = [
				{ y: 55, title: 'App resmi', sub: 'com.contoh.app', at: 0.2, label: 'pkg ✓ · sha1 AB:12…', res: 'ok', note: 'cocok, diizinkan' },
				{ y: 165, title: 'App lain', sub: 'com.tiruan.app', at: 2.6, label: 'pkg ✗ · sha1 99:FE…', res: 'no', note: 'package tidak terdaftar' },
				{ y: 275, title: 'Script curl', sub: 'bukan app sama sekali', at: 6.2, label: 'pkg ✓ · sha1 AB:12…', res: 'warn', note: 'LOLOS! cuma string', bad: true },
			];
			const TRAVEL = 1.1;
			for (const s of senders) {
				wire(ctx, 245, s.y, 705, SRV[1] + (s.y - SRV[1]) * 0.35, t, s.bad ? rgba(C.danger, 0.6) : C.line);
			}
			// APK -> copy headers to script
			const apk = [420, 330];
			if (t > 4.2) {
				const a = pop(t, 4.2, 0.3);
				ctx.save();
				ctx.globalAlpha = a;
				box(ctx, apk[0], apk[1], 84, 34, { stroke: C.muted, r: 4 });
				text(ctx, 'app.apk', apk[0], apk[1] + 1, { size: 12, font: MONO, color: C.muted });
				ctx.restore();
			}
			if (t > 4.6 && t < 5.8) {
				const q = (t - 4.6) / 1.2;
				pill(ctx, 'apksigner → SHA-1', ...along([apk[0], apk[1] - 22], [245, 275], q), C.danger, { size: 11 });
			}
			for (const s of senders) {
				const p = (t - s.at) / TRAVEL;
				if (p >= 0 && p < 1) {
					const end = [705, SRV[1] + (s.y - SRV[1]) * 0.35];
					pill(ctx, s.label, ...along([250, s.y], end, p, false), s.res === 'no' ? C.danger : s.bad ? C.danger : C.accent, { size: 11 });
				}
			}
			senders.forEach((s) => {
				namedNode(ctx, 140, s.y, s.title, s.sub, {
					w: 210,
					stroke: s.bad ? C.danger : C.line,
					titleColor: s.bad ? C.danger : C.text,
					icon: (x, y) => (s.bad ? text(ctx, '>_', x, y, { size: 16, font: MONO, weight: 700, color: C.danger }) : miniPhone(ctx, x, y)),
				});
			});
			const lines = [
				{ text: 'API key restriction', dim: true },
				{ text: 'android app:', dim: true },
				{ text: '  com.contoh.app' },
				{ text: '  SHA-1 AB:12:…:9C' },
				{ text: '' },
			];
			for (const s of senders) {
				const arr = s.at + TRAVEL;
				if (t >= arr) {
					lines.push({
						text: s.title.padEnd(12),
						status: s.res === 'no' ? '403' : '200',
						color: s.res === 'ok' ? C.accent : s.res === 'warn' ? C.warn : C.danger,
						fresh: t - arr < 1.2,
					});
				}
			}
			logPanel(ctx, ...SRV, 330, 300, 'maps.googleapis.com', lines, { lh: 24 });
			for (const s of senders) {
				const age = t - (s.at + TRAVEL);
				if (age < 0 || age > 1.6) continue;
				const y = SRV[1] + (s.y - SRV[1]) * 0.35;
				mark(ctx, 712, y, s.res, { scale: 0.6 + 0.4 * pop(t, s.at + TRAVEL, 0.15) });
				burst(ctx, 712, y, age, s.res === 'ok' ? C.accent : s.res === 'warn' ? C.warn : C.danger);
				text(ctx, s.note, 600, y - 26, {
					size: 13.5,
					weight: 700,
					color: s.res === 'ok' ? C.text : s.res === 'warn' ? C.warn : C.danger,
					alpha: 1 - clamp((age - 1.2) / 0.4, 0, 1),
				});
			}
		},
	};

	// 7. App attestation: token ditandatangani Google/Apple, diverifikasi server
	scenes.attest = {
		still: 3.6,
		draw(ctx, t) {
			const L = 10.5;
			t = t % L;
			const APP = [130, 70];
			const SCR = [130, 280];
			const PLAT = [470, 70];
			const SRV = [880, 175];
			wire(ctx, 225, 70, 375, 70, t);
			wire(ctx, 225, 280, 705, 280, t, rgba(C.danger, 0.6));
			wire(ctx, 210, 262, 390, 92, t, rgba(C.danger, 0.35));
			wire(ctx, 130, 108, 130, 250, t, rgba(C.text, 0));
			// app -> server path (down from app, across)
			ctx.save();
			ctx.strokeStyle = C.line;
			ctx.lineWidth = 2;
			ctx.setLineDash([6, 8]);
			ctx.lineDashOffset = -t * 30;
			ctx.beginPath();
			ctx.moveTo(130, 108);
			ctx.lineTo(130, 175);
			ctx.lineTo(705, 175);
			ctx.stroke();
			ctx.restore();

			// app flow
			if (t > 0.2 && t < 1.0) pill(ctx, 'requestHash', ...along([230, 70], [370, 70], (t - 0.2) / 0.8, false), C.accent, { size: 11 });
			if (t > 1.3 && t < 2.1) pill(ctx, 'token ✍ signed', ...along([370, 70], [230, 70], (t - 1.3) / 0.8, false), C.info, { size: 11 });
			if (t > 2.2 && t < 3.3) {
				const q = (t - 2.2) / 1.1;
				const pos = q < 0.15 ? along([130, 112], [130, 175], q / 0.15, false) : along([130, 175], [700, 175], (q - 0.15) / 0.85, false);
				pill(ctx, 'request + token', ...pos, C.accent, { size: 11 });
			}
			// script flow
			if (t > 5.0 && t < 5.8) pill(ctx, 'minta token?', ...along([215, 258], [385, 95], (t - 5.0) / 0.8, false), C.danger, { size: 11 });
			if (t > 5.8 && t < 7.0) {
				mark(ctx, 300, 176 - 0, 'no', { scale: 0.8, alpha: 1 - clamp((t - 6.6) / 0.4, 0, 1) });
				text(ctx, 'bukan app asli / device asli', 300, 150, { size: 12.5, weight: 700, color: C.danger, alpha: 1 - clamp((t - 6.6) / 0.4, 0, 1) });
			}
			if (t > 7.2 && t < 8.3) pill(ctx, 'request + token lama', ...along([230, 280], [700, 280], (t - 7.2) / 1.1, false), C.danger, { size: 11 });

			namedNode(ctx, ...APP, 'App resmi', 'device asli', { w: 190, icon: (x, y) => miniPhone(ctx, x, y) });
			namedNode(ctx, ...SCR, 'Script curl', 'copy header & key', {
				w: 190,
				stroke: C.danger,
				titleColor: C.danger,
				icon: (x, y) => text(ctx, '>_', x, y, { size: 16, font: MONO, weight: 700, color: C.danger }),
			});
			const platGlow = (t > 0.9 && t < 1.4) || (t > 5.7 && t < 6.0) ? 0.8 : 0;
			namedNode(ctx, ...PLAT, 'Play Integrity', 'App Attest (iOS)', { w: 190, glow: platGlow, stroke: C.info, titleColor: C.info });

			const checks = [
				['appRecognitionVerdict', 'PLAY_RECOGNIZED'],
				['packageName', 'com.contoh.app'],
				['certificateSha256Digest', 'cocok'],
				['deviceRecognitionVerdict', 'MEETS_DEVICE'],
				['requestHash', 'cocok'],
				['timestampMillis', '< 60 dtk'],
			];
			const lines = [];
			if (t > 3.3 && t < 7.2) {
				checks.forEach(([k, v], i) => {
					const at = 3.3 + i * 0.22;
					if (t >= at) lines.push({ text: k, status: v + ' ✓', color: C.accent, fresh: i === checks.length - 1 && t - at < 0.6 });
				});
				if (t > 3.3 + checks.length * 0.22) lines.push({ text: '→ 200 OK', status: '', color: C.accent });
			}
			if (t >= 8.3) {
				lines.push({ text: 'token dari request lain', dim: true });
				lines.push({ text: 'requestHash', status: 'tidak cocok ✗', color: C.danger });
				lines.push({ text: 'timestampMillis', status: 'basi ✗', color: C.danger });
				lines.push({ text: '→ 401', status: '', color: C.danger, fresh: true });
			}
			logPanel(ctx, ...SRV, 330, 290, 'server · verifikasi verdict', lines, { lh: 24 });
			if (t > 4.6 && t < 6.0) {
				mark(ctx, 712, 175, 'ok', { scale: 0.6 + 0.4 * pop(t, 4.6, 0.15) });
				burst(ctx, 712, 175, t - 4.6, C.accent);
			}
			if (t > 8.3 && t < 10) {
				mark(ctx, 712, 280, 'no', { scale: 0.6 + 0.4 * pop(t, 8.3, 0.15) });
				burst(ctx, 712, 280, t - 8.3, C.danger);
			}
		},
	};

	// ------------------------------------------------------------------ runtime
	let active = [];
	let start = performance.now();
	let raf = 0;

	function prep(cv) {
		if (cv.hasAttribute('data-fullscreen')) {
			cv.dataset.w = window.innerWidth;
			cv.dataset.h = window.innerHeight;
			if (cv._ready && cv._w === window.innerWidth && cv._h === window.innerHeight) return;
			cv._ready = false;
		}
		if (cv._ready) return;
		const w = +cv.dataset.w || 1000;
		const h = +cv.dataset.h || 300;
		cv.width = w * DPR;
		cv.height = h * DPR;
		cv.style.width = w + 'px';
		cv.style.height = h + 'px';
		cv._w = w;
		cv._h = h;
		cv._ctx = cv.getContext('2d');
		cv._ready = true;
	}

	function render(cv, t) {
		const scene = scenes[cv.dataset.scene];
		if (!scene) return;
		const ctx = cv._ctx;
		ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
		ctx.clearRect(0, 0, cv._w, cv._h);
		scene.draw(ctx, t, cv._w, cv._h);
	}

	function frame(now) {
		const t = Math.max(0, (now - start) / 1000);
		for (const cv of active) render(cv, t);
		raf = active.length ? requestAnimationFrame(frame) : 0;
	}

	function collect(deck) {
		const slide = deck.getCurrentSlide();
		active = slide ? [...slide.querySelectorAll('canvas[data-scene]')] : [];
		const cover = document.getElementById('cover-bg');
		if (cover && slide && (slide.dataset.state || '').includes('is-cover')) active.push(cover);
		active.forEach(prep);
		start = performance.now();
		if (reduceMotion) {
			active.forEach((cv) => render(cv, scenes[cv.dataset.scene]?.still ?? 0));
			return;
		}
		if (!raf && active.length) raf = requestAnimationFrame(frame);
	}

	window.TalkDiagrams = {
		scenes,
		init(deck) {
			loadColors();
			// render a still frame everywhere (overview mode, PDF export)
			document.querySelectorAll('canvas[data-scene]').forEach((cv) => {
				prep(cv);
				render(cv, scenes[cv.dataset.scene]?.still ?? 0);
			});
			deck.on('slidechanged', () => collect(deck));
			window.addEventListener('resize', () => {
				const cover = document.getElementById('cover-bg');
				if (cover) {
					prep(cover);
					render(cover, scenes.orbit.still);
				}
			});
			collect(deck);
		},
	};
})();
