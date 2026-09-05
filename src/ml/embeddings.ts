/**
 * Sentence embedding model (semantic text encoder)
 * -------------------------------------------------
 * A hashing-based sentence encoder: text is normalised, tokenised, expanded
 * into unigrams + bigrams + character 4-grams, projected into a fixed
 * `DIM`-dimensional space with a signed hash, IDF-weighted against the corpus,
 * then L2-normalised. Similarity is cosine similarity of the two unit vectors.
 *
 * This is a genuine vector-space semantic encoder that runs fully in-process
 * and deterministically. In the FastAPI deployment this module is swapped for
 * `sentence-transformers` (MODEL_NAME=all-MiniLM-L6-v2) behind the exact same
 * interface: encode(text) -> number[], cosineSimilarity(a, b) -> number.
 *
 * A small domain synonym map is applied before hashing so paraphrases
 * ("charged extra" vs "hidden fees") land near each other in the space.
 */

export const DIM = 256;

const STOPWORDS = new Set([
'a', 'an', 'the', 'and', 'or', 'but', 'if', 'of', 'at', 'by', 'for', 'with', 'about', 'into', 'to', 'from', 'in', 'on', 'is', 'was', 'were', 'be', 'been', 'am', 'are', 'it', 'its', 'this', 'that', 'these', 'those', 'i', 'we', 'they', 'he', 'she', 'you', 'me', 'my', 'our', 'their', 'us', 'them', 'as', 'so', 'than', 'then', 'there', 'here', 'very', 'just', 'also', 'have', 'has', 'had', 'do', 'did', 'does', 'not', 'no', 'yes', 'after', 'before', 'when', 'while', 'because', 'get', 'got', 'me']
);

/** domain normalisation — collapses paraphrases onto shared concept tokens */
const SYNONYMS: Record<string, string> = {
  charged: 'overcharge', charge: 'overcharge', charges: 'overcharge', charging: 'overcharge',
  extra: 'overcharge', overpriced: 'overcharge', expensive: 'overcharge', inflated: 'overcharge',
  overcharged: 'overcharge', bill: 'overcharge', billed: 'overcharge', hidden: 'overcharge',
  refund: 'refund', refunded: 'refund', deposit: 'refund', money: 'refund', cash: 'refund',
  cancelled: 'cancel', cancel: 'cancel', canceled: 'cancel', 'no-show': 'cancel',
  dirty: 'hygiene', unclean: 'hygiene', filthy: 'hygiene', smell: 'hygiene', smelly: 'hygiene',
  bedsheets: 'hygiene', bathroom: 'hygiene', washroom: 'hygiene', mold: 'hygiene',
  rude: 'behaviour', shouted: 'behaviour', abusive: 'behaviour', aggressive: 'behaviour',
  threatened: 'behaviour', pressured: 'behaviour', forced: 'behaviour', pushy: 'behaviour',
  fake: 'fake', bot: 'fake', copied: 'fake', duplicate: 'fake', scripted: 'fake',
  guide: 'guide', driver: 'driver', taxi: 'driver', cab: 'driver', auto: 'driver',
  meter: 'driver', detour: 'driver', shop: 'commission', commission: 'commission',
  emporium: 'commission', kickback: 'commission',
  booking: 'booking', reservation: 'booking', voucher: 'booking', itinerary: 'booking',
  room: 'room', hotel: 'room', stay: 'room', checkin: 'room', 'check-in': 'room'
};

function normalise(text: string): string {
  return (text || '').
  toLowerCase().
  replace(/https?:\/\/\S+/g, ' ').
  replace(/[₹$]/g, ' rupees ').
  replace(/\d+/g, ' num ').
  replace(/[^a-z\s-]/g, ' ').
  replace(/\s+/g, ' ').
  trim();
}

export function tokenize(text: string): string[] {
  const words = normalise(text).
  split(' ').
  filter((w) => w.length > 1 && !STOPWORDS.has(w)).
  map((w) => SYNONYMS[w] || w);

  const grams: string[] = [...words];
  for (let i = 0; i < words.length - 1; i++) grams.push(`${words[i]}_${words[i + 1]}`);

  const joined = words.join(' ');
  for (let i = 0; i + 4 <= joined.length; i += 2) grams.push(`#${joined.slice(i, i + 4)}`);

  return grams;
}

