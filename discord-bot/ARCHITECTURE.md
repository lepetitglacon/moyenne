# Discord Bot Architecture

Architecture en couches avec injection de dépendances.

```
discord-bot/
├── index.js                 # Bootstrap (~130 lignes)
├── config.js                # Config Discord + API
├── db.js                    # Initialisation SQLite
├── api.js                   # Client HTTP vers server
├── logger.js                # Logger
│
├── domain-bridge/           # Bridge CJS/ESM vers server/domain
│   └── time.js              # validateTimeFormat, timeToCron
│
├── infrastructure/          # Repositories
│   ├── config.repository.js
│   └── user-link.repository.js
│
├── application/             # Services
│   ├── schedule.service.js  # Gestion cron, config heure
│   ├── user.service.js      # Link/unlink Discord-Tilt
│   └── recap.service.js     # Envoi récap, build embed
│
├── commands/                # Définitions slash commands
│   ├── index.js             # Registry
│   └── recap.command.js     # /recap avec subcommands
│
├── handlers/                # Handlers d'interaction
│   ├── interaction.handler.js  # Dispatcher
│   └── recap.handler.js     # Logique /recap
│
└── shared/
    ├── errors.js            # BotError, ValidationError...
    └── reply.js             # Helpers Discord (replyError, handleError)
```

## Principes

- **Commands** : définitions pures (SlashCommandBuilder)
- **Handlers** : parsing + appel service + réponse Discord
- **Services** : logique métier, inject deps via factory
- **Domain-bridge** : réutilise validation du server (CJS compat)
- **Shared** : gestion erreurs centralisée
