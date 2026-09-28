// 盲品题卡数据。
// 关键约束：clues 中只允许出现颜色 / 酸度 / 单宁 / 酒体 / 酒精度 / 结构线索，
// 绝不能出现品种名或典型香气词——答案信息（品种、酒款、典型香气）只能在作答后揭晓。

export type WineKind = "red" | "white" | "sweet";

export interface WineRegion {
  id: string;
  name: string;
  country: string;
  blurb: string;
}

export interface WineClues {
  color: string;
  acidity: string;
  tannin: string;
  body: string;
  alcohol: string;
  /** 纯结构 / 陈年线索，不含品种与香气信息 */
  structure: string;
}

export interface WineCard {
  id: string;
  regionId: string;
  /** 酒款名称，作答后才揭晓（部分酒款名含品种，故不能提前露出） */
  wine: string;
  /** 正确答案：葡萄品种 */
  variety: string;
  kind: WineKind;
  clues: WineClues;
  /** 作答后揭晓的典型香气 */
  aromas: string[];
  /** 作答后揭晓的品鉴说明 */
  note: string;
}

export const REGIONS: WineRegion[] = [
  {
    id: "bordeaux",
    name: "波尔多",
    country: "法国",
    blurb: "以混酿闻名：左岸赤霞珠主导，右岸梅洛为王，还有苏玳贵腐甜白。",
  },
  {
    id: "burgundy",
    name: "勃艮第",
    country: "法国",
    blurb: "黑皮诺与霞多丽的圣地，强调风土、优雅与瓶陈发展。",
  },
  {
    id: "napa",
    name: "纳帕谷",
    country: "美国 · 加州",
    blurb: "阳光充沛，果实成熟度高，风格浓郁、新橡木与高酒精度是标志。",
  },
  {
    id: "rioja",
    name: "里奥哈",
    country: "西班牙",
    blurb: "丹魄王国，美国橡木桶长期陈酿带来香草与椰子气息。",
  },
  {
    id: "alsace",
    name: "阿尔萨斯",
    country: "法国",
    blurb: "芳香型白葡萄品种走廊，雷司令与琼瑶浆风格对比鲜明。",
  },
  {
    id: "piedmont",
    name: "皮埃蒙特",
    country: "意大利",
    blurb: "内比奥罗成就巴罗洛，巴贝拉高酸低单宁，莫斯卡托甜美低酒精度。",
  },
];

