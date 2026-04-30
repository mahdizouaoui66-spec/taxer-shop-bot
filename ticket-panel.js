const {
  SlashCommandBuilder, EmbedBuilder,
  ActionRowBuilder, StringSelectMenuBuilder,
  PermissionFlagsBits
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket-panel')
    .setDescription('إرسال لوحة التذاكر')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('تاكسر شوب — نظام التذاكر')
      .setDescription(
        'مرحباً بك في دعم **Taxer Shop** 🎮\n\n' +
        'اختر نوع التذكرة التي تريد فتحها من القائمة أدناه\n\n' +
        '⚡ سيتم الرد عليك في أقرب وقت ممكن'
      )
      .setColor('#5b4fcf')
      .setThumbnail(interaction.guild.iconURL())
      .setFooter({ text: 'Taxer Shop • نحن هنا دائماً 💜' });

    const menu = new StringSelectMenuBuilder()
      .setCustomId('ticket_select')
      .setPlaceholder('اختر نوع التذكرة...')
      .addOptions([
        { label: 'دعم فني',        description: 'مشكلة تقنية أو استفسار', value: 'ticket_support',  emoji: '🎫' },
        { label: 'مكافأة',         description: 'طلب مكافأة',             value: 'ticket_reward',   emoji: '🎁' },
        { label: 'التقديم للستاف', description: 'انضم لفريق العمل',       value: 'ticket_apply',    emoji: '📋' },
        { label: 'طلب شحن',        description: 'شراء أو شحن',            value: 'ticket_commande', emoji: '👑' },
      ]);

    await interaction.channel.send({
      embeds: [embed],
      components: [new ActionRowBuilder().addComponents(menu)]
    });
    await interaction.reply({ content: '✅ تم إرسال اللوحة!', ephemeral: true });
  }
};
