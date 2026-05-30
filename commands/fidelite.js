const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../utils/db.js');

const POINTS_VIP = 60;
const ROLE_VIP_ID = '1385261128439042098';

// /nqati = نقاطي
module.exports = {
  data: new SlashCommandBuilder()
    .setName('nqati')
    .setDescription('اعرض نقاط الولاء الخاصة بك'),

  async execute(interaction) {
    const data   = db.getClientData(interaction.user.id);
    const points = data.points ?? 0;
    const orders = data.orders ?? 0;
    const isVip  = interaction.member?.roles?.cache?.has(ROLE_VIP_ID);

    const remaining = Math.max(POINTS_VIP - points, 0);

    // شريط التقدم
    const barLength  = 20;
    const filled     = Math.round((Math.min(points, POINTS_VIP) / POINTS_VIP) * barLength);
    const progressBar = '█'.repeat(filled) + '░'.repeat(barLength - filled);

    const embed = new EmbedBuilder()
      .setTitle(`${isVip ? '👑' : '🎁'} نقاط الولاء — ${interaction.user.username}`)
      .setColor(isVip ? '#FFD700' : '#5b4fcf')
      .setThumbnail(interaction.user.displayAvatarURL())
      .addFields(
        { name: '⭐ نقاطك الحالية',   value: `**${points}** نقطة`,   inline: true },
        { name: '🛒 عدد طلباتك',      value: `**${orders}** طلب`,    inline: true },
        { name: '👑 الحالة',           value: isVip ? '**VIP** 👑' : '**عميل عادي**', inline: true },
        {
          name: `📊 التقدم نحو VIP (${POINTS_VIP} نقطة)`,
          value: isVip
            ? '✅ أنت بالفعل VIP! شكراً لولائك 💜'
            : `\`${progressBar}\` ${points}/${POINTS_VIP}\nباقي **${remaining} نقطة** للوصول إلى VIP 👑`
        },
      )
      .setFooter({ text: 'Taxer Shop • نظام الولاء 💜' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], flags: 64 });
  }
};
