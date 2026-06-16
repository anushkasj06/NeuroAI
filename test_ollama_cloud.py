import os
from ollama import Client

client = Client(
    host="https://ollama.com",
    headers={'Authorization': 'Bearer ' + os.environ.get('OLLAMA_API_KEY')}
)

try:
  for part in client.chat('gpt-oss:120b-cloud', messages=[{'role': 'user', 'content': 'hi'}], stream=True):
    print(part['message']['content'], end='', flush=True)
except Exception as e:
  print(f"\nERROR: {e}")
