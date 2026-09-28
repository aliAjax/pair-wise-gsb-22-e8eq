// 逻辑验证：选项、防泄题、复习队列调度、统计、持久化。
// 用法：npx esbuild src/lib/__tests__/logic.test.ts --bundle --platform=node --format=cjs | node
import "./setup";
import { CARDS, REGIONS, buildOptions, cardsOfRegion, getRegion } from "../../data/wines";
import {
  abandonDeck,
  advance,
  answerCard,
  getState,
  overallStat,
  regionStat,
  resetAll,
  startDeck,
} from "../storage";

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    passed += 1;
    console.log(`  ✓ ${message}`);
  } else {
    failed += 1;
    console.error(`  ✗ ${message}`);
  }
}

console.log("1. 选项完整性");
for (const card of CARDS) {
  const options = buildOptions(card);
  assert(options.length === 4, `${card.id}: 恰好 4 个选项`);
  assert(new Set(options).size === 4, `${card.id}: 选项无重复`);
  assert(options.includes(card.variety), `${card.id}: 选项包含正确答案「${card.variety}」`);
  const reds = new Set(
    CARDS.filter((c) => c.kind === "red").map((c) => c.variety),
  );
  const whites = new Set(
    CARDS.filter((c) => c.kind !== "red").map((c) => c.variety),
  );
  // 有些品种红白都有（如霞多丽仅白），这里只校验纯红题卡不会只混入白品种时的颜色池规则：
  // 红题卡的干扰项应来自红酒池。
  if (card.kind === "red") {
    const distractors = options.filter((o) => o !== card.variety);
    const allFromRedPool = distractors.every((d) => reds.has(d));
    assert(allFromRedPool, `${card.id}: 干扰项来自红酒品种池`);
  }
  void whites;
}
const firstOptions = buildOptions(CARDS[0]);
assert(
  JSON.stringify(firstOptions) === JSON.stringify(buildOptions(CARDS[0])),
  "同一题卡的选项与顺序稳定（种子随机）",
);

console.log("2. 线索防泄题：clues 中不得出现任何品种名 / 该卡香气词 / 产区名");
{
  const varietyTokens = Array.from(new Set(CARDS.map((c) => c.variety)));
  let leakCount = 0;
  for (const card of CARDS) {
    const clueText = Object.values(card.clues).join(" ");
    const region = getRegion(card.regionId);
    const forbidden = [
      ...varietyTokens,
      ...card.aromas,
      region.name,
      region.country.split(" ")[0],
    ];
    for (const token of forbidden) {
      if (token.length >= 2 && clueText.includes(token)) {
        leakCount += 1;
        console.error(`    泄题：${card.id} 线索包含「${token}」 → ${clueText}`);
      }
    }
  }
  assert(leakCount === 0, "全部题卡的线索均不含答案信息");
}

console.log("3. 答错回队 + 重复出错更靠前");
resetAll();
startDeck("bordeaux");
{
  const s0 = getState();
  const deck0 = s0.deck!;
  const total = cardsOfRegion("bordeaux").length;
  assert(deck0.queue.length === total, `波尔多初始队列 ${total} 张`);
  assert(deck0.mastered.length === 0, "初始 mastered 为空");

  const a = deck0.queue[0];
  const afterA = deck0.queue.slice(1, 4); // 队列 1-3 位
  answerCard(a, "__错误品种__");
  const s1 = getState();
  // 第一次错：插在索引 2
  assert(s1.deck!.queue[2] === a, "第一次答错后插在第 3 位（索引 2）");
  assert(JSON.stringify(s1.deck!.queue.slice(0, 2)) === JSON.stringify(afterA.slice(0, 2)),
    "前两张原本排在后面的题卡顺序不变");
  assert(s1.deck!.mastered.length === 0, "答错不进入 mastered");
  assert(s1.deck!.score === 0 && s1.deck!.attempts === 1, "本轮得分 0、作答数 1");
  assert(s1.deck!.streak === 0, "答错后当前连对归零");
  advance();

  // 连过两张，让 a 来到队头
  answerCard(getState().deck!.queue[0], getCardVariety(getState().deck!.queue[0]));
  advance();
  answerCard(getState().deck!.queue[0], getCardVariety(getState().deck!.queue[0]));
  advance();
  const headBeforeSecond = getState().deck!.queue[0];
  assert(headBeforeSecond === a, "按队列推进后，错题 a 再次出现");
  answerCard(a, "__错误品种__");
  const s2 = getState();
  // 第二次错：插在索引 1
  assert(s2.deck!.queue[1] === a, "第二次答错后插到第 2 位（索引 1）");
  advance();

  // 过一张，a 又到队头
  answerCard(getState().deck!.queue[0], getCardVariety(getState().deck!.queue[0]));
  advance();
  assert(getState().deck!.queue[0] === a, "再过一张后错题 a 马上出现");
  answerCard(a, "__错误品种__");
  const s3 = getState();
  assert(s3.deck!.queue[0] === a, "第三次答错直接插到队首（索引 0）");
  assert(getState().cards[a].wrongStreak === 3, "题卡 wrongStreak 累计为 3");
  advance();
}

