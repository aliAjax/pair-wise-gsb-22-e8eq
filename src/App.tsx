import "./styles.css";
import { ALL_REGION_OPTION, GRAPE_OPTIONS, REGIONS } from "./wines";
import { useTraining } from "./useTraining";

const project = {
  id: "hxwl-08",
  port: 5108,
  title: "葡萄酒盲品训练",
  subtitle: "产区、品种与感官特征的盲品复习系统",
};

function formatPercent(correct: number, answered: number): string {
  if (answered === 0) return "—";
  return Math.round((correct / answered) * 100) + "%";
}

function MetricCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone: "ok" | "watch" | "danger" | "neutral";
}) {
  return (
    <article className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
      {hint ? <em>{hint}</em> : null}
      <i className={`status-${tone}`} />
    </article>
  );
}

function RegionButton({
  name,
  accuracy,
  remaining,
  state,
  active,
  onClick,
}: {
  name: string;
  accuracy: string;
  remaining: number;
  state: "idle" | "progress" | "done";
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={`region-row${active ? " active" : ""}${state === "done" ? " done" : ""}`}
      onClick={onClick}
    >
      <span className="region-name">
        {state === "done" ? "✓ " : ""}
        {name}
      </span>
      <span className="region-meta">
        <b>{accuracy}</b>
        <i>{state === "done" ? "已完成" : `剩 ${remaining}`}</i>
      </span>
    </button>
  );
}

