const { AttachmentBuilder, PermissionFlagsBits } = require('discord.js');
const config      = require('../config.json');
const db          = require('../utils/db.js');
const profileCard = require('../utils/profileCard.js');

const PROFILE_CHANNEL_ID = '1416486448361902261';
const ADMIN_ROLE_IDS     = config.tickets.adminRoleIds || [];
const STAFF_ROLE_ID      = config.tickets.staffRoleId;

function isStaff(member) {
  return member.permissions.has(PermissionFlagsBits.Administrator)
      || ADMIN_ROLE_IDS.some(id => member.roles.cache.has(id))
      || member.roles.cache.has(STAFF_ROLE_ID);
}

module.exports = {
  name: 'messageCreate',
  async execute(message, client) {
    if (message.author.bot) return;
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
        message.reply('❌ خطأ في توليد البطاقة. تأكد من تثبيت: npm install @napi-rs/canvas');
      }
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
