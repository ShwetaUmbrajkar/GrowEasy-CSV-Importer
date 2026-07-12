import { CRM_FIELDS } from "./types";

/**
 * Rough token/cost estimator shown BEFORE the user confirms the AI import,
 * so they know roughly what an upload will cost before it happens. This is
 * intentionally approximate (real cost depends on actual field lengths and
 * the provider's tokenizer) - it's meant to set expectations, not be exact
 * to the cent.
 *
 * Pricing below matches gpt-4o-mini's public per-token rate as of this
 * writing; update PRICE_PER_1M_INPUT/OUTPUT_TOKENS if you switch models.
 */
const PRICE_PER_1M_INPUT_TOKENS = 0.15; // USD
const PRICE_PER_1M_OUTPUT_TOKENS = 0.6; // USD
const BATCH_SIZE = 15;

export interface CostEstimate {
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  estimatedCostUsd: number;
  totalBatches: number;
}

export function estimateImportCost(rowCount: number, columnCount: number): CostEstimate {
  // Rough heuristic: ~8 tokens per raw cell + a fixed per-row overhead for
  // JSON structure, plus the (fixed-size) system prompt repeated per batch.
  const totalBatches = Math.max(1, Math.ceil(rowCount / BATCH_SIZE));
  const systemPromptTokens = 650; // approx, encodes all the business rules
  const perRowInputTokens = columnCount * 8 + 20;
  const perRowOutputTokens = CRM_FIELDS.length * 6 + 15; // 15 output fields incl. confidence

  const estimatedInputTokens = totalBatches * systemPromptTokens + rowCount * perRowInputTokens;
  const estimatedOutputTokens = rowCount * perRowOutputTokens;

  const estimatedCostUsd =
    (estimatedInputTokens / 1_000_000) * PRICE_PER_1M_INPUT_TOKENS +
    (estimatedOutputTokens / 1_000_000) * PRICE_PER_1M_OUTPUT_TOKENS;

  return { estimatedInputTokens, estimatedOutputTokens, estimatedCostUsd, totalBatches };
}
