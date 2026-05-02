const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../utils/db.js');
const fs = require('fs');
const path = require('path');
const WARNS_FILE = path.join(__dirname, '../data/warns.json');
function loadWarns() {
  if (!fs.existsSync(WARNS_FILE)) { fs.mkdirSync(path.dirname(WARNS_FILE), { recursive: true }); fs.writeFileSync(WARNS_FILE, '{}'); }
  try { return JSON.parse(fs.readFileSync(WARNS_FILE, 'utf-8')); } catch { return {}; }
}
function saveWarns(d) { fs.writeFileSync(WARNS_FILE, JSON.stringify(d, null, 2)); }
module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('تحذير عضو وتسجيله')
    .addUserOption(o => o.setName('membre').setDescription('العضو المراد تحذيره').setRequired(true))
    .addStringOption(o => o.setName('raison').setDescription('سبب التحذير').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  async execute(interaction) {
    const target = interaction.options.getUser('membre');
    const raison = interaction.options.getString('raison');
    const warns  = loadWarns();
    if (!warns[target.id]) warns[target.id] = [];
    warns[target.id].push({ raison, by: interaction.user.id, date: new Date().toISOString() });
    saveWarns(warns);
    db.addPoints(interaction.user.id, 1, 'warns');
    await interaction.reply({ embeds: [new EmbedBuilder().setColor('#FFA500')
      .setTitle('⚠️ تحذير')
      .addFields(
        { name: 'العضو',           value: target.tag,                    inline: true },
        { name: 'عدد التحذيرات',   value: `${warns[target.id].length}`,  inline: true },
        { name: 'السبب',           value: raison,                        inline: false },
        { name: 'بواسطة',          value: `${interaction.user}`,         inline: true },
      ).setTimestamp()] });
    try {
      await target.send({ embeds: [new EmbedBuilder().setColor('#FFA500')
        .setTitle(`⚠️ تحذير من ${interaction.guild.name}`)
        .setDescription(`لقد تلقيت تحذيراً\n**السبب:** ${raison}`)
      ]});
    } catch {}
  }
};
