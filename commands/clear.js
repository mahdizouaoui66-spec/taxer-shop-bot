const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder()
    .setName('clear')
    .setDescription('حذف رسائل بشكل جماعي')
    .addIntegerOption(o => o.setName('nombre').setDescription('عدد الرسائل (1-100)').setRequired(true).setMinValue(1).setMaxValue(100))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
  async execute(interaction) {
    const n = interaction.options.getInteger('nombre');
    const deleted = await interaction.channel.bulkDelete(n, true);
    await interaction.reply({ content: `✅ تم حذف **${deleted.size}** رسالة.`, ephemeral: true });
  }
};
