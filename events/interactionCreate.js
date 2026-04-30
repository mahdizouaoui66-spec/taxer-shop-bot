const {
  EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
  ChannelType, PermissionFlagsBits, StringSelectMenuBuilder,
} = require('discord.js');

const config = require('../config.json');
const db     = require('../utils/db.js');
const fs     = require('fs');
const path   = require('path');

const TICKET_TYPES     = {};
for (const t of config.tickets.types) TICKET_TYPES[`ticket_${t.id}`] = t;

const STAFF_ROLE_ID    = config.tickets.staffRoleId;
const NOTIF_ROLE_ID    = config.tickets.notifRoleId;
const ADMIN_ROLE_IDS   = config.tickets.adminRoleIds || [];
const LOG_CHANNEL_ID   = config.tickets.logChannelId;
const CATEGORY_ID      = config.tickets.categoryId;
const RATING_CHANNEL_ID = '1499145488036003920';

const claimedBy  = new Map();
const ticketInfo = new Map();

function isAdmin(member) {
  return member.permissions.has(PermissionFlagsBits.Administrator)
      || ADMIN_ROLE_IDS.some(id => member.roles.cache.has(id));
}
function isStaff(member) {
  return isAdmin(member) || member.roles.cache.has(STAFF_ROLE_ID);
}
function sendLog(guild, embed) {
  const ch = guild.channels.cache.get(LOG_CHANNEL_ID);
  if (ch) ch.send({ embeds: [embed] });
}
function buildTranscript(messages, channelName) {
  const rows = messages.map(m =>
    `<tr><td>${new Date(m.createdTimestamp).toLocaleString()}</td>
     <td><b>${m.author.tag}</b></td>
     <td>${m.content.replace(/</g,'&lt;') || '[ملف]'}</td></tr>`
  ).join('');
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Transcript</title>
  <style>body{font-family:sans-serif;background:#1a1a2e;color:#eee;padding:20px}
  h1{color:#7c6bff}table{width:100%;border-collapse:collapse}
  th,td{padding:8px 12px;border:1px solid #333;font-size:13px}
  th{background:#2d2b55}tr:nth-child(even){background:#16213e}</style>
  </head><body><h1>Transcript — #${channelName}</h1>
  <table><tr><th>التاريخ</th><th>العضو</th><th>الرسالة</th></tr>${rows}</table></body></html>`;
}
function ticketButtons(claimed) {
  return new ActionRowBuilder().addComponents(
    claimed
      ? new ButtonBuilder().setCustomId('ticket_unclaim').setLabel('إلغاء الاستلام').setEmoji('🔄').setStyle(ButtonStyle.Secondary)
      : new ButtonBuilder().setCustomId('ticket_claim').setLabel('استلام').setEmoji('✅').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('ticket_close').setLabel('إغلاق').setEmoji('🔒')
      .setStyle(claimed ? ButtonStyle.Danger : ButtonStyle.Secondary),
  );
}
function ratingButtons(ticketNum) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`rate_1_${ticketNum}`).setLabel('⭐').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`rate_2_${ticketNum}`).setLabel('⭐⭐').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`rate_3_${ticketNum}`).setLabel('⭐⭐⭐').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`rate_4_${ticketNum}`).setLabel('⭐⭐⭐⭐').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`rate_5_${ticketNum}`).setLabel('⭐⭐⭐⭐⭐').setStyle(ButtonStyle.Success),
  );
}

async function openTicket(interaction, cat) {
  if (config.tickets.options.oneTicketPerUser) {
    const existing = interaction.guild.channels.cache.find(
      c => c.topic && c.topic.includes(`owner:${interaction.user.id}`)
    );
    if (existing) {
      await interaction.editReply({ content: `❌ لديك تذكرة مفتوحة بالفعل! ${existing}` });
      return;
    }
  }

  const ticketNum   = db.getNextTicketNumber();
  const channelName = `ticket-${String(ticketNum).padStart(4, '0')}`;
  const openedAt    = Date.now();

  const channel = await interaction.guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: CATEGORY_ID,
    topic: `owner:${interaction.user.id} | type:${cat.id} | num:${ticketNum}`,
    permissionOverwrites: [
      { id: interaction.guild.id, deny:  [PermissionFlagsBits.ViewChannel] },
      { id: interaction.user.id,  allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles] },
      { id: STAFF_ROLE_ID,        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageMessages] },
      ...ADMIN_ROLE_IDS.map(id => ({
        id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageMessages]
      }))
    ],
  });

  ticketInfo.set(channel.id, {
    openerTag: interaction.user.tag,
    openerId:  interaction.user.id,
    opener:    `${interaction.user}`,
    ticketNum, cat, openedAt
  });

  const mainEmbed = new EmbedBuilder()
    .setTitle(`Taxer Shop | #${ticketNum} — ${cat.emoji} ${cat.label}`)
    .setColor(cat.color)
    .setDescription(
      `> مرحباً ${interaction.user} !\n` +
      `> شكراً لفتح التذكرة. سيقوم أحد أعضاء الفريق بمساعدتك قريباً.\n\n` +
      `🕐 تم الفتح <t:${Math.floor(openedAt/1000)}:R>`
    )
    .setFooter({ text: `Taxer Shop • ID: ${interaction.user.id}` })
    .setTimestamp();

  const msg = await channel.send({
    content: `${interaction.user} | <@&${STAFF_ROLE_ID}> | <@&${NOTIF_ROLE_ID}>`,
    embeds: [mainEmbed],
    components: [ticketButtons(false)]
  });
  await msg.pin().catch(() => {});

  sendLog(interaction.guild, new EmbedBuilder()
    .setTitle('📂 تذكرة جديدة').setColor('#7c6bff')
    .addFields(
      { name: 'الرقم',  value: `#${ticketNum}`,      inline: true },
      { name: 'العضو',  value: interaction.user.tag, inline: true },
      { name: 'النوع',  value: cat.label,            inline: true },
      { name: 'القناة', value: `${channel}`,         inline: true },
    ).setTimestamp()
  );

  await interaction.editReply({
    content: `✅ تم فتح تذكرتك رقم **#${ticketNum}**! ${channel}\nسيتم الرد عليك قريباً 🔥`
  });
}

module.exports = {
  name: 'interactionCreate',
  ticketInfo,
  claimedBy,
  async execute(interaction, client) {
    try {

      // ── SELECT MENU TICKET ──────────────────────────────────
      if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_select') {
        await interaction.deferReply({ flags: 64 });
        const cat = TICKET_TYPES[interaction.values[0]];
        if (!cat) return interaction.editReply({ content: '❌ نوع التذكرة غير موجود!' });
        await openTicket(interaction, cat);
        return;
      }

      // ── SELECT MENU GESTION ─────────────────────────────────
      if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_manage') {
        const member = interaction.guild.members.cache.get(interaction.user.id);
        if (!isStaff(member)) return interaction.reply({ content: '❌ للستاف فقط!', flags: 64 });
        const val = interaction.values[0];
        if (val === 'manage_add')    return interaction.reply({ content: '➕ اكتب: `+tadd @العضو`', flags: 64 });
        if (val === 'manage_remove') return interaction.reply({ content: '➖ اكتب: `+tremove @العضو`', flags: 64 });
        if (val === 'manage_rename') return interaction.reply({ content: '✏️ اكتب: `+rename الاسم-الجديد`', flags: 64 });
        if (val === 'manage_close') {
          return interaction.reply({
            content: '⚠️ هل أنت متأكد من إغلاق التذكرة؟',
            components: [new ActionRowBuilder().addComponents(
              new ButtonBuilder().setCustomId('ticket_confirm_close').setLabel('✅ تأكيد').setStyle(ButtonStyle.Danger),
              new ButtonBuilder().setCustomId('ticket_cancel_close').setLabel('❌ إلغاء').setStyle(ButtonStyle.Secondary),
            )],
            flags: 64
          });
        }
        return;
      }

      // ── CLAIM ───────────────────────────────────────────────
      if (interaction.isButton() && interaction.customId === 'ticket_claim') {
        const member = interaction.guild.members.cache.get(interaction.user.id);
        if (!isStaff(member)) return interaction.reply({ content: '❌ للستاف فقط!', flags: 64 });
        claimedBy.set(interaction.channel.id, { userId: interaction.user.id, tag: interaction.user.tag });
        db.addPoints(interaction.user.id, 1, 'tickets');
        await interaction.update({ components: [ticketButtons(true)] });
        await interaction.channel.send({
          embeds: [new EmbedBuilder().setColor('#7c6bff')
            .setDescription(`✋ **${interaction.user}** استلم هذه التذكرة وسيساعدك الآن!\n🏆 +1 نقطة`)]
        });
        return;
      }

      // ── UNCLAIM ─────────────────────────────────────────────
      if (interaction.isButton() && interaction.customId === 'ticket_unclaim') {
        const member  = interaction.guild.members.cache.get(interaction.user.id);
        const claimer = claimedBy.get(interaction.channel.id);
        if (claimer && claimer.userId !== interaction.user.id && !isAdmin(member)) {
          return interaction.reply({ content: `❌ هذه التذكرة مستلمة من **${claimer.tag}** فقط هو أو الإدارة يمكنهم إلغاء الاستلام.`, flags: 64 });
        }
        claimedBy.delete(interaction.channel.id);
        db.addPoints(interaction.user.id, -1, null);
        await interaction.update({ components: [ticketButtons(false)] });
        await interaction.channel.send({
          embeds: [new EmbedBuilder().setColor('#ED4245')
            .setDescription(`🔄 **${interaction.user}** ألغى استلام التذكرة.\n⏳ في انتظار الستاف...`)]
        });
        return;
      }

      // ── FERMER ──────────────────────────────────────────────
      if (interaction.isButton() && interaction.customId === 'ticket_close') {
        const member  = interaction.guild.members.cache.get(interaction.user.id);
        const claimer = claimedBy.get(interaction.channel.id);
        if (claimer && claimer.userId !== interaction.user.id && !isAdmin(member)) {
          return interaction.reply({ content: `❌ هذه التذكرة مستلمة من **${claimer.tag}** فقط هو أو الإدارة يمكنهم إغلاقها.`, flags: 64 });
        }
        if (!claimer && !isStaff(member)) {
          return interaction.reply({ content: '❌ فقط الستاف يمكنهم الإغلاق!', flags: 64 });
        }
        return interaction.reply({
          content: '⚠️ هل أنت متأكد من إغلاق التذكرة؟',
          components: [new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('ticket_confirm_close').setLabel('✅ تأكيد').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('ticket_cancel_close').setLabel('❌ إلغاء').setStyle(ButtonStyle.Secondary),
          )],
          flags: 64
        });
      }

      if (interaction.isButton() && interaction.customId === 'ticket_cancel_close') {
        return interaction.update({ content: '❌ تم إلغاء الإغلاق.', components: [] });
      }

      // ── CONFIRMER FERMETURE ─────────────────────────────────
      if (interaction.isButton() && interaction.customId === 'ticket_confirm_close') {
        const info    = ticketInfo.get(interaction.channel.id);
        const claimer = claimedBy.get(interaction.channel.id);

        await interaction.update({ content: '🔒 جاري إغلاق التذكرة...', components: [] });
        claimedBy.delete(interaction.channel.id);
        ticketInfo.delete(interaction.channel.id);

        try {
          const fetched  = await interaction.channel.messages.fetch({ limit: 100 });
          const sorted   = [...fetched.values()].reverse();
          const html     = buildTranscript(sorted, interaction.channel.name);
          const filePath = path.join(__dirname, `../transcript-${interaction.channel.name}.html`);
          fs.writeFileSync(filePath, html);
          const logCh = interaction.guild.channels.cache.get(LOG_CHANNEL_ID);
          if (logCh) {
            await logCh.send({
              embeds: [new EmbedBuilder().setTitle('🔒 تذكرة مغلقة').setColor('#ED4245')
                .addFields(
                  { name: 'القناة',       value: interaction.channel.name,          inline: true },
                  { name: 'أُغلق بواسطة', value: interaction.user.tag,              inline: true },
                  { name: 'مستلم بواسطة', value: claimer ? claimer.tag : 'لا أحد', inline: true },
                ).setTimestamp()],
              files: [filePath]
            });
            fs.unlinkSync(filePath);
          }
        } catch(e) { console.error('Transcript error:', e); }

        // DM تقييم
        if (info?.openerId) {
          try {
            const opener = await interaction.guild.members.fetch(info.openerId).catch(() => null);
            if (opener) {
              await opener.send({
                embeds: [new EmbedBuilder()
                  .setTitle('⭐ قيّم تجربتك معنا')
                  .setDescription(
                    `شكراً لتواصلك مع **Taxer Shop** 💜\n\n` +
                    `تذكرة رقم **#${info.ticketNum}** — ${info.cat.emoji} ${info.cat.label}\n\n` +
                    `كيف تقيّم الدعم الذي تلقيته؟`
                  )
                  .setColor('#7c6bff')
                  .setFooter({ text: 'تقييمك يساعدنا على تحسين الخدمة 🙏' })
                ],
                components: [ratingButtons(info.ticketNum)]
              }).catch(() => {});
            }
          } catch(e) { console.error('Rating DM error:', e); }
        }

        setTimeout(() => interaction.channel.delete().catch(() => {}), 3000);
        return;
      }

      // ── تقييم النجوم ────────────────────────────────────────
      if (interaction.isButton() && interaction.customId.startsWith('rate_')) {
        const parts     = interaction.customId.split('_');
        const stars     = parseInt(parts[1]);
        const ticketNum = parts[2];
        const starsText = '⭐'.repeat(stars);

        db.saveRating(interaction.user.id, ticketNum, stars);

        const ratingCh = interaction.client.channels.cache.get(RATING_CHANNEL_ID);
        if (ratingCh) {
          ratingCh.send({ embeds: [new EmbedBuilder()
            .setTitle('⭐ تقييم جديد')
            .setColor(stars >= 4 ? '#57F287' : stars >= 3 ? '#FEE75C' : '#ED4245')
            .addFields(
              { name: 'العضو',       value: interaction.user.tag, inline: true },
              { name: 'رقم التذكرة', value: `#${ticketNum}`,      inline: true },
              { name: 'التقييم',     value: starsText,            inline: true },
            ).setTimestamp()
          ]});
        }

        await interaction.update({
          embeds: [new EmbedBuilder()
            .setTitle('✅ شكراً على تقييمك!')
            .setDescription(`لقد أعطيت تقييم **${starsText}** (${stars}/5)\nرأيك مهم جداً لنا 💜`)
            .setColor('#57F287')
          ],
          components: []
        });
        return;
      }

      // ── SLASH COMMANDS ──────────────────────────────────────
      if (!interaction.isChatInputCommand()) return;
      const command = client.commands.get(interaction.commandName);
      if (!command) return;
      await command.execute(interaction);

    } catch (err) {
      console.error('Interaction error:', err);
      try {
        const msg = { content: '❌ خطأ!', flags: 64 };
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(msg);
        } else {
          await interaction.reply(msg);
        }
      } catch {}
    }
  }
};
