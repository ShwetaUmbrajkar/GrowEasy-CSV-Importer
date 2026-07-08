export interface Batch<T> {
  batchIndex: number;
  startRow: number;
  items: T[];
}

/**
 * Splits an array into fixed-size batches, tracking the original row
 * index of each item's first element so we can map skipped rows back
 * to their position in the source CSV for debugging/reporting.
 */
export function toBatches<T>(items: T[], batchSize: number): Batch<T>[] {
  const batches: Batch<T>[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push({
      batchIndex: batches.length,
      startRow: i,
      items: items.slice(i, i + batchSize),
    });
  }
  return batches;
}
