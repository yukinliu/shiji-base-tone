import { LunarUtil, Solar } from 'lunar-javascript';

export type HourOption =
  | 'zi_early' | 'chou' | 'yin' | 'mao' | 'chen' | 'si' | 'wu'
  | 'wei' | 'shen' | 'you' | 'xu' | 'hai' | 'zi_late' | 'unknown';
export type Focus = 'energy' | 'strength' | 'relationship' | 'overall';
export type Effective = 'clarity' | 'autonomy' | 'coordination' | 'progress';
export type Overload = 'start_delay' | 'over_response' | 'cognitive_carryover' | 'input_fatigue';
export type Channel = 'input' | 'output' | 'result' | 'rule' | 'peer';
export type Element = 'wood' | 'fire' | 'earth' | 'metal' | 'water';

export type FormData = {
  year: string;
  month: string;
  day: string;
  hour: HourOption | '';
  focus: Focus | '';
  effective: Effective[];
  overload: Overload[];
};

export type BaseToneReport = {
  productName: string;
  contentVersion: string;
  poeticTitle: string;
  poeticLine: string;
  dayPillar: string;
  monthCommand: string;
  mainAxisTitle: string;
  mainAxisSummary: string;
  originalChart: string;
  adjustment: string;
  expandCondition: string;
  obstruction: string;
  adjustmentPath: string;
  onlineReality: string;
  overloadReality: string;
  observation: string;
  dayElement: Element;
  dayPolarity: 'yang' | 'yin';
  dayBranchIndex: number;
  season: 'spring' | 'summer' | 'autumn' | 'winter';
};

type Strength = 'strong' | 'balanced' | 'weak';

const STEM_ELEMENT: Record<string, Element> = {
  甲: 'wood', 乙: 'wood', 丙: 'fire', 丁: 'fire', 戊: 'earth', 己: 'earth',
  庚: 'metal', 辛: 'metal', 壬: 'water', 癸: 'water',
};
const STEM_POLARITY: Record<string, 'yang' | 'yin'> = {
  甲: 'yang', 乙: 'yin', 丙: 'yang', 丁: 'yin', 戊: 'yang', 己: 'yin',
  庚: 'yang', 辛: 'yin', 壬: 'yang', 癸: 'yin',
};
const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const PRODUCES: Record<Element, Element> = { wood: 'fire', fire: 'earth', earth: 'metal', metal: 'water', water: 'wood' };
const CONTROLS: Record<Element, Element> = { wood: 'earth', earth: 'water', water: 'fire', fire: 'metal', metal: 'wood' };

const HOUR_MIDDLE: Record<Exclude<HourOption, 'unknown'>, [number, number]> = {
  zi_early: [0, 30], chou: [2, 0], yin: [4, 0], mao: [6, 0], chen: [8, 0], si: [10, 0],
  wu: [12, 0], wei: [14, 0], shen: [16, 0], you: [18, 0], xu: [20, 0], hai: [22, 0], zi_late: [23, 30],
};

const TEN_GOD_GROUP: Record<string, Channel> = {
  比肩: 'peer', 劫财: 'peer', 食神: 'output', 伤官: 'output', 偏财: 'result', 正财: 'result',
  七杀: 'rule', 正官: 'rule', 偏印: 'input', 正印: 'input',
};
const CHANNEL_ZH: Record<Channel, string> = {
  input: '印星', output: '食伤', result: '财星', rule: '官杀', peer: '比劫',
};
const SEASON_BY_MONTH: Record<string, BaseToneReport['season']> = {
  寅: 'spring', 卯: 'spring', 辰: 'spring', 巳: 'summer', 午: 'summer', 未: 'summer',
  申: 'autumn', 酉: 'autumn', 戌: 'autumn', 亥: 'winter', 子: 'winter', 丑: 'winter',
};

const STEM_IMAGE: Record<string, string> = {
  甲: '乔木', 乙: '藤蔓', 丙: '朝阳', 丁: '灯火', 戊: '山丘', 己: '田园',
  庚: '岩刃', 辛: '清露', 壬: '长河', 癸: '微雨',
};
const BRANCH_IMAGE: Record<string, string> = {
  子: '夜潮', 丑: '冻土', 寅: '初林', 卯: '花径', 辰: '云野', 巳: '暖谷',
  午: '日原', 未: '晚坡', 申: '风岭', 酉: '清庭', 戌: '暮原', 亥: '深河',
};
const SEASON_LINE: Record<BaseToneReport['season'], string> = {
  spring: '新意正在生长，也需要一处能让力量扎根的地方。',
  summer: '光与热推动事物展开，节奏决定这份力量能走多远。',
  autumn: '清晰来自取舍；留下真正重要的，力量才会聚拢。',
  winter: '表面安静时，内部仍有水流；支点让积累重新向前。',
};

