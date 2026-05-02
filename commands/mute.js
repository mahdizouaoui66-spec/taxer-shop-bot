const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../utils/db.js');
module.exports = {
  data: new SlashCommandBuilder()
    .setName('mute')
    .setDescription('كتم عضو مؤقتاً (timeout)')
    .addUserOption(o => o.setName('membre').setDescription('العضو المراد كتمه').setRequired(true))
    .addIntegerOption(o => o.setName('minutes').setDescription('المدة بالدقائق').setRequired(true).setMinValue(1).setMaxValue(10080))
    .addStringOption(o => o.setName('raison').setDescription('سبب الكتم'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  async execute(interaction) {
    const member  = interaction.options.getMember('membre');
    const minutes = interaction.options.getInteger('minutes');
    const raison  = interaction.options.getString('raison') ?? 'لا يوجد سبب';
    try {
      await member.timeout(minutes * 60 * 1000, raison);
      db.addPoints(interaction.user.id, 1, 'mutes');
      await interaction.reply({ embeds: [new EmbedBuilder().setColor('#7c6bff')
        .setTitle('🔇 تم الكتم')
        .addFields(
          { name: 'العضو',  value: member.user.tag,        inline: true },
          { name: 'المدة',  value: `${minutes} دقيقة`,    inline: true },
          { name: 'السبب',  value: raison,                 inline: false },
          { name: 'بواسطة', value: `${interaction.user}`,  inline: true },
        ).setTimestamp()] });
    } catch {
      interaction.reply({ content: '❌ لا أستطيع كتم هذا العضو.', ephemeral: true });
    }
  }
};
