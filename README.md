# 🤖 TaxerBot v2 — Taxer Shop

## 📁 Structure
```
taxer-bot/
├── index.js
├── deploy-commands.js
├── config.json              ← REMPLIS EN PREMIER
├── .env.example             ← renomme en .env
├── commands/
│   ├── ticket-panel.js      /ticket-panel
│   ├── add.js               /add
│   ├── ban.js               /ban    (+1 pt)
│   ├── kick.js              /kick   (+1 pt)
│   ├── mute.js              /mute   (+1 pt)
│   ├── warn.js              /warn   (+1 pt)
│   ├── clear.js             /clear
│   └── top.js               /top classement
├── events/
│   ├── ready.js
│   ├── interactionCreate.js ← tickets + claim/unclaim
│   └── messageCreate.js     ← +profile
├── utils/
│   ├── db.js                points + numéro ticket
│   └── profileCard.js       carte violette/bleue
└── data/
    ├── counter.json         numéro ticket auto
    ├── points.json          points admins
    └── warns.json           avertissements
```

## ⚡ Installation rapide

```bash
# 1. Installer
npm install

# 2. Copier .env.example → .env et remplir
TOKEN=ton_token
CLIENT_ID=ton_client_id
GUILD_ID=ton_guild_id

# 3. Remplir config.json avec tes IDs Discord

# 4. Déployer les commandes
node deploy-commands.js

# 5. Lancer
node index.js
```

## 🎫 Système de tickets

| Étape | Ce qui se passe |
|---|---|
| Membre clique bouton panneau | Modal de détails s'ouvre |
| Membre remplit le modal | Salon `ticket-0001` créé automatiquement |
| Embed épinglé dans le salon | Numéro #1, #2, #3... auto |
| Staff clique **Claim** ✅ | +1 point staff, bouton devient **Unclaim** |
| Staff clique **Unclaim** 🔄 | -1 point, retour à Claim, "Waiting for staff..." |
| Fermer 🔒 | Confirmation → transcript HTML → suppression |

## 🏆 Points admins

| Action | Points |
|---|---|
| Claim ticket | +1 (stat tickets) |
| Unclaim | -1 |
| /ban | +1 (stat bans) |
| /kick | +1 (stat kicks) |
| /mute | +1 (stat mutes) |
| /warn | +1 (stat warns) |

## 🟣 Commandes prefix

| Commande | Description | Salon autorisé |
|---|---|---|
| `+profile` | Carte profil violette/bleue | #1416486448361902261 |
| `+profile @user` | Profil d'un autre admin | #1416486448361902261 |
| `+points @user 5` | Ajouter points manuellement | Partout (admin) |

## 🔒 PM2 — garder actif 24/7

```bash
npm install -g pm2
pm2 start index.js --name "taxer-bot"
pm2 save && pm2 startup
```
