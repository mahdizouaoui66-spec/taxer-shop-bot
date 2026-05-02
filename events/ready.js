const { ActivityType } = require('discord.js');
const config = require('../config.json');
const { startStatsUpdater } = require('../utils/stats.js');

module.exports = {
  name: 'clientReady',
  once: true,
  execute(client) {
    console.log(`\n🚀 ============================`);
    console.log(`✅  ${client.user.tag} est en ligne !`);
    console.log(`📡  Serveurs : ${client.guilds.cache.size}`);
    console.log(`👥  Membres  : ${client.users.cache.size}`);
    console.log(`🚀 ============================\n`);

    const typeMap = {
      WATCHING:   ActivityType.Watching,
      PLAYING:    ActivityType.Playing,
      LISTENING:  ActivityType.Listening,
      COMPETING:  ActivityType.Competing,
    };

    client.user.setPresence({
      status: config.bot.status,
      activities: [{
        name: config.bot.activity.text,
        type: typeMap[config.bot.activity.type] ?? ActivityType.Watching,
      }]
    });

    startStatsUpdater(client);
  }
};
