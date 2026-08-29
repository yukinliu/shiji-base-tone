import { LunarUtil, Solar } from 'lunar-javascript';

export type AnswerKey = 'A' | 'B' | 'C' | 'D';
export type ArchetypeName = '伏羲' | '女娲' | '大禹' | '精卫' | '后羿' | '哪吒';
export type DimensionKey = 'energy' | 'cognition' | 'action' | 'motivation';
export type Focus = DimensionKey | 'overall';
export type HourOption = 'zi_early' | 'chou' | 'yin' | 'mao' | 'chen' | 'si' | 'wu' | 'wei' | 'shen' | 'you' | 'xu' | 'hai' | 'zi_late' | 'unknown';
export type Channel = 'input' | 'output' | 'result' | 'rule' | 'peer';
export type Element = 'wood' | 'fire' | 'earth' | 'metal' | 'water';
export type Season = 'spring' | 'summer' | 'autumn' | 'winter';
type Strength = 'strong' | 'balanced' | 'weak';

export type BirthData = { year: string; month: string; day: string; hour: HourOption | '' };
export type Question = { id: number; text: string; options: Record<AnswerKey, string> };
export type DimensionResult = { key: DimensionKey; label: string; value: number; copy: string };
export type MythReport = {
  productName: string; contentVersion: string; archetype: ArchetypeName; archetypeIndex: number;
  archetypeTitle: string; archetypeLine: string; combinedTitle: string;
  dimensionResults: DimensionResult[]; strongestDimension: DimensionKey; evidence: string[];
  imageryTitle: string; imageryShort: string; imageryLine: string; lifeCopy: string;
  valueChain: string[]; valueSummary: string; coreProposition: string;
  earlySignal: string; observation: string; smallAction: string;
  dayElement: Element; dayPolarity: 'yang' | 'yin'; season: Season; channel: Channel;
  strength: Strength; flowComplete: boolean;
};

