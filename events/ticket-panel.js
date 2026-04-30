const {
  SlashCommandBuilder, EmbedBuilder,
  ActionRowBuilder, StringSelectMenuBuilder,
  PermissionFlagsBits
} = require('discord.js');

const IMAGE_URL = 'https://media.discordapp.net/attachments/1385261281015238698/1495769057763397712/Taxer_shop_logo.png?ex=69e772fd&is=69e6217d&hm=5ce12815b1b94c5739b6f440379312234a7c8bf859d417649bbc4ee3c3f37558&=&format=webp&quality=lossless&width=958&height=958';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket-panel')
    .setDescription('إرسال لوحة التذاكر')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('Taxer Shop Tickets :')
      .setDescription(
        'مرحباً بكم في دعم **Taxer Shop** 🎮\n' +
        'اختر نوع التذكرة التي تريد فتحها'
      )
      .setImage(IMAGE_URL)
      .setColor('#5b4fcf')
      .setFooter({ text: 'Taxer Shop • نحن هنا دائماً 💜' });

    const menu = new StringSelectMenuBuilder()
      .setCustomId('ticket_select')
      .setPlaceholder('اختر نوع التذكرة...')
      .addOptions([
        { label: 'Support',             description: 'دعم فني أو استفسار',     value: 'ticket_support',  emoji: '🎫' },
        { label: 'Reward',              description: 'طلب مكافأة',              value: 'ticket_reward',   emoji: '🎁' },
        { label: 'Apply to Staff Team', description: 'التقديم لفريق العمل',    value: 'ticket_apply',    emoji: '📋' },
        { label: 'Ordre',               description: 'طلب شحن أو شراء',        value: 'ticket_commande', emoji: '👑' },
      ]);

    await interaction.channel.send({
      embeds: [embed],
      components: [new ActionRowBuilder().addComponents(menu)]
    });
    await interaction.reply({ content: '✅ تم إرسال اللوحة!', ephemeral: true });
  }
};