const EFFECTIVE_LABEL: Record<Effective, string> = {
  clarity: '方向清楚', autonomy: '有自主空间', coordination: '配合顺畅', progress: '进展可见',
};
const OVERLOAD_LABEL: Record<Overload, string> = {
  start_delay: '越来越难启动', over_response: '持续回应、停不下来',
  cognitive_carryover: '事情结束后头脑仍在处理', input_fatigue: '对信息与交流失去耐心',
};

const AXIS_TITLE: Record<Channel, Record<Strength, string>> = {
  input: {
    strong: '让理解形成出口，而不是继续增加准备',
    balanced: '在吸收与表达之间建立自己的节奏',
    weak: '先形成内部支点，再处理复杂信息',
  },
  output: {
    strong: '让表达获得承接，使能力形成结果',
    balanced: '在形成想法与落地结果之间保持流动',
    weak: '先稳住承载，再让能力向外展开',
  },
  result: {
    strong: '把现实推动力放进清楚的边界',
    balanced: '在投入、交换与成果之间分配力量',
    weak: '先确认承载，再接住具体目标与结果',
  },
  rule: {
    strong: '让秩序服务于判断，而不是扩大压力',
    balanced: '在责任、标准与自主行动之间分配力量',
    weak: '先建立支点，再承接规则与责任',
  },
  peer: {
    strong: '让自主力量拥有出口与协作边界',
    balanced: '在自我推进与共同节奏之间找到位置',
    weak: '借助可靠支点，形成自己的推进节奏',
  },
};

const CHANNEL_FUNCTION: Record<Channel, { effective: string; overload: string; need: string }> = {
  input: {
    effective: '你擅长先吸收、辨别和组织信息，再形成判断。复杂度增加时，这种先建立内部框架的方式，能帮助你减少仓促反应。',
    overload: '当输入持续增加却没有进入表达或决策，理解会从支点变成滞留：看起来仍在准备，内部却难以真正结束。',
    need: '让已经形成的理解进入一次表达、试做或明确决定',
  },
  output: {
    effective: '你的力量更容易通过表达、创造、拆解或试做被看见。只要有具体对象承接，想法会在行动中逐渐清楚。',
    overload: '当输出不断发生，却缺少结果、反馈或可停下的节点，能力会变成持续外放，内部承载也随之变薄。',
    need: '为输出设置对象、完成标准和回收反馈的节点',
  },
  result: {
    effective: '你更容易通过具体对象、资源安排和可见成果组织行动。目标一旦可处理，投入就不再停留在抽象层面。',
    overload: '当目标和责任继续增加、承载却没有同步补上，你仍可能维持推进，但会越来越依赖即时处理和个人补位。',
    need: '先核对可用时间、权限和资源，再决定要承接多少',
  },
  rule: {
    effective: '你对标准、责任和秩序较敏感。边界清楚时，这种敏感会成为判断优先级和稳定交付的能力。',
    overload: '当责任先落下、权限和结束条件却不清楚时，秩序感会转成持续自我要求：事情能够完成，压力却难以退出。',
    need: '把责任、权限与完成边界放回同一张清单',
  },
  peer: {
    effective: '你有较强的主体推进倾向，需要通过参与、比较或协作确认自己的位置。空间清楚时，这会形成稳定的自主行动。',
    overload: '当资源边界和角色位置变得模糊，主体力量容易转成反复较劲、独自承担，或在多人节奏中难以收束。',
    need: '先分清自己的决定、共同决定和不由自己承担的部分',
  },
};

const FOCUS_SCENE: Record<Focus, { online: string; overload: string }> = {
  energy: { online: '投入与恢复之间', overload: '能量开始改变的最早一刻' },
  strength: { online: '能力形成具体成果时', overload: '优势开始转为代价的位置' },
  relationship: { online: '合作或关系互动中', overload: '责任和回应开始失去边界的位置' },
  overall: { online: '一段完整的工作或生活循环里', overload: '原有节奏最先失去比例的位置' },
};

function isProducer(candidate: Element, target: Element) {
  return PRODUCES[candidate] === target;
}

function channelFor(dayMaster: string, targetStem: string): Channel {
  return TEN_GOD_GROUP[LunarUtil.SHI_SHEN[dayMaster + targetStem]] ?? 'peer';
}

