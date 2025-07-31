# Exemple d'utilisation de l'API MCP dz-memory

Ce document présente des exemples pratiques d'utilisation de l'API MCP dz-memory.

## Démarrage du serveur

```bash
# Démarrer le serveur avec la configuration par défaut
deno run --allow-all main.ts

# Ou avec des variables d'environnement personnalisées
MCP_AUTH_TOKEN=mon-token-securise PORT=8080 deno run --allow-all main.ts
```

## Tests avec curl

### 1. Mémoriser des informations

```bash
# Mémoriser des informations sur un bug backend
curl -X POST http://localhost:8000 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer default-token-change-in-production" \
  -d '{
    "id": "mem-1",
    "tool": "memorize",
    "params": {
      "text": "Pour résoudre le problème de lenteur sur l API users, nous avons ajouté un index sur la colonne user_status dans la table users. Cela a réduit le temps de réponse de 2s à 200ms.",
      "tags": ["backend", "performance", "database", "api"],
      "context": "Projet CRM - Sprint 12",
      "priority": 9,
      "category": "technique"
    }
  }'

# Mémoriser des préférences utilisateur
curl -X POST http://localhost:8000 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer default-token-change-in-production" \
  -d '{
    "id": "mem-2",
    "tool": "memorize",
    "params": {
      "text": "Le client préfère un style de communication direct et concis. Il apprécie les résumés en points et n aime pas les longs paragraphes explicatifs.",
      "tags": ["client", "communication", "préférences"],
      "context": "Relation client - Marie Dupont",
      "priority": 7,
      "category": "personnel"
    }
  }'
```

### 2. Rechercher des informations

```bash
# Recherche par mots-clés
curl -X POST http://localhost:8000 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer default-token-change-in-production" \
  -d '{
    "id": "search-1",
    "tool": "list",
    "params": {
      "query": "performance API",
      "limit": 5
    }
  }'

# Recherche par tags
curl -X POST http://localhost:8000 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer default-token-change-in-production" \
  -d '{
    "id": "search-2",
    "tool": "list",
    "params": {
      "tags": ["backend", "performance"],
      "sortBy": "priority",
      "sortOrder": "desc"
    }
  }'

# Recherche par catégorie
curl -X POST http://localhost:8000 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer default-token-change-in-production" \
  -d '{
    "id": "search-3",
    "tool": "list",
    "params": {
      "category": "technique",
      "limit": 10
    }
  }'
```

### 3. Récupérer un souvenir spécifique

```bash
# Récupérer par ID
curl -X POST http://localhost:8000 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer default-token-change-in-production" \
  -d '{
    "id": "get-1",
    "tool": "get_memory",
    "params": {
      "id": "mem-1"
    }
  }'
```

### 4. Obtenir des métadonnées

```bash
# Lister tous les tags
curl -X POST http://localhost:8000 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer default-token-change-in-production" \
  -d '{
    "id": "tags-1",
    "tool": "get_tags",
    "params": {}
  }'

# Lister toutes les catégories
curl -X POST http://localhost:8000 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer default-token-change-in-production" \
  -d '{
    "id": "cat-1",
    "tool": "get_categories",
    "params": {}
  }'

# Obtenir les statistiques
curl -X POST http://localhost:8000 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer default-token-change-in-production" \
  -d '{
    "id": "stats-1",
    "tool": "get_stats",
    "params": {}
  }'
```

### 5. Réorganiser les souvenirs

```bash
# Nettoyer et optimiser
curl -X POST http://localhost:8000 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer default-token-change-in-production" \
  -d '{
    "id": "reorg-1",
    "tool": "reorganize",
    "params": {
      "mergeSimilarTags": true,
      "cleanupOldMemories": false,
      "optimizeStorage": true,
      "maxMemories": 1000
    }
  }'
```

## Utilisation programmatique

### Exemple en JavaScript/TypeScript

```javascript
class MCPMemoryClient {
  constructor(baseUrl = 'http://localhost:8000', authToken = 'default-token-change-in-production') {
    this.baseUrl = baseUrl;
    this.authToken = authToken;
  }

  async memorize(text, options = {}) {
    return this.request('memorize', {
      text,
      tags: options.tags || [],
      context: options.context,
      priority: options.priority || 5,
      category: options.category
    });
  }

  async search(query, options = {}) {
    return this.request('list', {
      query,
      tags: options.tags,
      category: options.category,
      limit: options.limit || 10,
      sortBy: options.sortBy || 'relevance'
    });
  }

  async getStats() {
    return this.request('get_stats', {});
  }

  async request(tool, params) {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.authToken}`
      },
      body: JSON.stringify({
        id: Date.now().toString(),
        tool,
        params
      })
    });

    const result = await response.json();

    if (result.error) {
      throw new Error(`MCP Error: ${result.error.message}`);
    }

    return result.result;
  }
}

