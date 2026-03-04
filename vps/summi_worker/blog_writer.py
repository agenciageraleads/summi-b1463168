"""
blog_writer.py — Automated SEO blog post generator for Summi.

Flow:
1. Pick a keyword: pytrends (Google Trends BR) with fallback to curated seed list
2. Generate full Markdown post via OpenAI GPT-4o (SEO + AIO optimized)
3. Fetch a cover photo from Unsplash API
4. Insert the post into Supabase blog_posts table (published=True)
"""
from __future__ import annotations

import hashlib
import json
import logging
import os
import random
import re
import time
from datetime import date
from typing import Optional

import requests

from .supabase_rest import SupabaseRest

logger = logging.getLogger("summi_worker.blog_writer")

# ---------------------------------------------------------------------------
# Seed keyword list (used as fallback and as pytrends seed)
# ---------------------------------------------------------------------------
SEED_KEYWORDS = [
    "como transcrever audio do whatsapp automaticamente",
    "whatsapp business para pequenas empresas automação",
    "resumo de conversas whatsapp com ia",
    "como não perder mensagens importantes whatsapp",
    "assistente ia para whatsapp",
    "automação de atendimento whatsapp",
    "transcrição de audio whatsapp gratis",
    "produtividade no whatsapp dicas",
    "ia para responder mensagens whatsapp",
    "whatsapp business dicas para vendas",
    "como organizar grupos de whatsapp trabalho",
    "whatsapp business vs whatsapp normal diferenças",
    "como usar whatsapp para gerar leads",
    "automatizar respostas whatsapp business",
    "análise de conversas whatsapp inteligência artificial",
    "como economizar tempo respondendo whatsapp",
    "alertas de mensagens importantes whatsapp",
    "ia que resume áudios do whatsapp",
    "como profissionais usam whatsapp no trabalho",
    "whatsapp para atendimento ao cliente automação",
    "transcrição de reuniões whatsapp",
    "como gerenciar múltiplos whatsapp business",
    "privacidade no whatsapp business lgpd",
    "whatsapp e produtividade empresarial",
    "ia conversacional whatsapp 2026",
    "como fazer follow up pelo whatsapp",
    "chatbot whatsapp pequenas empresas gratis",
    "whatsapp marketing estratégias",
    "como não se distrair com notificações whatsapp",
    "ferramenta ia para whatsapp business brasil",
]

# Unsplash search queries mapped to niches
UNSPLASH_QUERIES = [
    "artificial intelligence productivity",
    "whatsapp business smartphone",
    "technology automation workspace",
    "mobile phone communication business",
    "digital assistant ai",
    "productivity workspace laptop",
    "business communication technology",
    "smartphone messaging app",
]

# ---------------------------------------------------------------------------
# GPT-4o blog generation prompt
# ---------------------------------------------------------------------------
_SYSTEM_PROMPT = """\
Você é um redator especialista em SEO e AIO (AI Overview Optimization) para o mercado brasileiro de tecnologia.
Você escreve artigos para o blog da Summi, uma ferramenta de IA para WhatsApp Business.

Regras de escrita:
- Escreva em Português Brasileiro, tom profissional mas acessível
- O artigo deve ser otimizado para aparecer no Google E nas respostas de IA (ChatGPT, Gemini, Copilot, Perplexity)
- Para AIO: responda perguntas diretamente, use listas, seja conciso nos primeiros parágrafos
- Para SEO: use a palavra-chave principal no título, nos primeiros 100 palavras e em subtítulos
- Extensão: 1800-2500 palavras
- Inclua sempre uma seção FAQ com 4-6 perguntas e respostas diretas (ótimo para featured snippets)
- Mencione a Summi naturalmente 2-3 vezes como solução (não faça propaganda agressiva)
- Não invente dados — use afirmações verdadeiras e genéricas quando precisar de estatísticas

Formato de saída — retorne JSON com:
{
  "title": "Título otimizado para SEO (50-60 chars)",
  "excerpt": "Meta description (150-160 chars, inclui a keyword)",
  "slug": "url-amigavel-sem-acentos",
  "category": "Produtividade|Tutoriais|Negócios|Tecnologia",
  "tags": ["tag1", "tag2", "tag3"],
  "keywords": "keyword1, keyword2, keyword3",
  "reading_time": <int minutos>,
  "content": "<conteúdo completo em Markdown>"
}
"""

