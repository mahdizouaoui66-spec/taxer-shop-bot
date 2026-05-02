const { AttachmentBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, PermissionFlagsBits } = require('discord.js');
const config      = require('../config.json');
const db          = require('../utils/db.js');
const profileCard = require('../utils/profileCard.js');

const PROFILE_CHANNEL_ID = '1416486448361902261';
const TOP_CHANNEL_ID     = '1495122586005278842';
const ADMIN_ROLE_IDS     = config.tickets.adminRoleIds || [];
const STAFF_ROLE_ID      = config.tickets.staffRoleId;

// Top journalier activé ou non
const TOP_ENABLED = false; // ← mets true quand tu veux activer

// Compteur de messages par jour
const msgCount = new Map();

function isStaff(member) {
  return member.permissions.has(PermissionFlagsBits.Administrator)
      || ADMIN_ROLE_IDS.some(id => member.roles.cache.has(id))
      || member.roles.cache.has(STAFF_ROLE_ID);
}

// Envoyer le top journalier à minuit
function scheduleDailyTop(client) {
  if (!TOP_ENABLED) return;
  const now  = new Date();
  const next = new Date();
  next.setHours(24, 0, 0, 0);
  const msUntilMidnight = next - now;

  setTimeout(async () => {
    try {
      const sorted = [...msgCount.entries()]
        .sort(([,a],[,b]) => b - a)
        .slice(0, 10);

      if (!sorted.length) { msgCount.clear(); scheduleDailyTop(client); return; }

      const date   = new Date().toISOString().split('T')[0];
      const lines  = sorted.map(([id, count], i) => {
        const medals = ['🥇','🥈','🥉'];
        const medal  = medals[i] ?? `**#${i+1}**`;
        return `${medal} <@${id}> — **${count}** رسالة`;
      }).join('\n');

      const pointLines = sorted.map(([id, count], i) => {
        const pts = 10 - i;
        db.addPoints(id, pts, 'autres');
        return `• <@${id}> التوب ${i+1} له **${pts}** نقاط`;
      }).join('\n');

      const guild = client.guilds.cache.first();
      const ch    = guild?.channels.cache.get(TOP_CHANNEL_ID);
      if (ch) {
        await ch.send({ embeds: [
          new EmbedBuilder()
            .setTitle(`. Hollywood 50K 🏆 توب الشات اليومي 🏆`)
            .setDescription(`**${date}**`)
            .setColor('#5b4fcf')
            .addFields(
              { name: 'الترتيب', value: lines },
              { name: '🏆 نظام الترقيات عبر التوب', value: `هذه النقاط ستوزع يومياً عبر التوب اليومي\n\n${pointLines}` }
            )
            .setTimestamp()
        ]});
      }
    } catch(e) { console.error('Daily top error:', e); }
    msgCount.clear();
    scheduleDailyTop(client);
  }, msUntilMidnight);
}

module.exports = {
  name: 'messageCreate',
  async execute(message, client) {
    if (message.author.bot) return;

    // Compter les messages pour le top journalier
    if (TOP_ENABLED && !message.content.startsWith('+')) {
      const count = msgCount.get(message.author.id) || 0;
      msgCount.set(message.author.id, count + 1);
    }

    // Lancer le scheduler au premier message
    if (!module.exports._scheduled) {
      module.exports._scheduled = true;
      scheduleDailyTop(client);
    }

    if (!message.content.startsWith('+')) return;

    const args    = message.content.slice(1).trim().split(/ +/);
    const command = args.shift().toLowerCase();
    const member  = message.guild?.members.cache.get(message.author.id);
    if (!member) return;

    // ── +profile ──────────────────────────────────────────────
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
      const data   = db.getUser(target.user.id);
      try {
        await message.channel.sendTyping();
        const imageBuffer = await profileCard.generate({
          username:  target.user.username,
          avatarURL: target.user.displayAvatarURL({ extension: 'png', size: 256 }),
          rank:      db.getRank(target.user.id),
          points:    data.points,
          msgsToday: data.msgsToday,
          xp:        data.xp,
          xpMax:     data.xpMax,
          stats:     data.stats,
        });
        await message.channel.send({ files: [new AttachmentBuilder(imageBuffer, { name: 'profile.png' })] });
        message.delete().catch(() => {});
      } catch (err) {
        console.error('Profile card error:', err);
        message.reply('❌ خطأ في توليد البطاقة. تأكد من: npm install @napi-rs/canvas');
      }
      return;
    }

    // ── +panel (affiche le panel de gestion dans le ticket) ───
    if (command === 'panel') {
      if (!isStaff(member)) return;

      // Récupérer les infos du ticket depuis interactionCreate
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

      await message.channel.send({
        embeds: [embed],
        components: [new ActionRowBuilder().addComponents(menu)]
      });
      message.delete().catch(() => {});
      return;
    }

    // ── +points @user <nb> ────────────────────────────────────
    if (command === 'points') {
      if (!member.permissions.has(PermissionFlagsBits.Administrator)) return;
      const target = message.mentions.users.first();
      const amount = parseInt(args[1]);
      if (!target || isNaN(amount)) return message.reply('الاستخدام: `+points @user 5`');
      db.addPoints(target.id, amount, 'autres');
      message.reply(`✅ تم إضافة **${amount}** نقطة لـ ${target}`);
      return;
    }

    // ── +tadd @user ───────────────────────────────────────────
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

    // ── +tremove @user ────────────────────────────────────────
    if (command === 'tremove') {
      if (!isStaff(member)) return;
      const target = message.mentions.members.first();
      if (!target) return message.reply('الاستخدام: `+tremove @عضو`');
      await message.channel.permissionOverwrites.edit(target, { ViewChannel: false });
      message.reply(`✅ تم إزالة ${target} من التذكرة!`);
      return;
    }

    // ── +rename <nom> ─────────────────────────────────────────
    if (command === 'rename') {
      if (!isStaff(member)) return;
      const newName = args.join('-').toLowerCase().replace(/[^a-z0-9-]/g, '');
      if (!newName) return message.reply('الاستخدام: `+rename الاسم-الجديد`');
      await message.channel.setName(newName);
      message.reply(`✅ تم تغيير اسم القناة إلى **${newName}**!`);
      return;
    }

    // ── +close ────────────────────────────────────────────────
    if (command === 'close') {
      if (!isStaff(member)) return;
      await message.reply('🔒 جاري إغلاق التذكرة خلال 3 ثواني...');
      setTimeout(() => message.channel.delete().catch(() => {}), 3000);
      return;
    }

    // ── +delete (admin only) ──────────────────────────────────
    if (command === 'delete') {
      if (!member.permissions.has(PermissionFlagsBits.Administrator)) return;
      await message.reply('🗑️ جاري حذف التذكرة...');
      setTimeout(() => message.channel.delete().catch(() => {}), 2000);
      return;
    }
  }
};
