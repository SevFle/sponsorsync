export interface KeywordMatchResult {
  matched: boolean;
  confidence: number;
  matchedKeywords: string[];
  totalKeywords: number;
  details: string;
}

export interface KeywordMatchOptions {
  caseSensitive: boolean;
  requireAllKeywords: boolean;
  minConfidenceThreshold: number;
}

const DEFAULT_OPTIONS: KeywordMatchOptions = {
  caseSensitive: false,
  requireAllKeywords: false,
  minConfidenceThreshold: 0.5,
};

const SPONSOR_SIGNAL_PHRASES = [
  "sponsored by",
  "brought to you by",
  "this episode is sponsored",
  "our sponsor",
  "proud sponsor",
  "thanks to",
  "supported by",
  "partnered with",
  "in partnership with",
  "this podcast is sponsored",
  "advertiser",
  "promotional partner",
  "sponsor of this episode",
  "sponsor of today's episode",
  "brought to you today by",
  "fueled by",
  "made possible by",
  "presented by",
];

const ANTI_SIGNAL_PHRASES = [
  "not sponsored by",
  "not affiliated with",
  "no sponsorship",
  "not a sponsor",
];

function normalizeText(text: string, caseSensitive: boolean): string {
  const normalized = text.replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim();
  return caseSensitive ? normalized : normalized.toLowerCase();
}

function findKeywordInText(keyword: string, text: string, caseSensitive: boolean): boolean {
  const searchKeyword = caseSensitive ? keyword : keyword.toLowerCase();
  const searchText = caseSensitive ? text : text.toLowerCase();
  const escaped = searchKeyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const startBoundary = /^\w/.test(searchKeyword) ? "\\b" : "";
  const endBoundary = /\w$/.test(searchKeyword) ? "\\b" : "";
  const pattern = new RegExp(`${startBoundary}${escaped}${endBoundary}`);
  return pattern.test(searchText);
}

export function matchKeywords(
  transcript: string,
  keywords: string[],
  options: Partial<KeywordMatchOptions> = {}
): KeywordMatchResult {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const normalizedTranscript = normalizeText(transcript, opts.caseSensitive);

  const matchedKeywords: string[] = [];
  for (const keyword of keywords) {
    if (findKeywordInText(keyword, normalizedTranscript, opts.caseSensitive)) {
      matchedKeywords.push(keyword);
    }
  }

  let keywordConfidence = keywords.length > 0 ? matchedKeywords.length / keywords.length : 0;
  if (opts.requireAllKeywords && matchedKeywords.length !== keywords.length) {
    return {
      matched: false,
      confidence: 0,
      matchedKeywords,
      totalKeywords: keywords.length,
      details: `${matchedKeywords.length}/${keywords.length} keyword(s) matched (requireAllKeywords): ${matchedKeywords.join(", ")}`,
    };
  }
  if (opts.requireAllKeywords) {
    keywordConfidence = 1;
  }

  let signalBoost = 0;
  let signalCount = 0;
  for (const phrase of SPONSOR_SIGNAL_PHRASES) {
    if (normalizedTranscript.includes(opts.caseSensitive ? phrase : phrase.toLowerCase())) {
      signalCount++;
    }
  }
  if (signalCount > 0) {
    signalBoost = Math.min(signalCount * 0.2, 0.2);
  }

  let antiSignalPenalty = 0;
  for (const phrase of ANTI_SIGNAL_PHRASES) {
    if (normalizedTranscript.includes(opts.caseSensitive ? phrase : phrase.toLowerCase())) {
      antiSignalPenalty += 0.3;
    }
  }

  let confidence = Math.min(keywordConfidence + signalBoost, 1) - antiSignalPenalty;
  confidence = Math.max(0, Math.min(1, confidence));

  const matched = confidence >= opts.minConfidenceThreshold;

  let details: string;
  if (keywords.length === 0) {
    details = "No keywords provided for matching";
  } else if (matchedKeywords.length === 0) {
    details = `None of ${keywords.length} keyword(s) found in transcript`;
  } else if (matchedKeywords.length === keywords.length) {
    details = `All ${keywords.length} keyword(s) matched: ${matchedKeywords.join(", ")}`;
  } else {
    details = `${matchedKeywords.length}/${keywords.length} keyword(s) matched: ${matchedKeywords.join(", ")}`;
  }

  if (signalCount > 0) {
    details += `; ${signalCount} sponsor signal phrase(s) detected`;
  }
  if (antiSignalPenalty > 0) {
    details += `; anti-signal penalty applied`;
  }

  return {
    matched,
    confidence: Math.round(confidence * 100) / 100,
    matchedKeywords,
    totalKeywords: keywords.length,
    details,
  };
}

export function detectSponsorRead(
  transcript: string,
  sponsorName: string,
  productName?: string,
  placementType?: string
): KeywordMatchResult {
  const keywords: string[] = [];

  if (sponsorName) {
    const parts = sponsorName.split(/\s+/).filter(Boolean);
    keywords.push(sponsorName);
    if (parts.length > 1) {
      keywords.push(parts[0]);
    }
  }

  if (productName) {
    keywords.push(productName);
  }

  if (placementType) {
    keywords.push(placementType);
  }

  return matchKeywords(transcript, keywords, {
    caseSensitive: false,
    minConfidenceThreshold: 0.5,
  });
}

export function computeKeywordConfidence(
  transcript: string,
  sponsorName: string,
  productName?: string | null,
  additionalKeywords?: string[]
): number {
  const keywords: string[] = [sponsorName];
  if (productName) keywords.push(productName);
  if (additionalKeywords) keywords.push(...additionalKeywords);

  const result = matchKeywords(transcript, keywords);
  return result.confidence;
}
