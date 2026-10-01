// Small helpers shared by /50-off and /quote: confetti, haptics, UTM capture, view tracking.

const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const COLORS = ["#ff4d6d", "#ff758f", "#ffb3c1", "#a4133c", "#ffd166", "#ffffff"];

let canvas, ctx, parts = [], raf = null;
function ensureCanvas() {
  if (canvas) return;
  canvas = document.createElement("canvas");
  canvas.id = "fx";
  canvas.setAttribute("aria-hidden", "true");
  document.body.appendChild(canvas);
  ctx = canvas.getContext("2d");
  const size = () => {
    canvas.width = innerWidth * devicePixelRatio;
    canvas.height = innerHeight * devicePixelRatio;
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  };
  size();
  addEventListener("resize", size);
}

function tick() {
  ctx.clearRect(0, 0, innerWidth, innerHeight);
  parts = parts.filter((p) => p.life > 0);
  for (const p of parts) {
    p.vy += 0.25; p.vx *= 0.985; p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.life -= 1;
    ctx.save();
    ctx.globalAlpha = Math.min(1, p.life / 30);
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.fillStyle = p.c;
    if (p.shape === "s") { ctx.font = `${p.size * 2}px sans-serif`; ctx.fillText("✨", 0, 0); }
    else ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
    ctx.restore();
  }
  raf = parts.length ? requestAnimationFrame(tick) : null;
}

export function burst(x, y, count = 18, power = 6) {
  if (reduce) return;
  ensureCanvas();
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = power * (0.5 + Math.random());
    parts.push({
      x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - power * 0.6,
      rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4,
      size: 6 + Math.random() * 6, c: COLORS[(Math.random() * COLORS.length) | 0],
      life: 50 + Math.random() * 30, shape: "r",
    });
  }
  if (!raf) raf = requestAnimationFrame(tick);
}

export function bigCelebration() {
  if (reduce) return;
  const w = innerWidth;
  burst(w * 0.2, innerHeight * 0.35, 60, 11);
  setTimeout(() => burst(w * 0.8, innerHeight * 0.35, 60, 11), 180);
  setTimeout(() => burst(w * 0.5, innerHeight * 0.25, 80, 13), 360);
}

export function buzz(ms = 12) {
  try { navigator.vibrate && navigator.vibrate(ms); } catch {}
}

export function burstFrom(el, count, power) {
  const r = el.getBoundingClientRect();
  burst(r.left + r.width / 2, r.top + r.height / 2, count, power);
}

const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid"];
export function getUtm() {
  const q = new URLSearchParams(location.search);
  let saved = {};
  try { saved = JSON.parse(sessionStorage.getItem("rr_utm") || "{}"); } catch {}
  const out = { ...saved };
  for (const k of UTM_KEYS) if (q.get(k)) out[k] = q.get(k).slice(0, 150);
  if (!out.utm_source && q.get("fbclid")) { out.utm_source = "facebook"; out.utm_medium = out.utm_medium || "paid"; }
  try { sessionStorage.setItem("rr_utm", JSON.stringify(out)); } catch {}
  return out;
}

export function trackView(page, detail = "") {
  const body = JSON.stringify({ page, detail, referrer: document.referrer, ...getUtm() });
  try {
    if (navigator.sendBeacon) navigator.sendBeacon("/api/track-view", new Blob([body], { type: "application/json" }));
    else fetch("/api/track-view", { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true });
  } catch {}
}

export function countUp(el, to, ms = 900) {
  if (reduce) { el.textContent = "$" + to.toLocaleString("en-US"); return; }
  const start = performance.now();
  const step = (t) => {
    const k = Math.min(1, (t - start) / ms);
    const e = 1 - Math.pow(1 - k, 3);
    el.textContent = "$" + Math.round(to * e).toLocaleString("en-US");
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