function calculateChart(data: FormData) {
  const [hour, minute] = data.hour === 'unknown' ? [12, 0] : HOUR_MIDDLE[data.hour as Exclude<HourOption, 'unknown'>];
  const lunar = Solar.fromYmdHms(Number(data.year), Number(data.month), Number(data.day), hour, minute, 0).getLunar();
  const eight = lunar.getEightChar();
  eight.setSect(2);
  const pillars = [eight.getYear(), eight.getMonth(), eight.getDay(), eight.getTime()] as string[];
  const stems = pillars.map(item => item.slice(0, 1));
  const branches = pillars.map(item => item.slice(1, 2));
  return { pillars, stems, branches, dayMaster: stems[2], monthBranch: branches[1] };
}

function strengthOf(dayMaster: string, stems: string[], branches: string[]): { level: Strength; roots: number; seal: number } {
  const dayElement = STEM_ELEMENT[dayMaster];
  let support = 0;
  let drain = 0;
  let roots = 0;
  let seal = 0;
  const inspect = (stem: string, weight: number) => {
    const element = STEM_ELEMENT[stem];
    if (!element) return;
    if (element === dayElement) { support += weight; roots += weight; return; }
    if (isProducer(element, dayElement)) { support += weight * 0.85; seal += weight; return; }
    if (PRODUCES[dayElement] === element) drain += weight * 0.75;
    else if (CONTROLS[dayElement] === element) drain += weight * 0.9;
    else if (CONTROLS[element] === dayElement) drain += weight;
  };
  stems.forEach((stem, index) => { if (index !== 2) inspect(stem, index === 1 ? 1.25 : 1); });
  branches.forEach((branch, branchIndex) => {
    const hidden = (LunarUtil.ZHI_HIDE_GAN[branch] ?? []) as string[];
    hidden.forEach((stem, hiddenIndex) => inspect(stem, branchIndex === 1 ? (hiddenIndex === 0 ? 2.8 : 1.15) : (hiddenIndex === 0 ? 1.35 : .55)));
  });
  const difference = support - drain;
  return { level: difference > 1.75 ? 'strong' : difference < -1.75 ? 'weak' : 'balanced', roots: Math.round(roots), seal: Math.round(seal) };
}

function allChannels(dayMaster: string, stems: string[], branches: string[]) {
  const channels = new Set<Channel>();
  stems.forEach((stem, index) => { if (index !== 2) channels.add(channelFor(dayMaster, stem)); });
  branches.forEach(branch => ((LunarUtil.ZHI_HIDE_GAN[branch] ?? []) as string[]).forEach(stem => channels.add(channelFor(dayMaster, stem))));
  return channels;
}

function patternSupport(channel: Channel, channels: Set<Channel>, strength: Strength) {
  if (channel === 'input') return channels.has('output') ? '原局同时存在把理解转为表达的出口' : '理解与准备较多，向外形成结果的通道需要被主动建立';
  if (channel === 'output') return channels.has('result') ? '输出之后有现实对象与结果承接' : '表达和能力存在，但成果承接与结束标准不够清楚';
  if (channel === 'result') return strength !== 'weak' ? '主体具备承接目标与资源的基础' : '现实目标较清楚，但承载条件需要先被补足';
  if (channel === 'rule') return channels.has('input') ? '责任与标准能够通过理解、凭据和方法得到承接' : '外部标准较清楚，内部方法与缓冲需要主动建立';
  return channels.has('output') ? '主体力量能够通过行动或表达向外流动' : '自主力量较集中，需要明确出口与资源边界';
}

function joinLabels<T extends string>(values: T[], labels: Record<T, string>) {
  return values.map(value => labels[value]).join('、');
}

