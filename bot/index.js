const { Client, GatewayIntentBits, EmbedBuilder, PermissionFlagsBits, ChannelType, AttachmentBuilder } = require('discord.js');
const path = require('path');

const BANNER_PATH = path.join(__dirname, 'assets', 'banner.png');
const EMBED_COLOR = 0x7b2fff;
const FEEDBACK_CHANNEL_ID = '1385261245107671112';
const PROOF_CATEGORY_ID = '1385261194616508470';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once('clientReady', () => {
  console.log(`✅ Bot en ligne : ${client.user.tag}`);
});

client.on('guildMemberAdd', (member) => {
  const guild = member.guild;

  const welcomeChannel = guild.channels.cache.find((ch) => ch.name === 'welcome');
  if (!welcomeChannel) return;

  const chatChannel = guild.channels.cache.find(
    (ch) => ch.name === 'chat' || ch.name === 'Chat'
  );
  const ordreChannel = guild.channels.cache.find(
    (ch) => ch.name === 'ordre' || ch.name === 'Ordre' || ch.name === 'support' || ch.name === 'Support'
  );

  const createdDate = new Date(member.user.createdTimestamp).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
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

  const banner = new AttachmentBuilder(BANNER_PATH, { name: 'banner.png' });

  const embed = new EmbedBuilder()
    .setColor(EMBED_COLOR)
    .setTitle(member.user.username)
    .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 512 }))
    .setDescription(lines.join('\n'))
    .setImage('attachment://banner.png')
    .setFooter({ text: member.user.username })
    .setTimestamp();

  welcomeChannel.send({ embeds: [embed], files: [banner] });
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  if (message.channel.parentId === PROOF_CATEGORY_ID) {
    const banner = new AttachmentBuilder(BANNER_PATH, { name: 'banner.png' });
    const bannerEmbed = new EmbedBuilder()
      .setColor(EMBED_COLOR)
      .setImage('attachment://banner.png');
    message.channel.send({ embeds: [bannerEmbed], files: [banner] }).catch(console.error);
  }

  if (message.channel.id === FEEDBACK_CHANNEL_ID && message.mentions.users.size > 0) {
    const mentionedUser = message.mentions.users.first();
    const avatarURL = mentionedUser.displayAvatarURL({ dynamic: true, size: 512 });

    const embed = new EmbedBuilder()
      .setColor(EMBED_COLOR)
      .setAuthor({
        name: `Taxer Shop — Feedbacks`,
        iconURL: message.guild.iconURL({ dynamic: true }) ?? undefined,
      })
      .setTitle(`⭐ ${mentionedUser.username}`)
      .setThumbnail(avatarURL)
      .setDescription(
        `> 💜 **Thanks For Giving Us Feedback** 💜\n` +
        `> 💜 **Hope You Visit Us Again** 💜`
      )
      .addFields({
        name: '〔 Feedback par 〕',
        value: `${message.author}`,
        inline: true,
      })
      .setFooter({
        text: `${mentionedUser.username} • Taxer Shop`,
        iconURL: avatarURL,
      })
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
      return message.reply('⚠️ Tu as déjà un ticket ouvert !');
    }

    const permissionOverwrites = [
      { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
      { id: member.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
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
      .setAuthor({
        name: 'Taxer Shop — Support',
        iconURL: guild.iconURL({ dynamic: true }) ?? undefined,
      })
      .setTitle('🎫 Ticket Ouvert')
      .setDescription(
        `Bienvenue ${member} !\n\n` +
        `> Un membre du **Support** sera avec toi très bientôt.\n` +
        `> Décris ton problème en détail ci-dessous.\n\n` +
        `Utilise **\`!fermer\`** pour fermer ce ticket.`
      )
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 512 }))
      .setFooter({ text: `Taxer Shop • ${ticketName}` })
      .setTimestamp();

    ticketChannel.send({ embeds: [embed] });
    message.reply(`✅ Ton ticket a été créé : ${ticketChannel}`);
  }

  if (message.content === '!fermer') {
    if (!message.channel.name.startsWith('ticket-')) {
      return message.reply('❌ Cette commande ne peut être utilisée que dans un salon ticket.');
    }

    const embed = new EmbedBuilder()
      .setColor(0xff4444)
      .setTitle('🔒 Fermeture du Ticket')
      .setDescription(
        `> Ce ticket sera **définitivement fermé** dans **5 secondes**...\n` +
        `> Merci d'avoir contacté le support de **Taxer Shop** !`
      )
      .setFooter({ text: 'Taxer Shop — Support' })
      .setTimestamp();

    await message.channel.send({ embeds: [embed] });

    setTimeout(() => {
      message.channel.delete().catch(console.error);
    }, 5000);
  }
});

client.login(process.env.TOKEN);

const http = require('http');
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => res.end('Bot is alive!')).listen(PORT, () => {
  console.log(`🌐 Keep-alive server running on port ${PORT}`);
});
