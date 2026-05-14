export type PlacementType = "pre_roll" | "mid_roll" | "post_roll" | "unknown";

export interface TimestampAnalysis {
  placement: PlacementType;
  confidence: number;
  timestampSeconds: number | null;
  episodeDurationSeconds: number | null;
  positionPercent: number | null;
  details: string;
}

export interface TimestampAnalysisInput {
  adTimestampSeconds: number | null;
  episodeDurationSeconds: number | null;
  requiredPlacement: PlacementType | null;
  episodeTotalSegments: number | null;
  adSegmentIndex: number | null;
}

const PRE_ROLL_THRESHOLD = 0.15;
const POST_ROLL_THRESHOLD = 0.85;
const MID_ROLL_MIN = 0.2;
const MID_ROLL_MAX = 0.75;

function classifyPlacement(
  positionPercent: number | null,
  segmentIndex: number | null,
  totalSegments: number | null
): { placement: PlacementType; confidence: number } {
  if (segmentIndex !== null && totalSegments !== null && totalSegments > 0) {
    const segmentPercent = segmentIndex / totalSegments;
    if (segmentIndex === 0) return { placement: "pre_roll", confidence: 0.95 };
    if (segmentIndex === totalSegments - 1) return { placement: "post_roll", confidence: 0.9 };
    if (segmentPercent <= PRE_ROLL_THRESHOLD) return { placement: "pre_roll", confidence: 0.85 };
    if (segmentPercent >= POST_ROLL_THRESHOLD) return { placement: "post_roll", confidence: 0.85 };
    return { placement: "mid_roll", confidence: 0.9 };
  }

  if (positionPercent === null) {
    return { placement: "unknown", confidence: 0 };
  }

  if (positionPercent <= PRE_ROLL_THRESHOLD) {
    return { placement: "pre_roll", confidence: 0.8 };
  }
  if (positionPercent >= POST_ROLL_THRESHOLD) {
    return { placement: "post_roll", confidence: 0.8 };
  }
  if (positionPercent >= MID_ROLL_MIN && positionPercent <= MID_ROLL_MAX) {
    return { placement: "mid_roll", confidence: 0.85 };
  }

  if (positionPercent > MID_ROLL_MAX) {
    return { placement: "post_roll", confidence: 0.6 };
  }
  return { placement: "mid_roll", confidence: 0.55 };
}

function verifyPlacementMatch(
  detected: PlacementType,
  required: PlacementType
): { matches: boolean; confidenceAdjustment: number } {
  if (required === "unknown" || detected === "unknown") {
    return { matches: true, confidenceAdjustment: 0 };
  }

  if (detected === required) {
    return { matches: true, confidenceAdjustment: 0.1 };
  }

  return { matches: false, confidenceAdjustment: -0.3 };
}

export function analyzeTimestamps(input: TimestampAnalysisInput): TimestampAnalysis {
  const { adTimestampSeconds, episodeDurationSeconds, requiredPlacement, episodeTotalSegments, adSegmentIndex } = input;

  let positionPercent: number | null = null;
  if (adTimestampSeconds !== null && episodeDurationSeconds !== null && episodeDurationSeconds > 0) {
    positionPercent = adTimestampSeconds / episodeDurationSeconds;
  }

  const { placement, confidence: baseConfidence } = classifyPlacement(
    positionPercent,
    adSegmentIndex,
    episodeTotalSegments
  );

  let confidence = baseConfidence;
  let placementMatches = true;
  let placementDetails = "";

  if (requiredPlacement && requiredPlacement !== "unknown") {
    const result = verifyPlacementMatch(placement, requiredPlacement);
    placementMatches = result.matches;
    confidence = Math.max(0, Math.min(1, confidence + result.confidenceAdjustment));

    if (result.matches) {
      placementDetails = `Placement matches required ${requiredPlacement.replace("_", "-")}`;
    } else {
      placementDetails = `Placement mismatch: detected ${placement.replace("_", "-")}, required ${requiredPlacement.replace("_", "-")}`;
    }
  } else {
    placementDetails = `Detected placement: ${placement.replace("_", "-")}`;
  }

  let details = placementDetails;
  if (positionPercent !== null) {
    details += `; position: ${Math.round(positionPercent * 100)}% of episode`;
  }
  if (adTimestampSeconds !== null) {
    details += `; timestamp: ${formatSeconds(adTimestampSeconds)}`;
  }
  if (episodeDurationSeconds !== null) {
    details += `; episode duration: ${formatSeconds(episodeDurationSeconds)}`;
  }
  if (!placementMatches) {
    details += "; PLACEMENT MISMATCH";
  }

  return {
    placement,
    confidence: Math.round(confidence * 100) / 100,
    timestampSeconds: adTimestampSeconds,
    episodeDurationSeconds,
    positionPercent: positionPercent !== null ? Math.round(positionPercent * 1000) / 1000 : null,
    details,
  };
}

function formatSeconds(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function isPlacementCorrect(
  detected: PlacementType,
  required: PlacementType
): boolean {
  if (required === "unknown" || detected === "unknown") return true;
  return detected === required;
}
