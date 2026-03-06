from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import io
import os
import shutil
import tempfile
import re
from pathlib import Path
from dotenv import load_dotenv
import traceback
from composio import ComposioToolSet

# Load .env from parent directory
dotenv_path = Path(__file__).resolve().parent.parent / '.env'
load_dotenv(dotenv_path=dotenv_path)

from ocr_processor import OCRProcessor
from database_chat_agent import DatabaseChatAgent
from pydantic import BaseModel
from typing import List, Dict, Any, Optional

class ChatRequest(BaseModel):
    message: str
    userId: Optional[str] = None
    active_table: Optional[str] = None
    available_tables: List[Dict[str, Any]] = []
    database_schema: List[Dict[str, Any]]
    database_rows: List[Dict[str, Any]]
    context: Optional[Dict[str, Any]] = None

class FetchUrlRequest(BaseModel):
    url: str

app = FastAPI()

# Enable CORS for the React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/process")
async def process_document(file: UploadFile = File(...)):
    # Save the uploaded file to a temporary location
    suffix = Path(file.filename).suffix
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp_file:
        shutil.copyfileobj(file.file, tmp_file)
        tmp_path = tmp_file.name

    try:
        # Common Tesseract paths on Windows
        tesseract_paths = [
            r"C:\Program Files\Tesseract-OCR\tesseract.exe",
            r"C:\Users\AppData\Local\Tesseract-OCR\tesseract.exe",
            "/usr/bin/tesseract",
            os.getenv("TESSERACT_PATH", "")
        ]
        
        tesseract_exe = None
        for path in tesseract_paths:
            if path and os.path.exists(path):
                tesseract_exe = path
                break

        # Initialize OCRProcessor with Spanish and English support
        processor = OCRProcessor(tmp_path, lang='spa+eng', tesseract_path=tesseract_exe)
        
        # Preprocess for better accuracy if it's an image
        if suffix.lower() in ['.png', '.jpg', '.jpeg', '.tiff']:
            processor.preprocess(denoise=True, contrast=1.2)
            
        result = processor.extract_structured()
        
        pages_data = []
        
        # Group lines by page for the frontend
        for page_idx in range(result['pages']):
            page_num = page_idx + 1
            
            # Since OCRProcessor uses images, we get width/height from the images
            img = processor._images[page_idx]
            width, height = img.size
            
            page_lines = []
            for line in result['lines']:
                if line['page'] == page_num:
                    # Convert [x, y, w, h] to [x0, y0, x1, y1] for consistency with pdfplumber style if needed
                    # but typically [x, y, w, h] is fine if the frontend expects it.
                    # Frontend in App.tsx seems to expect [x0, y0, x1, y1] or similar?
                    # Let's provide [x, y, x+w, y+h] just in case.
                    bbox = line['bbox']
                    page_lines.append({
                        "text": line['text'],
                        "bbox": [bbox[0], bbox[1], bbox[0] + bbox[2], bbox[1] + bbox[3]]
                    })
            
            pages_data.append({
                "page_index": page_idx,
                "width": float(width),
                "height": float(height),
                "lines": page_lines,
                "tables": [] # Simple OCR doesn't always handle tables well, adding empty for now
            })
            
        return {"pages": pages_data}
        
    finally:
        # Clean up temporary file
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

class GmailSyncRequest(BaseModel):
    userId: str
    query: str
    limit: int = 5

class GmailSyncResponse(BaseModel):
    status: str
    auth_url: Optional[str] = None
    data: List[Dict[str, Any]] = []

def get_gmail_session(user_id: str):
    # Using ComposioToolSet which is standard for 0.7.x
    toolset = ComposioToolSet(api_key=os.getenv("COMPOSIO_API_KEY"))
    entity = toolset.get_entity(id=user_id)
    return toolset, entity

@app.post("/gmail/sync", response_model=GmailSyncResponse)
async def gmail_sync(request: GmailSyncRequest):
    try:
        toolset, entity = get_gmail_session(request.userId)
        
        # Check if connected — get_connection returns None/raises if not found
        try:
            connection = entity.get_connection(app="gmail")
        except Exception:
            connection = None
        
        if not connection:
            # Generate auth URL
            auth_result = entity.initiate_connection(app_name="gmail")
            return GmailSyncResponse(status="needs_auth", auth_url=auth_result.redirectUrl)

        # Connected, search emails using the correct action name for composio 0.7.x
        result = toolset.execute_action(
            action="GMAIL_FETCH_EMAILS",
            params={
                "query": request.query,
                "max_results": request.limit,
                "include_spam_trash": False
            },
            entity_id=request.userId
        )

        # Unwrap - result may be wrapped in a 'data' key
        emails = result.get("data", result) if isinstance(result, dict) else {}
        messages = emails.get("messages", emails.get("emails", []))
        
        extracted_results = []
        
        for msg in messages:
            # Confirmed field names from GMAIL_FETCH_EMAILS response:
            # messageId, messageTimestamp, sender, subject, messageText, preview, attachmentList
            body = msg.get("messageText") or msg.get("preview") or ""
            email_data = {
                "source": "gmail",
                "email_id": msg.get("messageId", ""),
                "date": msg.get("messageTimestamp", ""),
                "sender": msg.get("sender", ""),
                "subject": msg.get("subject", "No Subject"),
                "content_preview": body[:500]
            }
            extracted_results.append(email_data)

        return GmailSyncResponse(status="success", data=extracted_results)
    except Exception as e:
        print(f"Gmail Sync Error: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/chat")
async def chat_endpoint(request: ChatRequest):
    try:
        agent = DatabaseChatAgent()
        response = agent.process_chat(
            message=request.message,
            userId=request.userId,
            active_table=request.active_table,
            available_tables=request.available_tables,
            database_schema=request.database_schema,
            database_rows=request.database_rows,
            context=request.context
        )
        result = response.model_dump()
        print(f"[CHAT RESPONSE] answer_preview='{result['answer'][:80]}...' actions={result['actions']}")
        return result
    except Exception as e:
        print(f"Chat Error: {e}")
        return {"answer": f"Error: {str(e)}", "actions": []}

@app.post("/fetch-url")
async def fetch_url(request: FetchUrlRequest):
    try:
        import urllib.request
        headers = {'User-Agent': 'Mozilla/5.0'}
        req = urllib.request.Request(request.url, headers=headers)
        with urllib.request.urlopen(req, timeout=15) as response:
            raw = response.read().decode('utf-8', errors='ignore')
        # Strip HTML tags
        plain = re.sub(r'<[^>]+>', ' ', raw)
        plain = re.sub(r'\s+', ' ', plain).strip()
        return {"text": plain[:50000]}  # Limit to 50k chars
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not fetch URL: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
