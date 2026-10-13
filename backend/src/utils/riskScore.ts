/**
 * Rule-based "AI" risk scoring engine.
 *
 * This simulates an AI risk assessment by analyzing resume text against a
 * job's required skills and minimum experience. It is intentionally
 * dependency-free (no external AI API key needed) so the project runs
 * out of the box. Swap `computeRiskScore` internals with a real LLM call
 * (e.g. Anthropic/OpenAI API) later if you want deeper semantic matching.
 *
 * riskScore: 0 = extremely low risk (great fit) ... 100 = extremely high risk (poor fit)
 * matchScore: 0 = no match ... 100 = perfect match (roughly 100 - riskScore, but computed independently)
 */

export interface RiskResult {
  matchedSkills: string[];
  missingSkills: string[];
  extractedExperienceYears: number | null;
  riskScore: number;
  matchScore: number;
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9+.# \n]/g, " ");
}

/** Try to extract "X years of experience" style phrases from resume text. */
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

export function computeRiskScore(
  resumeText: string,
  requiredSkills: string[],
  minExperienceYears: number
): RiskResult {
  const normalizedResume = normalize(resumeText);
  const words = new Set(normalizedResume.split(/\s+/).filter(Boolean));
  const resumeLower = normalizedResume;

  const matchedSkills: string[] = [];
  const missingSkills: string[] = [];

  for (const skillRaw of requiredSkills) {
    const skill = skillRaw.trim().toLowerCase();
    if (!skill) continue;
    const found =
      words.has(skill) ||
      resumeLower.includes(skill) ||
      skill.split(/\s+/).every((part) => resumeLower.includes(part));

    if (found) matchedSkills.push(skillRaw);
    else missingSkills.push(skillRaw);
  }

  const totalSkills = requiredSkills.length || 1;
  const skillCoverage = matchedSkills.length / totalSkills; // 0..1

  const extractedExperienceYears = extractExperienceYears(resumeText);

  let experienceFactor = 0.5; // neutral if unknown
  if (extractedExperienceYears !== null) {
    if (minExperienceYears <= 0) {
      experienceFactor = 1;
    } else {
      experienceFactor = Math.min(1, extractedExperienceYears / minExperienceYears);
    }
  }

  const matchScoreRaw = skillCoverage * 0.75 + experienceFactor * 0.25;
  const matchScore = Math.round(matchScoreRaw * 100);

  let riskScoreRaw = (1 - matchScoreRaw) * 100;

  if (missingSkills.length === requiredSkills.length && requiredSkills.length > 0) {
    riskScoreRaw = Math.max(riskScoreRaw, 85);
  }
  if (extractedExperienceYears === null) {
    riskScoreRaw += 5;
  }

  const riskScore = Math.max(0, Math.min(100, Math.round(riskScoreRaw)));

  return {
    matchedSkills,
    missingSkills,
    extractedExperienceYears,
    riskScore,
    matchScore: Math.max(0, Math.min(100, matchScore)),
  };
}
