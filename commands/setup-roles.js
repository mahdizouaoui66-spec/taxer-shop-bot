const { SlashCommandBuilder, PermissionFlagsBits, PermissionsBitField } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup-roles')
    .setDescription('إنشاء وترتيب رتب الإدارة تلقائياً')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const guild = interaction.guild;
    await guild.roles.fetch();

    // ── Définition des rôles à créer ──
    const rolesToCreate = [
      {
        name: 'TX | Modérateur',
        color: '#3498db',
        hoist: true,
        mentionable: true,
        permissions: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages,
          PermissionsBitField.Flags.ReadMessageHistory,
          PermissionsBitField.Flags.ManageMessages,
          PermissionsBitField.Flags.KickMembers,
          PermissionsBitField.Flags.ModerateMembers,
          PermissionsBitField.Flags.ManageNicknames,
          PermissionsBitField.Flags.MuteMembers,
          PermissionsBitField.Flags.DeafenMembers,
          PermissionsBitField.Flags.MoveMembers,
        ]
      },
      {
        name: 'TX | Admin',
        color: '#9b59b6',
        hoist: true,
        mentionable: true,
        permissions: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages,
          PermissionsBitField.Flags.ReadMessageHistory,
          PermissionsBitField.Flags.ManageMessages,
          PermissionsBitField.Flags.ManageChannels,
          PermissionsBitField.Flags.ManageRoles,
          PermissionsBitField.Flags.KickMembers,
          PermissionsBitField.Flags.BanMembers,
          PermissionsBitField.Flags.ModerateMembers,
          PermissionsBitField.Flags.ManageNicknames,
          PermissionsBitField.Flags.MuteMembers,
          PermissionsBitField.Flags.DeafenMembers,
          PermissionsBitField.Flags.MoveMembers,
          PermissionsBitField.Flags.ManageGuild,
          PermissionsBitField.Flags.ViewAuditLog,
        ]
      },
      {
        name: 'TX | Manager',
        color: '#e74c3c',
        hoist: true,
        mentionable: true,
        permissions: [
          PermissionsBitField.Flags.Administrator,
        ]
      },
    ];

    const createdRoles = [];
    const existingRoles = [];

    for (const roleData of rolesToCreate) {
      const existing = guild.roles.cache.find(r => r.name === roleData.name);
      if (existing) {
        existingRoles.push(existing.name);
        continue;
      }

      const newRole = await guild.roles.create({
        name: roleData.name,
        color: roleData.color,
        hoist: roleData.hoist,
        mentionable: roleData.mentionable,
        permissions: roleData.permissions,
        reason: 'Setup automatique — Taxer Shop Bot',
      });
      createdRoles.push(newRole);
    }

    // ── Récupérer tous les rôles après création ──
    await guild.roles.fetch();

    const coOwnerRole  = guild.roles.cache.find(r => r.id === '1385261115524644894');
    const managerRole  = guild.roles.cache.find(r => r.name === 'TX | Manager');
    const adminRole    = guild.roles.cache.find(r => r.name === 'TX | Admin');
    const modRole      = guild.roles.cache.find(r => r.name === 'TX | Modérateur');
    const hightRole    = guild.roles.cache.get('1496295838459367455');
    const warriorRole  = guild.roles.cache.get('1496296648018497547');
    const newbieRole   = guild.roles.cache.get('1496295371025022996');
    const staffRole    = guild.roles.cache.get('1385261123862794261');

    // ── Classement des rôles (position haute = important) ──
    try {
      const botMember = guild.members.me;
      const botPos    = botMember.roles.highest.position;

      const positions = [];

      if (managerRole)  positions.push({ role: managerRole,  position: botPos - 1 });
      if (adminRole)    positions.push({ role: adminRole,    position: botPos - 2 });
      if (modRole)      positions.push({ role: modRole,      position: botPos - 3 });
      if (hightRole)    positions.push({ role: hightRole,    position: botPos - 4 });
      if (warriorRole)  positions.push({ role: warriorRole,  position: botPos - 5 });
      if (newbieRole)   positions.push({ role: newbieRole,   position: botPos - 6 });
      if (staffRole)    positions.push({ role: staffRole,    position: botPos - 7 });

      if (positions.length > 0) {
        await guild.roles.setPositions(positions).catch(e => console.error('Position error:', e));
      }
    } catch(e) { console.error('Classement error:', e); }

    // ── Réponse ──
    let desc = '';
    if (createdRoles.length > 0) {
      desc += `**✅ Rôles créés :**\n${createdRoles.map(r => `> ${r}`).join('\n')}\n\n`;
    }
    if (existingRoles.length > 0) {
      desc += `**ℹ️ Déjà existants :**\n${existingRoles.map(r => `> ${r}`).join('\n')}\n\n`;
    }
    desc += `**📊 Classement :**\n`;
    desc += `> 👑 TX | Co-Owner\n`;
    desc += `> 💎 TX | Manager\n`;
    desc += `> ⚔️ TX | Admin\n`;
    desc += `> 🛡️ TX | Modérateur\n`;
    desc += `> 🔴 TX| • Hight\n`;
    desc += `> 🟣 TX| • Warrior\n`;
    desc += `> 🔵 TX| • NEWBIE\n`;
    desc += `> 🟢 TX| STAFF`;

    await interaction.editReply({
      embeds: [{
        color: 0xcc0000,
        title: '✅ Setup des rôles terminé !',
        description: desc,
        footer: { text: 'Taxer Shop Bot Manager' },
        timestamp: new Date().toISOString(),
      }]
    });
  }
};
