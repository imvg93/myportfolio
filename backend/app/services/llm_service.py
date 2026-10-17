from typing import List, Optional, Tuple
import logging
import httpx
from ..config import settings
from ..schemas.chat import ChatMessage

logger = logging.getLogger(__name__)

SYSTEM_PROMPT_TEMPLATE = """You are Gireesh’s personal AI assistant.
You know everything about his skills, projects, and achievements.
Always answer naturally and helpfully in first-person as if you are Gireesh.
Mention real skills like Python, FastAPI, Next.js, MERN, Flutter, and AI/ML systems.
Never answer unrelated or private personal questions.
{rag_section}"""


class LLMService:
    """Service handling multi-provider LLM responses (OpenAI, Hugging Face)."""

    def __init__(self):
        self._openai_client = None

    def _get_openai_client(self):
        if self._openai_client is not None:
            return self._openai_client
        if not settings.OPENAI_API_KEY:
            return None
        from openai import AsyncOpenAI
        self._openai_client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        return self._openai_client

    def build_system_prompt(self, rag_context: str = "") -> str:
        rag_section = f"\n{rag_context}\n" if rag_context else ""
        return SYSTEM_PROMPT_TEMPLATE.format(rag_section=rag_section)

    async def _call_huggingface(self, messages: List[ChatMessage], system_prompt: str) -> Optional[str]:
        """Call Hugging Face inference API for chat completion."""
        if not settings.HUGGINGFACE_API_KEY:
            return None

        candidates = [
            settings.HF_TEXT_MODEL,
            "mistralai/Mistral-7B-Instruct-v0.2",
            "HuggingFaceH4/zephyr-7b-beta",
        ]
        candidates = [m for m in candidates if m]

        headers = {
            "Authorization": f"Bearer {settings.HUGGINGFACE_API_KEY}",
            "Content-Type": "application/json",
        }

        # Build prompt string for text-generation fallback
        history_text = "\n".join([f"{m.role.upper()}: {m.content}" for m in messages])
        formatted_prompt = f"{system_prompt}\n\n{history_text}\nASSISTANT:"

        async with httpx.AsyncClient(timeout=45.0) as client:
            for model in candidates:
                try:
                    url = f"https://api-inference.huggingface.co/models/{model}"
                    payload = {
                        "inputs": formatted_prompt,
                        "parameters": {
                            "max_new_tokens": 512,
                            "temperature": 0.7,
                            "return_full_text": False
                        },
                        "options": {"wait_for_model": True, "use_cache": False}
                    }
                    resp = await client.post(url, json=payload, headers=headers)
                    if resp.status_code == 200:
                        data = resp.json()
                        reply = ""
                        if isinstance(data, list) and len(data) > 0:
                            item = data[0]
                            reply = item.get("generated_text", "") if isinstance(item, dict) else str(item)
                        elif isinstance(data, dict):
                            reply = data.get("generated_text", "")

                        reply = reply.strip()
                        if reply:
                            logger.info("HF model %s succeeded", model)
                            return reply
                except Exception as e:
                    logger.warning("HF candidate %s failed: %s", model, e)
                    continue

        return None

    async def _call_openai(
        self,
        messages: List[ChatMessage],
        system_prompt: str,
        model: str = "gpt-4o"
    ) -> Optional[str]:
        """Call OpenAI chat completions API."""
        client = self._get_openai_client()
        if not client:
            return None

        formatted_messages = [{"role": "system", "content": system_prompt}]
        for m in messages:
            formatted_messages.append({"role": m.role, "content": m.content})

        try:
            response = await client.chat.completions.create(
                model=model,
                messages=formatted_messages,
                temperature=0.7,
            )
            return response.choices[0].message.content or ""
        except Exception as e:
            logger.error("OpenAI call failed for model %s: %s", model, e)
            # Try lightweight fallback if primary model failed
            if model != "gpt-4o-mini":
                try:
                    logger.info("Attempting OpenAI fallback to gpt-4o-mini...")
                    response = await client.chat.completions.create(
                        model="gpt-4o-mini",
                        messages=formatted_messages,
                        temperature=0.7,
                    )
                    return response.choices[0].message.content or ""
                except Exception as fb_err:
                    logger.error("OpenAI fallback failed: %s", fb_err)
            return None

    async def generate_chat_reply(
        self,
        messages: List[ChatMessage],
        rag_context: str = ""
    ) -> Tuple[str, str]:
        """
        Orchestrate LLM call across available providers.
        Returns (reply_text, model_name_used).
        """
        system_prompt = self.build_system_prompt(rag_context)

        # 1. Try Hugging Face if configured
        if settings.HUGGINGFACE_API_KEY:
            hf_reply = await self._call_huggingface(messages, system_prompt)
            if hf_reply:
                return hf_reply, "Hugging Face"

        # 2. Try OpenAI
        if settings.OPENAI_API_KEY:
            openai_reply = await self._call_openai(messages, system_prompt)
            if openai_reply:
                return openai_reply, "OpenAI (GPT-4o)"

        # 3. Graceful fallback if no API keys are active or services fail
        fallback_msg = (
            "Hi there! I am Gireesh's AI assistant. My Python AI engine is up and running! "
            "To enable live answers, please set OPENAI_API_KEY or HUGGINGFACE_API_KEY in your .env file."
        )
        return fallback_msg, "System Fallback"


llm_service = LLMService()