export const QUESTIONS: Question[] = [
  { id: 1, text: '连着忙了一周，你最常有的感觉是？', options: { A: '得先抽身出来，把这几天的事在脑子里过一遍', B: '得找人说说话，不然情绪一直堵着', C: '没做完的事一直拽着我，停不下来', D: '反而越忙脑子越清楚，停着才难受' } },
  { id: 2, text: '别人说你太拼，你心里更接近？', options: { A: '我只是看不下去事情在我眼前坏掉', B: '做完了，我才算对自己有个交代', C: '投入进去的时候，我才觉得自己是活着的', D: '我没觉得在拼，只是顺着劲往前走' } },
  { id: 3, text: '事情卡住的时候，最耗你的是什么？', options: { A: '事都压在我这儿，没人能接手', B: '明知该放手，心里就是放不下', C: '该有人顶上的时候，一个都没有', D: '被别人的节奏带着走，我最受不了' } },
  { id: 4, text: '接到一个说不太清的新任务，你会先？', options: { A: '拆成能下手的小块，一块块磨', B: '先找到最要命的那一点', C: '先凭感觉试一把，做着做着就明白了', D: '先弄明白整件事大概是怎么回事' } },
  { id: 5, text: '你一般怎么缓过来？', options: { A: '做成一件像样的事，我才歇得下来', B: '换件完全不相干的事，脑子就松了', C: '一个人待着，让乱的念头自己落下来', D: '和懂我的人待着，不用多解释' } },
  { id: 6, text: '碰到一个没见过又很复杂的事，你最先会？', options: { A: '先试一下，看反馈再说', B: '先看看整体的路数和规律', C: '先想这事会影响到谁', D: '先弄清楚这事该由谁负责' } },
  { id: 7, text: '一个重要的选择，你最后听谁的？', options: { A: '看它会不会伤到我在乎的关系', B: '看这事是不是该我扛', C: '看它是不是我真正认的那件事', D: '看有没有人需要我站出来' } },
  { id: 8, text: '别人给你提意见，你第一个冒出来的念头是？', options: { A: '我是不是哪里没做到位', B: '他到底懂不懂我在坚持什么', C: '他是不是小看我了', D: '他是不是想让我听话' } },
  { id: 9, text: '一堆乱七八糟的东西摆在你面前，你最容易先看见？', options: { A: '哪里不对劲、哪个细节有问题', B: '最要命的是哪一点', C: '有没有别的可能，能不能换个做法', D: '这些东西之间是什么关系' } },
  { id: 10, text: '要开始一件不好做的事，你一般怎么起头？', options: { A: '先找靠谱的人一起，互相有个照应', B: '先干起来，办法路上会自己长出来', C: '先把整条路想清楚，再迈步', D: '先找人聊聊，说着说着就成形了' } },
  { id: 11, text: '一群人一起做事，你通常是？', options: { A: '一觉得不对，就想推翻重来', B: '先看清气氛和谁说了算，再找自己的位置', C: '主动把人拢起来，一起做更快', D: '自己扛着，不太愿意开口求人' } },
  { id: 12, text: '合作里出了分歧，你先做？', options: { A: '把真正的分歧点找出来，再想怎么改', B: '先弄明白对方真正想要什么，再调整说法', C: '借着这次，把分工重新定清楚', D: '一条条对，慢慢把差距磨小' } },
  { id: 13, text: '跟人起冲突，你更容易？', options: { A: '我不想把关系弄僵，先退一步', B: '把谁该干什么，重新说清楚', C: '该我的我先认，别让事情卡在这', D: '把话挑明，尽快有个结果' } },
  { id: 14, text: '有人拖你后腿，你会？', options: { A: '把规矩和权责再立一次', B: '先忍着，一遍遍去磨', C: '当面说开，不绕弯子', D: '不想将就，宁可推翻重来' } },
  { id: 15, text: '什么时候你会觉得一下子来了劲？', options: { A: '有一件非做成不可的事摆在那儿', B: '有人或者有事需要我护着', C: '我觉得自己可以不被原来的框框限制', D: '一堆乱的东西突然在我脑子里理顺了' } },
  { id: 16, text: '说到底，你最想要的是？', options: { A: '关键时候我顶得上，没让人失望', B: '我能按自己的方式活，不用跟谁解释', C: '那些乱糟糟的事，被我理出了头绪', D: '有人是真的懂我，也离不开我' } },
  { id: 17, text: '你更希望自己留下的是哪一种？', options: { A: '有些事因为我，变得没那么难懂了', B: '有一段关系，因为我变得更好了', C: '答应过的事，我都一件件做到了', D: '难走的地方，被我一点点填平了' } },
  { id: 18, text: '回头看的时候，什么会让你觉得踏实？', options: { A: '我一直按自己的心意活，没被推着走', B: '那些想不通的事，我总算想明白了', C: '重要的人一直都在，没有散', D: '我经手的事，没有在我这儿掉链子' } },
];

export const FOCUS_OPTIONS: { value: Focus; title: string; detail: string }[] = [
  { value: 'energy', title: '能量节奏与恢复方式', detail: '看见自己怎样进入状态，又在何时开始消耗。' },
  { value: 'cognition', title: '认知风格与决策习惯', detail: '理解自己怎样形成判断，又容易忽略什么。' },
  { value: 'action', title: '行动模式与协作方式', detail: '观察自己怎样开始、推进和处理分歧。' },
  { value: 'motivation', title: '动力来源与投入条件', detail: '找到真正让自己愿意持续投入的部分。' },
  { value: 'overall', title: '整体都想了解', detail: '暂时没有特定方向，先看完整运行方式。' },
];

