const { AttachmentBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, PermissionFlagsBits } = require('discord.js');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const config      = require('../config.json');
const db          = require('../utils/db.js');

const PROFILE_CHANNEL_ID = '1416486448361902261';
const OFFERS_CATEGORY_ID = '1385261194616508470';
const ADMIN_ROLE_IDS     = config.tickets.adminRoleIds || [];
const STAFF_ROLE_ID      = config.tickets.staffRoleId;

const BANNER_URL = 'https://media.discordapp.net/attachments/1385261281015238698/1495769057763397712/Taxer_shop_logo.png?ex=69e772fd&is=69e6217d&hm=5ce12815b1b94c5739b6f440379312234a7c8bf859d417649bbc4ee3c3f37558&=&format=webp&quality=lossless&width=958&height=958';

function isStaff(member) {
  return member.permissions.has(PermissionFlagsBits.Administrator)
      || ADMIN_ROLE_IDS.some(id => member.roles.cache.has(id))
      || member.roles.cache.has(STAFF_ROLE_ID);
}

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

async function sendProfileCard(message, target) {
  const userData = db.getUser(target.user.id);
  const rank     = db.getRank(target.user.id);

  const W = 700, H = 280;
  const canvas = createCanvas(W, H);
  const ctx    = canvas.getContext('2d');

  // Fond noir
  ctx.fillStyle = '#0d0d0d';
  ctx.fillRect(0, 0, W, H);

  // Bordure rouge
  ctx.strokeStyle = '#cc0000';
  ctx.lineWidth = 3;
  ctx.strokeRect(2, 2, W - 4, H - 4);

  // Ligne rouge en haut
  const grad = ctx.createLinearGradient(0, 0, W, 0);
  grad.addColorStop(0, 'transparent');
  grad.addColorStop(0.3, '#cc0000');
  grad.addColorStop(0.7, '#cc0000');
  grad.addColorStop(1, 'transparent');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, 3);

  // Avatar
  const avatarSize = 110;
  const avatarX    = 40;
  const avatarY    = H / 2 - avatarSize / 2;

  try {
    const avatarURL = target.user.displayAvatarURL({ extension: 'png', size: 256 });
    const avatar    = await loadImage(avatarURL);

    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2 + 4, 0, Math.PI * 2);
    ctx.fillStyle = '#cc0000';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2 + 2, 0, Math.PI * 2);
    ctx.fillStyle = '#0d0d0d';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
    ctx.restore();
  } catch {}

  // Rank badge
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

  // Nom
  const textX = avatarX + avatarSize + 30;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 26px sans-serif';
  const displayName = target.displayName ?? target.user.username;
  ctx.fillText(displayName.length > 18 ? displayName.slice(0, 18) + '…' : displayName, textX, 55);

  ctx.fillStyle = '#888888';
  ctx.font = '14px sans-serif';
  ctx.fillText(`@${target.user.username}`, textX, 78);

  // XP Bar
  const barX = textX, barY = 95, barW = W - textX - 40, barH = 14;

  ctx.fillStyle = '#1a1a1a';
  roundRect(ctx, barX, barY, barW, barH, 7);
  ctx.fill();

  const xpRatio = Math.min(userData.xp / userData.xpMax, 1);
  if (xpRatio > 0) {
    const xpGrad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
    xpGrad.addColorStop(0, '#880000');
    xpGrad.addColorStop(1, '#ff2222');
    ctx.fillStyle = xpGrad;
    roundRect(ctx, barX, barY, barW * xpRatio, barH, 7);
    ctx.fill();
  }

  ctx.strokeStyle = '#cc0000';
  ctx.lineWidth = 1;
  roundRect(ctx, barX, barY, barW, barH, 7);
  ctx.stroke();

  ctx.fillStyle = '#aaaaaa';
  ctx.font = '12px sans-serif';
  ctx.fillText(`${userData.xp} / ${userData.xpMax} XP`, barX, barY - 5);

  // Stats
  const stats = [
    { label: 'تكت',     key: 'tickets' },
    { label: 'بان',     key: 'bans'    },
    { label: 'ميوت',    key: 'mutes'   },
    { label: 'كيك',     key: 'kicks'   },
    { label: 'مسؤولية', key: 'autres'  },
    { label: 'تحذير',   key: 'warns'   },
  ];

  const statBoxW = 72, statBoxH = 52;
  const statY    = 125;
  const gap      = 10;

  stats.forEach((s, i) => {
    const bx = textX + i * (statBoxW + gap);
    const by = statY;

    ctx.fillStyle = '#111111';
    ctx.strokeStyle = '#2a2a2a';
    ctx.lineWidth = 1;
    roundRect(ctx, bx, by, statBoxW, statBoxH, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(userData.stats[s.key] ?? 0, bx + statBoxW / 2, by + 30);

    ctx.fillStyle = '#666666';
    ctx.font = '11px sans-serif';
    ctx.fillText(s.label, bx + statBoxW / 2, by + 46);
  });

  // Points
  ctx.textAlign = 'left';
  ctx.fillStyle = '#cc0000';
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText(`نقاط: ${userData.points}`, textX, 205);

  ctx.fillStyle = '#555555';
  ctx.font = '13px sans-serif';
  ctx.fillText(`رسائل اليوم: ${userData.msgsToday}`, textX + 130, 205);

  // Watermark
  ctx.fillStyle = '#cc0000';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('Taxer Shop', W - 20, 25);

  ctx.fillStyle = '#333333';
  ctx.font = '11px sans-serif';
  ctx.fillText(`ID: ${target.user.id}`, W - 20, H - 12);

  const buffer     = canvas.toBuffer('image/png');
  const attachment = new AttachmentBuilder(buffer, { name: 'profile.png' });
  await message.channel.send({ files: [attachment] });
  message.delete().catch(() => {});
}

