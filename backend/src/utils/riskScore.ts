/**
 * LLM-powered AI risk scoring engine.
 *
 * Uses Groq (Cloud LPU) as the primary LLM and Google Gemini as a fallback.
 * If both LLM providers fail (e.g. missing keys, rate limits, network),
 * falls back to a deterministic rule-based scorer so the app never breaks.
 *
 * riskScore:  0 = extremely low risk (great fit) ... 100 = extremely high risk (poor fit)
 * matchScore: 0 = no match ... 100 = perfect match
 */

import https from "https";

export interface RiskResult {
  matchedSkills: string[];
  missingSkills: string[];
  extractedExperienceYears: number | null;
  riskScore: number;
  matchScore: number;
}

// ---------------------------------------------------------------------------
// LLM prompt builder
// ---------------------------------------------------------------------------

function buildPrompt(
  resumeText: string,
  requiredSkills: string[],
  minExperienceYears: number
): string {
  return `You are an expert technical recruiter AI. Analyze the following resume against the job requirements and produce a JSON risk assessment.

### Job Requirements
- **Required Skills**: ${requiredSkills.join(", ") || "None specified"}
- **Minimum Experience**: ${minExperienceYears} year(s)

### Resume Text
"""
${resumeText.substring(0, 12000)}
"""

### Instructions
1. Identify which of the required skills the candidate clearly demonstrates in their resume (matchedSkills).
2. Identify which required skills are missing or not evident (missingSkills).
3. Extract the candidate's total years of professional experience from the resume. If you cannot determine it, use null.
4. Compute a **riskScore** (0-100) where 0 means the candidate is a perfect fit (low risk of bad hire) and 100 means extremely poor fit (high risk). Consider skill coverage, experience gap, relevance of past roles, and overall resume quality.
5. Compute a **matchScore** (0-100) where 0 means no match and 100 means perfect match.

### Response Format
Respond with ONLY valid JSON — no markdown, no code fences, no explanation:
{
  "matchedSkills": ["skill1", "skill2"],
  "missingSkills": ["skill3"],
  "extractedExperienceYears": 5,
  "riskScore": 25,
  "matchScore": 75
}`;
}

// ---------------------------------------------------------------------------
// Reliable HTTP client using native Node https to prevent socket resets
// ---------------------------------------------------------------------------

function httpsPost(
  urlStr: string,
  headers: Record<string, string>,
  bodyJson: object
): Promise<{ status: number; data: any; raw: string }> {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(bodyJson);
    const parsedUrl = new URL(urlStr);

    const req = https.request(
      {
        protocol: parsedUrl.protocol,
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (parsedUrl.protocol === "https:" ? 443 : 80),
        path: `${parsedUrl.pathname}${parsedUrl.search}`,
        method: "POST",
        headers: {
          ...headers,
          "Content-Length": Buffer.byteLength(payload),
          Connection: "close",
        },
        timeout: 15000,
      },
      (res) => {
        let text = "";
        res.on("data", (chunk) => (text += chunk));
        res.on("end", () => {
          let data: any = null;
          try {
            data = JSON.parse(text);
          } catch {
            // Handled downstream
          }
          resolve({ status: res.statusCode || 500, data, raw: text });
        });
      }
    );

    req.on("error", (err) => reject(err));
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Request timed out"));
    });

    req.write(payload);
    req.end();
  });
}

// ---------------------------------------------------------------------------
// Groq (Cloud LPU) provider
// ---------------------------------------------------------------------------

async function callGroq(prompt: string): Promise<RiskResult> {
  const apiKey = process.env.GROQ_API_KEY || process.env.GROK_API_KEY;
  if (!apiKey) throw new Error("Groq API key not configured");

  const baseUrl = process.env.GROQ_API_BASE_URL || "https://api.groq.com/openai/v1";
  const model = process.env.GROQ_MODEL || "openai/gpt-oss-120b";

  const { status, data, raw } = await httpsPost(
    `${baseUrl}/chat/completions`,
    {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "User-Agent": "JobPortal-AI/1.0",
    },
    {
      model,
      messages: [
        {
          role: "system",
          content:
            "You are a precise JSON-only response bot. Always respond with valid JSON and nothing else.",
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
      max_tokens: 1024,
    }
  );

  if (status < 200 || status >= 300) {
    throw new Error(`Groq API error ${status}: ${raw}`);
  }

  const content: string = data?.choices?.[0]?.message?.content?.trim() ?? "";
  return parseRiskResult(content, "Groq");
}

// ---------------------------------------------------------------------------
// Gemini (Google) provider
// ---------------------------------------------------------------------------

async function callGemini(prompt: string): Promise<RiskResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Gemini API key not configured");

  const model = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const { status, data, raw } = await httpsPost(
    url,
    { "Content-Type": "application/json" },
    {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 1024,
        responseMimeType: "application/json",
      },
    }
  );

  if (status < 200 || status >= 300) {
    throw new Error(`Gemini API error ${status}: ${raw}`);
  }

  const content: string =
    data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";

  return parseRiskResult(content, "Gemini");
}