const ARCHETYPES: ArchetypeName[] = ['伏羲', '女娲', '大禹', '精卫', '后羿', '哪吒'];
const DIMENSIONS: { key: DimensionKey; label: string; range: [number, number] }[] = [
  { key: 'energy', label: '能量节奏', range: [0, 4] }, { key: 'cognition', label: '认知风格', range: [5, 8] },
  { key: 'action', label: '行动模式', range: [9, 13] }, { key: 'motivation', label: '动力来源', range: [14, 17] },
];
const KEY: Record<number, Record<AnswerKey, ArchetypeName>> = {
  1:{A:'伏羲',B:'女娲',C:'大禹',D:'精卫'},2:{A:'女娲',B:'大禹',C:'精卫',D:'后羿'},3:{A:'大禹',B:'精卫',C:'后羿',D:'哪吒'},
  4:{A:'精卫',B:'后羿',C:'哪吒',D:'伏羲'},5:{A:'后羿',B:'哪吒',C:'伏羲',D:'女娲'},6:{A:'哪吒',B:'伏羲',C:'女娲',D:'大禹'},
  7:{A:'女娲',B:'大禹',C:'精卫',D:'后羿'},8:{A:'大禹',B:'精卫',C:'后羿',D:'哪吒'},9:{A:'精卫',B:'后羿',C:'哪吒',D:'伏羲'},
  10:{A:'后羿',B:'哪吒',C:'伏羲',D:'女娲'},11:{A:'哪吒',B:'伏羲',C:'女娲',D:'大禹'},12:{A:'伏羲',B:'女娲',C:'大禹',D:'精卫'},
  13:{A:'女娲',B:'大禹',C:'精卫',D:'后羿'},14:{A:'大禹',B:'精卫',C:'后羿',D:'哪吒'},15:{A:'精卫',B:'后羿',C:'哪吒',D:'伏羲'},
  16:{A:'后羿',B:'哪吒',C:'伏羲',D:'女娲'},17:{A:'伏羲',B:'女娲',C:'大禹',D:'精卫'},18:{A:'哪吒',B:'伏羲',C:'女娲',D:'大禹'},
};
const DIM_SLOTS: Record<DimensionKey, Record<ArchetypeName, number>> = {
  energy:{伏羲:3,女娲:3,大禹:3,精卫:4,后羿:4,哪吒:3}, cognition:{伏羲:2,女娲:2,大禹:3,精卫:3,后羿:3,哪吒:3},
  action:{伏羲:3,女娲:4,大禹:4,精卫:3,后羿:3,哪吒:3}, motivation:{伏羲:4,女娲:3,大禹:2,精卫:2,后羿:2,哪吒:3},
};

