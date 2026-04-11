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

client.once('ready', () => {
  console.log(`Bot is online as ${client.user.tag}`);
});

client.on('guildMemberAdd', (member) => {
  const welcomeChannel = member.guild.channels.cache.find(
    (ch) => ch.name === 'welcome'
  );
  if (!welcomeChannel) return;

  const createdAt = `<t:${Math.floor(member.user.createdTimestamp / 1000)}:F>`;

  const embed = new EmbedBuilder()
    .setColor(EMBED_COLOR)
    .setTitle('Welcome To Taxer Shop / Enjoy <3')
    .setDescription(`Hey ${member}, welcome to **Taxer Shop**!`)
    .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 512 }))
    .addFields(
      { name: 'Username', value: member.user.tag, inline: true },
      { name: 'Account Created', value: createdAt, inline: true },
      { name: 'Member Count', value: `${member.guild.memberCount}`, inline: true }
    )
    .setFooter({ text: 'Taxer Shop' })
    .setTimestamp();

  welcomeChannel.send({ embeds: [embed] });
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  if (message.channel.name === 'feedbacks' && message.mentions.users.size > 0) {
    const mentionedUser = message.mentions.users.first();

    const embed = new EmbedBuilder()
      .setColor(EMBED_COLOR)
      .setTitle('Thanks For Giving Us Feedback / Hope You Visit Us Again')
      .setThumbnail(mentionedUser.displayAvatarURL({ dynamic: true, size: 512 }))
      .setDescription(`Thank you ${message.author} for your feedback!`)
      .setFooter({ text: 'Taxer Shop — Feedbacks' })
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
      return message.reply('You already have an open ticket!');
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
      .setTitle('🎫 Ticket Opened')
      .setDescription(
        `Welcome ${member}!\n\nA support member will be with you shortly.\nPlease describe your issue below.\n\nUse **!fermer** to close this ticket.`
      )
      .setFooter({ text: 'Taxer Shop — Support' })
      .setTimestamp();

    ticketChannel.send({ embeds: [embed] });
    message.reply(`Your ticket has been created: ${ticketChannel}`);
  }

  if (message.content === '!fermer') {
    if (!message.channel.name.startsWith('ticket-')) {
      return message.reply('This command can only be used inside a ticket channel.');
    }

    const embed = new EmbedBuilder()
      .setColor(EMBED_COLOR)
      .setTitle('🔒 Ticket Closing')
      .setDescription('This ticket will be closed in **5 seconds**...')
      .setFooter({ text: 'Taxer Shop — Support' })
      .setTimestamp();

    await message.channel.send({ embeds: [embed] });

    setTimeout(() => {
      message.channel.delete().catch(console.error);
    }, 5000);
  }
});

client.login(process.env.TOKEN);
