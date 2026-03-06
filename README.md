# Quaere (ExtractAPI)

**A Local Multi-Engine Extraction Platform & Visual ORM running entirely in your browser.**

Quaere is a sophisticated data extraction and management environment that transforms unstructured documents (PDFs, Images) into structured, queryable data. Unlike traditional tools, it combines a **Visual ORM** interface with a **Local PostgreSQL engine (PGlite)** into a single, private workflow.

## Key Features

-   **🏗️ Visual ORM**: Map document elements directly to database schemas with a visual interface. Define tags, types, and relations without leaving the browser.
-   **🤖 AI-Powered Extraction**: Uses Google's Gemini API to intelligently parse documents, handle complex multi-page layouts, and populate your local database.
-   **💾 Local-First PostgreSQL**: Powered by [PGlite](https://pglite.dev/), providing a full PostgreSQL 17 engine running in a Web Worker. Your data stays in your browser's IndexedDB.
-   **💬 Data-Centric AI Chat**: Don't just chat *with* a PDF; chat *with your extracted data*. The AI can execute SQL, create tables, and transform data based on the current context.
-   **� Privacy-by-Design**: Absolute data sovereignty. Text extraction, database operations, and rendering happen locally. No documents are ever stored on a server.
-   **� Multi-Engine Architecture**: Processes data using a dedicated Web Worker to isolate heavy DB operations from the UI thread, ensuring a smooth, premium experience.

## The Workflow

1.  **Ingestion**: Drop any PDF or Image. The engine handles OCR and structural analysis locally.
2.  **Schema Design**: Use the Visual ORM or the AI Chat to define the target database schema.
3.  **Autonomous Extraction**: The AI extracts complex data points, mapping them to your defined columns with high precision.
4.  **SQL Querying & Management**: Query your data using standard SQL or natural language, export to JSON, or build workflows on top of your local database.

## Technology Stack

-   **Frontend:** React, TypeScript, Tailwind CSS
-   **Database:** [PGlite](https://pglite.dev/) (PostgreSQL 17.4 via WASM)
-   **Worker Architecture:** Dedicated Web Worker for database isolation
-   **PDF Processing:** [PDF.js](https://mozilla.github.io/pdf.js/)
-   **AI Language Model:** [Google Gemini API](https://ai.google.dev/) (`@google/genai`)
-   **Auth:** Clerk