module.exports = {
  name: 'messageCreate',
  async execute(message, client) {
    if (message.author.bot) return;

    // Embed automatique dans la catégorie offers
    if (message.channel.parentId === OFFERS_CATEGORY_ID) {
      try {
        const offerEmbed = new EmbedBuilder()
          .setColor('#5b4fcf')
          .setImage(BANNER_URL)
          .setDescription(
            `**${message.content}**\n\n` +
            `If You Want Open Ticket And Tag Me <#1385261245107671112>\n\n` +
            `For : @here`
          )
          .setFooter({ text: 'Taxer Shop', iconURL: message.guild.iconURL() })
          .setTimestamp();

        await message.channel.send({ embeds: [offerEmbed] });
        await message.delete().catch(() => {});
      } catch(e) { console.error('Offer embed error:', e); }
      return;
    }

    if (!message.content.startsWith('+')) return;

    const args    = message.content.slice(1).trim().split(/ +/);
    const command = args.shift().toLowerCase();
    const member  = message.guild?.members.cache.get(message.author.id);
    if (!member) return;

    // +profile
    if (command === 'profile') {
      if (message.channel.id !== PROFILE_CHANNEL_ID) {
        return message.reply({ content: `❌ هذا الأمر متاح فقط في <#${PROFILE_CHANNEL_ID}>` })
          .then(m => setTimeout(() => m.delete().catch(() => {}), 5000));
      }
      if (!isStaff(member)) {
        return message.reply({ content: '❌ هذا الأمر للإدارة فقط!' })
          .then(m => setTimeout(() => m.delete().catch(() => {}), 5000));
      }
      const target = message.mentions.members.first() || member;
      await sendProfileCard(message, target);
      return;
    }

    // +panel
    if (command === 'panel') {
      if (!isStaff(member)) return;
      const icEvent  = require('./interactionCreate');
      const info     = icEvent.ticketInfo?.get(message.channel.id);
      const claimer  = icEvent.claimedBy?.get(message.channel.id);

      const openerVal  = info ? info.opener      : 'غير معروف';
      const claimerVal = claimer ? `<@${claimer.userId}>` : 'لا أحد بعد';
      const timeVal    = info ? `<t:${Math.floor(info.openedAt/1000)}:R>` : 'غير معروف';
      const numVal     = info ? `#${String(info.ticketNum).padStart(4,'0')}` : message.channel.name;
      const catLabel   = info ? `${info.cat.emoji} ${info.cat.label}` : '';

      const embed = new EmbedBuilder()
        .setTitle(`إدارة التذكرة — ${numVal} ${catLabel}`)
        .setColor('#2b2d31')
        .addFields(
          { name: '👤 فُتح بواسطة',  value: openerVal,  inline: true },
          { name: '✅ مستلم بواسطة', value: claimerVal, inline: true },
          { name: '🕐 وقت الفتح',    value: timeVal,    inline: true },
        )
        .setDescription(
          '**⚡ أوامر سريعة:**\n' +
          '`+tadd @عضو` • `+tremove @عضو` • `+rename اسم` • `+close` • `+delete`'
        );

      const menu = new StringSelectMenuBuilder()
        .setCustomId('ticket_manage')
        .setPlaceholder('...اختر العملية')
        .addOptions([
          { label: 'Add Member',    description: 'أضف عضو للتكت',      value: 'manage_add',    emoji: '➕' },
          { label: 'Remove Member', description: 'أزل عضو من التكت',   value: 'manage_remove', emoji: '➖' },
          { label: 'Rename Ticket', description: 'غير اسم قناة التكت', value: 'manage_rename', emoji: '✏️' },
          { label: 'Close Ticket',  description: 'أغلق وحذف التكت',    value: 'manage_close',  emoji: '🔒' },
        ]);

      await message.channel.send({ embeds: [embed], components: [new ActionRowBuilder().addComponents(menu)] });
      message.delete().catch(() => {});
      return;
    }

    // +points @user <nb>
    if (command === 'points') {
      if (!member.permissions.has(PermissionFlagsBits.Administrator)) return;
      const target = message.mentions.users.first();
      const amount = parseInt(args[1]);
      if (!target || isNaN(amount)) return message.reply('الاستخدام: `+points @user 5`');
      db.addPoints(target.id, amount, 'autres');
      message.reply(`✅ تم إضافة **${amount}** نقطة لـ ${target}`);
      return;
    }

    // +tadd @user
    if (command === 'tadd') {
      if (!isStaff(member)) return;
      const target = message.mentions.members.first();
      if (!target) return message.reply('الاستخدام: `+tadd @عضو`');
      await message.channel.permissionOverwrites.edit(target, {
        ViewChannel: true, SendMessages: true, ReadMessageHistory: true,
      });
      message.reply(`✅ تم إضافة ${target} للتذكرة!`);
      return;
    }

    // +tremove @user
    if (command === 'tremove') {
      if (!isStaff(member)) return;
      const target = message.mentions.members.first();
      if (!target) return message.reply('الاستخدام: `+tremove @عضو`');
      await message.channel.permissionOverwrites.edit(target, { ViewChannel: false });
      message.reply(`✅ تم إزالة ${target} من التذكرة!`);
      return;
    }

    // +rename <nom>
    if (command === 'rename') {
      if (!isStaff(member)) return;
      const newName = args.join('-').toLowerCase().replace(/[^a-z0-9-]/g, '');
      if (!newName) return message.reply('الاستخدام: `+rename الاسم-الجديد`');
      await message.channel.setName(newName);
      message.reply(`✅ تم تغيير اسم القناة إلى **${newName}**!`);
      return;
    }

    // +close
    if (command === 'close') {
      if (!isStaff(member)) return;
      await message.reply('🔒 جاري إغلاق التذكرة خلال 3 ثواني...');
      setTimeout(() => message.channel.delete().catch(() => {}), 3000);
      return;
    }

    // +delete
    if (command === 'delete') {
      if (!member.permissions.has(PermissionFlagsBits.Administrator)) return;
      await message.reply('🗑️ جاري حذف التذكرة...');
      setTimeout(() => message.channel.delete().catch(() => {}), 2000);
      return;
    }
  }
};
