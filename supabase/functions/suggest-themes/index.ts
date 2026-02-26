// ABOUTME: Sugere palavras-chave (temas urgentes/importantes) com IA para ajudar o usuário a configurar a Summi.
// ABOUTME: Requer autenticação (Bearer token) e OPENAI_API_KEY nas env vars do Supabase.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type SuggestionMode = "personal" | "professional";

type SuggestThemesRequest =
  | {
      mode: "professional";
      profession: string;
      locale?: string;
    }
  | {
      mode: "personal";
      age: number;
      is_married: boolean;
      has_kids: boolean;
      locale?: string;
    };

type SuggestThemesResponse = {
  urgentes: string[];
  importantes: string[];
};

const extractJsonObject = (text: string): unknown => {
  if (!text) throw new Error("Empty model response");
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Could not locate JSON object in model response");
  }
  const raw = text.slice(start, end + 1);
  return JSON.parse(raw);
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const asStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.filter((x): x is string => typeof x === "string").map((x) => x.trim()).filter(Boolean);
};

const normalizeKeywords = (items: string[], max: number) => {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const keyword = item.trim();
    if (!keyword) continue;
    const key = keyword.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(keyword);
    if (out.length >= max) break;
  }
  return out;
};

const validateRequest = (raw: unknown): SuggestThemesRequest => {
  if (!isRecord(raw)) throw new Error("Invalid request body");
  const mode = raw.mode;
  if (mode !== "personal" && mode !== "professional") throw new Error("mode must be personal or professional");

  if (mode === "professional") {
    const profession = typeof raw.profession === "string" ? raw.profession.trim() : "";
    if (profession.length < 2 || profession.length > 80) throw new Error("profession is required");
    const locale = typeof raw.locale === "string" ? raw.locale : undefined;
    return { mode, profession, locale };
  }

  const age = typeof raw.age === "number" ? raw.age : Number(raw.age);
  const is_married = Boolean(raw.is_married);
  const has_kids = Boolean(raw.has_kids);
  if (!Number.isFinite(age) || age < 12 || age > 120) throw new Error("age must be a number between 12 and 120");
  const locale = typeof raw.locale === "string" ? raw.locale : undefined;
  return { mode, age, is_married, has_kids, locale };
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Token de autorização obrigatório" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) {
      return new Response(JSON.stringify({ error: "OPENAI_API_KEY não configurada" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    const { data: authData, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !authData.user) {
      return new Response(JSON.stringify({ error: "Token inválido ou sessão expirada" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const bodyRaw = (await req.json()) as unknown;
    const body = validateRequest(bodyRaw);

    const locale = body.locale ?? "pt-BR";
    const languageHint = locale.toLowerCase().startsWith("pt") ? "Português (Brasil)" : locale;

    const system =
      `Você ajuda a sugerir palavras-chave para classificar mensagens do WhatsApp. ` +
      `Responda APENAS com JSON válido (sem markdown) no formato: ` +
      `{"urgentes":["..."],"importantes":["..."]}. ` +
      `Gere de 12 a 20 itens por lista. Cada item deve ser curto (1–4 palavras), sem nomes próprios, sem dados pessoais, ` +
      `sem emojis, sem pontuação no final. Idioma: ${languageHint}.`;

    const user =
      body.mode === "professional"
        ? `Contexto: uso profissional. Profissão/área: "${body.profession}". ` +
          `Crie temas URGENTES (coisas que exigem ação imediata) e IMPORTANTES (coisas valiosas mas não urgentes). ` +
          `Use termos e frases comuns do dia a dia dessa área.`
        : `Contexto: uso pessoal. Idade: ${body.age}. Casado(a): ${body.is_married ? "sim" : "não"}. ` +
          `Tem filhos: ${body.has_kids ? "sim" : "não"}. ` +
          `Crie temas URGENTES e IMPORTANTES que um(a) parceiro(a) e/ou filhos poderiam mandar. ` +
          `Mantenha genérico e seguro (sem suposições sensíveis).`;

    const model = Deno.env.get("OPENAI_MODEL_THEME_SUGGESTIONS") ?? "gpt-4o-mini";

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      return new Response(JSON.stringify({ error: `Falha ao chamar IA (${resp.status})`, details: text }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = (await resp.json()) as unknown;
    const content = isRecord(data)
      ? (data.choices as unknown[] | undefined)?.[0] as unknown
      : undefined;
    const message = isRecord(content) ? (content.message as unknown) : undefined;
    const text = isRecord(message) && typeof message.content === "string" ? message.content : "";

    const extracted = extractJsonObject(text);
    if (!isRecord(extracted)) throw new Error("Invalid JSON from model");

    const urgentes = normalizeKeywords(asStringArray(extracted.urgentes), 25);
    const importantes = normalizeKeywords(asStringArray(extracted.importantes), 25);

    const result: SuggestThemesResponse = { urgentes, importantes };
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

