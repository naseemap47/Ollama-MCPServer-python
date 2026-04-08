from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from MCP.client import MCPClient
from utils.config import Settings, QueryRequest


settings = Settings()

@asynccontextmanager
async def lifespan(app: FastAPI):
    client = MCPClient()
    try:
        connected = await client.connect_to_server(settings.server_script_path)
        if not connected:
            raise HTTPException(
                status_code=500, detail="Failed to connect to MCP Server"
            )
        app.state.client = client
        yield
    except Exception as e:
        print(f"Error during lifespan: {e}")
    finally:
        await client.cleanup()

app = FastAPI(title="MCP Client API", lifespan=lifespan)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

from fastapi.responses import StreamingResponse
import json

@app.post("/query")
async def process_query(request: QueryRequest):
    """Process a query and return the response"""
    try:
        messages = await app.state.client.process_query(request.query)
        return {"messages": messages}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/stream")
async def stream_query(request: QueryRequest):
    """Process a query and return the response as a stream of Server-Sent Events"""
    async def event_generator():
        try:
            async for event in app.state.client.process_query_stream(request.query):
                yield f"data: {json.dumps(event)}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
            
    return StreamingResponse(event_generator(), media_type="text/event-stream")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="localhost",
        port=8000,
        reload=True
    )
