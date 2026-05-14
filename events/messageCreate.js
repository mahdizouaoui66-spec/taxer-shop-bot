const { AttachmentBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, PermissionFlagsBits } = require('discord.js');
const config      = require('../config.json');
const db          = require('../utils/db.js');

const PROFILE_CHANNEL_ID = '1416486448361902261';
const OFFERS_CATEGORY_ID = '1385261194616508470';
const ADMIN_ROLE_IDS     = config.tickets.adminRoleIds || [];
const STAFF_ROLE_ID      = config.tickets.staffRoleId;

// Banner TS image URL — remplace par ton vrai lien si tu en as un
const BANNER_URL = 'https://media.discordapp.net/attachments/1385261281015238698/1495769057763397712/Taxer_shop_logo.png?ex=69e772fd&is=69e6217d&hm=5ce12815b1b94c5739b6f440379312234a7c8bf859d417649bbc4ee3c3f37558&=&format=webp&quality=lossless&width=958&height=958';

function isStaff(member) {
  return member.permissions.has(PermissionFlagsBits.Administrator)
      || ADMIN_ROLE_IDS.some(id => member.roles.cache.has(id))
      || member.roles.cache.has(STAFF_ROLE_ID);
}

// Carte profil en embed Discord (sans canvas)
async function sendProfileEmbed(message, target) {
  const data  = db.getUser(target.user.id);
  const rank  = db.getRank(target.user.id);

  const xpBar    = Math.round((data.xp / data.xpMax) * 20);
  const xpFilled = '█'.repeat(xpBar);
  const xpEmpty  = '░'.repeat(20 - xpBar);

  const embed = new EmbedBuilder()
    .setColor('#5b4fcf')
    .setAuthor({ name: `Taxer Shop`, iconURL: message.guild.iconURL() })
    .setThumbnail(target.user.displayAvatarURL({ extension: 'png', size: 256 }))
    .setTitle(`👤 ${target.user.username}`)
    .addFields(
      { name: '🏆 الرتبة',        value: `#${rank}`,                                         inline: true },
      { name: '⭐ النقاط',        value: `${data.points}`,                                   inline: true },
      { name: '💬 رسائل اليوم',   value: `${data.msgsToday}`,                               inline: true },
      { name: `📊 XP — ${data.xp}/${data.xpMax}`, value: `\`${xpFilled}${xpEmpty}\``,      inline: false },
      { name: '🎫 تكت',           value: `${data.stats.tickets}`,  inline: true },
      { name: '🔨 بون',           value: `${data.stats.bans}`,     inline: true },
      { name: '⚠️ رسائل',         value: `${data.stats.warns}`,    inline: true },
      { name: '👢 إدارة',         value: `${data.stats.kicks}`,    inline: true },
      { name: '🔇 مسؤولية',       value: `${data.stats.mutes}`,    inline: true },
      { name: '➕ إضافية',        value: `${data.stats.autres}`,   inline: true },
    )
    .setFooter({ text: `Taxer Shop • ID: ${target.user.id}` })
    .setTimestamp();

  await message.channel.send({ embeds: [embed] });
  message.delete().catch(() => {});
}

module.exports = {
  name: 'messageCreate',
  async execute(message, client) {
    if (message.author.bot) return;

    // ── Embed automatique dans la catégorie offers ────────────
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
        // Supprimer le message original
        await message.delete().catch(() => {});
      } catch(e) { console.error('Offer embed error:', e); }
      return;
    }

    // ── Commandes prefix (+) ──────────────────────────────────
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
      await sendProfileEmbed(message, target);
      return;
    }

    // ── +panel ────────────────────────────────────────────────
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
