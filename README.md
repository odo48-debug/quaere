# 🧠 Quaere: The Agent Brain

**A local-first, vector-powered memory layer for AI agents.**

Quaere is a specialized, open-source storage solution designed to acts as the "long-term memory" for AI agents. It provides a full **PostgreSQL 17** engine running entirely in your browser using **PGlite**, enhanced with **pgvector** for semantic search and **Google Gemini** for automatic embedding generation.

![Quaere Banner](https://images.unsplash.com/photo-1620712943543-bcc4628c6757?auto=format&fit=crop&q=80&w=1200&h=400)

## 🚀 Why Quaere?

Current AI agents are often "amnesic"—they lose context between sessions or struggle to retrieve relevant facts from thousands of messages. Quaere solves this by providing:

- **💾 Local-First Persistence**: Data stays in your browser's IndexedDB. Zero latency, 100% privacy.
- **🧬 Vector-Powered Memory**: Semantic search using `pgvector` to find memories by meaning, not just keywords.
- **🔗 Agent Bridge API**: A zero-sdk way for any agent (OpenClaw, etc.) to store and recall memories via standard Web APIs.
- **🏗️ Structured Knowledge**: Native support for **Episodic** (logs), **Semantic** (facts), and **Procedural** (skills) memory types.

## 🛠️ Core Features

- **PostgreSQL in the Browser**: A real SQL engine running via WASM (powered by PGlite).
- **Pro AI Integration**: Automatic vector embeddings for memories using `gemini-embedding-2-preview`.
- **SaaS Mode**: Integrated authentication with Clerk and subscription tiers (Free/Pro).
- **Brain Control Panel**: A premium UI to visualize, search, and manage your agent's knowledge graph and timeline.

## 🔌 The Agent Bridge API
Your agent doesn't need to know SQL. It just sends JSON messages via a `BroadcastChannel`.

### 1. Store a Memory (REMEMBER)
```javascript
const brain = new BroadcastChannel('quaere_agent_bridge');
brain.postMessage({
  type: 'REMEMBER',
  memory_type: 'episodic',
  content: 'The user is a software engineer from Madrid who likes React.',
  source: 'openclaw-v1',
  tags: ['user-profile', 'work']
});
```

### 2. Semantic Search (SEARCH)
```javascript
brain.postMessage({
  type: 'SEARCH',
  query: 'What do we know about the user\'s tech stack?',
  limit: 5
});

brain.onmessage = (e) => {
  if (e.data.type === 'SQL_RESULT') {
    console.log('Similar memories:', e.data.data.rows);
  }
};
```

## 💎 SaaS Tiers

| Feature | Free Tier | Pro Tier (SaaS) |
| :--- | :--- | :--- |
| **Storage** | Local-First (IndexedDB) | Local-First (IndexedDB) |
| **Max Rows** | 10,000 | Unlimited |
| **SQL Engine** | PostgreSQL 17 | PostgreSQL 17 |
| **Vector Search** | Manual Vectors | **Auto-Embed (Gemini 2)** |
| **UI** | Table Explorer | **Brain Control Panel** |
| **API** | Agent Bridge | Agent Bridge |

## ⚙️ Quick Start

1. **Clone & Install:**
   ```bash
   git clone https://github.com/your-org/quaere-engine.git
   cd quaere-engine
   npm install
   ```

2. **Configure Environment:**
   Create a `.env` file from `.env.example`:
   ```env
   VITE_GEMINI_API_KEY=your_google_ai_studio_key
   ```

3. **Launch:**
   ```bash
   npm run dev
   ```

## 🌐 Self-Hosting & Open Source

Quaere is **100% Open Source**. You can run the entire "Pro" experience for free on your own hardware. 

### How to enable "Pro" features locally:
To use the **Brain Control Panel** and **Automatic Embeddings** without a subscription:

1. **Obtain a Gemini API Key**: Get one for free at [Google AI Studio](https://aistudio.google.com/).
2. **Configure `.env`**: Add your key to `VITE_GEMINI_API_KEY`.
3. **Bypass Subscription**: The engine will detect your API key and enable all premium features automatically for your local instance.

### SaaS vs. Self-Hosted
| Feature | SaaS (quaere.so) | Self-Hosted |
| :--- | :--- | :--- |
| **Setup** | 1-click / No setup | Technical (Git/Node) |
| **AI Credits** | Included in €9/mo | Use your own API key |
| **Updates** | Automatic | Manual `git pull` |
| **Privacy** | 100% Local Browser | 100% Local Browser |

## 📜 Memory Architecture
Quaere organizes agent memory into three "Vaults":

1. **`brain_episodic`**: Temporal logs of experiences and interactions.
2. **`brain_semantic`**: Knowledge triples (Subject → Predicate → Object).
3. **`brain_procedural`**: Stored workflows, tools, and learned skills.

---
*Built for a future where AI is private, persistent, and local.*
