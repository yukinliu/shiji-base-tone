'use client';

import { toPng } from 'html-to-image';
import QRCode from 'qrcode';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  FOCUS_OPTIONS, QUESTIONS, daysInMonth, generateMythReport,
  type AnswerKey, type BirthData, type DimensionKey, type Focus, type HourOption, type MythReport,
} from '../lib/report-engine';

type Stage = 'landing' | 'intro' | 'questions' | 'birth' | 'focus' | 'making' | 'reveal' | 'report';

const SURVEY_URL = process.env.NEXT_PUBLIC_WJX_URL || 'https://v.wjx.cn/vm/PrWGZvl.aspx';
const SURVEY_GATING = (process.env.NEXT_PUBLIC_SURVEY_GATING || 'off').toLowerCase();
const PENDING_KEY = 'shiji-myth-pending-v4';
const DRAFT_KEY = 'shiji-myth-draft-v4';
const SURVEY_STARTED_KEY = 'shiji-myth-survey-started-v4';
const TWO_HOURS = 2 * 60 * 60 * 1000;

const HOURS: { value: HourOption; label: string }[] = [
  { value: 'zi_early', label: '子时｜00:00–00:59' }, { value: 'chou', label: '丑时｜01:00–02:59' },
  { value: 'yin', label: '寅时｜03:00–04:59' }, { value: 'mao', label: '卯时｜05:00–06:59' },
  { value: 'chen', label: '辰时｜07:00–08:59' }, { value: 'si', label: '巳时｜09:00–10:59' },
  { value: 'wu', label: '午时｜11:00–12:59' }, { value: 'wei', label: '未时｜13:00–14:59' },
  { value: 'shen', label: '申时｜15:00–16:59' }, { value: 'you', label: '酉时｜17:00–18:59' },
  { value: 'xu', label: '戌时｜19:00–20:59' }, { value: 'hai', label: '亥时｜21:00–22:59' },
  { value: 'zi_late', label: '子时｜23:00–23:59' }, { value: 'unknown', label: '不确定' },
];

const EMPTY_BIRTH: BirthData = { year: '', month: '', day: '', hour: '' };
const ANSWER_KEYS: AnswerKey[] = ['A', 'B', 'C', 'D'];
const SIGIL_LABELS: Record<DimensionKey, string> = { energy: '节奏', cognition: '认知', action: '行动', motivation: '动力' };

function Brand() {
  return <div className="brand"><span className="brand-mark">识</span><span>刘迷糊丨自我探索</span></div>;
}

function MythPortrait({ index, className = '' }: { index: number; className?: string }) {
  return <div className={`myth-portrait portrait-${index} ${className}`} style={{ backgroundImage: 'url("myth-archetypes-v1.png?v=5")' }} role="img" aria-label="神话原型人物视觉" />;
}

function themeClass(report: MythReport) {
  return `theme-${report.season}-${report.channel}`;
}

function SceneAtmosphere() {
  return <div className="scene-atmosphere" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /><i /></div>;
}

function DimensionSigil({ report, compact = false }: { report: MythReport; compact?: boolean }) {
  const values = report.dimensionResults.map(dimension => dimension.value);
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const range = maximum - minimum;
  return (
    <div className={`dimension-sigil ${compact ? 'is-compact' : ''}`} aria-label="你的四维纹章">
      {report.dimensionResults.map(dimension => {
        const relative = range > .001 ? (dimension.value - minimum) / range : .48;
        const level = 42 + relative * 58;
        return <div className={dimension.key === report.strongestDimension ? 'sigil-axis is-strongest' : 'sigil-axis'} key={dimension.key}>
          <div className="sigil-track"><i style={{ '--level': `${level}%` } as React.CSSProperties} /></div>
          <span>{SIGIL_LABELS[dimension.key]}</span>
        </div>;
      })}
    </div>
  );
}

function sigilInsight(report: MythReport) {
  const ordered = [...report.dimensionResults].sort((a, b) => b.value - a.value);
  return `在你的四维纹章里，${ordered[0].label}最先亮起，${ordered[1].label}为它提供第二个支点。`;
}

