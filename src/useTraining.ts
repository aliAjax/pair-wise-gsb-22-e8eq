import { useCallback, useEffect, useMemo, useState } from "react";
import { REGIONS, WINES, type Wine } from "./wines";

const STORAGE_KEY = "wine-blind-training:v1";

export interface RegionStat {
  correct: number;
  answered: number;
}

export interface CardState {
  wineId: string;
  /** 当前这一轮已经连续答错的次数；答对后置 0 并退出队列 */
  misses: number;
  answered: boolean;
  pickedRegion: string | null;
  pickedGrape: string | null;
  wasCorrect: boolean | null;
}

export interface DeckState {
  key: string;
  total: number;
  /** 待作答队列，队首为当前题 */
  queue: CardState[];
  /** 本轮已答对的题数 */
  solved: number;
  finished: boolean;
}

export interface PersistState {
  version: 1;
  activeKey: string | null;
  decks: Record<string, DeckState>;
  stats: {
    totalCorrect: number;
    totalAnswered: number;
    streak: number;
    bestStreak: number;
    byRegion: Record<string, RegionStat>;
  };
}

interface DraftAnswer {
  region: string;
  grape: string;
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function buildDeck(key: string): DeckState {
  const pool =
    key === "全部产区"
      ? WINES
      : WINES.filter((wine) => wine.region === key);
  const queue = shuffle(pool).map((wine) => ({
    wineId: wine.id,
    misses: 0,
    answered: false,
    pickedRegion: null,
    pickedGrape: null,
    wasCorrect: null,
  }));
  return { key, total: queue.length, queue, solved: 0, finished: false };
}

function emptyStats(): PersistState["stats"] {
  return {
    totalCorrect: 0,
    totalAnswered: 0,
    streak: 0,
    bestStreak: 0,
    byRegion: {},
  };
}

function loadState(): PersistState {
  const fallback: PersistState = {
    version: 1,
    activeKey: null,
    decks: {},
    stats: emptyStats(),
  };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as PersistState;
    if (parsed.version !== 1 || typeof parsed.decks !== "object") {
      return fallback;
    }
    return {
      version: 1,
      activeKey: parsed.activeKey ?? null,
      decks: parsed.decks ?? {},
      stats: { ...emptyStats(), ...(parsed.stats ?? {}) },
    };
  } catch {
    return fallback;
  }
}

const wineById = new Map<string, Wine>(WINES.map((wine) => [wine.id, wine]));

