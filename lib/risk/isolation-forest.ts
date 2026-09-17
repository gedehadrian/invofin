const EULER_MASCHERONI = 0.5772156649;

function harmonicNumber(n: number) {
  if (n < 1) return 0;
  return Math.log(n) + EULER_MASCHERONI;
}

/** Average path length of unsuccessful search in a BST of n points. */
export function averageUnsuccessfulPathLength(n: number) {
  if (n <= 1) return 0;
  if (n === 2) return 1;
  return 2 * harmonicNumber(n - 1) - (2 * (n - 1)) / n;
}

type Node =
  | {
      kind: "external";
      size: number;
    }
  | {
      kind: "internal";
      feature: number;
      threshold: number;
      left: Node;
      right: Node;
    };

export type IsolationForestOptions = {
  nTrees?: number;
  maxSamples?: number;
  random?: () => number;
};

export class IsolationForest {
  private trees: Node[] = [];
  private sampleSize = 0;
  private readonly nTrees: number;
  private readonly maxSamples: number;
  private readonly random: () => number;

  constructor(options: IsolationForestOptions = {}) {
    this.nTrees = options.nTrees ?? 100;
    this.maxSamples = options.maxSamples ?? 256;
    this.random = options.random ?? Math.random;
  }

  fit(samples: number[][]) {
    if (samples.length === 0) {
      this.trees = [];
      this.sampleSize = 0;
      return;
    }
    const dim = samples[0].length;
    this.sampleSize = Math.min(this.maxSamples, samples.length);
    const maxHeight = Math.ceil(Math.log2(this.sampleSize));
    this.trees = [];

    for (let t = 0; t < this.nTrees; t++) {
      const subset = this.sampleRows(samples, this.sampleSize);
      this.trees.push(this.buildTree(subset, 0, maxHeight, dim));
    }
  }

  /** Higher scores are more anomalous. Typical outlier threshold: 0.6. */
  score(point: number[]) {
    if (this.trees.length === 0 || this.sampleSize === 0) return 0;
    const c = averageUnsuccessfulPathLength(this.sampleSize);
    if (c === 0) return 0;
    const avgPath =
      this.trees.reduce((sum, tree) => sum + this.pathLength(tree, point, 0), 0) /
      this.trees.length;
    return Math.pow(2, -avgPath / c);
  }

  scores(points: number[][]) {
    return points.map((p) => this.score(p));
  }

  private sampleRows(samples: number[][], size: number) {
    const out: number[][] = [];
    for (let i = 0; i < size; i++) {
      const idx = Math.floor(this.random() * samples.length);
      out.push(samples[idx]);
    }
    return out;
  }

  private buildTree(
    data: number[][],
    height: number,
    maxHeight: number,
    dim: number,
  ): Node {
    if (data.length <= 1 || height >= maxHeight) {
      return { kind: "external", size: data.length };
    }

    const feature = Math.floor(this.random() * dim);
    let min = data[0][feature];
    let max = min;
    for (const row of data) {
      const v = row[feature];
      if (v < min) min = v;
      if (v > max) max = v;
    }
    if (min === max) {
      return { kind: "external", size: data.length };
    }

    const threshold = min + this.random() * (max - min);
    const left = data.filter((row) => row[feature] < threshold);
    const right = data.filter((row) => row[feature] >= threshold);
    if (left.length === 0 || right.length === 0) {
      return { kind: "external", size: data.length };
    }

    return {
      kind: "internal",
      feature,
      threshold,
      left: this.buildTree(left, height + 1, maxHeight, dim),
      right: this.buildTree(right, height + 1, maxHeight, dim),
    };
  }

  private pathLength(node: Node, point: number[], current: number): number {
    if (node.kind === "external") {
      return current + averageUnsuccessfulPathLength(node.size);
    }
    if (point[node.feature] < node.threshold) {
      return this.pathLength(node.left, point, current + 1);
    }
    return this.pathLength(node.right, point, current + 1);
  }
}

export const ISOLATION_FOREST_MIN_SAMPLES = 20;
export const ISOLATION_FOREST_OUTLIER_THRESHOLD = 0.6;