function ReportSections({ report, exportMode = false }: { report: MythReport; exportMode?: boolean }) {
  return (
    <>
      <section className="report-block dimensions-block">
        <p className="section-index">01</p>
        <h2>你的四维原型轮廓</h2>
        <p className="section-lead">同一个原型，会在不同的人身上从不同位置出现。</p>
        {!exportMode && <DimensionSigil report={report} />}
        <div className="dimension-list">
          {report.dimensionResults.map(dimension => (
            <article className={dimension.key === report.strongestDimension ? 'is-strongest' : ''} key={dimension.key}>
              <div><h3>{dimension.label}</h3>{dimension.key === report.strongestDimension && <span>这股力量在这里最清楚</span>}</div>
              <p>{dimension.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="report-block life-block">
        <p className="section-index">02</p>
        <h2>你的生命底色</h2>
        <div className="imagery-heading"><span>生命意象</span><h3>{report.imageryTitle}</h3><p>{report.imageryLine}</p></div>
        <p>{report.lifeCopy}</p>
      </section>

      <section className="report-block value-block">
        <p className="section-index">03</p>
        <h2>你更可能怎样形成价值</h2>
        <div className="value-chain">
          {report.valueChain.map((node, index) => <div key={node}><span>{String(index + 1).padStart(2, '0')}</span><p>{node}</p></div>)}
        </div>
        <p>{report.valueSummary}</p>
      </section>

      <section className="report-block proposition-block">
        <p className="section-index">04</p>
        <h2>这股力量也需要一个落点</h2>
        <p>{report.coreProposition}</p>
      </section>

      <section className="report-block action-block">
        <p className="section-index">05</p>
        <h2>给此刻的你</h2>
        <div className="action-grid">
          <article><span>一个早期信号</span><p>{report.earlySignal}</p></article>
          <article><span>可以观察</span><p>{report.observation}</p></article>
          <article><span>一个小行动</span><p>{report.smallAction}</p></article>
        </div>
        <p className="gentle-ending">不必急着证明它准确。先把这句话带回生活，看它会不会在某个具体时刻被你认出来。</p>
      </section>
    </>
  );
}

function ExportCard({ report, productQr }: { report: MythReport; productQr: string }) {
  return (
    <article className={`export-card tone-${report.dayElement} season-${report.season} ${themeClass(report)}`}>
      <div className="export-cover">
        <SceneAtmosphere />
        <Brand />
        <p className="eyebrow">我的神话原型</p>
        <MythPortrait index={report.archetypeIndex} />
        <h1 className="result-title">{report.combinedTitle}</h1>
        <p className="archetype-role">{report.archetypeTitle}</p>
        <p className="archetype-line">{report.archetypeLine}</p>
        <DimensionSigil report={report} compact />
        <p className="sigil-insight">{sigilInsight(report)}</p>
      </div>
      <div className="export-content"><ReportSections report={report} exportMode /></div>
      <div className="export-sign">刘迷糊丨自我探索 · SHIJI</div>
      <div className="qr-zone">
        <div className="qr-item"><div><strong>制作你的《识己 · 神话原型》</strong><p>你的生命故事里，住着哪位神话人物？</p></div>{productQr && <img src={productQr} alt="产品二维码" />}</div>
        <div className="qr-item"><div><strong>添加刘迷糊</strong><p>咨询《识己 · 自我认知八维地图》</p></div><div className="wechat-qr-crop"><img src="wechat-qr.png" alt="刘迷糊微信二维码" /></div></div>
      </div>
    </article>
  );
}

export default function Home() {
  const currentYear = new Date().getFullYear();
  const [stage, setStage] = useState<Stage>('landing');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerKey[]>([]);
  const [birth, setBirth] = useState<BirthData>(EMPTY_BIRTH);
  const [focus, setFocus] = useState<Focus | ''>('');
  const [report, setReport] = useState<MythReport | null>(null);
  const [makingStep, setMakingStep] = useState(0);
  const [unlocked, setUnlocked] = useState(SURVEY_GATING !== 'on');
  const [surveyPrompt, setSurveyPrompt] = useState(false);
  const [pendingAvailable, setPendingAvailable] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedImage, setSavedImage] = useState('');
  const [hasSaved, setHasSaved] = useState(false);
  const [message, setMessage] = useState('');
  const [productQr, setProductQr] = useState('');
  const exportRef = useRef<HTMLDivElement>(null);
  const surveyActive = useRef(false);
  const surveyLeft = useRef(false);
  const surveyOpenedAt = useRef(0);
  const popupTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const years = useMemo(() => Array.from({ length: currentYear - 1899 }, (_, index) => currentYear - index), [currentYear]);
  const days = useMemo(() => Array.from({ length: daysInMonth(Number(birth.year), Number(birth.month)) }, (_, index) => index + 1), [birth.year, birth.month]);
  const currentQuestion = QUESTIONS[questionIndex];

  useEffect(() => {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    const restoreDraft = navigation?.type === 'reload' || navigation?.type === 'back_forward';
    if (restoreDraft) {
      try {
        const raw = sessionStorage.getItem(DRAFT_KEY);
        if (raw) {
          const draft = JSON.parse(raw);
          // Restoring an external browser-session snapshot is the purpose of this effect.
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setStage(draft.stage || 'landing'); setAnswers(draft.answers || []); setQuestionIndex(draft.questionIndex || 0);
          setBirth(draft.birth || EMPTY_BIRTH); setFocus(draft.focus || ''); setReport(draft.report || null);
        }
      } catch { sessionStorage.removeItem(DRAFT_KEY); }
    } else {
      sessionStorage.removeItem(DRAFT_KEY);
    }
    try {
      const pending = JSON.parse(localStorage.getItem(PENDING_KEY) || 'null');
      if (pending && pending.expiresAt > Date.now()) {
        setPendingAvailable(true);
        if (sessionStorage.getItem(SURVEY_STARTED_KEY) === 'true' && navigation?.type === 'back_forward') {
          setReport(pending.report); setStage('report'); setUnlocked(true);
          setTimeout(() => document.getElementById('save-area')?.scrollIntoView({ behavior: 'smooth' }), 160);
        }
      } else if (pending) localStorage.removeItem(PENDING_KEY);
    } catch { localStorage.removeItem(PENDING_KEY); }
    const siteUrl = `${window.location.origin}${window.location.pathname}`;
    QRCode.toDataURL(siteUrl, { width: 260, margin: 2, color: { dark: '#17323c', light: '#eef3f2' } }).then(setProductQr);
  }, []);

  useEffect(() => {
    if (stage === 'landing') return;
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ stage, answers, questionIndex, birth, focus, report }));
  }, [stage, answers, questionIndex, birth, focus, report]);

  useEffect(() => {
    const unlockOnReturn = () => {
      if (!surveyActive.current || Date.now() - surveyOpenedAt.current < 900) return;
      setUnlocked(true); surveyActive.current = false; sessionStorage.setItem(SURVEY_STARTED_KEY, 'returned');
      setTimeout(() => document.getElementById('save-area')?.scrollIntoView({ behavior: 'smooth' }), 180);
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden' && surveyActive.current) surveyLeft.current = true;
      if (document.visibilityState === 'visible' && surveyLeft.current) unlockOnReturn();
    };
    const onFocus = () => { if (surveyLeft.current) unlockOnReturn(); };
    const onPageShow = (event: PageTransitionEvent) => { if (event.persisted && sessionStorage.getItem(SURVEY_STARTED_KEY)) unlockOnReturn(); };
    document.addEventListener('visibilitychange', onVisibility); window.addEventListener('focus', onFocus); window.addEventListener('pageshow', onPageShow);
    return () => { document.removeEventListener('visibilitychange', onVisibility); window.removeEventListener('focus', onFocus); window.removeEventListener('pageshow', onPageShow); if (popupTimer.current) clearInterval(popupTimer.current); };
  }, []);

  function startFresh() {
    sessionStorage.removeItem(DRAFT_KEY); localStorage.removeItem(PENDING_KEY);
    setStage('intro'); setAnswers([]); setQuestionIndex(0); setBirth(EMPTY_BIRTH); setFocus(''); setReport(null);
    setUnlocked(SURVEY_GATING !== 'on'); setPendingAvailable(false); setError(''); setMessage(''); setHasSaved(false); setSavedImage('');
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  function chooseAnswer(answer: AnswerKey) {
    const next = [...answers]; next[questionIndex] = answer; setAnswers(next);
    if (questionIndex < 17) setTimeout(() => setQuestionIndex(index => index + 1), 220);
    else setTimeout(() => setStage('birth'), 220);
  }

  function validateBirth() {
    if (!birth.year || !birth.month || !birth.day) return '请选择完整的公历出生日期。';
    if (new Date(Number(birth.year), Number(birth.month) - 1, Number(birth.day), 12).getTime() > Date.now()) return '出生日期不能晚于今天。';
    return '';
  }

  function continueBirth() {
    const nextError = validateBirth(); if (nextError) { setError(nextError); return; }
    setError(''); setStage('focus');
  }

  function makeReport() {
    if (!focus) { setError('请选择一个此刻最关心的方向。'); return; }
    try {
      const next = generateMythReport(answers, birth, focus); setReport(next); setStage('making'); setMakingStep(0);
      [650, 1350, 2100].forEach((delay, index) => window.setTimeout(() => setMakingStep(index + 1), delay));
      window.setTimeout(() => setStage('reveal'), 2850);
    } catch { setError('这次没有顺利制作，请检查信息后再试一次。'); }
  }

  function continuePending() {
    try {
      const pending = JSON.parse(localStorage.getItem(PENDING_KEY) || 'null');
      if (!pending || pending.expiresAt < Date.now()) throw new Error();
      setReport(pending.report); setStage('report'); setUnlocked(sessionStorage.getItem(SURVEY_STARTED_KEY) !== null); setPendingAvailable(false);
    } catch { localStorage.removeItem(PENDING_KEY); setPendingAvailable(false); }
  }

  function goToSurvey() {
    if (!report) return;
    setSurveyPrompt(false);
    localStorage.setItem(PENDING_KEY, JSON.stringify({ report, expiresAt: Date.now() + TWO_HOURS }));
    sessionStorage.setItem(SURVEY_STARTED_KEY, 'true');
    surveyActive.current = true; surveyLeft.current = false; surveyOpenedAt.current = Date.now();
    const popup = window.open(SURVEY_URL, '_blank');
    if (popup) {
      try { popup.opener = null; } catch { /* cross-origin */ }
      popupTimer.current = setInterval(() => {
        if (popup.closed) {
          if (popupTimer.current) clearInterval(popupTimer.current);
          popupTimer.current = null; surveyLeft.current = true; setUnlocked(true); surveyActive.current = false;
          setTimeout(() => document.getElementById('save-area')?.scrollIntoView({ behavior: 'smooth' }), 180);
        }
      }, 800);
    } else window.location.assign(SURVEY_URL);
  }

  async function saveImage() {
    if (!exportRef.current || !report) return;
    setSaving(true); setMessage('');
    try {
      await document.fonts.ready;
      const embeddedImages = Array.from(exportRef.current.querySelectorAll('img'));
      await Promise.all(embeddedImages.map(async image => {
        if (image.complete && image.naturalWidth > 0) return;
        await new Promise<void>((resolve, reject) => {
          const timer = window.setTimeout(() => reject(new Error(`图片资源加载超时：${image.src}`)), 5000);
          image.addEventListener('load', () => { window.clearTimeout(timer); resolve(); }, { once: true });
          image.addEventListener('error', () => { window.clearTimeout(timer); reject(new Error(`图片资源加载失败：${image.src}`)); }, { once: true });
          if (image.complete && image.naturalWidth === 0) image.src = image.src;
        });
      }));
      // 将神话原型图内联为 data URL，确保 html-to-image 能把它嵌入导出图。
      // 离屏容器里的 CSS 背景图（尤其是精灵图切片）常常抓不到，导致保存后原型图空白。
      let portraitNodes: HTMLElement[] = [];
      let previousBackgrounds: string[] = [];
      try {
        const portraitResp = await fetch('myth-archetypes-v1.png?v=5');
        const portraitBlob = await portraitResp.blob();
        const portraitDataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error('神话原型图读取失败'));
          reader.readAsDataURL(portraitBlob);
        });
        portraitNodes = Array.from(exportRef.current.querySelectorAll<HTMLElement>('.myth-portrait'));
        previousBackgrounds = portraitNodes.map(node => node.style.backgroundImage);
        portraitNodes.forEach(node => { node.style.backgroundImage = `url("${portraitDataUrl}")`; });
      } catch (inlineError) {
        console.warn('神话原型图内联失败，将按原背景图导出：', inlineError);
      }
      try {
        // 降低 pixelRatio，让长图更贴近手机宽度，放大后的导出字号在按宽度缩放后仍清晰可读。
        const dataUrl = await toPng(exportRef.current, { pixelRatio: 1, cacheBust: false, backgroundColor: '#e8eeef' });
        if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) setSavedImage(dataUrl);
        else { const link = document.createElement('a'); link.download = `识己·神话原型-${report.archetype}.png`; link.href = dataUrl; link.click(); }
      } finally {
        portraitNodes.forEach((node, index) => { node.style.backgroundImage = previousBackgrounds[index] || ''; });
      }
      setHasSaved(true); setMessage('图片已经准备好。你可以把它留给自己，也可以邀请朋友一起来看看。');
    } catch (saveError) {
      console.error('Unable to create result image:', saveError);
      setMessage('图片暂时没有制作成功，请再试一次。');
    }
    finally { setSaving(false); }
  }

  async function shareProduct() {
    if (!report) return;
    const pageUrl = `${window.location.origin}${window.location.pathname}`;
    const text = `我是${report.combinedTitle}。你的生命故事里，住着哪位神话人物？\n${pageUrl}`;
    const copyViaExecCommand = () => {
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        ta.style.top = '0';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.focus(); ta.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(ta);
        return ok;
      } catch { return false; }
    };
    const isWeChat = /micromessenger/i.test(navigator.userAgent);
    try {
      if (navigator.share) {
        try {
          await navigator.share({ title: '识己 · 神话原型', text, url: pageUrl });
          return;
        } catch (shareError) {
          if ((shareError as DOMException)?.name === 'AbortError') return;
          // 其他错误（如微信内被拦截）继续走复制兜底
        }
      }
      let copied = false;
      if (navigator.clipboard && window.isSecureContext) {
        copied = await navigator.clipboard.writeText(text).then(() => true).catch(() => false);
      }
      if (!copied) copied = copyViaExecCommand();
      if (copied) setMessage(isWeChat ? '链接已复制，去微信粘贴给朋友吧 👌' : '链接已复制，可以发给朋友了。');
      else setMessage('复制失败，请长按上方网址手动发送给朋友。');
    } catch {
      if (copyViaExecCommand()) setMessage(isWeChat ? '链接已复制，去微信粘贴给朋友吧 👌' : '链接已复制，可以发给朋友了。');
      else setMessage('复制失败，请长按上方网址手动发送给朋友。');
    }
  }

  function renderGate() {
    if (!report) return null;
    const saveButton = <button className="primary-button" type="button" onClick={saveImage} disabled={saving}>{saving ? '正在制作图片……' : '保存为图片'}<span>↓</span></button>;
    if (SURVEY_GATING === 'off') return saveButton;
    if (SURVEY_GATING === 'soft') return <>{saveButton}<a className="soft-survey" href={SURVEY_URL} target="_blank" rel="noreferrer">如果你愿意，花几分钟告诉我你真正想从自我探索中获得什么 →</a></>;
    if (unlocked) return saveButton;
    return <button className="primary-button" type="button" onClick={() => setSurveyPrompt(true)}>参与简短调研，解锁保存<span>↗</span></button>;
  }

  return (
    <main className={`app stage-${stage}`}>
      {stage === 'landing' && (
        <section className="landing-screen">
          <div className="landing-art"><img src="myth-archetypes-v1.png" alt="六位神话人物" /></div>
          <div className="landing-overlay" />
          <div className="landing-content"><Brand /><p className="product-name">识己 · 神话原型</p><h1>你的生命故事里，<br />住着哪位神话人物？</h1><p className="landing-copy">看见与你最接近的神话原型，以及这股力量落在怎样的生命底色里。</p><button className="primary-button light" onClick={startFresh}>看见我的神话<span>→</span></button><p className="privacy-line">约3分钟 · 20题 · 完全隐私</p>{pendingAvailable && <button className="resume-button" onClick={continuePending}>继续刚才的报告</button>}</div>
        </section>
      )}

      {stage === 'intro' && (
        <section className="flow-screen intro-screen"><Brand /><div className="mystery-orbit" aria-hidden="true"><span className="cosmic-core" /><b className="star-dust" /><i /><i /><i /><i /><i /><i /></div><div className="screen-copy"><p className="eyebrow">开始之前</p><h1>从第一反应开始</h1><p>这里没有正确答案。请选择更接近日常里的你，而不是你觉得自己应该成为的样子。</p><p className="expectation-line">约 3 分钟 · 18 道题 · 完全隐私</p><button className="primary-button" onClick={() => setStage('questions')}>开始<span>→</span></button></div></section>
      )}

      {stage === 'questions' && currentQuestion && (
        <section className="flow-screen question-screen"><Brand /><div className="question-progress"><div><i style={{ width: `${((questionIndex + 1) / 18) * 100}%` }} /></div><span>{questionIndex + 1} / 18</span></div><div className="question-card"><h1>{currentQuestion.text}</h1><div className="answer-list">{ANSWER_KEYS.map(key => <button className={answers[questionIndex] === key ? 'is-selected' : ''} key={key} onClick={() => chooseAnswer(key)}><span>{currentQuestion.options[key]}</span><i /></button>)}</div><button className="back-link" disabled={questionIndex === 0} onClick={() => setQuestionIndex(index => Math.max(0, index - 1))}>← 上一题</button></div></section>
      )}

      {stage === 'birth' && (
        <section className="flow-screen form-screen"><Brand /><div className="screen-copy wide"><p className="eyebrow">你的神话原型已经渐渐清晰</p><h1>让它落进你的生命底色</h1><p className="cosmic-copy">隔着宇宙星辰，也许会有 ta 共振。<br />用来绘制你的能量流动——它会是什么样呢？</p><div className="form-card"><h2>出生日期 <small>公历</small></h2><div className="date-grid"><label><span>年</span><select value={birth.year} onChange={event => setBirth(previous => ({ ...previous, year: event.target.value }))}><option value="">选择</option>{years.map(year => <option value={year} key={year}>{year} 年</option>)}</select></label><label><span>月</span><select value={birth.month} onChange={event => setBirth(previous => ({ ...previous, month: event.target.value, day: '' }))}><option value="">选择</option>{Array.from({ length: 12 }, (_, index) => index + 1).map(month => <option value={month} key={month}>{month} 月</option>)}</select></label><label><span>日</span><select value={birth.day} onChange={event => setBirth(previous => ({ ...previous, day: event.target.value }))}><option value="">选择</option>{days.map(day => <option value={day} key={day}>{day} 日</option>)}</select></label><label className="hour-field"><span>出生时辰｜选填</span><select value={birth.hour} onChange={event => setBirth(previous => ({ ...previous, hour: event.target.value as HourOption }))}><option value="">不确定可以跳过</option>{HOURS.map(item => <option value={item.value} key={item.value}>{item.label}</option>)}</select></label></div></div>{error && <p className="error" role="alert">{error}</p>}<button className="primary-button" onClick={continueBirth}>下一页<span>→</span></button></div></section>
      )}

      {stage === 'focus' && (
        <section className="flow-screen focus-screen"><Brand /><div className="screen-copy wide"><p className="eyebrow">最后一题</p><h1>这一次，你最想先看见什么？</h1><p>选择一个此刻最关心的方向。</p><div className="focus-list">{FOCUS_OPTIONS.map(option => <button className={focus === option.value ? 'is-selected' : ''} key={option.value} onClick={() => { setFocus(option.value); setError(''); }}><div><strong>{option.title}</strong><span>{option.detail}</span></div><i /></button>)}</div>{error && <p className="error" role="alert">{error}</p>}<button className="primary-button" onClick={makeReport}>看见我的神话<span>→</span></button></div></section>
      )}

      {stage === 'making' && (
        <section className="making-screen"><div className="making-visual"><div className="making-core" /><i /><i /><i /><i /></div><div className="making-copy"><p className={makingStep >= 0 ? 'active' : ''}>正在整理你的选择轮廓</p><p className={makingStep >= 1 ? 'active' : ''}>正在看见你的神话原型</p><p className={makingStep >= 2 ? 'active' : ''}>你的生命底色正在绽放</p><strong className={makingStep >= 3 ? 'active' : ''}>看见了。</strong></div></section>
      )}

      {stage === 'reveal' && report && (
        <section className={`reveal-screen tone-${report.dayElement} season-${report.season} ${themeClass(report)}`}><Brand /><div className="reveal-card"><SceneAtmosphere /><div className="reveal-head"><p className="eyebrow">在你的选择里，与你最接近的是</p><h1 className="result-title">{report.combinedTitle}</h1><h2>{report.archetypeTitle}</h2></div><div className="reveal-visual"><MythPortrait index={report.archetypeIndex} /></div><div className="reveal-signature"><DimensionSigil report={report} compact /><p>{sigilInsight(report)}</p></div></div><button className="primary-button light reveal-cta" onClick={() => { setStage('report'); setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 30); }}>查看全部<span>↓</span></button></section>
      )}

      {stage === 'report' && report && (
        <section className={`report-page tone-${report.dayElement} season-${report.season} ${themeClass(report)}`}><header className="report-cover"><SceneAtmosphere /><Brand /><div className="report-hero"><MythPortrait index={report.archetypeIndex} /><div><p className="eyebrow">我的神话原型</p><h1 className="result-title">{report.combinedTitle}</h1><h2>{report.archetypeTitle}</h2><p>{report.archetypeLine}</p></div></div><DimensionSigil report={report} /></header><div className="report-content"><ReportSections report={report} /><section className="map-bridge"><p className="section-index">继续探索</p><h2>从神话原型到真实完整的自己</h2><p>如果你还想进一步理解：这些倾向怎样形成、不同维度如何互相影响，以及你当前正在面对什么——《识己 · 自我认知八维地图》会在完整资料和现实校准的基础上，展开八个自我认知维度、原局核心解析与行动启示。</p></section><section className="save-area" id="save-area"><div className="save-actions">{renderGate()}<button className="secondary-button" type="button" onClick={startFresh}>重新制作<span>↻</span></button></div>{hasSaved && <button className="secondary-button" onClick={shareProduct}>邀请朋友也来看看<span>↗</span></button>}{message && <p className="status-message" role="status">{message}</p>}</section></div></section>
      )}

      {surveyPrompt && <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="survey-title"><div className="survey-modal"><button className="modal-close" onClick={() => setSurveyPrompt(false)} aria-label="关闭">×</button><p className="eyebrow">保存之前</p><h2 id="survey-title">完成后，记得回来</h2><p>问卷将在新页面打开。提交后，请返回这里保存你的《识己 · 神话原型》。</p><p className="modal-note">本次结果已经为你临时保留。</p><button className="primary-button" onClick={goToSurvey}>去填写调研<span>↗</span></button><button className="text-button" onClick={() => setSurveyPrompt(false)}>暂时不填</button></div></div>}

      {savedImage && <div className="image-modal"><div><button onClick={() => setSavedImage('')} aria-label="关闭">×</button><p>长按图片保存到相册</p><img src={savedImage} alt="识己神话原型长图" /></div></div>}

      {report && <div className="export-stage" aria-hidden="true"><div ref={exportRef}><ExportCard report={report} productQr={productQr} /></div></div>}
    </main>
  );
}