const PROFILE: Record<ArchetypeName, { title:string; line:string; drive:string; overuse:string; signal:string; dimension:Record<DimensionKey,string> }> = {
  伏羲:{title:'观局者',line:'你更习惯先辨认关系与规律，再决定自己从哪里进入。',drive:'把混乱读出结构',overuse:'不断增加理解，却迟迟没有让判断进入行动',signal:'信息仍在增加，但你已经很久没有形成一个明确决定',dimension:{energy:'你需要从持续输入中抽身，让杂乱的信息自行沉淀。',cognition:'你会先寻找整体路数，以及不同部分为什么这样连接。',action:'你更愿意理解整条路径之后再迈步，行动需要一个说得通的框架。',motivation:'当复杂事物逐渐出现秩序，你会重新获得力量。'}},
  女娲:{title:'连缀者',line:'你会在关系或事物出现裂缝时，本能地寻找重新连接的可能。',drive:'让断裂重新形成连接',overuse:'为了维持完整而不断调整自己，直到自己的位置变得模糊',signal:'你开始反复猜测别人需要什么，却很少问自己是否仍愿意',dimension:{energy:'被理解和真实交流能够帮助你松开积压的情绪。',cognition:'你会自然看见一个决定将影响谁，以及关系是否能够承受。',action:'你擅长把不同的人重新带回同一张桌面，让事情继续。',motivation:'关系恢复流动、彼此重新靠近时，你会感到自己的投入有意义。'}},
  大禹:{title:'担纲者',line:'承诺一旦落在你手里，你会希望它有始有终，不在自己这里中断。',drive:'把责任稳稳承接到结果',overuse:'因为仍然能够承担，便让责任持续扩大到没有结束边界',signal:'事情仍在推进，但你已经默认只有自己能够接住',dimension:{energy:'未完成的责任很难从你心里真正退出，做完才容易放下。',cognition:'你会先辨认责任归属、交付标准和谁需要把事情接住。',action:'你习惯先承接，再通过分工和规则让局面稳定下来。',motivation:'重要的事没有在自己这里掉链子，会带给你深层的踏实。'}},
  精卫:{title:'衔石者',line:'一旦确认一件事值得，你愿意把遥远目标拆成许多次具体坚持。',drive:'让认定的事穿过时间',overuse:'把坚持本身当作意义，错过了重新判断方向的时机',signal:'你已经很累，却仍用“再做一点”推迟是否继续的决定',dimension:{energy:'投入本身会给你力量，但也让你在该停下时更难抽身。',cognition:'你看重细节是否可靠，也看重这件事是否值得自己长期相信。',action:'你擅长把巨大距离拆成可以重复的小动作，一点点磨近。',motivation:'只要内心仍然认定，你不太需要即时掌声来维持方向。'}},
  后羿:{title:'挺身者',line:'当问题真正出现，你更容易锁定关键位置，站出来让事情发生改变。',drive:'在关键时刻保护重要之物',overuse:'持续站在最前面处理问题，却没有为自己留下恢复和交接',signal:'你又一次先站了出来，却没有确认这次是否真的只能由你完成',dimension:{energy:'目标越清楚，你越容易集中；真正的消耗常来自关键位置长期缺人。',cognition:'你会迅速锁定最要紧的一点，并判断谁需要被保护。',action:'你倾向直接处理、尽快说开，让问题不再继续扩散。',motivation:'关键时刻能够顶上，并让重要的人或事情安稳下来，会点亮你。'}},
  哪吒:{title:'破局者',line:'你对失效的方式很敏感，也更愿意用自己的选择重新打开可能。',drive:'取回选择并重写旧路径',overuse:'不断推翻旧方式，却没有留下一个能够承接下一步的结果',signal:'刚刚打开一个新方向，又开始想彻底换掉整套做法',dimension:{energy:'当节奏持续被外部牵引，换一个场景或推进方式能帮你取回主动。',cognition:'你相信真实反馈，也会主动寻找旧解释之外的另一种可能。',action:'面对不合适的方法，你很少只是忍耐，而会试着重新开路。',motivation:'能够按自己的方式决定方向，是你持续投入的重要条件。'}},
};

