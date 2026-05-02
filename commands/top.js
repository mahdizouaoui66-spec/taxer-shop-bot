const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../utils/db.js');
module.exports = {
  data: new SlashCommandBuilder()
    .setName('top')
    .setDescription('ترتيب الإدارة حسب النقاط')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction) {
    const top = db.getLeaderboard(10);
    if (!top.length) return interaction.reply({ content: 'لا توجد بيانات بعد.', ephemeral: true });
    const lines = top.map((e, i) => {
      const medals = ['🥇','🥈','🥉'];
      const medal  = medals[i] ?? `**${i+1}.**`;
      return `${medal} <@${e.userId}> — **${e.points}** نقطة (تكت: ${e.stats.tickets})`;
    }).join('\n');
    await interaction.reply({ embeds: [new EmbedBuilder()
      .setTitle('🏆 ترتيب الإدارة — Taxer Shop')
      .setColor('#7c6bff')
      .setDescription(lines)
      .setFooter({ text: 'النقاط: claim تذكرة / حظر / طرد / تحذير / كتم' })
      .setTimestamp()
    ]});
  }
};
