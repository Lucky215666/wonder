from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.api.analysis import router as analysis_router
from backend.api.knowledge import router as knowledge_router
from backend.api.readme_advisor import router as readme_advisor_router

app = FastAPI(title="Note Forge API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analysis_router)
app.include_router(knowledge_router)
app.include_router(readme_advisor_router)


@app.get("/health")
async def health():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