function getCardVariety(id: string): string {
  const card = CARDS.find((c) => c.id === id)!;
  return card.variety;
}

console.log("4. 再次答对才退出队列，且清空队列即完成");
{
  // 继续上面的波尔多：先把队首 a 答对
  const a = getState().deck!.queue[0];
  const outcome = answerCard(a, getCardVariety(a));
  assert(outcome.correct === true, "错题 a 重新作答判为正确");
  assert(!getState().deck!.queue.includes(a), "答对后 a 退出队列");
  assert(getState().deck!.mastered.includes(a), "a 进入 mastered");
  assert(getState().cards[a].wrongStreak === 0, "答对后 wrongStreak 清零");
  advance();

  // 把队列剩余题卡全部答对
  let guard = 0;
  while (getState().deck && !getState().deck!.finished && guard < 50) {
    const id = getState().deck!.queue[0];
    const result = answerCard(id, getCardVariety(id));
    assert(result.correct, `剩余题卡 ${id} 答对`);
    advance();
    guard += 1;
  }
  const deck = getState().deck!;
  assert(deck.finished === true, "队列清空后本轮完成");
  assert(deck.queue.length === 0, "完成时队列为空");
  assert(deck.mastered.length === cardsOfRegion("bordeaux").length, "全部题卡进入 mastered");
  assert(deck.score === deck.attempts - 3, `得分 = 作答数 - 3 次答错（score=${deck.score}, attempts=${deck.attempts}）`);
  assert(deck.bestStreak >= 1, "最高连对已记录");
}

console.log("5. 统计：每卡累计、产区正确率、总览");
{
  // 上面波尔多每张卡都有作答；a 卡 4 次（3 错 1 对），其余 1 次全对。
  const rs = regionStat("bordeaux");
  const expectedAttempts = (cardsOfRegion("bordeaux").length - 1) + 4;
  assert(rs.attempts === expectedAttempts, `波尔多累计作答 ${expectedAttempts}（实际 ${rs.attempts}）`);
  assert(rs.correct === cardsOfRegion("bordeaux").length, "波尔多累计答对数 = 题卡数（每卡最终对过）");
  assert(Math.abs(rs.accuracy - rs.correct / rs.attempts) < 1e-9, "产区正确率 = 对/总");

  const untouched = regionStat("napa");
  assert(untouched.attempts === 0 && untouched.accuracy === 0, "未练习的产区正确率为 0 而非 NaN");

  const overall = overallStat();
  assert(overall.attempts === rs.attempts, `总作答等于已练产区之和（${overall.attempts}）`);
}

console.log("6. 持久化：localStorage 中可恢复进度与 pending 揭晓态");
{
  resetAll();
  startDeck("rioja");
  const first = getState().deck!.queue[0];
  answerCard(first, "__错误品种__"); // 留下 pending
  const saved = JSON.parse(
    (globalThis as any).window.localStorage.getItem("hxwl08.blindTasting.v1"),
  );
  assert(saved.deck.regionId === "rioja", "localStorage 保存了当前产区");
  assert(saved.deck.queue.includes(first), "localStorage 中错题仍在队列");
  assert(saved.pending && saved.pending.cardId === first, "localStorage 保存了待揭晓的作答");
  assert(saved.pending.correct === false, "保存的作答判定为错误");

  // 模拟重新加载：重新 require 存储模块（通过 reset 内部状态无法做到，直接校验 JSON 结构完整）
  assert(typeof saved.cards[first].attempts === "number", "题卡历史成绩已持久化");
  assert(saved.regionBest.rioja === 0 || saved.regionBest.rioja > 0, "产区最高连对字段存在");
  abandonDeck();
  assert(getState().deck === null, "放弃队列后 deck 清空");
  const saved2 = JSON.parse(
    (globalThis as any).window.localStorage.getItem("hxwl08.blindTasting.v1"),
  );
  assert(saved2.deck === null && saved2.cards[first].attempts === 1, "放弃队列不影响历史成绩");
}

console.log("7. 数据覆盖：每产区题卡 ≥ 3，且产区字段完整");
for (const region of REGIONS) {
  const cards = cardsOfRegion(region.id);
  assert(cards.length >= 3, `${region.name} 至少 3 张题卡（${cards.length} 张）`);
  for (const card of cards) {
    assert(card.aromas.length >= 3, `${card.id}: 至少 3 个典型香气`);
    assert(Boolean(card.variety && card.wine && card.note), `${card.id}: 答案字段完整`);
  }
}

console.log(`\n结果：${passed} 通过，${failed} 失败`);
if (failed > 0) process.exit(1);