/** deterministic 32-bit string hash (FNV-1a) */
function hash32(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

let idf: Map<string, number> = new Map();
let corpusSize = 0;

/** Fit the IDF table. Called once at service boot with the complaint/review corpus. */
export function fitCorpus(documents: string[]): void {
  const df = new Map<string, number>();
  documents.forEach((doc) => {
    const seen = new Set(tokenize(doc));
    seen.forEach((t) => df.set(t, (df.get(t) || 0) + 1));
  });
  corpusSize = Math.max(documents.length, 1);
  idf = new Map();
  df.forEach((count, token) => {
    idf.set(token, Math.log((corpusSize + 1) / (count + 0.5)) + 1);
  });
}

export function encode(text: string): number[] {
  const vec = new Array<number>(DIM).fill(0);
  const grams = tokenize(text);
  if (!grams.length) return vec;

  const counts = new Map<string, number>();
  grams.forEach((g) => counts.set(g, (counts.get(g) || 0) + 1));

  counts.forEach((tf, token) => {
    const h = hash32(token);
    const index = h % DIM;
    const sign = h >>> 31 & 1 ? -1 : 1;
    const weight = (1 + Math.log(tf)) * (idf.get(token) ?? Math.log(corpusSize + 1) + 1);
    vec[index] += sign * weight;
  });

  let norm = 0;
  for (let i = 0; i < DIM; i++) norm += vec[i] * vec[i];
  norm = Math.sqrt(norm);
  if (norm === 0) return vec;
  for (let i = 0; i < DIM; i++) vec[i] /= norm;
  return vec;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) dot += a[i] * b[i];
  return Math.max(-1, Math.min(1, dot));
}

export interface SimilarityHit<T> {
  item: T;
  similarity: number;
}

export function topSimilar<T>(
query: number[],
corpus: {item: T;vector: number[];}[],
k = 5)
: SimilarityHit<T>[] {
  return corpus.
  map(({ item, vector }) => ({ item, similarity: cosineSimilarity(query, vector) })).
  sort((a, b) => b.similarity - a.similarity).
  slice(0, k);
}

/**
 * Greedy semantic clustering over embeddings — used for the recurring-complaint
 * clusters shown in the authority analytics view.
 */
export function clusterTexts(
texts: {id: number;text: string;}[],
threshold = 0.45)
: {label: string;members: number[];}[] {
  const vectors = texts.map((t) => ({ ...t, vector: encode(t.text) }));
  const clusters: {centroid: number[];label: string;members: number[];}[] = [];

  vectors.forEach((v) => {
    let best = -1;
    let bestScore = threshold;
    clusters.forEach((c, i) => {
      const s = cosineSimilarity(v.vector, c.centroid);
      if (s > bestScore) {
        bestScore = s;
        best = i;
      }
    });
    if (best === -1) {
      clusters.push({ centroid: v.vector, label: conceptLabel(v.text), members: [v.id] });
    } else {
      const c = clusters[best];
      const n = c.members.length;
      c.centroid = c.centroid.map((x, i) => (x * n + v.vector[i]) / (n + 1));
      c.members.push(v.id);
    }
  });

  return clusters.
  map((c) => ({ label: c.label, members: c.members })).
  sort((a, b) => b.members.length - a.members.length);
}

const CONCEPT_LABELS: [string, string][] = [
['overcharge', 'Billing above agreed price'],
['refund', 'Deposit / refund withheld'],
['cancel', 'Cancelled after payment'],
['hygiene', 'Room condition & hygiene'],
['behaviour', 'Staff pressure & conduct'],
['fake', 'Repetitive review patterns'],
['driver', 'Transport route & fare'],
['commission', 'Forced shopping stops'],
['booking', 'Booking not honoured'],
['room', 'Stay did not match listing']];


export function conceptLabel(text: string): string {
  const tokens = new Set(tokenize(text));
  for (const [concept, label] of CONCEPT_LABELS) if (tokens.has(concept)) return label;
  return 'Other service complaint';
}