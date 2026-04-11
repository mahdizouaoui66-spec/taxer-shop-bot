const { Client, GatewayIntentBits, EmbedBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const EMBED_COLOR = 0x7b2fff;

client.once('clientReady', () => {
  console.log(`Bot is online as ${client.user.tag}`);
});

client.on('guildMemberAdd', (member) => {
  const guild = member.guild;

  const welcomeChannel = guild.channels.cache.find(
    (ch) => ch.name === 'welcome'
  );
  if (!welcomeChannel) return;

  const chatChannel = guild.channels.cache.find(
    (ch) => ch.name === 'chat' || ch.name === 'Chat'
  );
  const ordreChannel = guild.channels.cache.find(
    (ch) => ch.name === 'ordre' || ch.name === 'Ordre' || ch.name === 'support' || ch.name === 'Support'
  );

  const createdDate = new Date(member.user.createdTimestamp).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });

  const lines = [
    `🚀 Hey : **${member.user.username}**`,
    `🚀 Welcome To **Taxer Shop**`,
    `🚀 If You Wanna Chat`,
    chatChannel ? `${chatChannel}` : '',
    `🚀 If > You Want Support Open Ticket Here :`,
    ordreChannel ? `${ordreChannel}` : '',
    `🚀 Account Created At **${createdDate}**`,
    `🚀`,
    ``,
    `**Enjoy <3**`,
  ].filter((l) => l !== null);

  const embed = new EmbedBuilder()
    .setColor(EMBED_COLOR)
    .setTitle(member.user.username)
    .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 512 }))
    .setDescription(lines.join('\n'))
    .setFooter({ text: member.user.username })
    .setTimestamp();

  const bannerURL = guild.bannerURL({ size: 1024, extension: 'png' });
  if (bannerURL) embed.setImage(bannerURL);

  welcomeChannel.send({ embeds: [embed] });
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  if (message.channel.name === 'feedbacks' && message.mentions.users.size > 0) {
    const mentionedUser = message.mentions.users.first();

    const embed = new EmbedBuilder()
      .setColor(EMBED_COLOR)
      .setTitle(mentionedUser.username)
      .setThumbnail(mentionedUser.displayAvatarURL({ dynamic: true, size: 512 }))
      .setDescription(
        `💜 Thanks For Giving Us Feedback 💜\n` +
        `💜 Hope You Visit Us Again 💜`
      )
      .setFooter({ text: mentionedUser.username })
      .setTimestamp();

    message.reply({ embeds: [embed] });
  }

  if (message.content === '!ticket') {
    const guild = message.guild;
    const member = message.member;

    const supportRole = guild.roles.cache.find((r) => r.name === 'Support');

    const ticketName = `ticket-${member.user.username.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;

    const existing = guild.channels.cache.find((ch) => ch.name === ticketName);
    if (existing) {
      return message.reply('Tu as déjà un ticket ouvert !');
    }

    const permissionOverwrites = [
      {
        id: guild.id,
        deny: [PermissionFlagsBits.ViewChannel],
      },
      {
        id: member.id,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
      },
    ];

    if (supportRole) {
      permissionOverwrites.push({
        id: supportRole.id,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
      });
    }

    const ticketChannel = await guild.channels.create({
      name: ticketName,
      type: ChannelType.GuildText,
      permissionOverwrites,
    });

    const embed = new EmbedBuilder()
      .setColor(EMBED_COLOR)
      .setTitle('🎫 Ticket Ouvert')
      .setDescription(
        `Bienvenue ${member} !\n\nUn membre du support arrive bientôt.\nDécris ton problème ci-dessous.\n\nUtilise **!fermer** pour fermer ce ticket.`
      )
      .setFooter({ text: 'Taxer Shop — Support' })
      .setTimestamp();

    ticketChannel.send({ embeds: [embed] });
    message.reply(`Ton ticket a été créé : ${ticketChannel}`);
  }

  if (message.content === '!fermer') {
    if (!message.channel.name.startsWith('ticket-')) {
      return message.reply('Cette commande ne peut être utilisée que dans un salon ticket.');
    }

    const embed = new EmbedBuilder()
      .setColor(EMBED_COLOR)
      .setTitle('🔒 Fermeture du Ticket')
      .setDescription('Ce ticket sera fermé dans **5 secondes**...')
      .setFooter({ text: 'Taxer Shop — Support' })
      .setTimestamp();

    await message.channel.send({ embeds: [embed] });

    setTimeout(() => {
      message.channel.delete().catch(console.error);
    }, 5000);
  }
});

client.login(process.env.TOKEN);
