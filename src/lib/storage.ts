// 盲品训练的持久化状态与出题队列调度。
// 每次状态变更都会立即写入 localStorage，因此中途关闭 / 刷新页面后进度与成绩不丢。

import { CARDS, cardsOfRegion, getCard } from "../data/wines";

const STORAGE_KEY = "hxwl08.blindTasting.v1";

export interface CardStat {
  attempts: number;
  correct: number;
  /** 当前连续答对 */
  streak: number;
  /** 历史最高连续答对 */
  bestStreak: number;
  /** 当前连续答错，决定回队后的插入位置 */
  wrongStreak: number;
}

export interface DeckState {
  regionId: string;
  /** 待复习队列，队头（index 0）即下一张；答对的题卡会被移除 */
  queue: string[];
  /** 本轮已掌握（答对过）的题卡 */
  mastered: string[];
  startedAt: number;
  /** 本轮答对数 */
  score: number;
  /** 本轮作答数 */
  attempts: number;
  /** 本轮当前连对 */
  streak: number;
  /** 本轮最高连对 */
  bestStreak: number;
  /** 全部题卡答对、队列清空后置为完成态 */
  finished: boolean;
  finishedAt: number | null;
}

export interface PendingAnswer {
  cardId: string;
  picked: string;
  correct: boolean;
  at: number;
}

export interface PersistState {
  version: 1;
  deck: DeckState | null;
  /** 最近一次已提交的作答，用于刷新后仍停在揭晓页 */
  pending: PendingAnswer | null;
  /** 每张题卡的历史成绩 */
  cards: Record<string, CardStat>;
  /** 各产区历史最高连对 */
  regionBest: Record<string, number>;
}

function emptyState(): PersistState {
  return { version: 1, deck: null, pending: null, cards: {}, regionBest: {} };
}

function sanitize(raw: unknown): PersistState {
  const base = emptyState();
  if (typeof raw !== "object" || raw === null) return base;
  const data = raw as Partial<PersistState>;
  if (data.version !== 1) return base;

  const knownIds = new Set(CARDS.map((card) => card.id));
  const cards: Record<string, CardStat> = {};
  if (data.cards && typeof data.cards === "object") {
    for (const [id, stat] of Object.entries(data.cards as Record<string, unknown>)) {
      if (!knownIds.has(id) || typeof stat !== "object" || stat === null) continue;
      const s = stat as Partial<CardStat>;
      cards[id] = {
        attempts: Number(s.attempts) || 0,
        correct: Number(s.correct) || 0,
        streak: Number(s.streak) || 0,
        bestStreak: Number(s.bestStreak) || 0,
        wrongStreak: Number(s.wrongStreak) || 0,
      };
    }
  }

  const regionBest: Record<string, number> = {};
  if (data.regionBest && typeof data.regionBest === "object") {
    for (const [id, value] of Object.entries(data.regionBest as Record<string, unknown>)) {
      if (knownIds.has(id) || CARDS.some((card) => card.regionId === id)) {
        regionBest[id] = Number(value) || 0;
      }
    }
  }

  let deck: DeckState | null = null;
  if (data.deck && typeof data.deck === "object") {
    const d = data.deck as Partial<DeckState>;
    const regionId = String(d.regionId || "");
    const regionIds = new Set(cardsOfRegion(regionId).map((card) => card.id));
    if (regionIds.size > 0) {
      const mastered = Array.from(
        new Set(Array.isArray(d.mastered) ? d.mastered : []),
      ).filter((id) => regionIds.has(id));
      const masteredSet = new Set(mastered);
      const queue = Array.isArray(d.queue)
        ? Array.from(new Set(d.queue as string[])).filter(
            (id) => regionIds.has(id) && !masteredSet.has(id),
          )
        : [];
      const finished = Boolean(d.finished) || (queue.length === 0 && mastered.length === regionIds.size);
      deck = {
        regionId,
        queue,
        mastered,
        startedAt: Number(d.startedAt) || Date.now(),
        score: Number(d.score) || 0,
        attempts: Number(d.attempts) || 0,
        streak: Number(d.streak) || 0,
        bestStreak: Number(d.bestStreak) || 0,
        finished,
        finishedAt: Number(d.finishedAt) || (finished ? Date.now() : null),
      };
    }
  }

  // pending 指向最后一次作答：即使本轮已完成也保留，刷新后停在该题揭晓页。
  let pending: PendingAnswer | null = null;
  if (data.pending && typeof data.pending === "object" && deck) {
    const p = data.pending as Partial<PendingAnswer>;
    const cardId = String(p.cardId || "");
    if (
      knownIds.has(cardId) &&
      getCard(cardId).regionId === deck.regionId &&
      typeof p.picked === "string" &&
      typeof p.correct === "boolean"
    ) {
      pending = { cardId, picked: p.picked, correct: p.correct, at: Number(p.at) || Date.now() };
    }
  }

  return { version: 1, deck, pending, cards, regionBest };
}

// ── 极简发布订阅 store，配合 useSyncExternalStore 使用 ──────

let state: PersistState = emptyState();
const listeners = new Set<() => void>();

function load(): PersistState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    return sanitize(JSON.parse(raw));
  } catch {
    return emptyState();
  }
}

function persist() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // 存储不可用时训练仍可继续，只是无法跨刷新保留。
  }
}

function setState(next: PersistState) {
  state = next;
  persist();
  listeners.forEach((listener) => listener());
}