export const CARDS: WineCard[] = [
  // ── 波尔多 ──────────────────────────────────────────────
  {
    id: "bx-cab",
    regionId: "bordeaux",
    wine: "波尔多左岸红葡萄酒",
    variety: "赤霞珠",
    kind: "red",
    clues: {
      color: "深宝石红，边缘带紫",
      acidity: "中高",
      tannin: "高，紧实抓口",
      body: "饱满",
      alcohol: "中高",
      structure: "结构紧实、单宁硬朗，需要多年陈年才会柔化。",
    },
    aromas: ["黑醋栗", "雪松", "铅笔芯"],
    note: "左岸以赤霞珠为主导调配，高单宁与黑加仑果香是其骨架。",
  },
  {
    id: "bx-merlot",
    regionId: "bordeaux",
    wine: "波尔多右岸红葡萄酒",
    variety: "梅洛",
    kind: "red",
    clues: {
      color: "深宝石红，紫边较少",
      acidity: "中等",
      tannin: "中高，比左岸圆润",
      body: "饱满",
      alcohol: "中高",
      structure: "口感圆润柔顺，单宁温和，比左岸更早适饮。",
    },
    aromas: ["李子", "黑樱桃", "薄荷"],
    note: "右岸（圣埃美隆、波美侯）以梅洛为主，单宁柔和、果味丰盈。",
  },
  {
    id: "bx-sauternes",
    regionId: "bordeaux",
    wine: "苏玳贵腐甜白葡萄酒",
    variety: "赛美蓉",
    kind: "sweet",
    clues: {
      color: "金黄至琥珀色",
      acidity: "高，与甜度形成平衡",
      tannin: "无",
      body: "饱满甜润",
      alcohol: "中等",
      structure: "葡萄在藤上失水浓缩，糖分极高，全靠明亮酸度撑起，余味悠长。",
    },
    aromas: ["杏脯", "蜂蜜", "蜂蜡", "贵腐"],
    note: "苏玳以赛美蓉为主，混入长相思等品种，贵腐菌赋予浓缩甜感。",
  },
  {
    id: "bx-sb",
    regionId: "bordeaux",
    wine: "佩萨克-雷奥良干白葡萄酒",
    variety: "长相思",
    kind: "white",
    clues: {
      color: "浅柠檬黄",
      acidity: "高",
      tannin: "无",
      body: "中等，略厚重",
      alcohol: "中等",
      structure: "常经橡木桶发酵，比一般清爽白酒多一层厚度与烟熏感。",
    },
    aromas: ["青草", "柑橘", "西柚", "燧石"],
    note: "波尔多干白以长相思为主，常混入赛美蓉增加酒体圆润度。",
  },

  // ── 勃艮第 ──────────────────────────────────────────────
  {
    id: "bg-pn",
    regionId: "burgundy",
    wine: "勃艮第村级红葡萄酒",
    variety: "黑皮诺",
    kind: "red",
    clues: {
      color: "浅至中宝石红，边缘偏砖红",
      acidity: "高",
      tannin: "低至中，质地细腻",
      body: "中等",
      alcohol: "中等",
      structure: "口感丝滑，颜色偏浅却结构清晰，瓶陈后出现咸鲜陈年风味。",
    },
    aromas: ["红樱桃", "草莓", "蘑菇", "湿叶"],
    note: "勃艮第是黑皮诺的故乡，优雅、高酸与红色果香是其签名。",
  },
  {
    id: "bg-chard",
    regionId: "burgundy",
    wine: "勃艮第村级白葡萄酒",
    variety: "霞多丽",
    kind: "white",
    clues: {
      color: "浅金黄",
      acidity: "中高",
      tannin: "无",
      body: "中等至饱满",
      alcohol: "中等",
      structure: "常经橡木桶与苹果酸乳酸发酵，口感比一般清爽白酒圆润饱满。",
    },
    aromas: ["柠檬", "黄油", "烤面包", "榛子"],
    note: "从夏布利到 Côte de Beaune，勃艮第是霞多丽的标杆产区。",
  },
  {
    id: "bg-ali",
    regionId: "burgundy",
    wine: "勃艮第阿里高特白葡萄酒",
    variety: "阿里高特",
    kind: "white",
    clues: {
      color: "浅柠檬黄",
      acidity: "高，锋利直接",
      tannin: "无",
      body: "轻至中等",
      alcohol: "中等",
      structure: "不经橡木桶，风格简单直接，口感清冽解渴。",
    },
    aromas: ["青苹果", "柠檬花", "燧石"],
    note: "阿里高特是勃艮第传统配角白品种，酸度锋利、果味清新。",
  },

  // ── 纳帕谷 ──────────────────────────────────────────────
  {
    id: "napa-cab",
    regionId: "napa",
    wine: "纳帕谷赤霞珠红葡萄酒",
    variety: "赤霞珠",
    kind: "red",
    clues: {
      color: "深紫黑，几乎不透光",
      acidity: "中等",
      tannin: "高，丰厚带甜感",
      body: "饱满",
      alcohol: "高",
      structure: "果实成熟度高，新橡木比例大，单宁厚重而酒精度突出。",
    },
    aromas: ["黑醋栗", "黑樱桃", "薄荷", "香草"],
    note: "纳帕赤霞珠成熟浓郁、单宁丰厚，是加州葡萄酒的名片。",
  },
  {
    id: "napa-merlot",
    regionId: "napa",
    wine: "纳帕谷梅洛红葡萄酒",
    variety: "梅洛",
    kind: "red",
    clues: {
      color: "深宝石红",
      acidity: "中等",
      tannin: "中等，柔软",
      body: "饱满",
      alcohol: "中高",
      structure: "果味成熟、入口柔顺，常以单一品种装瓶。",
    },
    aromas: ["黑莓", "李子", "巧克力"],
    note: "加州梅洛成熟柔软，常单品装瓶，口感比波尔多右岸更外放。",
  },
  {
    id: "napa-chard",
    regionId: "napa",
    wine: "纳帕谷霞多丽白葡萄酒",
    variety: "霞多丽",
    kind: "white",
    clues: {
      color: "中等至深金黄",
      acidity: "中等",
      tannin: "无",
      body: "饱满油润",
      alcohol: "中高",
      structure: "重度橡木桶与搅桶处理，酒体丰满、口感油润。",
    },
    aromas: ["熟苹果", "菠萝", "黄油", "香草"],
    note: "纳帕霞多丽以浓郁橡木桶风格著称，与夏布利形成鲜明对比。",
  },
  {
    id: "napa-zin",
    regionId: "napa",
    wine: "纳帕谷老藤红葡萄酒",
    variety: "仙粉黛",
    kind: "red",
    clues: {
      color: "深紫红",
      acidity: "中等",
      tannin: "中高",
      body: "饱满",
      alcohol: "高",
      structure: "老藤果实浓缩，酒精度高，口感甜润奔放。",
    },
    aromas: ["黑莓酱", "葡萄干", "黑胡椒"],
    note: "仙粉黛是加州标志性红品种，老藤酒浓郁、高酒精度。",
  },

  // ── 里奥哈 ──────────────────────────────────────────────
  {
    id: "rj-temp",
    regionId: "rioja",
    wine: "里奥哈珍藏（Reserva）红葡萄酒",
    variety: "丹魄",
    kind: "red",
    clues: {
      color: "石榴红，边缘带砖红",
      acidity: "中高",
      tannin: "中高，已被陈年柔化",
      body: "中等至饱满",
      alcohol: "中等",
      structure: "在橡木桶中经长期陈年，单宁被时间打磨得顺滑。",
    },
    aromas: ["香草", "椰子", "熟李子", "皮革"],
    note: "丹魄是里奥哈的支柱，美国橡木桶赋予标志性的香草椰子香。",
  },
  {
    id: "rj-gra",
    regionId: "rioja",
    wine: "里奥哈歌海娜红葡萄酒",
    variety: "歌海娜",
    kind: "red",
    clues: {
      color: "中等石榴红",
      acidity: "中低",
      tannin: "中等",
      body: "饱满",
      alcohol: "高",
      structure: "高酒精度、口感圆润柔和，红色果味充沛。",
    },
    aromas: ["草莓酱", "红樱桃", "甘草"],
    note: "歌海娜在里奥哈常作调配，单品酒成熟圆润、酒精度高。",
  },
  {
    id: "rj-viura",
    regionId: "rioja",
    wine: "里奥哈白葡萄酒",
    variety: "维奥娜",
    kind: "white",
    clues: {
      color: "浅柠檬黄",
      acidity: "中高",
      tannin: "无",
      body: "中等",
      alcohol: "中等",
      structure: "传统做法经短时橡木桶陈酿，收尾微带一丝苦味。",
    },
    aromas: ["白桃", "柑橘", "野花"],
    note: "维奥娜（Macabeo）是里奥哈传统白品种，清新带花香。",
  },

  // ── 阿尔萨斯 ──────────────────────────────────────────────
  {
    id: "al-riesling",
    regionId: "alsace",
    wine: "阿尔萨斯雷司令白葡萄酒",
    variety: "雷司令",
    kind: "white",
    clues: {
      color: "浅柠檬黄带绿",
      acidity: "高，清爽利落",
      tannin: "无",
      body: "轻至中等",
      alcohol: "中等",
      structure: "几乎不用新橡木，矿物感突出，瓶陈后会出现陈年香。",
    },
    aromas: ["青柠", "白桃", "燧石", "汽油"],
    note: "阿尔萨斯雷司令干爽高酸、矿物感强，瓶陈后发展出汽油香。",
  },
  {
    id: "al-gw",
    regionId: "alsace",
    wine: "阿尔萨斯琼瑶浆白葡萄酒",
    variety: "琼瑶浆",
    kind: "white",
    clues: {
      color: "深金黄",
      acidity: "低至中",
      tannin: "无",
      body: "饱满油润",
      alcohol: "中高",
      structure: "口感油润丰盈，香气浓度极高，辨识度很强。",
    },
    aromas: ["荔枝", "玫瑰", "丁香", "热带水果"],
    note: "琼瑶浆是阿尔萨斯最芳香的品种，荔枝玫瑰香极具标志性。",
  },
  {
    id: "al-pg",
    regionId: "alsace",
    wine: "阿尔萨斯灰皮诺白葡萄酒",
    variety: "灰皮诺",
    kind: "white",
    clues: {
      color: "深金黄，常带铜色调",
      acidity: "中等",
      tannin: "无",
      body: "饱满",
      alcohol: "中高",
      structure: "口感丰盈、略带一丝咸鲜质感，颜色比一般白酒明显更深。",
    },
    aromas: ["梨", "杏干", "烟熏", "蜂蜜"],
    note: "阿尔萨斯灰皮诺饱满烟熏，与意大利清爽风格的灰皮诺不同。",
  },

  // ── 皮埃蒙特 ──────────────────────────────────────────────
  {
    id: "pm-neb",
    regionId: "piedmont",
    wine: "巴罗洛红葡萄酒",
    variety: "内比奥罗",
    kind: "red",
    clues: {
      color: "浅石榴红，边缘砖红",
      acidity: "高",
      tannin: "高，强劲细密",
      body: "饱满",
      alcohol: "中高",
      structure: "颜色偏浅却单宁极强、酸度明亮，需要极长时间陈年。",
    },
    aromas: ["玫瑰", "酸樱桃", "焦油", "松露"],
    note: "内比奥罗酿成巴罗洛与巴巴莱斯科，高酸高单宁、玫瑰焦油香。",
  },
  {
    id: "pm-bar",
    regionId: "piedmont",
    wine: "巴贝拉·阿斯蒂红葡萄酒",
    variety: "巴贝拉",
    kind: "red",
    clues: {
      color: "深紫红",
      acidity: "高，明亮活泼",
      tannin: "低",
      body: "中等至饱满",
      alcohol: "中等",
      structure: "高酸度搭配很低的单宁，果味充沛、易饮却也耐放。",
    },
    aromas: ["酸樱桃", "李子", "香草"],
    note: "巴贝拉高酸低单宁，是皮埃蒙特产量大、亲和力强的品种。",
  },
  {
    id: "pm-mosc",
    regionId: "piedmont",
    wine: "莫斯卡托·阿斯蒂甜起泡酒",
    variety: "莫斯卡托",
    kind: "sweet",
    clues: {
      color: "浅柠檬黄",
      acidity: "中等",
      tannin: "无",
      body: "轻盈",
      alcohol: "低（约 5%）",
      structure: "微起泡、酒精度明显偏低，口感清新甜美。",
    },
    aromas: ["葡萄", "蜜桃", "橙花"],
    note: "莫斯卡托·阿斯蒂用小粒白麝香酿造，低酒精度甜起泡。",
  },
];

