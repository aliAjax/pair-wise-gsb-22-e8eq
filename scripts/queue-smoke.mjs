// 纯逻辑冒烟测试：模拟答错回队、重复出错优先、答对退出、计分
function shuffle(items) {
  return [...items];
}

const wines = ["w1", "w2", "w3", "w4"].map((id) => ({ id, region: "R" }));

function buildDeck() {
  return {
    total: wines.length,
    queue: shuffle(wines).map((w) => ({
      wineId: w.id,
      misses: 0,
      answered: false,
      pickedRegion: null,
      pickedGrape: null,
      wasCorrect: null,
    })),
    solved: 0,
    finished: false,
  };
}

const answer = { R_g: true };
function submit(deck, regionOk, grapeOk) {
  const card = deck.queue[0];
  const correct = regionOk && grapeOk;
  deck.queue[0] = {
    ...card,
    answered: true,
    pickedRegion: regionOk ? "R" : "X",
    pickedGrape: grapeOk ? "g" : "y",
    wasCorrect: correct,
    misses: correct ? 0 : card.misses + 1,
  };
}

function advance(deck) {
  const [card, ...rest] = deck.queue;
  if (card.wasCorrect) {
    deck.queue = rest;
    deck.solved += 1;
  } else {
    const reset = { ...card, answered: false, pickedRegion: null, pickedGrape: null, wasCorrect: null };
    const unseen = rest.filter((i) => i.misses === 0);
    const review = rest.filter((i) => i.misses > 0);
    let at = review.findIndex((i) => i.misses < reset.misses);
    if (at === -1) at = review.length;
    deck.queue = [...unseen, ...review.slice(0, at), reset, ...review.slice(at)];
  }
  deck.finished = deck.queue.length === 0;
}

let failures = 0;
function assert(cond, msg) {
  if (!cond) {
    failures++;
    console.error("FAIL:", msg);
  } else {
    console.log("ok:", msg);
  }
}

// 场景 1：首轮顺序 w1 w2 w3 w4
const deck = buildDeck();
assert(deck.queue.map((c) => c.wineId).join(",") === "w1,w2,w3,w4", "初始队列顺序");

// w1 答错 → 回复习组，仍在新题之后
submit(deck, false, true);
advance(deck);
assert(deck.queue.map((c) => c.wineId).join(",") === "w2,w3,w4,w1", "首次答错回到队尾复习位");
assert(deck.queue[3].misses === 1, "记录 1 次连错");

// w2 答错两次：答错一次后排 w1 后（同次数稳定），再答错一次后应排到复习组最前
submit(deck, false, true); // w2 第一次错
advance(deck);
assert(deck.queue.map((c) => c.wineId).join(",") === "w3,w4,w1,w2", "w2 错1次，排在 w1 后");

submit(deck, false, true); // w3 错
advance(deck);
// queue: w4,w1,w2,w3
submit(deck, false, true); // w4 错
advance(deck);
// queue: w1,w2,w3,w4  (review 组 misses 全为1，稳定)
assert(deck.queue.map((c) => c.wineId).join(",") === "w1,w2,w3,w4", "四张全错一次后按稳定顺序复习");

// w1 这次答对 → 退出队列
submit(deck, true, true);
advance(deck);
assert(deck.queue.map((c) => c.wineId).join(",") === "w2,w3,w4", "w1 答对后退出队列");
assert(deck.solved === 1 && !deck.finished, "已掌握计数 +1，未结束");

// w2 再次答错（连续第2次）→ misses=2，应插到复习组最前
submit(deck, false, true);
advance(deck);
// w3(1), w4(1), w2(2) → 排序后 w2 最前
assert(deck.queue.map((c) => c.wineId).join(",") === "w2,w3,w4", "重复出错 w2 排到复习队列最前");
assert(deck.queue[0].misses === 2, "w2 连错次数为 2");

// 全部答对直到清空
for (const expected of ["w2", "w3", "w4"]) {
  assert(deck.queue[0].wineId === expected, `下一张是 ${expected}`);
  submit(deck, true, true);
  advance(deck);
}
assert(deck.finished && deck.solved === 4, "全部答对后本轮结束，solved=4");

// 场景 2：只选产区对、品种错 算答错
const d2 = buildDeck();
submit(d2, true, false);
assert(d2.queue[0].wasCorrect === false, "产区对品种错判为错误");

if (failures > 0) {
  console.error(`\n${failures} 个断言失败`);
  process.exit(1);
}
console.log("\n全部逻辑测试通过");
