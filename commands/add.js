const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder()
    .setName('add')
    .setDescription('إضافة عضو للتذكرة')
    .addUserOption(o => o.setName('membre').setDescription('العضو المراد إضافته').setRequired(true)),
  async execute(interaction) {
    const membre = interaction.options.getMember('membre');
    await interaction.channel.permissionOverwrites.edit(membre, {
      ViewChannel: true, SendMessages: true, ReadMessageHistory: true,
    });
    await interaction.reply({ content: `✅ تم إضافة ${membre} للتذكرة!` });
  }
};
