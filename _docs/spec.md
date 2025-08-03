# MCP dz-memory: Long-term Memory Tool

## Overview

dz-memory is an MCP (Memory-Centric Protocol) server that provides long-term
memory capabilities. It allows memorizing elements with their context, recalling
memorized elements through queries and/or context, and reorganizing memorized
elements to limit their number and improve the relevance of retrieved
information.

## Core Features

### Memory Tool

- Accepts text to memorize
- Accepts optional metadata (e.g., tags)
- Splits text into independent information chunks
- Detects metadata for each information piece

### Listing Tool

- Accepts text for semantic search
- Accepts metadata filtering
- Accepts temporal information filtering

### Storage

- Local storage (preferably pg_vector, fallback to sqlite, or in-memory for
  development)

### Memory Management

- Short-term and long-term memory mechanism (ability to recall older elements,
  but more easily retrieve recent ones)
- Automatic information reorganization mechanism
- Automatic metadata reorganization mechanism (e.g., tag merging)

## Bonus Features (Future)

### Structured Information Aggregation

- **Person sheet**: groups all memorized information about a given person
  - Potential integration with contact applications
- **Project sheet**: summarizes technical stack, important links, business
  knowledge
- **Todo list**: with metadata to list tasks related to a given context
  - Potential integration with TODO list tools
- **Concept sheet**: details the result of a conducted study
  - Potential integration with Obsidian or Notion

### External Integrations

- Calendar applications
- Contact management
- TODO list applications
- Note-taking applications

## Use Cases

- Finding the resolution method of an old backend problem when analyzing another
  backend problem
- Finding user style preferences for content generation
- Finding the name of an application that was analyzed in a previous
  conversation

## Technical Architecture

### Project Structure (Hexagonal Architecture)

```
mcp-dz-memory/
│
├── core/                # Domaine pur, agnostique
│   ├── models/          # Types, entités, helpers, value objects
│   ├── services/        # Cas d’usage, logique métier pure
│   └── ports/           # Interfaces des adapters (ports)
│
├── infra/               # Adapters techniques (implémentations)
│   ├── memory/          # In-memory storage
│   ├── postgresql/      # Adapter PostgreSQL/pgvector
│   ├── sqlite/          # Adapter SQLite
│   └── ...
│
├── api/                 # Points d’entrée (adapters primaires)
│   ├── http/            # Serveur HTTP
│   ├── cli/             # Interface CLI (optionnel)
│   └── mcp/             # Protocole MCP (parsing, dispatcher, outils)
│
├── tests/               # Tests unitaires et d’intégration
│
├── docs/                # Documentation
│
└── README.md
```

### Architecture Principles

- **Hexagonal (Ports & Adapters)** :
  - Le domaine (core/) ne dépend d’aucune technologie ni d’aucun point d’entrée.
  - Les services métier utilisent des interfaces (ports) pour accéder aux
    ressources externes (stockage, etc).
  - Les adapters techniques (infra/) implémentent ces ports pour chaque techno
    (in-memory, pgvector, sqlite, ...).
  - Les points d’entrée (api/) orchestrent le tout et font le wiring des
    dépendances.

- **Extensibilité** :
  - Ajouter un nouveau mode de stockage = nouvelle implémentation dans infra/.
  - Ajouter un nouvel endpoint = nouvelle entrée dans api/.

- **Testabilité** :
  - Le domaine est testable indépendamment de l’infrastructure.

### MCP Message Examples

**Memorization request:**

```json
{
  "id": "1",
  "tool": "memorize",
  "params": {
    "text": "Backend bug resolution",
    "tags": ["backend", "bug"],
    "context": "Project X, sprint 5"
  }
}
```

**Authentication**: All requests must include the static token in the request
headers:

```
Authorization: Bearer <static_token>
```

**Response:**

```json
{
  "id": "1",
  "result": {
    "status": "ok",
    "memory_id": "mem-123"
  }
}
```

**Error:**

```json
{
  "id": "1",
  "error": {
    "code": "INVALID_PARAMS",
    "message": "The 'text' field is required"
  }
}
```

## Implementation Roadmap

### Phase 1: Core Features

- Tool `memorize`: memorization, text splitting, metadata detection
- Tool `list`: semantic search, tag filtering, temporality
- Tool `reorganize`: merging, cleanup, short/long term management
- Local storage (pg_vector or sqlite, memory fallback)
- Static token authentication for security
- Unit tests for each tool and service

### Phase 2: Advanced Features

- Structured information aggregation (person sheets, project sheets, etc.)
- External application integrations
- Advanced semantic search capabilities
- Performance optimizations

## Technology Stack

- **Runtime**: Deno 2.0+
- **Language**: TypeScript
- **Storage**: pg_vector (preferred), SQLite (fallback), in-memory (development)
- **Protocol**: MCP over HTTP/WebSocket
- **Security**: Static token authentication (provided in app configuration)
- **Testing**: Deno's built-in testing framework
