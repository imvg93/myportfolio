from fastapi import APIRouter
from ..config import settings
from ..schemas.chat import HealthResponse

router = APIRouter(tags=["Health"])


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Health & Capabilities Check",
    description="Returns the status of the Python AI engine and configured third-party integrations."
)
async def health_check():
    """
    Check API health and display which AI services are currently configured.
    """
    capabilities = {
        "openai_configured": bool(settings.OPENAI_API_KEY),
        "huggingface_configured": bool(settings.HUGGINGFACE_API_KEY),
        "pinecone_configured": bool(settings.PINECONE_API_KEY),
        "rag_enabled": bool(settings.PINECONE_API_KEY and settings.HUGGINGFACE_API_KEY),
    }

    return HealthResponse(
        status="ok",
        version=settings.VERSION,
        environment=settings.ENVIRONMENT,
        capabilities=capabilities
    )