const STEM_ELEMENT:Record<string,Element>={甲:'wood',乙:'wood',丙:'fire',丁:'fire',戊:'earth',己:'earth',庚:'metal',辛:'metal',壬:'water',癸:'water'};
const STEM_POLARITY:Record<string,'yang'|'yin'>={甲:'yang',乙:'yin',丙:'yang',丁:'yin',戊:'yang',己:'yin',庚:'yang',辛:'yin',壬:'yang',癸:'yin'};
const PRODUCES:Record<Element,Element>={wood:'fire',fire:'earth',earth:'metal',metal:'water',water:'wood'};
const CONTROLS:Record<Element,Element>={wood:'earth',earth:'water',water:'fire',fire:'metal',metal:'wood'};
const SEASON_BY_MONTH:Record<string,Season>={寅:'spring',卯:'spring',辰:'spring',巳:'summer',午:'summer',未:'summer',申:'autumn',酉:'autumn',戌:'autumn',亥:'winter',子:'winter',丑:'winter'};
const TEN_GOD_GROUP:Record<string,Channel>={比肩:'peer',劫财:'peer',食神:'output',伤官:'output',偏财:'result',正财:'result',七杀:'rule',正官:'rule',偏印:'input',正印:'input'};
const HOUR_MIDDLE:Record<Exclude<HourOption,'unknown'>,[number,number]>={zi_early:[0,30],chou:[2,0],yin:[4,0],mao:[6,0],chen:[8,0],si:[10,0],wu:[12,0],wei:[14,0],shen:[16,0],you:[18,0],xu:[20,0],hai:[22,0],zi_late:[23,30]};
const IMAGERY:Record<Season,Record<Channel,[string,string]>>={
  spring:{input:['雨前的土壤','雨前土壤'],output:['抽枝的新柳','抽枝新柳'],result:['向阳的苗圃','向阳苗圃'],rule:['分畦的春田','分畦春田'],peer:['并生的竹影','并生竹影']},
  summer:{input:['树荫下的深井','树荫深井'],output:['穿林的长风','穿林长风'],result:['盛夏的果园','盛夏果园'],rule:['清楚的河岸','清楚河岸'],peer:['相接的树冠','相接树冠']},
  autumn:{input:['收声的谷仓','收声谷仓'],output:['出谷的清风','出谷清风'],result:['成熟的稻穗','成熟稻穗'],rule:['清晰的山脊','清晰山脊'],peer:['并行的雁阵','并行雁阵']},
  winter:{input:['雪下的泉眼','雪下泉眼'],output:['冬夜里的篝火','冬夜篝火'],result:['封存的种子','封存种子'],rule:['结冰的河岸','结冰河岸'],peer:['围炉的灯影','围炉灯影']},
};
const SEASON_LINE:Record<Season,string>={spring:'新意正在生长，真正重要的是让它找到可以扎根的位置。',summer:'光与热推动力量向外展开，节奏决定它能够走多远。',autumn:'清晰来自取舍；留下真正重要的，力量才会聚拢。',winter:'表面安静时，内部仍有水流；支点会让积累重新向前。'};
const CHANNEL_META:Record<Channel,{label:string;value:string;need:string;action:string}>={
  input:{label:'理解与吸收',value:'把复杂信息整理成新的理解入口',need:'一次表达或小范围验证',action:'把最想确认的一条判断写成问题，用一次低成本尝试换回真实反馈'},
  output:{label:'表达与创造',value:'让想法通过表达和试做进入现实',need:'明确对象、反馈与完成节点',action:'为眼前最想推进的想法，只设一个对象和一个完成标准'},
  result:{label:'投入与结果',value:'把资源与行动组织成可以被看见的结果',need:'与目标相称的时间、权限和资源',action:'开始前先写下可用时间、可以调用的资源和这次不再承接的部分'},
  rule:{label:'规则与责任',value:'让边界、标准与责任重新服务于重要目标',need:'责任、权限与结束条件同时清楚',action:'从当前责任中选一项，分别写下必须保留的目标、可以重谈的方法和不能扩大的边界'},
  peer:{label:'自主与协作',value:'在共同节奏中保留自己的判断和推进位置',need:'自己的决定与共同决定被分开',action:'把眼前的决定分成“我决定、共同决定、不由我承担”三栏，只先处理第一栏'},
};
const DIM_VALUE:Record<DimensionKey,string>={energy:'能量调度',cognition:'判断与理解',action:'行动与推进',motivation:'持续投入'};
const FOCUS_SCENE:Record<Focus,string>={energy:'一次从投入走向消耗的变化',cognition:'一次真正影响判断的选择',action:'一次需要开始或推进的行动',motivation:'一次让自己愿意持续投入的时刻',overall:'一段完整的工作或生活循环'};

