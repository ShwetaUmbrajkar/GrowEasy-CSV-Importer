import { toBatches } from "../src/utils/batch";

describe("toBatches", () => {
  it("splits items into correctly sized batches", () => {
    const items = Array.from({ length: 35 }, (_, i) => i);
    const batches = toBatches(items, 15);

    expect(batches).toHaveLength(3);
    expect(batches[0].items).toHaveLength(15);
    expect(batches[1].items).toHaveLength(15);
    expect(batches[2].items).toHaveLength(5);
  });

  it("tracks the correct startRow offset per batch", () => {
    const items = Array.from({ length: 10 }, (_, i) => i);
    const batches = toBatches(items, 4);

    expect(batches.map((b) => b.startRow)).toEqual([0, 4, 8]);
  });

  it("returns a single batch when items fit within batchSize", () => {
    const batches = toBatches([1, 2, 3], 15);
    expect(batches).toHaveLength(1);
  });

  it("returns an empty array for empty input", () => {
    expect(toBatches([], 15)).toEqual([]);
  });
});
