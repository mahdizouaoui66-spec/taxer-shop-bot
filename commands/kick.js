const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../utils/db.js');
module.exports = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('طرد عضو من السيرفر')
    .addUserOption(o => o.setName('membre').setDescription('العضو المراد طرده').setRequired(true))
    .addStringOption(o => o.setName('raison').setDescription('سبب الطرد'))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
  async execute(interaction) {
    const member = interaction.options.getMember('membre');
    const raison = interaction.options.getString('raison') ?? 'لا يوجد سبب';
    try {
      await member.kick(raison);
      db.addPoints(interaction.user.id, 1, 'kicks');
      await interaction.reply({ embeds: [new EmbedBuilder().setColor('#FEE75C')
        .setTitle('👢 تم الطرد')
        .addFields(
          { name: 'العضو',  value: member.user.tag,        inline: true },
          { name: 'السبب',  value: raison,                 inline: true },
          { name: 'بواسطة', value: `${interaction.user}`,  inline: true },
        ).setTimestamp()] });
    } catch {
      interaction.reply({ content: '❌ لا أستطيع طرد هذا العضو.', ephemeral: true });
    }
  }
};
