# MCP dz-memory: Long-term Memory Tool

Un serveur MCP (Memory-Centric Protocol) qui fournit des capacités de mémoire à long terme. Il permet de mémoriser des éléments avec leur contexte, de rappeler des éléments mémorisés via des requêtes et/ou du contexte, et de réorganiser les éléments mémorisés pour limiter leur nombre et améliorer la pertinence des informations récupérées.

## Fonctionnalités principales

### Outil de mémoire
- Accepte du texte à mémoriser
- Accepte des métadonnées optionnelles (ex: tags)
- Divise le texte en chunks d'information indépendants
- Détecte automatiquement les métadonnées pour chaque morceau d'information

### Outil de liste
- Accepte du texte pour la recherche sémantique
- Accepte le filtrage par métadonnées
- Accepte le filtrage par information temporelle

### Stockage
- Stockage local (préférablement pg_vector, fallback vers sqlite, ou en mémoire pour le développement)

### Gestion de la mémoire
- Mécanisme de mémoire à court et long terme (capacité de rappeler des éléments plus anciens, mais récupération plus facile des récents)
- Mécanisme automatique de réorganisation de l'information
- Mécanisme automatique de réorganisation des métadonnées (ex: fusion de tags)

## Installation

### Prérequis
- [Deno](https://deno.land/) version 1.40 ou supérieure

### Installation
```bash
# Cloner le repository
git clone <repository-url>
cd mcp-dz-memory

# Installer les dépendances (automatique avec Deno)
deno cache main.ts
```

## Configuration

### Variables d'environnement
```bash
# Token d'authentification (obligatoire en production)
export MCP_AUTH_TOKEN="your-secure-token-here"

# Configuration de la base de données
export DATABASE_URL="postgresql://user:password@localhost:5432/mcp_memory"  # Pour pgvector
export DATABASE_PATH="./data/memory.db"  # Pour SQLite

# Niveau de log
export LOG_LEVEL="INFO"  # DEBUG, INFO, WARNING, ERROR
```

### Configuration par défaut
- **Port**: 8000
- **Base de données**: En mémoire (pour le développement)
- **Token d'auth**: "default-token-change-in-production"
- **Niveau de log**: INFO

## Utilisation

### Démarrage du serveur
```bash
# Mode développement avec rechargement automatique
deno task dev

# Mode production
deno task start

# Tests
deno task test
```

### Format des requêtes MCP

Toutes les requêtes doivent inclure le token d'authentification dans l'en-tête :
```
Authorization: Bearer <your-token>
```

#### Mémoriser du texte
```json
{
  "id": "1",
  "tool": "memorize",
  "params": {
    "text": "Backend bug resolution: The issue was caused by incorrect SQL query syntax. Fixed by adding proper WHERE clause.",
    "tags": ["backend", "bug", "sql"],
    "context": "Project X, sprint 5",
    "priority": 8
  }
}
```

#### Rechercher des mémoires
```json
{
  "id": "2",
  "tool": "list",
  "params": {
    "query": "backend bug",
    "tags": ["backend"],
    "limit": 10,
    "sortBy": "relevance"
  }
}
```

#### Réorganiser les mémoires
```json
{
  "id": "3",
  "tool": "reorganize",
  "params": {
    "mergeSimilarTags": true,
    "cleanupOldMemories": true,
    "maxMemories": 1000
  }
}
```

#### Récupérer une mémoire spécifique
```json
{
  "id": "4",
  "tool": "get_memory",
  "params": {
    "id": "mem-123"
  }
}
```

#### Obtenir tous les tags
```json
{
  "id": "5",
  "tool": "get_tags",
  "params": {}
}
```

#### Obtenir toutes les catégories
```json
{
  "id": "6",
  "tool": "get_categories",
  "params": {}
}
```

#### Obtenir les statistiques
```json
{
  "id": "7",
  "tool": "get_stats",
  "params": {}
}
```

### Exemple avec curl
```bash
# Mémoriser du texte
curl -X POST http://localhost:8000 \
  -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "1",
    "tool": "memorize",
    "params": {
      "text": "API endpoint /users returns 500 error when user_id is null",
      "tags": ["api", "error", "users"],
      "context": "Production issue",
      "priority": 9
    }
  }'

# Rechercher des mémoires
curl -X POST http://localhost:8000 \
  -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "2",
    "tool": "list",
    "params": {
      "query": "API error",
      "tags": ["api"],
      "limit": 5
    }
  }'
```

## Architecture technique

### Structure du projet
```
mcp-dz-memory/
│
├── main.ts                # Point d'entrée du serveur
│
├── mcp/                   # Gestion du protocole MCP
│   ├── dispatcher.ts      # Route les messages MCP vers les outils
│   ├── types.ts           # Types de messages MCP
│   └── utils.ts           # Utilitaires MCP
│
├── tools/                 # Implémentation des outils MCP
│   ├── memorize.ts        # Outil pour mémoriser du texte
│   ├── list.ts            # Outil pour lister/rechercher des mémoires
│   ├── reorganize.ts      # Outil pour réorganiser la mémoire
│   ├── get_memory.ts      # Outil pour récupérer une mémoire
│   ├── get_tags.ts        # Outil pour récupérer les tags
│   ├── get_categories.ts  # Outil pour récupérer les catégories
│   └── get_stats.ts       # Outil pour récupérer les statistiques
│
├── services/              # Logique métier
│   ├── memory.ts          # Division de texte, détection de métadonnées
│   └── reorganizer.ts     # Réorganisation, fusion, gestion court/long terme
│
├── db/                    # Abstraction du stockage
│   ├── index.ts           # Interface commune
│   └── memory.ts          # Implémentation en mémoire
│
├── types/                 # Types TypeScript partagés
│   ├── memory.ts          # Types pour les entités de mémoire
│   └── mcp.ts             # Types pour le protocole MCP
│
└── docs/                  # Documentation
    ├── spec.md            # Spécifications du projet
    └── code-style.md      # Guide de style de code
```

### Principes d'architecture

- **Protocole MCP**: Interactions via messages structurés (JSON) sur HTTP
- **Séparation claire**: Protocole, outils, services et stockage sont séparés
- **Extensibilité**: Ajouter un nouvel outil = créer un fichier dans `tools/`
- **Types partagés**: Tous les types d'entités centralisés dans `types/`

## Cas d'usage

- Trouver la méthode de résolution d'un ancien problème backend lors de l'analyse d'un autre problème backend
- Trouver les préférences de style utilisateur pour la génération de contenu
- Trouver le nom d'une application qui a été analysée dans une conversation précédente

## Développement

### Formatage du code
```bash
deno fmt
```

### Linting
```bash
deno lint
```

### Tests
```bash
deno test
```

### Structure des tests
Les tests doivent être organisés dans le dossier `tests/` avec la même structure que le code source.

## Production

### Configuration recommandée
- Utiliser PostgreSQL avec pgvector pour la recherche sémantique
- Configurer un token d'authentification sécurisé
- Utiliser un reverse proxy (nginx) pour HTTPS
- Configurer la rotation des logs

### Variables d'environnement de production
```bash
export MCP_AUTH_TOKEN="your-very-secure-token"
export DATABASE_URL="postgresql://user:password@localhost:5432/mcp_memory"
export LOG_LEVEL="INFO"
```

## Licence

[À définir selon les besoins du projet] 