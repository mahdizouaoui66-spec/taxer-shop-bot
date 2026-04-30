const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../utils/db.js');
module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('حظر عضو من السيرفر')
    .addUserOption(o => o.setName('membre').setDescription('العضو المراد حظره').setRequired(true))
    .addStringOption(o => o.setName('raison').setDescription('سبب الحظر'))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
  async execute(interaction) {
    const target = interaction.options.getUser('membre');
    const raison = interaction.options.getString('raison') ?? 'لا يوجد سبب';
    try {
      await interaction.guild.members.ban(target, { reason: raison });
      db.addPoints(interaction.user.id, 1, 'bans');
      await interaction.reply({ embeds: [new EmbedBuilder().setColor('#ED4245')
        .setTitle('🔨 تم الحظر')
        .addFields(
          { name: 'العضو',    value: target.tag,             inline: true },
          { name: 'السبب',    value: raison,                 inline: true },
          { name: 'بواسطة',   value: `${interaction.user}`,  inline: true },
        ).setTimestamp()] });
    } catch {
      interaction.reply({ content: '❌ لا أستطيع حظر هذا العضو.', ephemeral: true });
    }
  }
};
