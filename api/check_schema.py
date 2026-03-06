import json
from database_chat_agent import AgentResponse

schema = AgentResponse.model_json_schema()
schema_str = json.dumps(schema, indent=2)
print(schema_str)

# Check for additionalProperties
if 'additionalProperties' in schema_str:
    print("\n\n==== FOUND additionalProperties in schema! ====")
else:
    print("\n\n==== No additionalProperties found ====")
