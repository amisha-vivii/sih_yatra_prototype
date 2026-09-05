/**
 * Isolation Forest — anomaly detection, implemented from the Liu, Ting & Zhou
 * (2008) algorithm. Same model family and scoring formula as
 * `sklearn.ensemble.IsolationForest`, trained in-process on the seeded
 * price/service feature matrix at boot.
 *
 * score(x) = 2 ^ ( -E[h(x)] / c(n) )   -> 0.5 = average, ->1 = anomalous
 */

interface Node {
  splitFeature?: number;
  splitValue?: number;
  left?: Node;
  right?: Node;
  size: number;
  depth: number;
  external: boolean;
}

/** deterministic PRNG so identical inputs always yield identical scores */
function mulberry32(seed: number) {
  return function rng() {
    seed |= 0;
    seed = seed + 0x6d2b79f5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function harmonic(n: number): number {
  if (n <= 1) return 0;
  return 2 * (Math.log(n - 1) + 0.5772156649) - 2 * (n - 1) / n;
}

export class IsolationForest {
  private trees: Node[] = [];
  private heightLimit = 0;
  private cn = 1;
  private nFeatures = 0;
  private fitted = false;

  constructor(
  private nEstimators = 120,
  private sampleSize = 128,
  private seed = 42)
  {}

  fit(X: number[][]): this {
    if (!X.length) return this;
    this.nFeatures = X[0].length;
    const n = Math.min(this.sampleSize, X.length);
    this.heightLimit = Math.ceil(Math.log2(Math.max(n, 2)));
    this.cn = harmonic(n) || 1;
    const rng = mulberry32(this.seed);
    this.trees = [];

    for (let t = 0; t < this.nEstimators; t++) {
      const sample: number[][] = [];
      for (let i = 0; i < n; i++) sample.push(X[Math.floor(rng() * X.length)]);
      this.trees.push(this.buildTree(sample, 0, rng));
    }
    this.fitted = true;
    return this;
  }

  private buildTree(X: number[][], depth: number, rng: () => number): Node {
    if (depth >= this.heightLimit || X.length <= 1) {
      return { size: X.length, depth, external: true };
    }
    // pick a feature that actually varies in this sample
    const candidates: number[] = [];
    for (let f = 0; f < this.nFeatures; f++) {
      let min = Infinity;
      let max = -Infinity;
      for (const row of X) {
        if (row[f] < min) min = row[f];
        if (row[f] > max) max = row[f];
      }
      if (max > min) candidates.push(f);
    }
    if (!candidates.length) return { size: X.length, depth, external: true };

    const splitFeature = candidates[Math.floor(rng() * candidates.length)];
    let min = Infinity;
    let max = -Infinity;
    for (const row of X) {
      if (row[splitFeature] < min) min = row[splitFeature];
      if (row[splitFeature] > max) max = row[splitFeature];
    }
    const splitValue = min + rng() * (max - min);

    const left: number[][] = [];
    const right: number[][] = [];
    for (const row of X) (row[splitFeature] < splitValue ? left : right).push(row);

    return {
      splitFeature,
      splitValue,
      size: X.length,
      depth,
      external: false,
      left: this.buildTree(left, depth + 1, rng),
      right: this.buildTree(right, depth + 1, rng)
    };
  }

  private pathLength(x: number[], node: Node): number {
    if (node.external) return node.depth + harmonic(node.size);
    return x[node.splitFeature!] < node.splitValue! ?
    this.pathLength(x, node.left!) :
    this.pathLength(x, node.right!);
  }

  /** 0..1 anomaly score; ~0.5 is typical, >0.62 is unusual */
  score(x: number[]): number {
    if (!this.fitted || !this.trees.length) return 0.5;
    let sum = 0;
    for (const tree of this.trees) sum += this.pathLength(x, tree);
    const avg = sum / this.trees.length;
    return Math.pow(2, -avg / this.cn);
  }

  isFitted(): boolean {
    return this.fitted;
  }

  size(): number {
    return this.trees.length;
  }
}