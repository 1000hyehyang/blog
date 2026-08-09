import type { Post } from "@/domain/post";

const DEFAULT_RELATED_POST_LIMIT = 3;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1_000;

const SCORING_RULES = {
  sameCategory: 5,
  sharedTag: 3,
  titleSimilarity: 2,
  recency: 1,
  recencyHalfLifeDays: 365,
} as const;

export type RelatedPostOptions = {
  limit?: number;
  now?: Date;
};

type ScoredPost = {
  post: Post;
  totalScore: number;
  createdAtTimestamp: number | null;
};

function normalizeText(value: string): string {
  return value.normalize("NFKC").trim().toLowerCase();
}

function toUniqueNormalizedSet(values: string[]): Set<string> {
  return new Set(values.map(normalizeText).filter(Boolean));
}

function tokenizeTitle(title: string): Set<string> {
  const tokens = normalizeText(title).match(/[\p{L}\p{N}]+/gu) ?? [];

  return new Set(tokens.filter((token) => token.length >= 2));
}

function countIntersection(left: Set<string>, right: Set<string>): number {
  let count = 0;

  for (const value of left) {
    if (right.has(value)) count += 1;
  }

  return count;
}

function calculateTitleSimilarity(current: Post, candidate: Post): number {
  const currentTokens = tokenizeTitle(current.title);
  const candidateTokens = tokenizeTitle(candidate.title);
  const intersectionSize = countIntersection(currentTokens, candidateTokens);

  if (intersectionSize === 0) return 0;

  const unionSize = new Set([...currentTokens, ...candidateTokens]).size;
  return intersectionSize / unionSize;
}

function parseTimestamp(value: string): number | null {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function calculateRecencyScore(
  createdAtTimestamp: number | null,
  nowTimestamp: number,
): number {
  if (createdAtTimestamp === null || !Number.isFinite(nowTimestamp)) return 0;

  const ageInDays = Math.max(
    0,
    (nowTimestamp - createdAtTimestamp) / MILLISECONDS_PER_DAY,
  );
  const decay = 1 + ageInDays / SCORING_RULES.recencyHalfLifeDays;

  return SCORING_RULES.recency / decay;
}

function calculateRelevanceScore(current: Post, candidate: Post): number {
  const currentCategory = normalizeText(current.category.slug);
  const candidateCategory = normalizeText(candidate.category.slug);
  const hasSameCategory =
    currentCategory.length > 0 && currentCategory === candidateCategory;

  const currentTags = toUniqueNormalizedSet(current.tags);
  const candidateTags = toUniqueNormalizedSet(candidate.tags);
  const sharedTagCount = countIntersection(currentTags, candidateTags);
  const titleSimilarity = calculateTitleSimilarity(current, candidate);

  return (
    (hasSameCategory ? SCORING_RULES.sameCategory : 0) +
    sharedTagCount * SCORING_RULES.sharedTag +
    titleSimilarity * SCORING_RULES.titleSimilarity
  );
}

function scorePost(
  current: Post,
  candidate: Post,
  nowTimestamp: number,
): ScoredPost {
  const relevanceScore = calculateRelevanceScore(current, candidate);
  const createdAtTimestamp = parseTimestamp(candidate.createdAt);

  // 관련도 없는 글은 최신순으로 빈 자리만 채운다.
  const recencyScore =
    relevanceScore > 0
      ? calculateRecencyScore(createdAtTimestamp, nowTimestamp)
      : 0;

  return {
    post: candidate,
    totalScore: relevanceScore + recencyScore,
    createdAtTimestamp,
  };
}

function compareTimestampsDescending(
  left: number | null,
  right: number | null,
): number {
  if (left === right) return 0;
  if (left === null) return 1;
  if (right === null) return -1;
  return right - left;
}

function compareScoredPosts(left: ScoredPost, right: ScoredPost): number {
  const scoreDifference = right.totalScore - left.totalScore;
  if (scoreDifference !== 0) return scoreDifference;

  const dateDifference = compareTimestampsDescending(
    left.createdAtTimestamp,
    right.createdAtTimestamp,
  );
  if (dateDifference !== 0) return dateDifference;

  return left.post.number - right.post.number;
}

function normalizeLimit(limit: number): number {
  if (!Number.isFinite(limit) || limit <= 0) return 0;
  return Math.floor(limit);
}

function getCandidates(posts: Post[], current: Post): Post[] {
  const seenPostNumbers = new Set<number>();

  return posts.filter((post) => {
    if (
      !post.published ||
      post.number === current.number ||
      seenPostNumbers.has(post.number)
    ) {
      return false;
    }

    seenPostNumbers.add(post.number);
    return true;
  });
}

export function rankRelatedPosts(
  posts: Post[],
  current: Post,
  {
    limit = DEFAULT_RELATED_POST_LIMIT,
    now = new Date(),
  }: RelatedPostOptions = {},
): Post[] {
  const normalizedLimit = normalizeLimit(limit);
  if (normalizedLimit === 0) return [];
  const nowTimestamp = now.getTime();

  return getCandidates(posts, current)
    .map((post) => scorePost(current, post, nowTimestamp))
    .sort(compareScoredPosts)
    .slice(0, normalizedLimit)
    .map(({ post }) => post);
}