// Utilisation
const memoryClient = new MCPMemoryClient();

// Mémoriser
await memoryClient.memorize(
  "L'authentification JWT nécessite une clé secrète robuste et une expiration courte",
  {
    tags: ['jwt', 'auth', 'security'],
    category: 'technique',
    priority: 8
  }
);

// Rechercher
const results = await memoryClient.search('JWT authentification', {
  tags: ['auth'],
  limit: 5
});

console.log('Souvenirs trouvés:', results.memories);
```

### Exemple en Python

```python
import requests
import json

class MCPMemoryClient:
    def __init__(self, base_url='http://localhost:8000', auth_token='default-token-change-in-production'):
        self.base_url = base_url
        self.auth_token = auth_token
        self.headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {auth_token}'
        }

    def memorize(self, text, tags=None, context=None, priority=5, category=None):
        return self._request('memorize', {
            'text': text,
            'tags': tags or [],
            'context': context,
            'priority': priority,
            'category': category
        })

    def search(self, query=None, tags=None, category=None, limit=10):
        params = {'limit': limit}
        if query:
            params['query'] = query
        if tags:
            params['tags'] = tags
        if category:
            params['category'] = category

        return self._request('list', params)

    def get_stats(self):
        return self._request('get_stats', {})

    def _request(self, tool, params):
        payload = {
            'id': str(int(time.time() * 1000)),
            'tool': tool,
            'params': params
        }

        response = requests.post(self.base_url, headers=self.headers, json=payload)
        result = response.json()

        if 'error' in result:
            raise Exception(f"MCP Error: {result['error']['message']}")

        return result['result']

# Utilisation
client = MCPMemoryClient()

# Mémoriser
client.memorize(
    "Pour déboguer les requêtes lentes PostgreSQL, utiliser EXPLAIN ANALYZE et vérifier les index",
    tags=['postgresql', 'debug', 'performance'],
    category='technique',
    priority=8
)

# Rechercher
results = client.search(query='PostgreSQL debug', tags=['performance'])
print(f"Trouvé {len(results['memories'])} souvenirs")
```

## Cas d'usage pratiques

### 1. Assistant de développement

```bash
# Mémoriser des solutions de bugs
curl -X POST http://localhost:8000 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer default-token-change-in-production" \
  -d '{
    "id": "dev-1",
    "tool": "memorize",
    "params": {
      "text": "Erreur CORS résolue en ajoutant les headers Access-Control-Allow-Origin et Access-Control-Allow-Methods dans le middleware Express",
      "tags": ["cors", "express", "javascript", "web"],
      "context": "Projet e-commerce - Debug CORS",
      "priority": 8,
      "category": "debug"
    }
  }'

# Rechercher des solutions similaires plus tard
curl -X POST http://localhost:8000 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer default-token-change-in-production" \
  -d '{
    "id": "dev-search",
    "tool": "list",
    "params": {
      "query": "CORS erreur",
      "tags": ["web"],
      "category": "debug"
    }
  }'
```

### 2. Gestion de préférences clients

```bash
# Mémoriser les préférences d'un client
curl -X POST http://localhost:8000 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer default-token-change-in-production" \
  -d '{
    "id": "client-1",
    "tool": "memorize",
    "params": {
      "text": "Client TechCorp: Préfère les réunions courtes (30min max), communications par email uniquement, très sensible aux délais",
      "tags": ["client", "preferences", "communication"],
      "context": "TechCorp - Jean Martin",
      "priority": 7,
      "category": "client"
    }
  }'
```

### 3. Base de connaissances technique

```bash
# Mémoriser de la documentation
curl -X POST http://localhost:8000 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer default-token-change-in-production" \
  -d '{
    "id": "kb-1",
    "tool": "memorize",
    "params": {
      "text": "Docker multi-stage builds permettent de réduire la taille des images en utilisant un conteneur temporaire pour la compilation et un conteneur final minimal pour l exécution",
      "tags": ["docker", "containers", "optimization", "devops"],
      "context": "Formation DevOps",
      "priority": 6,
      "category": "knowledge"
    }
  }'
```

Ces exemples montrent comment utiliser l'API MCP dz-memory pour créer un système de mémoire long terme polyvalent, que ce soit pour le développement, la gestion client ou la constitution d'une base de connaissances.
