'use client';

import { toPng } from 'html-to-image';
import QRCode from 'qrcode';
import { useEffect, useMemo, useRef, useState } from 'react';
import { daysInMonth, generateReport } from '../lib/report-engine';
import type { BaseToneReport, Effective, FormData, HourOption, Overload } from '../lib/report-engine';

const SURVEY_URL = process.env.NEXT_PUBLIC_WJX_URL || 'https://v.wjx.cn/vm/PrWGZvl.aspx';

const HOURS: { value: HourOption; label: string }[] = [
  { value: 'zi_early', label: '子时｜00:00–00:59' }, { value: 'chou', label: '丑时｜01:00–02:59' },
  { value: 'yin', label: '寅时｜03:00–04:59' }, { value: 'mao', label: '卯时｜05:00–06:59' },
  { value: 'chen', label: '辰时｜07:00–08:59' }, { value: 'si', label: '巳时｜09:00–10:59' },
  { value: 'wu', label: '午时｜11:00–12:59' }, { value: 'wei', label: '未时｜13:00–14:59' },
  { value: 'shen', label: '申时｜15:00–16:59' }, { value: 'you', label: '酉时｜17:00–18:59' },
  { value: 'xu', label: '戌时｜19:00–20:59' }, { value: 'hai', label: '亥时｜21:00–22:59' },
  { value: 'zi_late', label: '子时｜23:00–23:59' }, { value: 'unknown', label: '不确定' },
];

const FOCUS_OPTIONS = [
  ['energy', '能量与恢复', '看见自己怎样进入状态，又在何时开始消耗。'],
  ['strength', '优势与方向', '理解优势依赖什么条件，又在哪里可能转为代价。'],
  ['relationship', '关系与相处', '观察自己在关系中的位置、责任和回应方式。'],
  ['overall', '先看整体', '暂时没有特定方向，先从整体运行方式开始。'],
] as const;

const EFFECTIVE_OPTIONS = [
  ['clarity', '方向清楚', '知道这一阶段什么最重要。'],
  ['autonomy', '有自主空间', '可以按照自己的方式安排方法与节奏。'],
  ['coordination', '配合顺畅', '沟通和反馈能够真正推动事情。'],
  ['progress', '进展可见', '能够看见自己的投入正在形成结果。'],
] as const;

const OVERLOAD_OPTIONS = [
  ['start_delay', '越来越难启动', '明明知道有事要做，却迟迟无法真正进入。'],
  ['over_response', '持续回应，停不下来', '外部要求不断进入，回应没有清楚的结束边界。'],
  ['cognitive_carryover', '事情结束，头脑还在处理', '事情已经过去，思考和复盘仍在反复运转。'],
  ['input_fatigue', '对信息与交流失去耐心', '想暂时从持续输入、沟通和回应中退开。'],
] as const;

const EMPTY_FORM: FormData = {
  year: '', month: '', day: '', hour: '', focus: '', effective: [], overload: [],
};