export function useTraining() {
  const [state, setState] = useState<PersistState>(loadState);
  const [draft, setDraft] = useState<DraftAnswer | null>(null);

  // 进度与成绩实时落盘，刷新 / 关闭页面后回来不丢
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // 隐私模式等写入失败时静默降级为内存态
    }
  }, [state]);

  const activeDeck: DeckState | null = state.activeKey
    ? state.decks[state.activeKey] ?? null
    : null;
  const currentCard: CardState | null =
    activeDeck && activeDeck.queue.length > 0 ? activeDeck.queue[0] : null;
  const currentWine: Wine | null = currentCard
    ? wineById.get(currentCard.wineId) ?? null
    : null;

  // 进入一张未作答的新题时清空草稿；已揭晓的题恢复时不允许改动
  useEffect(() => {
    if (currentCard && !currentCard.answered) {
      setDraft({ region: "", grape: "" });
    }
  }, [currentCard?.wineId, currentCard?.answered]);

  const selectRegion = useCallback((key: string) => {
    setState((prev) => {
      if (prev.activeKey === key) return prev;
      const decks = { ...prev.decks };
      if (!decks[key]) {
        decks[key] = buildDeck(key);
      }
      return { ...prev, activeKey: key, decks };
    });
  }, []);

  const canSubmit =
    !!currentCard &&
    !currentCard.answered &&
    !!draft?.region &&
    !!draft?.grape;

  const submitAnswer = useCallback(() => {
    if (!draft?.region || !draft?.grape) return;
    setState((prev) => {
      if (!prev.activeKey) return prev;
      const deck = prev.decks[prev.activeKey];
      if (!deck || deck.queue.length === 0) return prev;
      const card = deck.queue[0];
      if (card.answered) return prev;
      const wine = wineById.get(card.wineId);
      if (!wine) return prev;

      const correct =
        draft.region === wine.region && draft.grape === wine.grape;
      const nextCard: CardState = {
        ...card,
        answered: true,
        pickedRegion: draft.region,
        pickedGrape: draft.grape,
        wasCorrect: correct,
        misses: correct ? 0 : card.misses + 1,
      };
      const queue = [nextCard, ...deck.queue.slice(1)];

      // 成绩在提交即结算：揭晓后直接关页面也不会重复计分
      const regionStat = prev.stats.byRegion[wine.region] ?? {
        correct: 0,
        answered: 0,
      };
      const nextStats: PersistState["stats"] = {
        ...prev.stats,
        totalCorrect: prev.stats.totalCorrect + (correct ? 1 : 0),
        totalAnswered: prev.stats.totalAnswered + 1,
        streak: correct ? prev.stats.streak + 1 : 0,
        bestStreak: correct
          ? Math.max(prev.stats.bestStreak, prev.stats.streak + 1)
          : prev.stats.bestStreak,
        byRegion: {
          ...prev.stats.byRegion,
          [wine.region]: {
            correct: regionStat.correct + (correct ? 1 : 0),
            answered: regionStat.answered + 1,
          },
        },
      };

      return {
        ...prev,
        stats: nextStats,
        decks: {
          ...prev.decks,
          [deck.key]: { ...deck, queue },
        },
      };
    });
  }, [draft]);

  const advance = useCallback(() => {
    setState((prev) => {
      if (!prev.activeKey) return prev;
      const deck = prev.decks[prev.activeKey];
      if (!deck || deck.queue.length === 0) return prev;
      const [card, ...rest] = deck.queue;
      if (!card.answered || card.wasCorrect === null) return prev;

      let queue: CardState[];
      let solved = deck.solved;
      if (card.wasCorrect) {
        // 再次答对 → 退出待复习队列
        queue = rest;
        solved += 1;
      } else {
        // 答错 → 回到待复习队列；未错过的新题在前，复习组按连续答错次数降序，
        // 同次数保持稳定先后，因此重复出错（misses 越大）排得越靠前
        const resetCard: CardState = {
          ...card,
          answered: false,
          pickedRegion: null,
          pickedGrape: null,
          wasCorrect: null,
        };
        const unseen = rest.filter((item) => item.misses === 0);
        const review = rest.filter((item) => item.misses > 0);
        let insertAt = review.findIndex(
          (item) => item.misses < resetCard.misses
        );
        if (insertAt === -1) insertAt = review.length;
        queue = [
          ...unseen,
          ...review.slice(0, insertAt),
          resetCard,
          ...review.slice(insertAt),
        ];
      }
      return {
        ...prev,
        decks: {
          ...prev.decks,
          [deck.key]: {
            ...deck,
            queue,
            solved,
            finished: queue.length === 0,
          },
        },
      };
    });
  }, []);

  const restartDeck = useCallback(() => {
    setState((prev) => {
      if (!prev.activeKey) return prev;
      return {
        ...prev,
        decks: {
          ...prev.decks,
          [prev.activeKey]: buildDeck(prev.activeKey),
        },
      };
    });
  }, []);

  const resetStats = useCallback(() => {
    setState((prev) => ({ ...prev, stats: emptyStats() }));
  }, []);

  const regionSummaries = useMemo(() => {
    return REGIONS.map((region) => {
      const stat = state.stats.byRegion[region];
      const deckKey = region;
      const deck = state.decks[deckKey];
      return {
        region,
        correct: stat?.correct ?? 0,
        answered: stat?.answered ?? 0,
        remaining: deck ? deck.queue.length : WINES.filter((w) => w.region === region).length,
        inProgress: !!deck && !deck.finished,
        finished: !!deck?.finished,
      };
    });
  }, [state]);

  const allDeck = state.decks["全部产区"];

  /** 待复习卡片：统计所有已建立队列中尚未答对退出的题数（含混合轮） */
  const reviewTotal = Object.values(state.decks).reduce(
    (sum, deck) => sum + deck.queue.length,
    0
  );

  return {
    stats: state.stats,
    activeDeck,
    currentCard,
    currentWine,
    draft,
    canSubmit,
    reviewTotal,
    allDeckActive: state.activeKey === "全部产区",
    allDeckFinished: !!allDeck?.finished,
    allDeckRemaining: allDeck ? allDeck.queue.length : WINES.length,
    regionSummaries,
    setDraftRegion: (region: string) =>
      setDraft((prev) => ({ region, grape: prev?.grape ?? "" })),
    setDraftGrape: (grape: string) =>
      setDraft((prev) => ({ region: prev?.region ?? "", grape })),
    selectRegion,
    submitAnswer,
    advance,
    restartDeck,
    resetStats,
  };
}
