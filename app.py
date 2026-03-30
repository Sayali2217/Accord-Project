import os
import re
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
from cli import run_agent_pipeline

app = FastAPI(title="Accord Project Agentic Pipeline")

class GenerateRequest(BaseModel):
    requirement: str
    model: str = "gemini"

@app.get("/")
def read_index():
    return FileResponse("index.html")
    
@app.get("/script.js")
def read_script():
    return FileResponse("script.js")

def parse_code_blocks(draft_text):
    pattern = r"```[a-zA-Z]*\n(.*?)```"
    blocks = re.findall(pattern, draft_text, re.DOTALL)
    if len(blocks) >= 3:
        return {"model": blocks[0].strip(), "text": blocks[1].strip(), "logic": blocks[2].strip()}
    return {"model": "Parsing error (couldn't find block)", "text": draft_text, "logic": "Parsing error (couldn't find block)"}

@app.post("/api/generate")
def generate_template(request: GenerateRequest):
    try:
        result = run_agent_pipeline(request.requirement, request.model)
        
        if not result.get("success"):
            raise HTTPException(status_code=500, detail=result.get("error"))
            
        draft_raw = result.get("draft_raw", "")
        parsed_files = parse_code_blocks(draft_raw)
        
        # Merge parsed files into the response
        result["parsed_model"] = parsed_files["model"]
        result["parsed_text"] = parsed_files["text"]
        result["parsed_logic"] = parsed_files["logic"]
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
