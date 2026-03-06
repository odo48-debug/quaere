import os
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from google import genai
from google.genai import types
from composio import Composio

# Define Pydantic Schemas for Structured Output
class KeyValuePair(BaseModel):
    key: str = Field(description="The column ID")
    value: str = Field(description="The value for the column")

class SchemaColumn(BaseModel):
    id: str = Field(description="A unique, snake_case identifier for the column (e.g., 'invoice_date', 'total_amount')")
    name: str = Field(description="The human-readable name for the column (e.g., 'Invoice Date', 'Total Amount')")
    type: str = Field(description="Data type: 'string', 'number', 'date', 'boolean', or 'json'")

class ActionPayload(BaseModel):
    rowId: Optional[str] = Field(default=None, description="The ID of the row to modify or delete. Required for UPDATE_CELL and DELETE_ROW.")
    colId: Optional[str] = Field(default=None, description="The ID of the column to modify. Required for UPDATE_CELL.")
    value: Optional[str] = Field(default=None, description="The generic string value to set. Required for UPDATE_CELL.")
    values: Optional[List[KeyValuePair]] = Field(default=None, description="A list of key-value pairs for ADD_ROW.")
    sql: Optional[str] = Field(default=None, description="Raw SQL string to execute. Required for SQL_EXEC.")
    chartConfigJson: Optional[str] = Field(default=None, description="A full Chart.js configuration object (type, data, options) encoded as a JSON string. Required for RENDER_CHART.")
    gmailQuery: Optional[str] = Field(default=None, description="The Gmail search query (e.g., 'label:invoice', 'from:bank@example.com'). Required for SYNC_GMAIL.")
    gmailSyncLimit: Optional[int] = Field(default=5, description="Number of emails to fetch.")

class Action(BaseModel):
    type: str = Field(description="The type of action: ADD_ROW, UPDATE_CELL, DELETE_ROW, SQL_EXEC, RENDER_CHART, or SYNC_GMAIL.")
    payload: ActionPayload

class AgentResponse(BaseModel):
    answer: str = Field(description="A natural language answer or confirmation for the user. If CREATE_SCHEMA is used, include the equivalent SQL CREATE TABLE statement in a markdown code block.")
    actions: List[Action] = Field(description="A list of database actions to perform. Can be empty if just answering a question.", default_factory=list)

class DatabaseChatAgent:
    def __init__(self):
        api_key = os.getenv("API_KEY") or os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("API_KEY, GOOGLE_API_KEY, or GEMINI_API_KEY must be set.")
        self.client = genai.Client(api_key=api_key)
        self.model_name = "gemini-2.5-flash" 
        self.composio_api_key = os.getenv("COMPOSIO_API_KEY")
        self.composio = Composio(api_key=self.composio_api_key) if self.composio_api_key else None

    def process_chat(self, message: str, database_schema: List[Dict[str, Any]], database_rows: List[Dict[str, Any]], active_table: Optional[str] = None, available_tables: List[Dict[str, Any]] = [], context: Optional[Dict[str, Any]] = None, userId: Optional[str] = None) -> AgentResponse:
        MAX_ROW_LIMIT = 100

        system_instruction = f"""
You are a helpful database assistant. Under the hood you have access to an in-browser PostgreSQL database powered by PGlite (https://github.com/electric-sql/pglite) and Gmail integration via Composio.

## Language Rule
- **Response Language**: You MUST detect the language of the user's message and **respond in the same language**.

Your unique superpower: you can extract structured data from documents (PDFs, invoices) and now directly from GMAIL.

## Available Database Tables
The following tables are available in the user's database:
{available_tables}

**Active Table**: {active_table or "None"}

## Cross-Table Analysis
- You have access to the schemas of ALL tables listed above.
- You can and SHOULD perform **JOINs** between tables when the user's question requires it (e.g., joining an 'orders' table with a 'customers' table using a shared ID).
- When writing SQL with JOINs, always use table aliases (e.g., `FROM table1 t1 JOIN table2 t2 ON ...`) to avoid column name collisions.

## Your Available Actions
Use these structured actions to modify the database.

- **SYNC_GMAIL** — Connect to and search the user's Gmail inbox to extract data from emails or attachments.
  - **WHEN TO USE**: Use this when the user says "sync my emails", "find invoices in my inbox", "look for amazon orders in my gmail", etc.
  - Payload:
    - `gmailQuery`: A search query (e.g. "subject:invoice", "from:amazon.es").
    - `gmailSyncLimit`: Default is 5.
  - **HOW IT WORKS**: The system will search for emails. For each email, it will extract:
    1. Metadata (Date, Sender, Subject).
    2. Body Content (The text of the email).
    3. Attachments (PDFs which will be automatically run through our OCR extraction).
  - You should then use the results to populate or update the database.

- **SQL_EXEC** — Execute arbitrary SQL directly.
- **RENDER_CHART** — Render visualization using Chart.js.
- **ADD_ROW** — Insert a row.
- **UPDATE_CELL** — Update a cell.
- **DELETE_ROW** — Delete a row.

## Behavior Rules
- **Gmail Extraction**: When a user asks to sync Gmail, explain that you will look for emails and extract both the content of the message and any relevant attachments like invoices.
- **Auto-Mapping**: Based on the emails found, you should intelligently map fields like "Amount", "Date", "Vendor" from the email body OR the attachments into the active table.
- If the user isn't connected to Gmail yet, the system will provide an authorization link which the frontend handles.
"""
        
        prompt = f"""
        User Message: {message}
        User ID: {userId or "anonymous"}
        
        Current Database Schema (columns of active table):
        {database_schema}
        
        Current Database Rows (of active table):
        {database_rows}
        
        Active Context (if any):
        {context}
        """

        import json, traceback

        # Describe the expected JSON format in the system prompt instead of using response_schema
        # This avoids Gemini SDK additionalProperties issues with Pydantic schemas
        json_format_instruction = """
## IMPORTANT: Response Format
You MUST respond with ONLY a valid JSON object in this exact format. No text before or after the JSON.

```json
{
  "answer": "Your natural language answer here",
  "actions": [
    {
      "type": "ACTION_TYPE",
      "payload": {
        "sql": "SELECT ...",
        "rowId": null,
        "colId": null,
        "value": null,
        "values": null,
        "chartConfigJson": null,
        "gmailQuery": "...",
        "gmailSyncLimit": 5
      }
    }
  ]
}
```

Action types: SQL_EXEC, RENDER_CHART, ADD_ROW, UPDATE_CELL, DELETE_ROW, SYNC_GMAIL
For SYNC_GMAIL: set payload.gmailQuery (e.g. "invoice")
"""

        full_system_instruction = system_instruction + json_format_instruction

        try:
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=prompt,
                config=types.GenerateContentConfig(
                    system_instruction=full_system_instruction,
                    response_mime_type="application/json",
                    temperature=0.1
                ),
            )
        except Exception as api_error:
            print(f"[GEMINI API ERROR] {type(api_error).__name__}: {api_error}")
            print(traceback.format_exc())
            raise

        try:
            response_text = response.text.strip()
            # Strip markdown code fences if present
            if response_text.startswith("```"):
                response_text = response_text.split("```")[1]
                if response_text.startswith("json"):
                    response_text = response_text[4:]
                response_text = response_text.strip()
            data = json.loads(response_text)
            # Ensure actions list exists
            if "actions" not in data:
                data["actions"] = []
            return AgentResponse(**data)
        except Exception as e:
            print("Error parsing Gemini response:", e)
            print("Raw response:", response.text)
            return AgentResponse(answer="Sorry, I encountered an error processing your request.", actions=[])
