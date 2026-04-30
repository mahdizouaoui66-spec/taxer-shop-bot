const { EmbedBuilder } = require('discord.js');
const db = require('./db.js');

const STATS_CHANNEL_ID = '1496294163845615636';

let statsMessageId = null;

async function updateStats(client) {
  try {
    const guild = client.guilds.cache.first();
    if (!guild) return;

    await guild.members.fetch();

    const totalMembers = guild.memberCount;
    const onlineMembers = guild.members.cache.filter(m =>
      m.presence?.status === 'online' ||
      m.presence?.status === 'idle' ||
      m.presence?.status === 'dnd'
    ).size;
    const botCount    = guild.members.cache.filter(m => m.user.bot).size;
    const humanCount  = totalMembers - botCount;
    const openTickets = guild.channels.cache.filter(c => c.name?.startsWith('ticket-')).size;
    const rating      = db.getAverageRating();
    const starsText   = rating.avg > 0 ? '⭐'.repeat(Math.round(rating.avg)) : 'لا يوجد بعد';

    const embed = new EmbedBuilder()
      .setTitle('📊 إحصائيات Taxer Shop')
      .setColor('#5b4fcf')
      .setThumbnail(guild.iconURL())
      .addFields(
        { name: '👥 إجمالي الأعضاء',    value: `\`\`\`${totalMembers}\`\`\``,  inline: true },
        { name: '🟢 الأعضاء النشطون',   value: `\`\`\`${onlineMembers}\`\`\``, inline: true },
        { name: '👤 الأعضاء البشريون',  value: `\`\`\`${humanCount}\`\`\``,    inline: true },
        { name: '🤖 البوتات',           value: `\`\`\`${botCount}\`\`\``,      inline: true },
        { name: '🎫 التذاكر المفتوحة',  value: `\`\`\`${openTickets}\`\`\``,   inline: true },
        { name: '⭐ متوسط التقييم',     value: `\`\`\`${rating.avg}/5 (${rating.total} تقييم)\`\`\``, inline: true },
      )
      .setFooter({ text: `آخر تحديث` })
      .setTimestamp();

    const statsChannel = guild.channels.cache.get(STATS_CHANNEL_ID);
    if (!statsChannel) return;

    if (statsMessageId) {
      try {
        const msg = await statsChannel.messages.fetch(statsMessageId);
        await msg.edit({ embeds: [embed] });
      } catch {
        const msg = await statsChannel.send({ embeds: [embed] });
        statsMessageId = msg.id;
      }
    } else {
      // حذف الرسائل القديمة
      const messages = await statsChannel.messages.fetch({ limit: 10 });
      await statsChannel.bulkDelete(messages).catch(() => {});
      const msg = await statsChannel.send({ embeds: [embed] });
      statsMessageId = msg.id;
    }
  } catch(e) { console.error('Stats error:', e); }
}

function startStatsUpdater(client) {
  // تحديث فوري عند البدء
  setTimeout(() => updateStats(client), 5000);
  // تحديث كل 5 دقائق
  setInterval(() => updateStats(client), 5 * 60 * 1000);
}

module.exports = { startStatsUpdater, updateStats };