// ---------------------------------------------------------------------------
// JSON response parser with validation
// ---------------------------------------------------------------------------

function parseRiskResult(raw: string, provider: string): RiskResult {
  // Strip markdown code fences if the LLM wraps the JSON
  let cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  cleaned = cleaned.trim();

  let parsed: any;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(
      `${provider} returned invalid JSON: ${cleaned.substring(0, 300)}`
    );
  }

  // Validate and clamp values
  const matchedSkills = Array.isArray(parsed.matchedSkills)
    ? parsed.matchedSkills.map(String)
    : [];
  const missingSkills = Array.isArray(parsed.missingSkills)
    ? parsed.missingSkills.map(String)
    : [];
  const extractedExperienceYears =
    typeof parsed.extractedExperienceYears === "number"
      ? parsed.extractedExperienceYears
      : null;
  const riskScore = clamp(
    typeof parsed.riskScore === "number" ? Math.round(parsed.riskScore) : 50,
    0,
    100
  );
  const matchScore = clamp(
    typeof parsed.matchScore === "number" ? Math.round(parsed.matchScore) : 50,
    0,
    100
  );

  return {
    matchedSkills,
    missingSkills,
    extractedExperienceYears,
    riskScore,
    matchScore,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// ---------------------------------------------------------------------------
// Deterministic fallback (original rule-based scorer)
// ---------------------------------------------------------------------------

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9+.# \n]/g, " ");
}

function extractExperienceYears(text: string): number | null {
  const patterns = [
    /(\d+(?:\.\d+)?)\s*\+?\s*years?\s+(?:of\s+)?experience/i,
    /experience\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*\+?\s*years?/i,
  ];
  for (const p of patterns) {
    const match = text.match(p);
    if (match) {
      const val = parseFloat(match[1]);
      if (!Number.isNaN(val)) return val;
    }
  }
  return null;
}

function fallbackRiskScore(
  resumeText: string,
  requiredSkills: string[],
  minExperienceYears: number
): RiskResult {
  const normalizedResume = normalize(resumeText);
  const words = new Set(normalizedResume.split(/\s+/).filter(Boolean));

  const matchedSkills: string[] = [];
  const missingSkills: string[] = [];

  for (const skillRaw of requiredSkills) {
    const skill = skillRaw.trim().toLowerCase();
    if (!skill) continue;
    const found =
      words.has(skill) ||
      normalizedResume.includes(skill) ||
      skill.split(/\s+/).every((part) => normalizedResume.includes(part));
    if (found) matchedSkills.push(skillRaw);
    else missingSkills.push(skillRaw);
  }

  const totalSkills = requiredSkills.length || 1;
  const skillCoverage = matchedSkills.length / totalSkills;

  const extractedExp = extractExperienceYears(resumeText);

  let experienceFactor = 0.5;
  if (extractedExp !== null) {
    experienceFactor =
      minExperienceYears <= 0
        ? 1
        : Math.min(1, extractedExp / minExperienceYears);
  }

  const matchScoreRaw = skillCoverage * 0.75 + experienceFactor * 0.25;
  const matchScore = Math.round(matchScoreRaw * 100);

  let riskScoreRaw = (1 - matchScoreRaw) * 100;
  if (
    missingSkills.length === requiredSkills.length &&
    requiredSkills.length > 0
  )
    riskScoreRaw = Math.max(riskScoreRaw, 85);
  if (extractedExp === null) riskScoreRaw += 5;

  return {
    matchedSkills,
    missingSkills,
    extractedExperienceYears: extractedExp,
    riskScore: clamp(Math.round(riskScoreRaw), 0, 100),
    matchScore: clamp(matchScore, 0, 100),
  };
}

// ---------------------------------------------------------------------------
// Main entry point — async, calls LLMs with cascading fallback
// ---------------------------------------------------------------------------

export async function computeRiskScore(
  resumeText: string,
  requiredSkills: string[],
  minExperienceYears: number
): Promise<RiskResult> {
  const prompt = buildPrompt(resumeText, requiredSkills, minExperienceYears);

  // 1️⃣  Try Groq (Cloud LPU) first
  try {
    const result = await callGroq(prompt);
    console.log("[RiskScore] ✅ Scored via Groq (Cloud LPU)");
    return result;
  } catch (err: any) {
    console.warn("[RiskScore] ⚠️  Groq failed:", err.message, err.cause ? err.cause : "");
  }

  // 2️⃣  Fallback to Gemini
  try {
    const result = await callGemini(prompt);
    console.log("[RiskScore] ✅ Scored via Gemini (fallback)");
    return result;
  } catch (err: any) {
    console.warn("[RiskScore] ⚠️  Gemini failed:", err.message);
  }

  // 3️⃣  Last resort: deterministic rule-based fallback
  console.warn("[RiskScore] ⚠️  Both LLMs unavailable — using rule-based fallback");
  return fallbackRiskScore(resumeText, requiredSkills, minExperienceYears);
}
