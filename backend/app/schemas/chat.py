from typing import List, Optional, Literal, Dict, Any
from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    """Single chat message schema."""
    role: Literal["user", "assistant", "system"] = Field(
        default="user",
        description="Role of the message sender."
    )
    content: str = Field(
        ...,
        min_length=1,
        description="Content of the message."
    )


class ChatRequest(BaseModel):
    """Payload for conversational chat with memory."""
    messages: List[ChatMessage] = Field(
        ...,
        min_items=1,
        description="Chronological list of chat messages."
    )


class ChatResponse(BaseModel):
    """Response payload for chat conversation."""
    ok: bool = Field(default=True, description="Success status.")
    reply: str = Field(..., description="Assistant response text.")
    model_used: Optional[str] = Field(default=None, description="Identifier of the model used.")


class AskRequest(BaseModel):
    """Payload for single-question Q&A with Pinecone context retrieval."""
    question: str = Field(
        ...,
        min_length=1,
        description="The question to ask Gireesh's AI persona."
    )


class SourceMetadata(BaseModel):
    """Metadata attached to a retrieved Pinecone vector match."""
    title: Optional[str] = None
    category: Optional[str] = None
    year: Optional[int] = None
    content: Optional[str] = None


class AskSource(BaseModel):
    """Single matched knowledge chunk."""
    index: int
    id: Optional[str] = None
    score: Optional[float] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class AskResponse(BaseModel):
    """Response payload containing answer and cited sources."""
    answer: str
    sources: List[AskSource] = Field(default_factory=list)


class HealthResponse(BaseModel):
    """Service health and capability status."""
    status: str = "ok"
    version: str
    environment: str
    capabilities: Dict[str, bool]