function ChoiceGroup({
  name, value, options, onChange,
}: {
  name: string;
  value: string;
  options: readonly (readonly [string, string, string])[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="choice-grid">
      {options.map(([optionValue, title, detail], index) => (
        <label className={`choice-card ${value === optionValue ? 'is-selected' : ''}`} key={optionValue}>
          <input type="radio" name={name} checked={value === optionValue} onChange={() => onChange(optionValue)} />
          <span className="choice-letter">{String.fromCharCode(65 + index)}</span>
          <span className="choice-copy"><strong>{title}</strong><small>{detail}</small></span>
          <span className="choice-check" aria-hidden="true">✓</span>
        </label>
      ))}
    </div>
  );
}

function MultiChoiceGroup<T extends string>({
  name, values, options, onChange,
}: {
  name: string;
  values: T[];
  options: readonly (readonly [T, string, string])[];
  onChange: (values: T[]) => void;
}) {
  function toggle(next: T) {
    if (values.includes(next)) onChange(values.filter(value => value !== next));
    else if (values.length < 2) onChange([...values, next]);
  }
  return (
    <div className="choice-grid">
      {options.map(([optionValue, title, detail], index) => {
        const selected = values.includes(optionValue);
        const disabled = !selected && values.length >= 2;
        return (
          <label className={`choice-card ${selected ? 'is-selected' : ''} ${disabled ? 'is-disabled' : ''}`} key={optionValue}>
            <input type="checkbox" name={name} checked={selected} disabled={disabled} onChange={() => toggle(optionValue)} />
            <span className="choice-letter">{String.fromCharCode(65 + index)}</span>
            <span className="choice-copy"><strong>{title}</strong><small>{detail}</small></span>
            <span className="choice-check" aria-hidden="true">✓</span>
          </label>
        );
      })}
    </div>
  );
}

function ReportContent({ report }: { report: BaseToneReport }) {
  return (
    <>
      <div className={`day-visual branch-${report.dayBranchIndex}`} aria-hidden="true"><span /><span /><span /></div>
      <header className="report-head">
        <p className="report-product">识己 · 底色</p>
        <h2>{report.poeticTitle}</h2>
        <p className="chart-meta">日柱：{report.dayPillar}<span />月令：{report.monthCommand}</p>
        <p className="poetic-line">{report.poeticLine}</p>
      </header>

      <section className="axis-block">
        <span>命盘主轴</span>
        <h3>{report.mainAxisTitle}</h3>
        <p>{report.mainAxisSummary}</p>
      </section>

      <section className="report-part">
        <p className="part-kicker">第一部分</p><h3>原局主轴</h3>
        <div className="report-copy"><h4>原局</h4><p>{report.originalChart}</p></div>
        <div className="report-copy"><h4>调节</h4><p>{report.adjustment}</p></div>
      </section>

      <section className="report-part">
        <p className="part-kicker">第二部分</p><h3>可能的运行方式</h3>
        <div className="report-copy"><h4>更容易展开的条件</h4><p>{report.expandCondition}</p></div>
        <div className="report-copy"><h4>容易形成的阻滞</h4><p>{report.obstruction}</p></div>
        <div className="report-copy"><h4>可以使用的调整路径</h4><p>{report.adjustmentPath}</p></div>
      </section>

      <section className="report-part reality-part">
        <p className="part-kicker">第三部分</p><h3>现实中的验证</h3>
        <div className="reality-grid">
          <div><h4>当你状态在线时</h4><p>{report.onlineReality}</p></div>
          <div><h4>当消耗开始时</h4><p>{report.overloadReality}</p></div>
        </div>
        <div className="observe-block"><span>可以观察</span><p>{report.observation}</p></div>
      </section>
    </>
  );
}

function ExportCard({ report, qrCode }: { report: BaseToneReport; qrCode: string }) {
  return (
    <article className={`export-card day-tone-${report.dayElement} polarity-${report.dayPolarity} season-${report.season}`}>
      <div className="export-paper">
        <div className="export-brand"><span>识</span>刘迷糊丨自我探索</div>
        <ReportContent report={report} />
        <footer className="export-signoff">刘迷糊丨自我探索 · SHIJI</footer>
      </div>
      <div className="share-tail">
        <div><strong>扫描制作你的识己 · 底色</strong><p>认识自己，从看见开始。</p></div>
        {qrCode ? <img src={qrCode} alt="识己底色H5二维码" /> : <div className="qr-placeholder" />}
      </div>
    </article>
  );
}

export default function Home() {
  const currentYear = new Date().getFullYear();
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [report, setReport] = useState<BaseToneReport | null>(null);
  const [making, setMaking] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [savedImage, setSavedImage] = useState('');
  const [qrCode, setQrCode] = useState('');
  const exportRef = useRef<HTMLElement>(null);

  const years = useMemo(() => Array.from({ length: currentYear - 1899 }, (_, i) => currentYear - i), [currentYear]);
  const days = useMemo(() => Array.from({ length: daysInMonth(Number(form.year), Number(form.month)) }, (_, i) => i + 1), [form.year, form.month]);

  useEffect(() => {
    const saved = sessionStorage.getItem('shiji-base-tone-report');
    const savedForm = sessionStorage.getItem('shiji-base-tone-form');
    const params = new URLSearchParams(window.location.search);
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    const surveyDone = params.get('survey') === 'done';
    const shouldRestore = surveyDone || navigation?.type === 'reload';
    if (saved && shouldRestore) {
      try {
        setReport(JSON.parse(saved));
        if (savedForm) setForm(JSON.parse(savedForm));
      } catch {
        sessionStorage.removeItem('shiji-base-tone-report');
        sessionStorage.removeItem('shiji-base-tone-form');
        sessionStorage.removeItem('shiji-base-tone-unlocked');
      }
    } else if (!shouldRestore) {
      sessionStorage.removeItem('shiji-base-tone-report');
      sessionStorage.removeItem('shiji-base-tone-form');
      sessionStorage.removeItem('shiji-base-tone-unlocked');
    }
    if (surveyDone && saved) {
      sessionStorage.setItem('shiji-base-tone-unlocked', 'true');
      setUnlocked(true);
      window.history.replaceState({}, '', window.location.pathname);
      setTimeout(() => document.getElementById('save')?.scrollIntoView({ behavior: 'smooth' }), 160);
    } else if (shouldRestore && sessionStorage.getItem('shiji-base-tone-unlocked') === 'true') {
      setUnlocked(true);
    }
  }, []);

  useEffect(() => {
    const url = `${window.location.origin}${window.location.pathname}`;
    QRCode.toDataURL(url, { width: 240, margin: 2, color: { dark: '#24352d', light: '#fffaf1' } }).then(setQrCode);
  }, []);

  function update<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm(previous => ({ ...previous, [key]: value }));
    setError('');
  }

  function validate() {
    if (!form.year || !form.month || !form.day || !form.hour) return '请完整填写公历（新历）出生日期和真太阳时辰。';
    if (new Date(Number(form.year), Number(form.month) - 1, Number(form.day), 12).getTime() > Date.now()) return '出生日期不能晚于今天。';
    if (!form.focus) return '请选择你现在最想了解的方向。';
    if (form.effective.length < 1 || form.effective.length > 2 || form.overload.length < 1 || form.overload.length > 2) return '第03、04题请分别选择1—2项。';
    return '';
  }

  function makeReport(event: React.FormEvent) {
    event.preventDefault();
    const nextError = validate();
    if (nextError) { setError(nextError); return; }
    setMaking(true);
    setTimeout(() => {
      try {
        const nextReport = generateReport(form);
        setReport(nextReport);
        setUnlocked(false);
        setSaveMessage('');
        sessionStorage.setItem('shiji-base-tone-report', JSON.stringify(nextReport));
        sessionStorage.setItem('shiji-base-tone-form', JSON.stringify(form));
        sessionStorage.removeItem('shiji-base-tone-unlocked');
        setTimeout(() => document.getElementById('report')?.scrollIntoView({ behavior: 'smooth' }), 100);
      } catch {
        setError('这次没有顺利制作，请检查出生信息后再试一次。');
      } finally {
        setMaking(false);
      }
    }, 520);
  }

  function openSurvey() {
    sessionStorage.setItem('shiji-base-tone-survey-started', 'true');
    window.location.assign(SURVEY_URL);
  }

  async function saveImage() {
    if (!exportRef.current || !report) return;
    setSaving(true);
    setSaveMessage('');
    try {
      await document.fonts.ready;
      const dataUrl = await toPng(exportRef.current, { pixelRatio: 2, cacheBust: true, backgroundColor: '#f6f1e7' });
      const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      if (isMobile) {
        setSavedImage(dataUrl);
      } else {
        const link = document.createElement('a');
        link.download = `识己·底色-${report.dayPillar}.png`;
        link.href = dataUrl;
        link.click();
        setSaveMessage('图片已保存。你可以把它留给自己，也可以分享给想一起认识自己的人。');
      }
    } catch {
      setSaveMessage('图片暂时没有保存成功，请稍后再试。');
    } finally {
      setSaving(false);
    }
  }

  return (
    <main id="top">
      <header className="brandbar"><span className="brand-seal">识</span><span>刘迷糊丨自我探索</span></header>

      <section className="form-section" id="start">
        <div className="product-heading"><h1>识己 · 底色</h1><p>认识自己，从看见开始。</p></div>
        <form className="generator-form" onSubmit={makeReport}>
          <fieldset className="form-block">
            <legend><span>01</span><strong>出生信息</strong></legend>
            <p className="block-intro">请选择公历（新历）出生信息。</p>
            <div className="date-grid">
              <label><span>出生年份（新历）</span><select value={form.year} onChange={event => update('year', event.target.value)}><option value="">请选择</option>{years.map(year => <option value={year} key={year}>{year} 年</option>)}</select></label>
              <label><span>出生月份</span><select value={form.month} onChange={event => { update('month', event.target.value); update('day', ''); }}><option value="">请选择</option>{Array.from({ length: 12 }, (_, index) => index + 1).map(month => <option value={month} key={month}>{month} 月</option>)}</select></label>
              <label><span>出生日期</span><select value={form.day} onChange={event => update('day', event.target.value)}><option value="">请选择</option>{days.map(day => <option value={day} key={day}>{day} 日</option>)}</select></label>
              <label><span>出生时辰（真太阳时）</span><select value={form.hour} onChange={event => update('hour', event.target.value as HourOption)}><option value="">请选择</option>{HOURS.map(hour => <option value={hour.value} key={hour.value}>{hour.label}</option>)}</select></label>
            </div>
          </fieldset>

          <fieldset className="form-block">
            <legend><span>02</span><strong>你现在最想了解什么？</strong></legend>
            <ChoiceGroup name="focus" value={form.focus} options={FOCUS_OPTIONS} onChange={value => update('focus', value as FormData['focus'])} />
          </fieldset>

          <fieldset className="form-block">
            <legend><span>03</span><strong>最近一次状态比较在线时，哪些条件更接近？</strong></legend>
            <p className="block-intro">可选择1—2项。</p>
            <MultiChoiceGroup<Effective> name="effective" values={form.effective} options={EFFECTIVE_OPTIONS} onChange={values => update('effective', values)} />
          </fieldset>

          <fieldset className="form-block">
            <legend><span>04</span><strong>当你开始消耗时，哪些信号通常最先出现？</strong></legend>
            <p className="block-intro">可选择1—2项。选择最早出现的信号，而不是最严重的表现。</p>
            <MultiChoiceGroup<Overload> name="overload" values={form.overload} options={OVERLOAD_OPTIONS} onChange={values => update('overload', values)} />
          </fieldset>

          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="primary-button" type="submit" disabled={making}>{making ? '正在制作你的识己 · 底色……' : '制作我的底色'}<span aria-hidden="true">→</span></button>
        </form>
      </section>

      {report && (
        <section className="report-section" id="report">
          <article className={`result-card day-tone-${report.dayElement} polarity-${report.dayPolarity} season-${report.season}`}><ReportContent report={report} /></article>
          <div className="report-actions">
            {!unlocked ? <button className="primary-button" type="button" onClick={openSurvey}>解锁保存本地<span aria-hidden="true">↗</span></button> : (
              <div className="save-panel" id="save">
                <h2>谢谢你花时间告诉我这些</h2>
                <p>你的回答已经收到。</p>
                <p>认识自己，不是找到一个固定答案，而是逐渐看见自己如何运转，也看见自己仍然拥有怎样的选择。</p>
                <div className="map-bridge"><h3>从底色，到完整地图</h3><p>如果你还想进一步理解：这种运行方式怎样形成、不同维度如何互相影响，以及你当前处在什么阶段——《识己 · 自我认知八维地图》会在完整资料和现实校准的基础上，展开八个自我认知维度、原局核心解析与行动启示。</p></div>
                <button className="primary-button" type="button" onClick={saveImage} disabled={saving}>{saving ? '正在制作图片……' : '保存为图片'}<span aria-hidden="true">↓</span></button>
                {saveMessage && <p className="save-message" role="status">{saveMessage}</p>}
              </div>
            )}
          </div>
        </section>
      )}

      <footer className="site-footer">刘迷糊丨自我探索</footer>

      {report && <div className="export-stage"><section ref={exportRef}><ExportCard report={report} qrCode={qrCode} /></section></div>}

      {savedImage && (
        <div className="image-modal" role="dialog" aria-modal="true" aria-label="保存识己底色图片">
          <div className="image-modal-card"><button type="button" onClick={() => setSavedImage('')} aria-label="关闭">×</button><h2>长按图片，保存到相册</h2><img src={savedImage} alt="识己底色长图" /></div>
        </div>
      )}
    </main>
  );
}