export function getState(): PersistState {
  return state;
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// 模块加载时（仅浏览器环境）读一次。
if (typeof window !== "undefined") {
  state = load();
}

// ── 业务动作 ────────────────────────────────────────────────

/** 答错回队：第一次错隔 2 张，第二次错隔 1 张，第三次起直接插到队首。 */
function reinsert(queue: string[], cardId: string, wrongStreak: number): string[] {
  const rest = queue.filter((id) => id !== cardId);
  const index = Math.min(Math.max(0, 3 - wrongStreak), rest.length);
  rest.splice(index, 0, cardId);
  return rest;
}

function touchCard(
  cards: Record<string, CardStat>,
  cardId: string,
  correct: boolean,
): CardStat {
  const prev: CardStat = cards[cardId] ?? {
    attempts: 0,
    correct: 0,
    streak: 0,
    bestStreak: 0,
    wrongStreak: 0,
  };
  const next: CardStat = {
    attempts: prev.attempts + 1,
    correct: prev.correct + (correct ? 1 : 0),
    streak: correct ? prev.streak + 1 : 0,
    bestStreak: correct ? Math.max(prev.bestStreak, prev.streak + 1) : prev.bestStreak,
    wrongStreak: correct ? 0 : prev.wrongStreak + 1,
  };
  cards[cardId] = next;
  return next;
}

export function startDeck(regionId: string): void {
  const ids = cardsOfRegion(regionId).map((card) => card.id);
  // 随机洗牌后作为初始队列。
  for (let i = ids.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  setState({
    ...state,
    deck: {
      regionId,
      queue: ids,
      mastered: [],
      startedAt: Date.now(),
      score: 0,
      attempts: 0,
      streak: 0,
      bestStreak: 0,
      finished: false,
      finishedAt: null,
    },
    pending: null,
  });
}

export interface AnswerOutcome {
  correct: boolean;
  /** 本次作答后该卡的连续答错次数 */
  wrongStreak: number;
  /** 作答后队列是否清空（本轮完成） */
  finished: boolean;
}

export function answerCard(cardId: string, picked: string): AnswerOutcome {
  const deck = state.deck;
  if (!deck || deck.finished || state.pending) {
    return { correct: false, wrongStreak: 0, finished: Boolean(deck?.finished) };
  }
  if (deck.queue[0] !== cardId) {
    return { correct: false, wrongStreak: 0, finished: false };
  }

  const card = getCard(cardId);
  const correct = picked === card.variety;

  const cards = { ...state.cards };
  const cardStat = touchCard(cards, cardId, correct);

  const mastered = deck.mastered.includes(cardId) ? deck.mastered : [...deck.mastered];
  let queue = deck.queue.slice(1);
  if (correct) {
    if (!mastered.includes(cardId)) mastered.push(cardId);
  } else {
    queue = reinsert(queue, cardId, cardStat.wrongStreak);
  }

  const streak = correct ? deck.streak + 1 : 0;
  const bestStreak = Math.max(deck.bestStreak, streak);
  const regionId = deck.regionId;
  const regionBest = {
    ...state.regionBest,
    [regionId]: Math.max(state.regionBest[regionId] ?? 0, bestStreak),
  };
  const finished = queue.length === 0;

  const nextDeck: DeckState = {
    ...deck,
    queue,
    mastered,
    score: deck.score + (correct ? 1 : 0),
    attempts: deck.attempts + 1,
    streak,
    bestStreak,
    finished,
    finishedAt: finished ? Date.now() : null,
  };

  setState({
    ...state,
    deck: nextDeck,
    cards,
    regionBest,
    pending: { cardId, picked, correct, at: Date.now() },
  });

  return { correct, wrongStreak: cardStat.wrongStreak, finished };
}

/** 关闭揭晓面板，进入下一张（或在队列清空时停在完成页）。 */
export function advance(): void {
  if (!state.pending) return;
  setState({ ...state, pending: null });
}

/** 放弃当前队列、重新开始本轮（历史成绩保留）。 */
export function restartDeck(): void {
  if (!state.deck) return;
  startDeck(state.deck.regionId);
}

/** 清空某产区的进行中队列（用于首页放弃进度）。 */
export function abandonDeck(): void {
  setState({ ...state, deck: null, pending: null });
}

/** 清空全部历史成绩与进度（谨慎操作）。 */
export function resetAll(): void {
  setState(emptyState());
}

// ── 统计派生 ────────────────────────────────────────────────

export interface RegionStat {
  attempts: number;
  correct: number;
  accuracy: number;
  bestStreak: number;
}

export function regionStat(regionId: string): RegionStat {
  let attempts = 0;
  let correct = 0;
  for (const card of cardsOfRegion(regionId)) {
    const stat = state.cards[card.id];
    if (stat) {
      attempts += stat.attempts;
      correct += stat.correct;
    }
  }
  return {
    attempts,
    correct,
    accuracy: attempts === 0 ? 0 : correct / attempts,
    bestStreak: state.regionBest[regionId] ?? 0,
  };
}

export function overallStat(): { attempts: number; correct: number; accuracy: number } {
  let attempts = 0;
  let correct = 0;
  for (const stat of Object.values(state.cards)) {
    attempts += stat.attempts;
    correct += stat.correct;
  }
  return { attempts, correct, accuracy: attempts === 0 ? 0 : correct / attempts };
}

/** 当前该作答的题卡：有揭晓中的作答时返回该卡，否则返回队头。 */
export function currentCardId(deck: DeckState): string | null {
  if (state.pending) return state.pending.cardId;
  return deck.queue[0] ?? null;
}