_USER_PROMPT_TEMPLATE = """\
Escreva um artigo completo e otimizado sobre o tema:
"{keyword}"

O artigo deve:
1. Ter um H1 implícito no título (não repita o título dentro do content)
2. Começar com 2-3 parágrafos que respondem diretamente o que o leitor quer saber (para AIO)
3. Usar ## para seções principais e ### para subseções
4. Incluir exemplos práticos do dia a dia brasileiro
5. Ter uma seção "## Perguntas Frequentes" com pelo menos 5 Q&As em formato ### Pergunta / Resposta
6. Terminar com uma conclusão e menção natural à Summi como solução

Retorne APENAS o JSON, sem markdown extra ao redor.
"""


def _pick_keyword_pytrends() -> str:
    """Try pytrends to get a trending keyword related to our niche."""
    try:
        from pytrends.request import TrendReq  # type: ignore

        seed = random.choice(SEED_KEYWORDS[:8])  # use top seeds for pytrends
        pt = TrendReq(hl="pt-BR", tz=-180, timeout=(10, 30), retries=2, backoff_factor=0.5)
        pt.build_payload([seed], timeframe="now 7-d", geo="BR")
        related = pt.related_queries()
        rising = related.get(seed, {}).get("rising")
        if rising is not None and not rising.empty:
            candidates = rising["query"].tolist()[:5]
            # Filter for relevance: keep queries that contain at least one of our core terms
            core = {"whatsapp", "audio", "áudio", "ia", "automação", "resumo", "transcrição", "mensagem"}
            relevant = [q for q in candidates if any(c in q.lower() for c in core)]
            if relevant:
                kw = relevant[0]
                logger.info("[blog_writer] pytrends keyword: %s", kw)
                return kw
        logger.info("[blog_writer] pytrends: no relevant rising queries, using seed")
    except Exception as exc:
        logger.warning("[blog_writer] pytrends failed (%s), using seed list", exc)

    return _pick_seed_keyword()


def _pick_seed_keyword() -> str:
    """Pick a seed keyword that hasn't been used recently."""
    return random.choice(SEED_KEYWORDS)


def _slug_from_title(title: str) -> str:
    s = title.lower()
    s = re.sub(r"[áàãâä]", "a", s)
    s = re.sub(r"[éèêë]", "e", s)
    s = re.sub(r"[íìîï]", "i", s)
    s = re.sub(r"[óòõôö]", "o", s)
    s = re.sub(r"[úùûü]", "u", s)
    s = re.sub(r"ç", "c", s)
    s = re.sub(r"[^a-z0-9\s-]", "", s)
    s = re.sub(r"\s+", "-", s.strip())
    s = re.sub(r"-+", "-", s)
    return s[:80]


def _generate_post_openai(keyword: str, api_key: str) -> Optional[dict]:
    """Call OpenAI GPT-4o to generate a blog post JSON."""
    url = "https://api.openai.com/v1/chat/completions"
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    payload = {
        "model": "gpt-4o",
        "temperature": 0.7,
        "response_format": {"type": "json_object"},
        "messages": [
            {"role": "system", "content": _SYSTEM_PROMPT},
            {"role": "user", "content": _USER_PROMPT_TEMPLATE.format(keyword=keyword)},
        ],
    }
    try:
        resp = requests.post(url, headers=headers, json=payload, timeout=120)
        resp.raise_for_status()
        content = resp.json()["choices"][0]["message"]["content"]
        data = json.loads(content)
        return data
    except Exception as exc:
        logger.error("[blog_writer] OpenAI generation failed: %s", exc)
        return None