function channelFor(dayMaster:string,targetStem:string):Channel{return TEN_GOD_GROUP[LunarUtil.SHI_SHEN[dayMaster+targetStem]]??'peer';}
function calculateLife(birth:BirthData){
  const knownHour=Boolean(birth.hour&&birth.hour!=='unknown');
  const [hour,minute]=knownHour?HOUR_MIDDLE[birth.hour as Exclude<HourOption,'unknown'>]:[12,0];
  const eight=Solar.fromYmdHms(Number(birth.year),Number(birth.month),Number(birth.day),hour,minute,0).getLunar().getEightChar(); eight.setSect(2);
  const pillars=[eight.getYear(),eight.getMonth(),eight.getDay(),eight.getTime()] as string[];
  const usable=knownHour?pillars:pillars.slice(0,3); const stems=usable.map(v=>v[0]); const branches=usable.map(v=>v[1]);
  const dayMaster=pillars[2][0]; const monthBranch=pillars[1][1]; const monthMainStem=((LunarUtil.ZHI_HIDE_GAN[monthBranch]??[]) as string[])[0]??dayMaster;
  const channel=channelFor(dayMaster,monthMainStem); const season=SEASON_BY_MONTH[monthBranch]??'spring'; const dayElement=STEM_ELEMENT[dayMaster]??'earth';
  let support=0,drain=0;
  const inspect=(stem:string,weight:number)=>{const element=STEM_ELEMENT[stem];if(!element)return;if(element===dayElement){support+=weight;return;}if(PRODUCES[element]===dayElement){support+=weight*.85;return;}if(PRODUCES[dayElement]===element)drain+=weight*.75;else if(CONTROLS[dayElement]===element)drain+=weight*.9;else if(CONTROLS[element]===dayElement)drain+=weight;};
  stems.forEach((stem,index)=>{if(index!==2)inspect(stem,index===1?1.25:1)});branches.forEach((branch,bi)=>((LunarUtil.ZHI_HIDE_GAN[branch]??[]) as string[]).forEach((stem,hi)=>inspect(stem,bi===1?(hi===0?2.8:1.15):(hi===0?1.35:.55))));
  const difference=support-drain; const strength:Strength=difference>1.75?'strong':difference< -1.75?'weak':'balanced'; const allChannels=new Set<Channel>();
  stems.forEach((stem,index)=>{if(index!==2)allChannels.add(channelFor(dayMaster,stem))});branches.forEach(branch=>((LunarUtil.ZHI_HIDE_GAN[branch]??[]) as string[]).forEach(stem=>allChannels.add(channelFor(dayMaster,stem))));
  const flowComplete=channel==='input'?allChannels.has('output'):channel==='output'?allChannels.has('result'):channel==='result'?strength!=='weak':channel==='rule'?allChannels.has('input'):allChannels.has('output');
  return{channel,season,strength,flowComplete,dayElement,dayPolarity:STEM_POLARITY[dayMaster]??'yang' as 'yang'|'yin'};
}

function scoreAnswers(answers:AnswerKey[]){
  const hit=Object.fromEntries(ARCHETYPES.map(name=>[name,0])) as Record<ArchetypeName,number>;
  const dimHit=Object.fromEntries(DIMENSIONS.map(dim=>[dim.key,Object.fromEntries(ARCHETYPES.map(name=>[name,0]))])) as Record<DimensionKey,Record<ArchetypeName,number>>;
  answers.forEach((answer,index)=>{const name=KEY[index+1][answer];const dim=DIMENSIONS.find(item=>index>=item.range[0]&&index<=item.range[1])!;hit[name]+=1;dimHit[dim.key][name]+=1;});
  const total=Object.fromEntries(ARCHETYPES.map(name=>[name,DIMENSIONS.reduce((sum,dim)=>sum+dimHit[dim.key][name]/DIM_SLOTS[dim.key][name],0)/4])) as Record<ArchetypeName,number>;
  const best=Math.max(...ARCHETYPES.map(name=>total[name]));const bestHit=Math.max(...ARCHETYPES.filter(name=>Math.abs(total[name]-best)<1e-9).map(name=>hit[name]));
  const tied=ARCHETYPES.filter(name=>Math.abs(total[name]-best)<1e-9&&hit[name]===bestHit).sort((a,b)=>a.localeCompare(b,'zh-CN'));const fingerprint=answers.reduce((sum,answer,index)=>sum+(answer.charCodeAt(0)-64)*(index+7),0);
  const archetype=tied[fingerprint%tied.length];const dimensionScores=Object.fromEntries(DIMENSIONS.map(dim=>[dim.key,dimHit[dim.key][archetype]/DIM_SLOTS[dim.key][archetype]])) as Record<DimensionKey,number>;
  return{archetype,dimensionScores};
}

