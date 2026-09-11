"""
OpenAI & OpenRouter API client wrapper with retry logic and error handling.
Supports OpenAI Direct and OpenRouter (`https://openrouter.ai/api/v1`) with any desired model.
"""

from __future__ import annotations

import json
import logging
import time
from typing import Any

from shared.exceptions import DependencyError, ExternalServiceError

logger = logging.getLogger(__name__)

# Retry configuration
MAX_RETRIES = 3
RETRY_DELAYS = [1, 2, 4]  # seconds


def call_openai(
    api_key: str,
    model: str,
    system_prompt: str,
    user_prompt: str,
    max_tokens: int = 4096,
    base_url: str | None = None,
    extra_headers: dict[str, str] | None = None,
) -> dict[str, Any]:
    """
    Call the OpenAI or OpenRouter Chat Completions API with retry logic.

    Args:
        api_key: API Key for OpenAI or OpenRouter (sk-or-v1-...)
        model: Model identifier (e.g. 'anthropic/claude-3.5-sonnet', 'openai/gpt-4o', 'deepseek/deepseek-r1')
        system_prompt: System prompt instructing the model
        user_prompt: Formatted network diff and analysis payload
        max_tokens: Token generation limit
        base_url: Optional API base URL (e.g. 'https://openrouter.ai/api/v1')
        extra_headers: Optional HTTP headers (e.g. HTTP-Referer, X-Title for OpenRouter)

    Returns:
        {
            "analysis": dict (parsed JSON response),
            "usage": {"prompt_tokens": int, "completion_tokens": int, "total_tokens": int}
        }
    """
    try:
        import openai
    except ImportError:
        raise DependencyError(
            "OpenAI library not installed. Add 'openai' to requirements."
        )

    headers = {
        "HTTP-Referer": "https://deltanet.local",
        "X-Title": "DeltaNet Cisco Network Automation",
    }
    if extra_headers:
        headers.update(extra_headers)

    client_kwargs: dict[str, Any] = {"api_key": api_key}
    if base_url:
        client_kwargs["base_url"] = base_url
        client_kwargs["default_headers"] = headers

    client = openai.OpenAI(**client_kwargs)

    last_error = None
    for attempt in range(MAX_RETRIES):
        try:
            logger.info(
                f"AI API call attempt {attempt + 1}/{MAX_RETRIES} "
                f"(model={model}, base_url={base_url or 'default'})"
            )

            response = client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                max_tokens=max_tokens,
                temperature=0.2,  # Low temperature for consistent analysis
                response_format={"type": "json_object"},
            )

            # Extract response
            content = response.choices[0].message.content or "{}"
            usage = {
                "prompt_tokens": getattr(response.usage, "prompt_tokens", 0) if response.usage else 0,
                "completion_tokens": getattr(response.usage, "completion_tokens", 0) if response.usage else 0,
                "total_tokens": getattr(response.usage, "total_tokens", 0) if response.usage else 0,
            }

            # Parse JSON response
            try:
                analysis = json.loads(content)
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse AI response as JSON: {e}")
                logger.error(f"Raw response: {content[:500]}")
                raise ExternalServiceError(
                    "AI Provider",
                    "Response was not valid JSON. Please try again.",
                )

            logger.info(
                f"AI analysis complete — "
                f"severity={analysis.get('severity', 'unknown')}, "
                f"tokens={usage['total_tokens']}"
            )

            return {
                "analysis": analysis,
                "usage": usage,
            }

        except openai.AuthenticationError:
            raise DependencyError(
                "Invalid API key. Please update your OpenAI / OpenRouter key in Settings."
            )

        except openai.RateLimitError as e:
            last_error = e
            if attempt < MAX_RETRIES - 1:
                delay = RETRY_DELAYS[attempt]
                logger.warning(
                    f"AI rate limit hit. Retrying in {delay}s..."
                )
                time.sleep(delay)
            else:
                raise ExternalServiceError(
                    "AI Provider",
                    "Rate limit exceeded. Please try again later.",
                )

        except openai.APIError as e:
            last_error = e
            if attempt < MAX_RETRIES - 1:
                delay = RETRY_DELAYS[attempt]
                logger.warning(
                    f"AI API error: {e}. Retrying in {delay}s..."
                )
                time.sleep(delay)
            else:
                raise ExternalServiceError("AI Provider", str(e))

        except Exception as e:
            raise ExternalServiceError("AI Provider", str(e))

    raise ExternalServiceError(
        "AI Provider", f"All {MAX_RETRIES} attempts failed: {last_error}"
    )
