const { SlashCommandBuilder, AttachmentBuilder, PermissionFlagsBits } = require('discord.js');
const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');
const db = require('../utils/db.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('profile')
    .setDescription('عرض بطاقة الملف الشخصي')
    .addUserOption(o => o.setName('membre').setDescription('العضو').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.deferReply();

    const target = interaction.options.getUser('membre') ?? interaction.user;
    const member = await interaction.guild.members.fetch(target.id).catch(() => null);

    const userData = db.getUser(target.id);
    const rank     = db.getRank(target.id);

    // ── Canvas setup ──
    const W = 700, H = 280;
    const canvas = createCanvas(W, H);
    const ctx    = canvas.getContext('2d');

    // Fond noir
    ctx.fillStyle = '#0d0d0d';
    ctx.fillRect(0, 0, W, H);

    // Bordure rouge extérieure
    ctx.strokeStyle = '#cc0000';
    ctx.lineWidth = 3;
    ctx.strokeRect(2, 2, W - 4, H - 4);

    // Ligne décorative rouge en haut
    const grad = ctx.createLinearGradient(0, 0, W, 0);
    grad.addColorStop(0, 'transparent');
    grad.addColorStop(0.3, '#cc0000');
    grad.addColorStop(0.7, '#cc0000');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, 3);

    // ── Avatar ──
    const avatarSize = 110;
    const avatarX    = 40;
    const avatarY    = H / 2 - avatarSize / 2;

    try {
      const avatarURL = target.displayAvatarURL({ extension: 'png', size: 256 });
      const avatar    = await loadImage(avatarURL);

      // Cercle rouge derrière avatar
      ctx.save();
      ctx.beginPath();
      ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2 + 4, 0, Math.PI * 2);
      ctx.fillStyle = '#cc0000';
      ctx.fill();

      // Cercle noir entre bordure et avatar
      ctx.beginPath();
      ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2 + 2, 0, Math.PI * 2);
      ctx.fillStyle = '#0d0d0d';
      ctx.fill();

      // Avatar clippé en cercle
      ctx.beginPath();
      ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
      ctx.restore();
    } catch {}

    // ── Rank badge ──
    ctx.fillStyle = '#1a0000';
    ctx.strokeStyle = '#cc0000';
    ctx.lineWidth = 1.5;
    roundRect(ctx, avatarX, avatarY + avatarSize + 8, avatarSize, 24, 5);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#cc0000';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`# ${rank}`, avatarX + avatarSize / 2, avatarY + avatarSize + 24);

    // ── Nom ──
    const textX = avatarX + avatarSize + 30;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 26px sans-serif';
    const displayName = member?.displayName ?? target.username;
    ctx.fillText(displayName.length > 18 ? displayName.slice(0, 18) + '…' : displayName, textX, 55);

    // Tag serveur (gris)
    ctx.fillStyle = '#888888';
    ctx.font = '14px sans-serif';
    ctx.fillText(`@${target.username}`, textX, 78);

    // ── XP Bar ──
    const barX = textX, barY = 95, barW = W - textX - 40, barH = 14;

    // Fond barre
    ctx.fillStyle = '#1a1a1a';
    roundRect(ctx, barX, barY, barW, barH, 7);
    ctx.fill();

    // Remplissage XP
    const xpRatio = Math.min(userData.xp / userData.xpMax, 1);
    if (xpRatio > 0) {
      const xpGrad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
      xpGrad.addColorStop(0, '#880000');
      xpGrad.addColorStop(1, '#ff2222');
      ctx.fillStyle = xpGrad;
      roundRect(ctx, barX, barY, barW * xpRatio, barH, 7);
      ctx.fill();
    }

    // Bordure barre
    ctx.strokeStyle = '#cc0000';
    ctx.lineWidth = 1;
    roundRect(ctx, barX, barY, barW, barH, 7);
    ctx.stroke();

    // Texte XP
    ctx.fillStyle = '#aaaaaa';
    ctx.font = '12px sans-serif';
    ctx.fillText(`${userData.xp} / ${userData.xpMax} XP`, barX, barY - 5);

    // ── Stats ──
    const stats = [
      { label: 'تكت',      key: 'tickets' },
      { label: 'بان',      key: 'bans'    },
      { label: 'ميوت',     key: 'mutes'   },
      { label: 'كيك',      key: 'kicks'   },
      { label: 'مسؤولية',  key: 'autres'  },
      { label: 'تحذير',    key: 'warns'   },
    ];

    const statBoxW  = 72, statBoxH = 52;
    const statStartX = textX;
    const statY      = 125;
    const gap        = 10;

    stats.forEach((s, i) => {
      const bx = statStartX + i * (statBoxW + gap);
      const by = statY;

      ctx.fillStyle = '#111111';
      ctx.strokeStyle = '#2a2a2a';
      ctx.lineWidth = 1;
      roundRect(ctx, bx, by, statBoxW, statBoxH, 6);
      ctx.fill();
      ctx.stroke();

      // Valeur
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 22px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(userData.stats[s.key] ?? 0, bx + statBoxW / 2, by + 30);

      // Label
      ctx.fillStyle = '#666666';
      ctx.font = '11px sans-serif';
      ctx.fillText(s.label, bx + statBoxW / 2, by + 46);
    });

    // ── Points & msgs today ──
    ctx.textAlign = 'left';
    ctx.fillStyle = '#cc0000';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText(`نقاط: ${userData.points}`, textX, 205);

    ctx.fillStyle = '#555555';
    ctx.font = '13px sans-serif';
    ctx.fillText(`رسائل اليوم: ${userData.msgsToday}`, textX + 130, 205);

    // ── Watermark ──
    ctx.fillStyle = '#cc0000';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('Taxer Shop', W - 20, 25);

    ctx.fillStyle = '#333333';
    ctx.font = '11px sans-serif';
    ctx.fillText(`ID: ${target.id}`, W - 20, H - 12);

    // ── Export ──
    const buffer     = canvas.toBuffer('image/png');
    const attachment = new AttachmentBuilder(buffer, { name: 'profile.png' });
    await interaction.editReply({ files: [attachment] });
  }
};

// Helper : rectangle arrondi compatible napi-rs/canvas
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