export function generateReport(data: FormData): BaseToneReport {
  const chart = calculateChart(data);
  const { stems, branches, dayMaster, monthBranch, pillars } = chart;
  const dayElement = STEM_ELEMENT[dayMaster] ?? 'earth';
  const dayPolarity = STEM_POLARITY[dayMaster] ?? 'yang';
  const dayPillar = pillars[2];
  const monthHidden = (LunarUtil.ZHI_HIDE_GAN[monthBranch] ?? []) as string[];
  const monthMainStem = monthHidden[0];
  const visibleStems = [stems[0], stems[1], stems[3]];
  const revealedStem = monthHidden.find(stem => visibleStems.includes(stem));
  const patternStem = revealedStem ?? monthMainStem;
  const tenGod = LunarUtil.SHI_SHEN[dayMaster + patternStem] ?? '比肩';
  const channel = channelFor(dayMaster, patternStem);
  const strength = strengthOf(dayMaster, stems, branches);
  const channels = allChannels(dayMaster, stems, branches);
  const season = SEASON_BY_MONTH[monthBranch] ?? 'spring';
  const support = patternSupport(channel, channels, strength.level);
  const patternName = channel === 'peer' ? `${tenGod}当令` : `${tenGod}格候选`;
  const revealText = revealedStem ? `${monthBranch}月藏干中的${revealedStem}${tenGod}透出，主轴能够在原局表层被看见` : `${monthBranch}月以${monthMainStem}为本气，但月令主轴没有直接透出，更多通过具体情境显现`;
  const rootText = strength.roots >= 3 ? '根气较明确，内部支点能够参与承载' : strength.roots > 0 ? '原局有根，但支点并非在所有场景都同样稳定' : '可直接使用的根气有限，承载更依赖印星、环境支持与清楚边界';
  const balanceText = strength.level === 'strong'
    ? '日主在原局中偏有力量，重点不是继续增加推动，而是为已有力量安排出口与边界'
    : strength.level === 'weak'
      ? '日主承载偏紧，重点是先增加支点、信息与可控范围，再扩大输出或责任'
      : '日主在中和附近，真正影响状态的是不同力量能否按顺序衔接，而非单纯增减某一种特质';
  const supportCount = [channel === 'output' && channels.has('result'), channel === 'rule' && channels.has('input'), channel === 'input' && channels.has('output'), channel === 'peer' && channels.has('output'), channel === 'result' && strength.level !== 'weak'].filter(Boolean).length;
  const statusText = supportCount ? '已经具备一部分成立与流通条件' : '主轴存在，但成立所需的承接条件并不完整';
  const effectiveCalibration = joinLabels(data.effective, EFFECTIVE_LABEL);
  const overloadCalibration = joinLabels(data.overload, OVERLOAD_LABEL);
  const scene = FOCUS_SCENE[data.focus as Focus];
  const functionCopy = CHANNEL_FUNCTION[channel];

  return {
    productName: '识己 · 底色',
    contentVersion: '2.0',
    poeticTitle: `${BRANCH_IMAGE[dayPillar.slice(1)] ?? '原野'}里的${STEM_IMAGE[dayMaster] ?? '微光'}`,
    poeticLine: SEASON_LINE[season],
    dayPillar,
    monthCommand: monthBranch,
    mainAxisTitle: AXIS_TITLE[channel][strength.level],
    mainAxisSummary: `${CHANNEL_ZH[channel]}是这张原局中较清楚的组织力量。它决定的不是固定性格，而是你更容易从哪里调动力量，以及这份力量需要什么条件才能持续。`,
    originalChart: `原局以${monthBranch}月为令，${revealText}，因此以“${patternName}”作为简化观察入口。这个结构${statusText}：${support}。条件顺畅时，${functionCopy.effective}条件受阻时，问题通常不是没有能力，而是能力难以进入合适的承接位置。`,
    adjustment: `${balanceText}。从根气与承载看，${rootText}。原局真正需要调节的，是“${CHANNEL_ZH[channel]}持续运转”与“现实承接条件”之间的比例；有效的救应不是压住原有倾向，而是${functionCopy.need}。`,
    expandCondition: `${functionCopy.effective}在${scene.online}，如果对象、边界和反馈能够彼此对应，这条主轴更容易表现为稳定能力，而不是短时用力。你选择的“${effectiveCalibration}”可以作为现实校准：观察它们是否确实让上述结构更顺畅。`,
    obstruction: `${functionCopy.overload}阻滞并不等同于能力不足；更常见的情况是，外在任务仍在推进，内部却需要持续调用同一种资源，直到恢复、判断或边界其中一项先退出。`,
    adjustmentPath: `当${scene.overload}出现时，先${functionCopy.need}，再决定是否继续扩大投入。对这张原局而言，提前恢复结构条件，比在消耗之后单纯要求自己坚持更有效。`,
    onlineReality: `状态在线时，你会更自然地使用${CHANNEL_ZH[channel]}所代表的功能，把${scene.online}的复杂信息组织成可以继续推进的动作。可验证的重点不是“有没有做到”，而是过程中是否仍保有判断、停止和调整的空间。`,
    overloadReality: `你选择的“${overloadCalibration}”是这次现实校准提供的早期信号。把它与原局交叉来看，值得留意的不是信号本身，而是信号出现之前，${CHANNEL_ZH[channel]}是否已经连续工作太久，却没有得到${functionCopy.need}这一条件。`,
    observation: `接下来一周，可以留意${scene.online}的一次具体情境：当“${effectiveCalibration}”出现时，你的判断、表达或行动怎样发生变化？当“${overloadCalibration}”最早出现时，原局需要的承接条件又是从哪一步开始缺位的？`,
    dayElement,
    dayPolarity,
    dayBranchIndex: Math.max(0, BRANCHES.indexOf(dayPillar.slice(1))),
    season,
  };
}

export function daysInMonth(year: number, month: number) {
  if (!year || !month) return 31;
  return new Date(year, month, 0).getDate();
}
