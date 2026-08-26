import { LunarUtil, Solar } from 'lunar-javascript';

export type HourOption =
  | 'zi_early' | 'chou' | 'yin' | 'mao' | 'chen' | 'si' | 'wu'
  | 'wei' | 'shen' | 'you' | 'xu' | 'hai' | 'zi_late' | 'unknown';
export type Focus = 'energy' | 'strength' | 'relationship' | 'overall';
export type Effective = 'clarity' | 'autonomy' | 'coordination' | 'progress';
export type Overload = 'start_delay' | 'over_response' | 'cognitive_carryover' | 'input_fatigue';
export type Channel = 'input' | 'output' | 'result' | 'rule' | 'peer';

export type FormData = {
  year: string;
  month: string;
  day: string;
  hour: HourOption | '';
  focus: Focus | '';
  effective: Effective | '';
  overload: Overload | '';
};

export type BaseToneReport = {
  productName: string;
  contentVersion: string;
  mode: 'structural_candidate' | 'fallback';
  title: string;
  subtitle: string;
  coreDescription: string;
  effectiveCondition: string;
  overloadSignal: string;
  observationQuestion: string;
  boundaryNote: string;
  fullReportBridge: string;
  imageKey: string;
};

const HOUR_RANGES: Record<Exclude<HourOption, 'unknown'>, [[number, number], [number, number]]> = {
  zi_early: [[0, 0], [0, 59]], chou: [[1, 0], [2, 59]], yin: [[3, 0], [4, 59]],
  mao: [[5, 0], [6, 59]], chen: [[7, 0], [8, 59]], si: [[9, 0], [10, 59]],
  wu: [[11, 0], [12, 59]], wei: [[13, 0], [14, 59]], shen: [[15, 0], [16, 59]],
  you: [[17, 0], [18, 59]], xu: [[19, 0], [20, 59]], hai: [[21, 0], [22, 59]],
  zi_late: [[23, 0], [23, 59]],
};

const TEN_GOD_GROUP: Record<string, Channel> = {
  比肩: 'peer', 劫财: 'peer', 食神: 'output', 伤官: 'output',
  偏财: 'result', 正财: 'result', 七杀: 'rule', 正官: 'rule', 偏印: 'input', 正印: 'input',
};

const SEASON_BY_MONTH: Record<string, 'spring' | 'summer' | 'autumn' | 'winter'> = {
  寅: 'spring', 卯: 'spring', 辰: 'spring', 巳: 'summer', 午: 'summer', 未: 'summer',
  申: 'autumn', 酉: 'autumn', 戌: 'autumn', 亥: 'winter', 子: 'winter', 丑: 'winter',
};

const TITLES: Record<'spring' | 'summer' | 'autumn' | 'winter', Record<Channel, string>> = {
  spring: { input: '雨前的土壤', output: '抽枝的新柳', result: '向阳的苗圃', rule: '分畦的春田', peer: '并生的竹影' },
  summer: { input: '树荫下的深井', output: '穿林的长风', result: '盛夏的果园', rule: '清楚的河岸', peer: '相接的树冠' },
  autumn: { input: '收声的谷仓', output: '出谷的清风', result: '成熟的稻穗', rule: '清晰的山脊', peer: '并行的雁阵' },
  winter: { input: '雪下的泉眼', output: '冬夜里的篝火', result: '封存的种子', rule: '结冰的河岸', peer: '围炉的灯影' },
};

const FALLBACK_TITLES = {
  spring: '雨后的新芽', summer: '午后的树荫', autumn: '收束的河谷', winter: '雪下的水流',
};