export function generateMythReport(answers:AnswerKey[],birth:BirthData,focus:Focus):MythReport{
  if(answers.length!==18)throw new Error('answers');const{archetype,dimensionScores}=scoreAnswers(answers);const profile=PROFILE[archetype];const life=calculateLife(birth);const[imageryTitle,imageryShort]=IMAGERY[life.season][life.channel];
  const dimensionResults=DIMENSIONS.map(dim=>({key:dim.key,label:dim.label,value:dimensionScores[dim.key],copy:profile.dimension[dim.key]}));const strongestDimension=[...dimensionResults].sort((a,b)=>b.value-a.value)[0].key;
  const evidence=answers.map((answer,index)=>({answer,index,matched:KEY[index+1][answer]===archetype})).filter(item=>item.matched).slice(0,3).map(item=>QUESTIONS[item.index].options[item.answer]);const channel=CHANNEL_META[life.channel];
  const strengthCopy=life.strength==='weak'?'这股力量更需要稳定支点和可控范围，承接条件不足时，消耗会比结果更早出现。':life.strength==='strong'?'你具备继续推动的力量，更重要的是为它安排出口、边界和可以停下的位置。':'你的承载接近动态平衡，状态更取决于力量能否按顺序进入现实，而不是单纯再加一把劲。';
  const flowCopy=life.flowComplete?`当前结构已经有一部分流通条件，${channel.value}更容易留下可以继续承接的结果。`:`当前更值得补上的，是${channel.need}；它会决定这股力量能否从倾向走向稳定价值。`;
  return{productName:'识己 · 神话原型',contentVersion:'4.0',archetype,archetypeIndex:ARCHETYPES.indexOf(archetype),archetypeTitle:profile.title,archetypeLine:profile.line,combinedTitle:`「${imageryShort}」的${archetype}`,dimensionResults,strongestDimension,evidence,imageryTitle,imageryShort,imageryLine:SEASON_LINE[life.season],lifeCopy:`你的力量更容易通过“${channel.label}”启动。${strengthCopy}${flowCopy}`,valueChain:[profile.drive,DIM_VALUE[strongestDimension],channel.value,`${archetype}式力量形成可被现实承接的价值`],valueSummary:`“${profile.drive}”这股倾向，最容易通过${DIM_VALUE[strongestDimension]}进入${channel.label}这条通道。真正形成价值的部分，不只是拥有这种倾向，而是让它获得对象、边界和反馈，最终留下一个能够继续向前的结果。`,coreProposition:`${profile.overuse}。当“${channel.need}”这一条件尚未具备时，这种惯性会更明显。你需要留意的不是要不要放弃这股力量，而是它是否仍然通向自己真正认可的结果。`,earlySignal:profile.signal,observation:`接下来一周，留意${FOCUS_SCENE[focus]}：当你更像“${archetype}”时，哪一个条件让这股力量形成了价值？它又是从哪一步开始失去比例？`,smallAction:channel.action,dayElement:life.dayElement,dayPolarity:life.dayPolarity,season:life.season,channel:life.channel,strength:life.strength,flowComplete:life.flowComplete};
}

export function daysInMonth(year:number,month:number){if(!year||!month)return 31;return new Date(year,month,0).getDate();}
