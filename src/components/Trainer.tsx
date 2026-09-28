import { useEffect, useMemo, useState } from "react";
import { useBlindStore } from "../lib/useStore";
import { advance, answerCard, restartDeck } from "../lib/storage";
import { CARDS, buildOptions, getCard, getRegion } from "../data/wines";

interface TrainerProps {
  onExit: () => void;
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export default function Trainer({ onExit }: TrainerProps) {
  const store = useBlindStore();
  const deck = store.deck;
  const pending = store.pending;
  const [feedback, setFeedback] = useState<{ wrongStreak: number } | null>(null);

  const cardId = useMemo(() => {
    if (!deck) return null;
    if (pending) return pending.cardId;
    return deck.queue[0] ?? null;
  }, [deck, pending]);

  const card = cardId ? getCard(cardId) : null;
  const options = card ? buildOptions(card) : [];

  // 每次进入新的一张题卡，清空“回队位置”反馈。
  useEffect(() => {
    setFeedback(null);
  }, [cardId]);

  if (!deck) {
    return (
      <main className="app-shell">
        <section className="panel empty-state">
          <h2>没有进行中的训练</h2>
          <p>回到首页选择一个产区开始盲品。</p>
          <button className="primary-action" onClick={onExit}>
            返回首页
          </button>
        </section>
      </main>
    );
  }

  const region = getRegion(deck.regionId);
  const total = CARDS.filter((item) => item.regionId === deck.regionId).length;
  const roundAccuracy = deck.attempts === 0 ? 0 : deck.score / deck.attempts;

  const handleAnswer = (picked: string) => {
    if (pending || !card) return;
    const outcome = answerCard(card.id, picked);
    if (!outcome.correct) setFeedback({ wrongStreak: outcome.wrongStreak });
  };

  const handleContinue = () => {
    advance();
  };

  const handleRestart = () => {
    restartDeck();
  };

  // 1-4 键选择选项；揭晓后按回车 / 空格继续。
  const handleKey = (event: React.KeyboardEvent) => {
    if (pending) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        handleContinue();
      }
      return;
    }
    const index = Number(event.key) - 1;
    if (card && index >= 0 && index < options.length) handleAnswer(options[index]);
  };

  const showComplete = deck.finished && !pending;

  const clueRows = card
    ? [
        { label: "颜色", value: card.clues.color },
        { label: "酸度", value: card.clues.acidity },
        { label: "单宁", value: card.clues.tannin },
        { label: "酒体", value: card.clues.body },
        { label: "酒精度", value: card.clues.alcohol },
      ]
    : [];

  const queueHint = pending?.correct
    ? "答对了，这张题卡已退出复习队列。"
    : feedback
      ? feedback.wrongStreak >= 2
        ? `这张已连续答错 ${feedback.wrongStreak} 次，已插到队首，下一轮马上再见。`
        : "这张题卡回到复习队列靠前位置，稍后会再次出现。"
      : "";

  return (
    <main className="app-shell trainer" tabIndex={-1} onKeyDown={handleKey}>
      <section className="trainer-top panel">
        <div className="trainer-id">
          <p className="eyebrow">盲品进行中</p>
          <h2>
            已掌握 {deck.mastered.length} / {total}
          </h2>
        </div>
        <div className="trainer-scores">
          <div>
            <span>本轮答对</span>
            <strong>
              {deck.score}
              <small>/{deck.attempts}</small>
            </strong>
          </div>
          <div>
            <span>当前连对</span>
            <strong>{deck.streak}</strong>
          </div>
          <div>
            <span>最高连对</span>
            <strong>{deck.bestStreak}</strong>
          </div>
          <div>
            <span>本轮正确率</span>
            <strong>{formatPercent(roundAccuracy)}</strong>
          </div>
        </div>
        <button className="ghost-action" onClick={onExit}>
          回首页（进度自动保存）
        </button>
      </section>

      <div className="progress-track" aria-hidden="true">
        <i style={{ width: `${(deck.mastered.length / total) * 100}%` }} />
      </div>

      {!showComplete && card ? (
        <section className={`question-card panel ${pending ? "revealed" : ""}`}>
          <div className="question-head">
            <span className="blind-tag">盲品酒样</span>
            <h2>根据杯中线索，判断葡萄品种</h2>
            <p className="key-hint">可按键盘 1-4 快速选择</p>
          </div>

          <div className="clue-grid">
            {clueRows.map((row) => (
              <div className="clue-item" key={row.label}>
                <span>{row.label}</span>
                <strong>{row.value}</strong>
              </div>
            ))}
          </div>
          <p className="structure-note">{card.clues.structure}</p>

          <div className={`options ${pending ? "locked" : ""}`}>
            {options.map((option, index) => {
              const isAnswer = option === card.variety;
              const isPicked = pending?.picked === option;
              const className = pending
                ? isAnswer
                  ? "option correct"
                  : isPicked
                    ? "option wrong"
                    : "option dim"
                : "option";
              return (
                <button
                  key={option}
                  className={className}
                  onClick={() => handleAnswer(option)}
                  disabled={Boolean(pending)}
                >
                  <kbd>{index + 1}</kbd>
                  <span>{option}</span>
                  {pending && isAnswer && <em className="mark">✓</em>}
                  {pending && isPicked && !isAnswer && <em className="mark">✕</em>}
                </button>
              );
            })}
          </div>

          {pending && (
            <div className={`reveal ${pending.correct ? "is-correct" : "is-wrong"}`}>
              <header>
                <span className={`verdict ${pending.correct ? "ok" : "bad"}`}>
                  {pending.correct ? "答对了" : "答错了"}
                </span>
                <p className="queue-hint">{queueHint}</p>
              </header>

              <div className="reveal-answer">
                <div>
                  <span>产区</span>
                  <strong>
                    {region.name} · {region.country}
                  </strong>
                </div>
                <div>
                  <span>品种</span>
                  <strong className="answer-variety">{card.variety}</strong>
                </div>
                <div>
                  <span>酒款</span>
                  <strong>{card.wine}</strong>
                </div>
              </div>

              <div className="aroma-block">
                <span>典型香气</span>
                <div className="aroma-tags">
                  {card.aromas.map((aroma) => (
                    <span className="aroma-tag" key={aroma}>
                      {aroma}
                    </span>
                  ))}
                </div>
                <p className="wine-note">{card.note}</p>
              </div>

              <div className="reveal-actions">
                <button className="primary-action" onClick={handleContinue}>
                  {deck.finished ? "查看本轮结果（Enter）" : "下一张（Enter）"}
                </button>
              </div>
            </div>
          )}
        </section>
      ) : (
        <section className="complete-card panel">
          <p className="eyebrow">复习队列已清空</p>
          <h2>🎉 本产区所有酒款都答对了</h2>
          <p className="complete-sub">
            答错的题卡均已重新答对并退出队列，这一轮可以收工了。
          </p>
          <div className="complete-stats">
            <div>
              <span>答对 / 作答</span>
              <strong>
                {deck.score} / {deck.attempts}
              </strong>
            </div>
            <div>
              <span>本轮正确率</span>
              <strong>{formatPercent(roundAccuracy)}</strong>
            </div>
            <div>
              <span>最高连对</span>
              <strong>{deck.bestStreak}</strong>
            </div>
          </div>
          <div className="complete-actions">
            <button className="primary-action" onClick={handleRestart}>
              再来一轮
            </button>
            <button onClick={onExit}>返回产区列表</button>
          </div>
        </section>
      )}
    </main>
  );
}
