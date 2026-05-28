const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
require('dotenv').config();
const config = require('./config.json');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildModeration,
  ]
});

// ── Charger les commandes ──
client.commands = new Collection();
const commandFiles = fs.readdirSync('./commands').filter(f => f.endsWith('.js'));
for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  if (command.data && command.execute) {
    client.commands.set(command.data.name, command);
    console.log(`✅ Commande chargée : /${command.data.name}`);
  }
}

// ── Charger les events ──
const eventFiles = fs.readdirSync('./events').filter(f => f.endsWith('.js'));
for (const file of eventFiles) {
  const event = require(`./events/${file}`);
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args, client));
  } else {
    client.on(event.name, (...args) => event.execute(...args, client));
  }
  console.log(`📡 Event chargé : ${event.name}`);
}

// ── Serveur HTTP pour Render ──
const http = require('http');
http.createServer((req, res) => res.end('Bot en ligne')).listen(process.env.PORT || 3000);
console.log('🌐 Serveur HTTP démarré');

// ── Gestion boutons protection ──
client.on('interactionCreate', async interaction => {
  if (!interaction.isButton()) return;
  if (!interaction.customId.startsWith('protect_')) return;
  if (interaction.user.id !== '1113897921922994337') {
    return interaction.reply({ content: '❌ هذا الأمر للمالك فقط!', ephemeral: true });
  }

  const parts  = interaction.customId.split('_');
  const action = parts[1];
  const userId = parts[2];
  const guild  = interaction.guild;
  const member = await guild.members.fetch(userId).catch(() => null);

  await interaction.update({ components: [] });

  if (action === 'ignore') {
    await interaction.followUp({ content: '⚪ تم تجاهل الحادثة.', ephemeral: true });
    return;
  }

  if (!member) {
    await interaction.followUp({ content: '❌ العضو غير موجود.', ephemeral: true });
    return;
  }

  const { EmbedBuilder } = require('discord.js');

  if (action === 'removeroles') {
    const adminRoles = config.tickets.adminRoleIds || [];
    for (const roleId of adminRoles) {
      await member.roles.remove(roleId).catch(() => {});
    }
    await interaction.followUp({ embeds: [new EmbedBuilder().setColor('#FFA500').setDescription(`🟡 تم سحب جميع رتب الإدارة من **${member.user.tag}**`).setTimestamp()] });
  }

  if (action === 'kick') {
    await member.kick('حماية السيرفر').catch(() => {});
    await interaction.followUp({ embeds: [new EmbedBuilder().setColor('#FEE75C').setDescription(`🟠 تم طرد **${member.user.tag}**`).setTimestamp()] });
  }

  if (action === 'ban') {
    await guild.members.ban(userId, { reason: 'حماية السيرفر' }).catch(() => {});
    await interaction.followUp({ embeds: [new EmbedBuilder().setColor('#ED4245').setDescription(`🔴 تم حظر **${member.user.tag}**`).setTimestamp()] });
  }
});

// ── Connexion ──
client.login(process.env.TOKEN);