// ── 派生数据与出题工具 ──────────────────────────────────────

export function getRegion(regionId: string): WineRegion {
  const region = REGIONS.find((item) => item.id === regionId);
  if (!region) throw new Error(`未知产区：${regionId}`);
  return region;
}

export function getCard(cardId: string): WineCard {
  const card = CARDS.find((item) => item.id === cardId);
  if (!card) throw new Error(`未知题卡：${cardId}`);
  return card;
}

export function cardsOfRegion(regionId: string): WineCard[] {
  return CARDS.filter((card) => card.regionId === regionId);
}

// 甜白与干白共用白酒干扰项池，红酒单独成池，避免靠颜色直接排除。
function samePool(card: WineCard, candidate: WineCard): boolean {
  const red = (kind: WineKind) => kind === "red";
  return red(card.kind) === red(candidate.kind);
}

// FNV-1a 哈希 + mulberry32，保证同一题卡的选项与选项顺序在任何设备上都稳定。
function hashSeed(text: string): number {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededRandom(seed: number): () => number {
  let value = seed;
  return () => {
    value |= 0;
    value = (value + 0x6d2b79f5) | 0;
    let t = Math.imul(value ^ (value >>> 15), 1 | value);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleWith<T>(items: T[], random: () => number): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** 返回该题卡的 4 个品种选项（含正确答案），顺序稳定随机。 */
export function buildOptions(card: WineCard): string[] {
  const distractors = Array.from(
    new Set(
      CARDS.filter((candidate) => candidate.id !== card.id && samePool(card, candidate)).map(
        (candidate) => candidate.variety,
      ),
    ),
  ).filter((variety) => variety !== card.variety);

  const pick = shuffleWith(distractors, seededRandom(hashSeed(card.id + "|pick"))).slice(0, 3);
  return shuffleWith([card.variety, ...pick], seededRandom(hashSeed(card.id + "|order")));
}

/** 构建一个新区的出题队列（顺序随机，随后会被持久化）。 */
export function buildDeckQueue(regionId: string): string[] {
  const ids = cardsOfRegion(regionId).map((card) => card.id);
  return shuffleWith(ids, seededRandom((Date.now() ^ hashSeed(regionId)) >>> 0));
}