function App() {
  const {
    stats,
    activeDeck,
    currentCard,
    currentWine,
    draft,
    canSubmit,
    allDeckActive,
    allDeckFinished,
    regionSummaries,
    setDraftRegion,
    setDraftGrape,
    selectRegion,
    submitAnswer,
    advance,
    restartDeck,
    resetStats,
    reviewTotal,
    allDeckRemaining,
  } = useTraining();

  const answered = currentCard?.answered ?? false;

  const optionState = (
    group: "region" | "grape",
    value: string
  ): "idle" | "selected" | "correct" | "wrong" => {
    if (!answered || !currentCard || !currentWine) {
      const picked = group === "region" ? draft?.region : draft?.grape;
      return picked === value ? "selected" : "idle";
    }
    const answer = group === "region" ? currentWine.region : currentWine.grape;
    const picked =
      group === "region" ? currentCard.pickedRegion : currentCard.pickedGrape;
    if (value === answer) return "correct";
    if (value === picked) return "wrong";
    return "idle";
  };

  return (
    <main className="app-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">{project.id} · port {project.port}</p>
          <h1>{project.title}</h1>
          <p className="subtitle">{project.subtitle}</p>
        </div>
        <div className="stack-card">
          <span>训练规则</span>
          <strong>
            先看酒款线索作答，再揭晓产区、品种与典型香气；答错立即回到复习队列，重复出错优先重考。
          </strong>
          <span>进度与成绩自动保存在本机，关闭页面再回来不丢失。</span>
        </div>
      </section>

      <section className="metrics-grid">
        <MetricCard
          label="累计答对"
          value={String(stats.totalCorrect)}
          hint={`共作答 ${stats.totalAnswered} 次`}
          tone="ok"
        />
        <MetricCard
          label="连续答对"
          value={String(stats.streak)}
          hint={`历史最佳 ${stats.bestStreak}`}
          tone={stats.streak > 0 ? "watch" : "neutral"}
        />
        <MetricCard
          label="总正确率"
          value={formatPercent(stats.totalCorrect, stats.totalAnswered)}
          tone="danger"
        />
        <MetricCard
          label="待复习卡片"
          value={String(reviewTotal)}
          hint="各队列尚未答对退出的题数"
          tone="neutral"
        />
      </section>

      <section className="workspace">
        <aside className="panel narrow">
          <div className="side-heading">
            <h2>训练产区</h2>
            <button
              className="link-danger"
              onClick={() => {
                if (window.confirm("确定清空所有成绩与连续答对记录吗？已在进行的队列会保留。")) {
                  resetStats();
                }
              }}
            >
              清空成绩
            </button>
          </div>
          <div className="region-list">
            <RegionButton
              name={ALL_REGION_OPTION}
              accuracy={formatPercent(stats.totalCorrect, stats.totalAnswered)}
              remaining={allDeckRemaining}
              state={allDeckFinished ? "done" : "idle"}
              active={allDeckActive}
              onClick={() => selectRegion(ALL_REGION_OPTION)}
            />
            {regionSummaries.map((item) => (
              <RegionButton
                key={item.region}
                name={item.region}
                accuracy={formatPercent(item.correct, item.answered)}
                remaining={item.remaining}
                state={item.finished ? "done" : item.inProgress ? "progress" : "idle"}
                active={activeDeck?.key === item.region}
                onClick={() => selectRegion(item.region)}
              />
            ))}
          </div>
        </aside>

        <section className="panel quiz-panel">
          {!activeDeck ? (
            <div className="empty-state">
              <h2>从左侧选择一个产区开始盲品</h2>
              <p>
                也可以选择「全部产区」进行 {REGIONS.length} 个产区的混合出题。
                系统逐张翻卡，先给线索，作答后揭晓答案。
              </p>
            </div>
          ) : activeDeck.finished ? (
            <div className="empty-state finish-state">
              <div className="finish-badge">✓</div>
              <h2>「{activeDeck.key}」本轮全部通过</h2>
              <p>
                {activeDeck.total} 张样酒卡均已答对并退出复习队列。
                当前连续答对 {stats.streak} 题。
              </p>
              <div className="finish-actions">
                <button
                  className="primary-action"
                  onClick={() => {
                    if (window.confirm("重新开始本轮训练？当前队列将重新洗牌。")) {
                      restartDeck();
                    }
                  }}
                >
                  再来一轮
                </button>
              </div>
            </div>
          ) : currentWine && currentCard ? (
            <>
              <div className="section-heading quiz-heading">
                <div>
                  <p>
                    {activeDeck.key} · 已掌握 {activeDeck.solved}/{activeDeck.total}
                  </p>
                  <h2>
                    {currentWine.code}
                    <span className="wine-type">{currentWine.color}</span>
                    {currentCard.misses > 0 ? (
                      <span className="miss-badge">
                        第 {currentCard.misses + 1} 次作答
                      </span>
                    ) : null}
                  </h2>
                </div>
                <button
                  onClick={() => {
                    if (window.confirm("重新洗牌本轮训练？当前复习队列会被重建，已累计的成绩不受影响。")) {
                      restartDeck();
                    }
                  }}
                >
                  重新开始
                </button>
              </div>

              <div className="quiz-progress">
                <i
                  style={{
                    width: `${Math.round((activeDeck.solved / activeDeck.total) * 100)}%`,
                  }}
                />
              </div>

              <div className="quiz-grid">
                <div className="clue-card">
                  <h3>酒款线索</h3>
                  <dl className="structure-grid">
                    <div>
                      <dt>外观</dt>
                      <dd>{currentWine.appearance}</dd>
                    </div>
                    <div>
                      <dt>酸度</dt>
                      <dd>{currentWine.acidity}</dd>
                    </div>
                    <div>
                      <dt>单宁</dt>
                      <dd>{currentWine.tannin}</dd>
                    </div>
                    <div>
                      <dt>酒体</dt>
                      <dd>{currentWine.body}</dd>
                    </div>
                    <div>
                      <dt>酒精度</dt>
                      <dd>{currentWine.alcohol}</dd>
                    </div>
                  </dl>
                  <ul className="clue-list">
                    {currentWine.clues.map((clue) => (
                      <li key={clue}>{clue}</li>
                    ))}
                  </ul>

                  <div className={`aroma-reveal${answered ? " open" : ""}`}>
                    <h3>典型香气</h3>
                    {answered ? (
                      <div className="chips">
                        {currentWine.aromas.map((aroma) => (
                          <span key={aroma}>{aroma}</span>
                        ))}
                      </div>
                    ) : (
                      <p className="masked">作答并揭晓后显示</p>
                    )}
                  </div>
                </div>

                <div className="answer-card">
                  {!answered ? (
                    <>
                      <h3>判断产区</h3>
                      <div className="option-grid regions">
                        {REGIONS.map((region) => (
                          <button
                            key={region}
                            className={`option ${optionState("region", region)}`}
                            onClick={() => setDraftRegion(region)}
                          >
                            {region}
                          </button>
                        ))}
                      </div>

                      <h3>判断品种</h3>
                      <div className="option-grid grapes">
                        {GRAPE_OPTIONS.map((grape) => (
                          <button
                            key={grape}
                            className={`option ${optionState("grape", grape)}`}
                            onClick={() => setDraftGrape(grape)}
                          >
                            {grape}
                          </button>
                        ))}
                      </div>

                      <button
                        className="primary-action submit-action"
                        disabled={!canSubmit}
                        onClick={submitAnswer}
                      >
                        {canSubmit ? "提交并揭晓" : "请选择产区与品种"}
                      </button>
                    </>
                  ) : (
                    <div className="reveal-panel">
                      <div
                        className={`verdict ${
                          currentCard.wasCorrect ? "correct" : "wrong"
                        }`}
                      >
                        <strong>
                          {currentCard.wasCorrect ? "回答正确" : "回答错误"}
                        </strong>
                        {currentCard.wasCorrect ? (
                          <span>本题已退出复习队列</span>
                        ) : (
                          <span>
                            已连续答错 {currentCard.misses} 次
                            {currentCard.misses >= 2 ? "，排到队列最前优先重考" : "，稍后重考"}
                          </span>
                        )}
                      </div>

                      <dl className="answer-detail">
                        <div>
                          <dt>产区</dt>
                          <dd>{currentWine.region}</dd>
                        </div>
                        <div>
                          <dt>品种</dt>
                          <dd>{currentWine.grape}</dd>
                        </div>
                        <div>
                          <dt>你选的产区</dt>
                          <dd className={currentCard.pickedRegion === currentWine.region ? "right" : "bad"}>
                            {currentCard.pickedRegion}
                          </dd>
                        </div>
                        <div>
                          <dt>你选的品种</dt>
                          <dd className={currentCard.pickedGrape === currentWine.grape ? "right" : "bad"}>
                            {currentCard.pickedGrape}
                          </dd>
                        </div>
                      </dl>

                      <p className="tasting-note">{currentWine.notes}</p>

                      <button className="primary-action submit-action" onClick={advance}>
                        {currentCard.wasCorrect
                          ? activeDeck.queue.length === 1
                            ? "完成本轮"
                            : "下一张样酒"
                          : "继续复习"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : null}
        </section>
      </section>
    </main>
  );
}

export default App;
