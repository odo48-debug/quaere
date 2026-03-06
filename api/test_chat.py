import requests

url = 'http://localhost:8000/chat'
data = {
    'message': 'crea la tabla de facturas',
    'database_schema': [],
    'database_rows': [],
    'context': None
}

try:
    response = requests.post(url, json=data)
    print("Status Code:", response.status_code)
    try:
        json_resp = response.json()
        print("Answer:", json_resp.get('answer'))
        actions = json_resp.get('actions', [])
        print("Actions length:", len(actions))
        if actions:
            print("First action type:", actions[0].get('type'))
            print("First action payload snippet:", str(actions[0].get('payload', {}))[:100])
    except Exception as e:
        print("Failed to decode JSON:", e)
        print("Raw response:", response.text)
except Exception as e:
    print("Failed to connect:", e)
