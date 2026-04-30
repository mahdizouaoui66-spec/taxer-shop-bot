const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');
const path = require('path');
const https = require('https');
const http  = require('http');

// Télécharger une image depuis une URL
function fetchImage(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    protocol.get(url, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

// Dessiner un rectangle arrondi
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

async function generate({ username, avatarURL, rank, points, msgsToday, xp, xpMax, stats }) {
  const W = 900, H = 360;
  const canvas = createCanvas(W, H);
  const ctx    = canvas.getContext('2d');

  // ── Fond principal ──────────────────────────────────────────
  ctx.fillStyle = '#0d0d1a';
  ctx.fillRect(0, 0, W, H);

  // Bordure extérieure violette
  ctx.strokeStyle = '#5b4fcf';
  ctx.lineWidth   = 2;
  roundRect(ctx, 2, 2, W - 4, H - 4, 12);
  ctx.stroke();

  // Ligne déco haut
  const gradTop = ctx.createLinearGradient(0, 0, W, 0);
  gradTop.addColorStop(0,   'transparent');
  gradTop.addColorStop(0.3, '#5b4fcf');
  gradTop.addColorStop(0.7, '#3b82f6');
  gradTop.addColorStop(1,   'transparent');
  ctx.fillStyle = gradTop;
  ctx.fillRect(0, 0, W, 3);

  // Ligne déco bas
  ctx.fillStyle = gradTop;
  ctx.fillRect(0, H - 3, W, 3);

  // ── Avatar ──────────────────────────────────────────────────
  const AVATAR_X = 75, AVATAR_Y = H / 2, AVATAR_R = 70;

  // Anneau extérieur dégradé
  const ringGrad = ctx.createLinearGradient(
    AVATAR_X - AVATAR_R, AVATAR_Y - AVATAR_R,
    AVATAR_X + AVATAR_R, AVATAR_Y + AVATAR_R
  );
  ringGrad.addColorStop(0, '#7c6bff');
  ringGrad.addColorStop(1, '#3b82f6');
  ctx.beginPath();
  ctx.arc(AVATAR_X, AVATAR_Y, AVATAR_R + 5, 0, Math.PI * 2);
  ctx.fillStyle = ringGrad;
  ctx.fill();

  // Cercle intérieur sombre
  ctx.beginPath();
  ctx.arc(AVATAR_X, AVATAR_Y, AVATAR_R + 2, 0, Math.PI * 2);
  ctx.fillStyle = '#0d0d1a';
  ctx.fill();

  // Photo avatar
  try {
    const avatarBuf = await fetchImage(avatarURL);
    const avatarImg = await loadImage(avatarBuf);
    ctx.save();
    ctx.beginPath();
    ctx.arc(AVATAR_X, AVATAR_Y, AVATAR_R, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatarImg, AVATAR_X - AVATAR_R, AVATAR_Y - AVATAR_R, AVATAR_R * 2, AVATAR_R * 2);
    ctx.restore();
  } catch {
    // Fallback si avatar indisponible
    ctx.beginPath();
    ctx.arc(AVATAR_X, AVATAR_Y, AVATAR_R, 0, Math.PI * 2);
    ctx.fillStyle = '#2d2b55';
    ctx.fill();
    ctx.fillStyle = '#7c6bff';
    ctx.font      = 'bold 48px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(username[0].toUpperCase(), AVATAR_X, AVATAR_Y);
  }

  // Rang sous avatar
  const rankGrad = ctx.createLinearGradient(0, 0, 120, 0);
  rankGrad.addColorStop(0, '#5b4fcf');
  rankGrad.addColorStop(1, '#3b82f6');
  roundRect(ctx, AVATAR_X - 50, AVATAR_Y + AVATAR_R + 10, 100, 26, 13);
  ctx.fillStyle = rankGrad;
  ctx.fill();
  ctx.fillStyle    = '#ffffff';
  ctx.font         = 'bold 13px sans-serif';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`🏆 #${rank}`, AVATAR_X, AVATAR_Y + AVATAR_R + 23);

  // ── Infos droite ────────────────────────────────────────────
  const RX = 200; // début zone droite

  // Nom d'utilisateur
  ctx.fillStyle    = '#e8e0ff';
  ctx.font         = 'bold 32px sans-serif';
  ctx.textAlign    = 'right';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(username, W - 30, 80);

  // Ligne séparatrice sous le nom
  const lineGrad = ctx.createLinearGradient(RX, 0, W - 30, 0);
  lineGrad.addColorStop(0, 'transparent');
  lineGrad.addColorStop(0.3, '#5b4fcf');
  lineGrad.addColorStop(1, '#3b82f6');
  ctx.fillStyle = lineGrad;
  ctx.fillRect(RX, 92, W - RX - 30, 1.5);

  // Label "رسائل اليوم"
  ctx.fillStyle    = '#8b80c8';
  ctx.font         = '14px sans-serif';
  ctx.textAlign    = 'right';
  ctx.fillText('رسائل اليوم', W - 30, 120);

  // Nombre de messages
  ctx.fillStyle = '#c4a9ff';
  ctx.font      = 'bold 52px sans-serif';
  ctx.fillText(String(msgsToday), W - 30, 175);

  // ── Barre XP ────────────────────────────────────────────────
  const BAR_X = RX, BAR_Y = 200, BAR_W = W - RX - 30, BAR_H = 12;
  const xpPct = Math.min(xp / xpMax, 1);

  // Fond barre
  roundRect(ctx, BAR_X, BAR_Y, BAR_W, BAR_H, 6);
  ctx.fillStyle = '#1e1b3a';
  ctx.fill();

  // Remplissage barre dégradé
  if (xpPct > 0) {
    const barGrad = ctx.createLinearGradient(BAR_X, 0, BAR_X + BAR_W * xpPct, 0);
    barGrad.addColorStop(0, '#7c6bff');
    barGrad.addColorStop(1, '#3b82f6');
    roundRect(ctx, BAR_X, BAR_Y, BAR_W * xpPct, BAR_H, 6);
    ctx.fillStyle = barGrad;
    ctx.fill();
  }

  // Labels XP
  ctx.fillStyle    = '#6b63a8';
  ctx.font         = '12px sans-serif';
  ctx.textAlign    = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(`${xp} / ${xpMax}`, BAR_X, BAR_Y + BAR_H + 6);

  ctx.textAlign = 'right';
  ctx.fillText(`إجمالي النقاط: ${points}`, W - 30, BAR_Y + BAR_H + 6);

  // ── Cartes stats ────────────────────────────────────────────
  const STATS_LABELS = ['تكت', 'بون', 'رسائل', 'إدارة', 'مسؤولية', 'إضافية'];
  const STATS_VALS   = [stats.tickets, stats.bans, stats.warns, stats.kicks, stats.mutes, stats.autres];
  const CARD_Y       = 245;
  const CARD_H       = 75;
  const CARD_W       = Math.floor((W - RX - 30 - 5 * 8) / 6);

  for (let i = 0; i < 6; i++) {
    const cx = RX + i * (CARD_W + 8);

    // Fond carte (premier = highlighted)
    roundRect(ctx, cx, CARD_Y, CARD_W, CARD_H, 8);
    if (i === 0) {
      const cGrad = ctx.createLinearGradient(cx, CARD_Y, cx, CARD_Y + CARD_H);
      cGrad.addColorStop(0, '#2d2060');
      cGrad.addColorStop(1, '#1a1440');
      ctx.fillStyle = cGrad;
    } else {
      ctx.fillStyle = '#13112a';
    }
    ctx.fill();

    // Bordure carte
    roundRect(ctx, cx, CARD_Y, CARD_W, CARD_H, 8);
    ctx.strokeStyle = i === 0 ? '#5b4fcf' : '#2a2545';
    ctx.lineWidth   = i === 0 ? 1.5 : 0.5;
    ctx.stroke();

    // Valeur
    ctx.fillStyle    = i === 0 ? '#c4a9ff' : '#9d94d6';
    ctx.font         = `bold ${i === 0 ? 22 : 18}px sans-serif`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(STATS_VALS[i]), cx + CARD_W / 2, CARD_Y + CARD_H / 2 - 10);

    // Label
    ctx.fillStyle = '#5a5488';
    ctx.font      = '11px sans-serif';
    ctx.fillText(STATS_LABELS[i], cx + CARD_W / 2, CARD_Y + CARD_H / 2 + 14);
  }

  return canvas.toBuffer('image/png');
}

module.exports = { generate };
