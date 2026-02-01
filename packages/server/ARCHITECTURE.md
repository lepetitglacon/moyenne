# Server Architecture

Clean Architecture avec séparation en couches.

```
server/
├── index.js              # Bootstrap (~120 lignes)
├── config.js             # Validation config (crash si manquant)
├── db.js                 # Initialisation SQLite
├── logger.js             # Logger avec niveaux
│
├── domain/               # Logique métier pure (0 dépendance)
│   ├── validators/       # Validation (time, rating, credentials, userId)
│   └── stats/            # Calculs stats (average, top3, dateRange)
│
├── infrastructure/       # Accès données
│   └── repositories/     # SQL queries (user, entry, rating)
│
├── application/          # Services métier
│   ├── auth.service.js   # Login, register
│   ├── entry.service.js  # CRUD entries
│   └── stats.service.js  # Stats, recap, users
│
├── interfaces/           # Adapters HTTP
│   └── http/
│       ├── middleware/   # auth, bot-auth, error
│       └── routes/       # auth, entries, stats, users, bot
│
└── shared/
    └── errors.js         # ValidationError, AuthError, NotFoundError...
```

## Principes

- **Domain** : fonctions pures, testables, sans I/O
- **Infrastructure** : factory pattern (`createXxxRepository(db)`)
- **Application** : orchestration, inject deps via factory
- **Interfaces** : routes minces, délèguent aux services
- **Errors** : types d'erreur mappés en HTTP par middleware central
