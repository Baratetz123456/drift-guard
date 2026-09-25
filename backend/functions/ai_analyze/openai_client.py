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
    timeout: float = 60.0,
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
        timeout: Request timeout in seconds (default: 60.0)

    Returns:
        {
            "analysis": dict (parsed JSON response),
            "usage": {"prompt_tokens": int, "completion_tokens": int, "total_tokens": int}
        }
    """
    import urllib.error
    import urllib.request

    is_anthropic = (
        (base_url and "anthropic.com" in base_url.lower())
        or (model.lower().startswith("claude") and (not base_url or "openrouter" not in base_url.lower()))
    )

    if is_anthropic:
        anthropic_url = base_url.rstrip("/") if base_url else "https://api.anthropic.com/v1"
        if not anthropic_url.endswith("/messages"):
            if not anthropic_url.endswith("/v1"):
                anthropic_url += "/v1"
            anthropic_url += "/messages"

        req_headers = {
            "Content-Type": "application/json",
            "x-api-key": api_key.strip(),
            "anthropic-version": "2023-06-01",
        }
        if extra_headers:
            req_headers.update(extra_headers)

        payload = {
            "model": model,
            "system": system_prompt,
            "messages": [{"role": "user", "content": user_prompt}],
            "max_tokens": max_tokens,
            "temperature": 0.2,
        }

        last_error = None
        for attempt in range(MAX_RETRIES):
            try:
                logger.info(
                    f"Anthropic API call attempt {attempt + 1}/{MAX_RETRIES} "
                    f"(model={model}, url={anthropic_url})"
                )
                req = urllib.request.Request(
                    anthropic_url,
                    data=json.dumps(payload).encode("utf-8"),
                    headers=req_headers,
                    method="POST",
                )
                with urllib.request.urlopen(req, timeout=timeout) as resp:
                    resp_data = json.loads(resp.read().decode("utf-8"))
                    content = ""
                    if "content" in resp_data and isinstance(resp_data["content"], list):
                        content = resp_data["content"][0].get("text", "")

                    usage = {
                        "prompt_tokens": resp_data.get("usage", {}).get("input_tokens", 0),
                        "completion_tokens": resp_data.get("usage", {}).get("output_tokens", 0),
                        "total_tokens": resp_data.get("usage", {}).get("input_tokens", 0) + resp_data.get("usage", {}).get("output_tokens", 0),
                    }

                    analysis = json.loads(content)
                    return {"analysis": analysis, "usage": usage}

            except urllib.error.HTTPError as e:
                err_body = e.read().decode("utf-8", errors="ignore")
                last_error = f"HTTP {e.code}: {err_body}"
                if e.code in (401, 403):
                    raise DependencyError("Invalid Anthropic API key. Please check your credentials in Settings.")
                if e.code == 429 and attempt < MAX_RETRIES - 1:
                    delay = RETRY_DELAYS[attempt]
                    time.sleep(delay)
                    continue
                raise ExternalServiceError("Anthropic Provider", last_error)
            except Exception as e:
                last_error = str(e)
                if attempt < MAX_RETRIES - 1:
                    time.sleep(RETRY_DELAYS[attempt])
                    continue
                raise ExternalServiceError("Anthropic Provider", str(e))

        raise ExternalServiceError("Anthropic Provider", f"All {MAX_RETRIES} attempts failed: {last_error}")

    try:
        import openai
    except ImportError:
        raise DependencyError(
            "OpenAI library not installed. Add 'openai' to requirements."
        )

    headers = {
        "HTTP-Referer": "https://driftguard.network",
        "X-Title": "DriftGuard Network Change Verification",
    }
    if extra_headers:
        headers.update(extra_headers)

    client_kwargs: dict[str, Any] = {"api_key": api_key, "timeout": timeout}
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
                "Invalid API key. Please update your API key in Settings."
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
