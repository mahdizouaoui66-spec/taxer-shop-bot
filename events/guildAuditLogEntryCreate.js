const {
  EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AuditLogEvent
} = require('discord.js');
const config = require('../config.json');

const OWNER_ID       = '1113897921922994337';
const CO_OWNER_ROLE  = '1385261115524644894';
const ADMIN_ROLE_IDS = config.tickets.adminRoleIds || [];

const counters = new Map();

function incrementCounter(userId, type) {
  const key = `${userId}_${type}`;
  if (!counters.has(key)) counters.set(key, { count: 0, timer: null });
  const c = counters.get(key);
  c.count++;
  if (c.timer) clearTimeout(c.timer);
  c.timer = setTimeout(() => counters.delete(key), 10000);
  return c.count;
}

function isProtected(member) {
  return member.id === OWNER_ID
      || member.roles.cache.has(CO_OWNER_ROLE);
}

async function alertOwner(client, guild, userId, reason, details) {
  try {
    const owner  = await client.users.fetch(OWNER_ID);
    const member = await guild.members.fetch(userId).catch(() => null);
    if (!member) return;
    if (isProtected(member)) return;

    const embed = new EmbedBuilder()
      .setColor('#cc0000')
      .setTitle('🚨 تحذير أمني — Taxer Shop')
      .setDescription(`**${reason}**`)
      .addFields(
        { name: '👤 العضو',    value: `${member.user.tag} (<@${userId}>)`, inline: true },
        { name: '🆔 ID',       value: userId,                              inline: true },
        { name: '📋 التفاصيل', value: details,                             inline: false },
      )
      .setThumbnail(member.user.displayAvatarURL())
      .setTimestamp()
      .setFooter({ text: 'Taxer Shop • اختر الإجراء المناسب' });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`protect_removeroles_${userId}`)
        .setLabel('🟡 سحب الرتب')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`protect_kick_${userId}`)
        .setLabel('🟠 Kick')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`protect_ban_${userId}`)
        .setLabel('🔴 Ban')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(`protect_ignore_${userId}`)
        .setLabel('⚪ تجاهل')
        .setStyle(ButtonStyle.Secondary),
    );

    await owner.send({ embeds: [embed], components: [row] });
  } catch(e) { console.error('Alert error:', e); }
}

module.exports = {
  name: 'guildAuditLogEntryCreate',
  async execute(auditLog, client) {
    const { action, executorId, targetId } = auditLog;
    const guild = auditLog.guild;
    if (!executorId) return;
    if (executorId === client.user.id) return;
    if (executorId === OWNER_ID) return;

    const executor = await guild.members.fetch(executorId).catch(() => null);
    if (!executor) return;
    if (isProtected(executor)) return;

    // Anti suppression de salons
    if (action === AuditLogEvent.ChannelDelete) {
      const count = incrementCounter(executorId, 'channelDelete');
      if (count >= 3) {
        await alertOwner(client, guild, executorId,
          '⚠️ حذف مشبوه للقنوات!',
          `قام بحذف **${count}** قناة في أقل من 10 ثواني`
        );
      }
    }

    // Anti suppression de rôles
    if (action === AuditLogEvent.RoleDelete) {
      const count = incrementCounter(executorId, 'roleDelete');
      if (count >= 3) {
        await alertOwner(client, guild, executorId,
          '⚠️ حذف مشبوه للرتب!',
          `قام بحذف **${count}** رتبة في أقل من 10 ثواني`
        );
      }
    }

    // Anti mass ban
    if (action === AuditLogEvent.MemberBanAdd) {
      const count = incrementCounter(executorId, 'massBan');
      if (count >= 3) {
        await alertOwner(client, guild, executorId,
          '⚠️ حظر جماعي مشبوه!',
          `قام بحظر **${count}** عضو في أقل من 10 ثواني`
        );
      }
    }

    // Anti ajout de bot
    if (action === AuditLogEvent.BotAdd) {
      await alertOwner(client, guild, executorId,
        '🤖 تمت إضافة بوت جديد!',
        `أضاف بوت بـ ID: **${targetId}**`
      );
    }
  }
};
