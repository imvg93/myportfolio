from fastapi import APIRouter, HTTPException, status
import logging
from ..schemas.chat import ChatRequest, ChatResponse
from ..services.rag_service import rag_service
from ..services.llm_service import llm_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["Chat"])


@router.post(
    "/chat",
    response_model=ChatResponse,
    summary="Chat with Gireesh's AI Persona",
    description="Takes conversation history, retrieves Pinecone RAG context, and generates persona response."
)
async def chat_endpoint(payload: ChatRequest):
    """
    Handle multi-turn conversational chat with automatic vector retrieval.
    """
    try:
        messages = payload.messages
        if not messages:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Messages list cannot be empty."
            )

        # Retrieve last user message for RAG context search
        last_user_msg = next((m for m in reversed(messages) if m.role == "user"), None)
        rag_context = ""
        if last_user_msg:
            rag_context, _ = await rag_service.retrieve_context(last_user_msg.content, top_k=5)

        reply, model_used = await llm_service.generate_chat_reply(messages, rag_context)

        return ChatResponse(
            ok=True,
            reply=reply,
            model_used=model_used
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Unexpected error in /api/chat: %s", e)
        # Return friendly fallback without 500 crashing client
        return ChatResponse(
            ok=True,
            reply="I am temporarily experiencing high load. Please try asking again in a few moments.",
            model_used="Error Fallback"
        )
