const { REST, Routes } = require('discord.js');
const fs = require('fs');
require('dotenv').config();

const config = require('./config.json');
const commands = [];
const commandFiles = fs.readdirSync('./commands').filter(f => f.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  if (command.data) {
    commands.push(command.data.toJSON());
    console.log(`📝 Préparation : /${command.data.name}`);
  }
}

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
  try {
    console.log('🔄 Déploiement des commandes slash...');
    await rest.put(
      Routes.applicationGuildCommands(config.server.clientId, config.server.guildId),
      { body: commands }
    );
    console.log(`✅ ${commands.length} commandes déployées avec succès !`);
  } catch (error) {
    console.error('❌ Erreur lors du déploiement :', error);
  }
})();
