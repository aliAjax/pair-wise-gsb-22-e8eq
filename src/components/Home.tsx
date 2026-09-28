import { useBlindStore } from "../lib/useStore";
import {
  abandonDeck,
  overallStat,
  regionStat,
  resetAll,
  startDeck,
} from "../lib/storage";
import { CARDS, REGIONS, cardsOfRegion } from "../data/wines";

interface HomeProps {
  onContinue: () => void;
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export default function Home({ onContinue }: HomeProps) {
  const store = useBlindStore();
  const overall = overallStat();
  const deck = store.deck;

  const totalCards = CARDS.length;
  const everAttempted = Object.keys(store.cards).length;

  const handlePick = (regionId: string) => {
    // 点击的正是进行中的产区：直接续训，不重置队列。
    if (deck && deck.regionId === regionId && !deck.finished) {
      onContinue();
      return;
    }
    if (deck && !deck.finished && deck.regionId !== regionId) {
      const ok = window.confirm(
        `当前产区训练尚未完成，切换到新产区会清空当前队列（历史成绩保留）。确定切换吗？`,
      );
      if (!ok) return;
    }
    startDeck(regionId);
    onContinue();
  };

  const handleContinue = () => {
    if (deck) onContinue();
  };

  const handleRestartRegion = (regionId: string) => {
    startDeck(regionId);
    onContinue();
  };

  const handleAbandon = () => {
    if (!deck) return;
    const ok = window.confirm("放弃当前产区的训练队列吗？历史成绩会保留。");
    if (ok) abandonDeck();
  };

  const handleResetAll = () => {
    const ok = window.confirm("将清空全部产区的历史成绩与训练进度，且无法恢复，确定继续吗？");
    if (ok) resetAll();
  };

  return (
    <main className="app-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">盲品训练 · BLIND TASTING</p>
          <h1>葡萄酒盲品训练</h1>
          <p className="subtitle">
            选定产区后逐张出题：先只看酒款线索，作答后再揭晓产区、品种与典型香气。
            答错的酒会回到待复习队列，重复出错会排得更靠前，直到再次答对才退出。
          </p>
        </div>
        <div className="stack-card">
          <span>规则速览</span>
          <strong>看线索 → 选品种 → 对答案 → 清队列</strong>
          <p className="stack-note">进度与成绩自动保存在本机，关掉页面再回来也不会丢。</p>
        </div>
      </section>

      {deck && (
        <section className="resume-bar panel">
          <div className="resume-info">
            <p className="eyebrow">{deck.finished ? "已完成的轮次" : "训练进行中"}</p>
            <h2>
              {deck.finished
                ? "本轮全部答对，再来一轮？"
                : `还有 ${deck.queue.length} 张待复习 · 已掌握 ${deck.mastered.length} 张`}
            </h2>
            <p className="resume-meta">
              本轮答对 <strong>{deck.score}</strong> / {deck.attempts} 题 · 当前连对{" "}
              <strong>{deck.streak}</strong> · 最高连对 <strong>{deck.bestStreak}</strong>
            </p>
          </div>
          <div className="resume-actions">
            <button className="primary-action" onClick={handleContinue}>
              {deck.finished ? "查看本轮结果" : "继续训练"}
            </button>
            {deck.finished ? (
              <button onClick={() => handleRestartRegion(deck.regionId)}>再来一轮</button>
            ) : (
              <button onClick={handleAbandon}>放弃队列</button>
            )}
          </div>
        </section>
      )}

      <section className="metrics-grid">
        <article className="metric-card">
          <span>累计作答</span>
          <strong>{overall.attempts}</strong>
          <i className="status-ok" />
        </article>
        <article className="metric-card">
          <span>累计答对</span>
          <strong>{overall.correct}</strong>
          <i className="status-watch" />
        </article>
        <article className="metric-card">
          <span>总正确率</span>
          <strong>{formatPercent(overall.accuracy)}</strong>
          <i className="status-danger" />
        </article>
        <article className="metric-card">
          <span>已练题卡</span>
          <strong>
            {everAttempted}
            <small> / {totalCards}</small>
          </strong>
          <i className="status-ok" />
        </article>
      </section>

      <section className="regions">
        <div className="section-heading">
          <div>
            <p>选择产区开始出题</p>
            <h2>产区队列</h2>
          </div>
          <button onClick={handleResetAll}>清空全部成绩</button>
        </div>
        <div className="region-grid">
          {REGIONS.map((region) => {
            const stat = regionStat(region.id);
            const total = cardsOfRegion(region.id).length;
            const isActive = deck?.regionId === region.id;
            const masteredHere = isActive ? deck!.mastered.length : 0;
            return (
              <article
                key={region.id}
                className={`region-card ${isActive ? "active" : ""}`}
              >
                <header>
                  <div>
                    <h3>{region.name}</h3>
                    <p className="region-country">{region.country}</p>
                  </div>
                  <span className="region-count">{total} 张题卡</span>
                </header>
                <p className="region-blurb">{region.blurb}</p>
                <div className="region-stats">
                  <div>
                    <span>正确率</span>
                    <strong>
                      {stat.attempts === 0 ? "—" : formatPercent(stat.accuracy)}
                    </strong>
                    <small>
                      {stat.correct}/{stat.attempts} 题
                    </small>
                  </div>
                  <div>
                    <span>最高连对</span>
                    <strong>{stat.bestStreak}</strong>
                    <small>历史最佳</small>
                  </div>
                  <div>
                    <span>状态</span>
                    <strong className="status-text">
                      {isActive && deck && !deck.finished
                        ? `待复习 ${deck.queue.length}`
                        : isActive && deck?.finished
                          ? "已通关"
                          : "未开始"}
                    </strong>
                    <small>{isActive ? `已掌握 ${masteredHere}` : "可随时开始"}</small>
                  </div>
                </div>
                <div className="accuracy-bar" aria-hidden="true">
                  <i style={{ width: `${Math.round(stat.accuracy * 100)}%` }} />
                </div>
                <button
                  className={isActive ? "region-btn" : "primary-action region-btn"}
                  onClick={() => handlePick(region.id)}
                >
                  {isActive && deck && !deck.finished
                    ? "继续这一产区"
                    : isActive && deck?.finished
                      ? "再来一轮"
                      : "开始盲品"}
                </button>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