const CHANNEL_COPY: Record<Channel, string> = {
  input: '面对新任务或复杂信息时，你更容易先为信息建立位置，再决定怎样回应。先理解并不等于迟缓，它是在为后续判断准备一个稳定的框架。',
  output: '当想法能够进入表达、试做或成果雏形时，你更容易把状态组织起来。对你而言，看见一个东西正在形成，常比长时间停留在设想里更有抓力。',
  result: '当任务有清楚对象、具体步骤或可见结果时，你更容易找到投入的抓手。抽象目标一旦落到可以处理的对象，注意力也更容易聚拢。',
  rule: '当标准、责任和完成边界清楚时，你更容易形成行动秩序。明确要求并不只是限制，也能帮助你判断什么需要承担、什么可以停下。',
  peer: '当你能够参与、对照或与他人形成共同节奏时，更容易确认自己的位置与力度。有效的互动给你参照，但参照并不等于把决定交给别人。',
};

const EFFECTIVE_COPY: Record<Effective, { body: string; short: string }> = {
  clarity: { body: '方向清楚、优先级明确时，你更容易把注意力留给真正重要的部分，而不是在多个入口之间来回切换。', short: '清楚的方向与优先级' },
  autonomy: { body: '拥有执行方式和节奏的决定空间时，你更容易进入持续状态；同一目标下，方法上的余地会明显影响投入质量。', short: '可以自主安排方法与节奏' },
  coordination: { body: '角色配合、沟通和反馈顺畅时，你更容易稳定推进；你需要的不是持续热闹，而是回应能够帮助事情向前。', short: '角色与反馈彼此清楚' },
  progress: { body: '当进展可见、投入能得到阶段性回声时，你更容易维持力度；模糊的长期目标需要被拆成看得见的节点。', short: '能看见阶段进展' },
};

const OVERLOAD_COPY: Record<Overload, { body: string; short: string }> = {
  start_delay: { body: '当任务入口过多、条件仍不清楚时，最早出现的信号是启动不断后移。此时继续增加计划，未必比先确认一个最小入口更有效。', short: '启动开始不断后移' },
  over_response: { body: '当外部要求持续进入、回应没有结束边界时，你会先失去停下来的位置。真正需要观察的不是回应多少，而是什么时候已经接过了不属于这一轮的部分。', short: '回应已经没有结束边界' },
  cognitive_carryover: { body: '事情已经结束，头脑却仍在反复处理，是你最早能看见的消耗信号。区分“还有新信息”与“只是重复运转”，会比强迫自己放空更具体。', short: '事情结束后仍在重复处理' },
  input_fatigue: { body: '当信息和交流继续增加时，你对输入的耐心会先下降。这个信号不等于拒绝关系，而是在提示当前的处理容量已经接近边界。', short: '对信息和交流的耐心先下降' },
};

const FOCUS_QUESTIONS: Record<Focus, (effective: string, overload: string) => string> = {
  energy: (effective, overload) => `最近一次${overload}时，我是在通过${effective}恢复推进，还是已经越过了需要停下来的临界点？`,
  strength: (effective, overload) => `当我能够依靠${effective}发挥时，优势形成了什么具体结果；而${overload}又最早从哪里出现？`,
  relationship: (effective, overload) => `在一次具体互动中，${effective}是在帮助关系向前，还是我已经出现${overload}却仍继续回应？`,
  overall: (effective, overload) => `当${effective}不再成立时，我是否会先出现${overload}；这两者之间有没有一个可以更早辨认的转折点？`,
};

function sampleTimes(hour: HourOption): [number, number][] {
  if (hour === 'unknown') return [[0, 0], [12, 0], [23, 59]];
  const [start, end] = HOUR_RANGES[hour];
  const middleMinutes = Math.floor(((start[0] * 60 + start[1]) + (end[0] * 60 + end[1])) / 2);
  return [start, [Math.floor(middleMinutes / 60), middleMinutes % 60], end];
}

function calculateAt(year: number, month: number, day: number, hour: number, minute: number, sect: 1 | 2) {
  const lunar = Solar.fromYmdHms(year, month, day, hour, minute, 0).getLunar();
  const eight = lunar.getEightChar();
  eight.setSect(sect);
  return {
    pillars: [eight.getYear(), eight.getMonth(), eight.getDay(), eight.getTime()] as string[],
    dayMaster: eight.getDayGan() as string,
    monthStem: eight.getMonthGan() as string,
    monthBranch: eight.getMonthZhi() as string,
    yearStem: eight.getYearGan() as string,
    hourStem: eight.getTimeGan() as string,
  };
}