def _get_unsplash_image(keyword: str, access_key: str) -> Optional[str]:
    """Fetch a relevant photo URL from Unsplash."""
    if not access_key:
        return None
    query = random.choice(UNSPLASH_QUERIES)
    url = "https://api.unsplash.com/search/photos"
    params = {
        "query": query,
        "per_page": 10,
        "orientation": "landscape",
        "content_filter": "high",
    }
    headers = {"Authorization": f"Client-ID {access_key}"}
    try:
        resp = requests.get(url, headers=headers, params=params, timeout=15)
        resp.raise_for_status()
        results = resp.json().get("results", [])
        if results:
            photo = random.choice(results[:5])
            # Use regular size (1080px wide) — good for og:image
            return photo["urls"]["regular"]
    except Exception as exc:
        logger.warning("[blog_writer] Unsplash failed: %s", exc)
    return None


def _slug_exists(supabase: SupabaseRest, slug: str) -> bool:
    try:
        rows = supabase.select("blog_posts", select="id", filters=[("slug", f"eq.{slug}")], limit=1)
        return bool(rows)
    except Exception:
        return False


def _make_unique_slug(supabase: SupabaseRest, base_slug: str) -> str:
    slug = base_slug
    if not _slug_exists(supabase, slug):
        return slug
    # Append date suffix to avoid collisions
    suffix = date.today().strftime("%Y-%m-%d")
    slug = f"{base_slug}-{suffix}"
    if not _slug_exists(supabase, slug):
        return slug
    # Last resort: random hash suffix
    h = hashlib.md5(f"{base_slug}{time.time()}".encode()).hexdigest()[:6]
    return f"{base_slug}-{h}"


def run_daily_blog_post(
    supabase: SupabaseRest,
    openai_api_key: str,
    unsplash_access_key: str = "",
    use_pytrends: bool = True,
) -> bool:
    """
    Main entry point: generate and publish one blog post.
    Returns True on success, False on failure.
    """
    logger.info("[blog_writer] Starting daily blog post generation")

    # 1. Pick keyword
    keyword = _pick_keyword_pytrends() if use_pytrends else _pick_seed_keyword()
    logger.info("[blog_writer] Using keyword: %s", keyword)

    # 2. Generate content
    post_data = _generate_post_openai(keyword, openai_api_key)
    if not post_data:
        logger.error("[blog_writer] Failed to generate post — aborting")
        return False

    # 3. Get cover image
    cover_image_url = _get_unsplash_image(keyword, unsplash_access_key)
    logger.info("[blog_writer] Cover image: %s", cover_image_url or "(none)")

    # 4. Build slug (ensure unique)
    raw_slug = post_data.get("slug") or _slug_from_title(post_data.get("title", keyword))
    slug = _make_unique_slug(supabase, raw_slug)

    today = date.today().isoformat()

    row = {
        "slug": slug,
        "title": post_data.get("title", keyword.title()),
        "excerpt": post_data.get("excerpt", ""),
        "content": post_data.get("content", ""),
        "published_at": today,
        "modified_at": today,
        "author": "Summi IA",
        "reading_time": int(post_data.get("reading_time", 6)),
        "keywords": post_data.get("keywords", keyword),
        "category": post_data.get("category", "Produtividade"),
        "tags": post_data.get("tags", ["WhatsApp", "IA"]),
        "published": True,
        "cover_image_url": cover_image_url,
    }

    # 5. Insert to Supabase
    try:
        supabase.insert("blog_posts", [row])
        logger.info("[blog_writer] Published post: '%s' (slug: %s)", row["title"], slug)
        return True
    except Exception as exc:
        logger.error("[blog_writer] Failed to insert post: %s", exc)
        return False
