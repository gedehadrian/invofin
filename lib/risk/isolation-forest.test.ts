import assert from "node:assert/strict";
import { test } from "node:test";
import {
  IsolationForest,
  averageUnsuccessfulPathLength,
} from "./isolation-forest";

test("average path length is 0 for a single point", () => {
  assert.equal(averageUnsuccessfulPathLength(1), 0);
});

test("inliers score lower than distant outliers", () => {
  const rng = (() => {
    let s = 42;
    return () => {
      s = (s * 1664525 + 1013904223) % 4294967296;
      return s / 4294967296;
    };
  })();
  const forest = new IsolationForest({ nTrees: 50, maxSamples: 32, random: rng });
  const samples = Array.from({ length: 40 }, (_, i) => [5 + (i % 5) * 0.1, 30, 80]);
  forest.fit(samples);
  const inlier = forest.score([5.2, 30, 80]);
  const outlier = forest.score([500, 400, 10]);
  assert.ok(outlier > inlier, `${outlier} should exceed ${inlier}`);
});