function groupFor(dayMaster: string, target: string): Channel {
  return TEN_GOD_GROUP[LunarUtil.SHI_SHEN[dayMaster + target]];
}

function deriveLiteChart(data: FormData) {
  const year = Number(data.year), month = Number(data.month), day = Number(data.day);
  const times = sampleTimes(data.hour as HourOption);
  const samples = times.flatMap(([hour, minute]) => ([1, 2] as const).map(sect => calculateAt(year, month, day, hour, minute, sect)));
  const pillarKeys = new Set(samples.map(item => item.pillars.join('|')));
  const dayMasters = new Set(samples.map(item => item.dayMaster));
  const monthBranches = new Set(samples.map(item => item.monthBranch));
  const ambiguous = data.hour === 'unknown' || pillarKeys.size > 1 || dayMasters.size > 1 || monthBranches.size > 1;
  const primary = samples[3];

  if (ambiguous) {
    const safeMonth = monthBranches.size === 1 ? primary.monthBranch : month <= 3 ? '卯' : month <= 6 ? '午' : month <= 9 ? '酉' : '子';
    return { mode: 'fallback' as const, season: SEASON_BY_MONTH[safeMonth], channel: null };
  }

  const monthMainStem = LunarUtil.ZHI_HIDE_GAN[primary.monthBranch][0] as string;
  const monthGroup = groupFor(primary.dayMaster, monthMainStem);
  const groups = [
    monthGroup,
    groupFor(primary.dayMaster, primary.monthStem),
    groupFor(primary.dayMaster, primary.yearStem),
    groupFor(primary.dayMaster, primary.hourStem),
  ];
  const qualified = groups.filter(group => group === monthGroup).length >= 2;
  return {
    mode: qualified ? 'structural_candidate' as const : 'fallback' as const,
    season: SEASON_BY_MONTH[primary.monthBranch],
    channel: qualified ? monthGroup : null,
  };
}

export function generateReport(data: FormData): BaseToneReport {
  const chart = deriveLiteChart(data);
  const effective = EFFECTIVE_COPY[data.effective as Effective];
  const overload = OVERLOAD_COPY[data.overload as Overload];
  const title = chart.channel ? TITLES[chart.season][chart.channel] : FALLBACK_TITLES[chart.season];
  const core = chart.channel
    ? `${CHANNEL_COPY[chart.channel]}结合你当前选择的状态条件，这条通道更适合被理解为一个可观察的起点，而不是对你的固定定义。`
    : `这次信息不足以形成唯一、稳定的简化结构，因此不把某一种命理解释写成你的固定特征。你的现实选择仍然给出了一个清楚入口：留意自己在什么条件下能够持续，以及消耗最早从哪里出现。`;

  return {
    productName: '识己 · 底色',
    contentVersion: '1.0',
    mode: chart.mode,
    title,
    subtitle: '一张关于你如何进入状态、又在何时开始消耗的观察卡',
    coreDescription: core,
    effectiveCondition: effective.body,
    overloadSignal: overload.body,
    observationQuestion: FOCUS_QUESTIONS[data.focus as Focus](effective.short, overload.short),
    boundaryNote: chart.mode === 'structural_candidate'
      ? '这张卡使用简化出生结构与三项现实选择，提供一个可以继续验证的观察入口；它不等同于完整命盘研判，也不替你定义自己。'
      : '由于当前时辰或历法边界不足以形成唯一结构，本次主要依据季节意象和你选择的现实状态生成观察入口，不作完整命盘判断。',
    fullReportBridge: '如果你还想进一步理解：这种运转方式怎样形成、不同维度如何互相影响，以及你当前处在什么阶段，《识己 · 自我认知地图》会在完整资料和双体系研判的基础上继续展开。',
    imageKey: `${chart.season}-${chart.channel ?? 'fallback'}`,
  };
}

export function daysInMonth(year: number, month: number) {
  if (!year || !month) return 31;
  return new Date(year, month, 0).getDate();
}
