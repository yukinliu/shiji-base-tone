'use client';

import { toPng } from 'html-to-image';
import QRCode from 'qrcode';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  daysInMonth,
  generateReport,
} from '../lib/report-engine';
import type { BaseToneReport, FormData, HourOption } from '../lib/report-engine';

const HOURS: { value: HourOption; label: string }[] = [
  { value: 'zi_early', label: '子时｜00:00–00:59' },
  { value: 'chou', label: '丑时｜01:00–02:59' },
  { value: 'yin', label: '寅时｜03:00–04:59' },
  { value: 'mao', label: '卯时｜05:00–06:59' },
  { value: 'chen', label: '辰时｜07:00–08:59' },
  { value: 'si', label: '巳时｜09:00–10:59' },
  { value: 'wu', label: '午时｜11:00–12:59' },
  { value: 'wei', label: '未时｜13:00–14:59' },
  { value: 'shen', label: '申时｜15:00–16:59' },
  { value: 'you', label: '酉时｜17:00–18:59' },
  { value: 'xu', label: '戌时｜19:00–20:59' },
  { value: 'hai', label: '亥时｜21:00–22:59' },
  { value: 'zi_late', label: '子时｜23:00–23:59' },
  { value: 'unknown', label: '不确定' },
];

const FOCUS_OPTIONS = [
  ['energy', '能量与恢复', '看见自己怎样进入状态，又在何时开始消耗'],
  ['strength', '优势与方向', '理解优势依赖什么条件，又在哪里转为代价'],
  ['relationship', '关系与相处', '观察角色、反馈、责任和回应边界'],
  ['overall', '先看整体', '暂时没有特定方向，从整体循环开始'],
] as const;

const EFFECTIVE_OPTIONS = [
  ['clarity', '方向清楚', '知道什么最重要'],
  ['autonomy', '有自主空间', '可以按自己的方式推进'],
  ['coordination', '配合顺畅', '沟通和反馈能够推动事情'],
  ['progress', '进展可见', '知道投入正在产生结果'],
] as const;

const OVERLOAD_OPTIONS = [
  ['start_delay', '越来越难启动', '明明有事要做，却迟迟进不去'],
  ['over_response', '持续回应，停不下来', '外部要求不断进入，没有结束边界'],
  ['cognitive_carryover', '事情结束，头脑还在处理', '复盘持续运转，却没有新结论'],
  ['input_fatigue', '对信息与交流失去耐心', '想先从持续输入中退开'],
] as const;

const EMPTY_FORM: FormData = {
  year: '', month: '', day: '', hour: '', focus: '', effective: '', overload: '',
};

function ChoiceGroup({
  name,
  value,
  options,
  onChange,
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
          <input
            type="radio"
            name={name}
            value={optionValue}
            checked={value === optionValue}
            onChange={() => onChange(optionValue)}
          />
          <span className="choice-letter">{String.fromCharCode(65 + index)}</span>
          <span className="choice-copy">
            <strong>{title}</strong>
            <small>{detail}</small>
          </span>
          <span className="choice-check" aria-hidden="true">✓</span>
        </label>
      ))}
    </div>
  );
}

function ReportContent({ report, compact = false }: { report: BaseToneReport; compact?: boolean }) {
  return (
    <>
      <header className="report-head">
        <p>你的底色</p>
        <h2>{report.title}</h2>
        <span>{report.subtitle}</span>
      </header>

      <div className="report-core">
        <p>{report.coreDescription}</p>
      </div>

      <div className="report-pair">
        <section>
          <span>01</span>
          <h3>状态在线的条件</h3>
          <p>{report.effectiveCondition}</p>
        </section>
        <section>
          <span>02</span>
          <h3>开始消耗的信号</h3>
          <p>{report.overloadSignal}</p>
        </section>
      </div>

      <section className="observe-block">
        <span>可以观察</span>
        <p>{report.observationQuestion}</p>
      </section>

      {!compact && (
        <>
          <p className="report-boundary">{report.boundaryNote}</p>
          <section className="full-bridge">
            <span>从底色，到完整地图</span>
            <p>{report.fullReportBridge}</p>
          </section>
        </>
      )}
    </>
  );
}

function ExportCard({ report, qrCode, share }: { report: BaseToneReport; qrCode: string; share: boolean }) {
  return (
    <article className="export-card">
      <div className="export-paper">
        <div className="export-brand"><span>识</span>识己 · 底色</div>
        <ReportContent report={report} />
        <footer className="export-signoff">SHIJI · BASE TONE / {report.contentVersion}</footer>
      </div>
      {share && (
        <div className="share-tail">
          <div className="crop-hint"><span /> 以下为体验入口，裁去不影响报告正文 <span /></div>
          <div className="share-tail-content">
            <div>
              <strong>也想看见自己的底色？</strong>
              <p>扫码填写出生信息，生成一张属于你的自我观察卡。</p>
            </div>
            {qrCode ? <img src={qrCode} alt="识己底色H5二维码" /> : <div className="qr-placeholder" />}
          </div>
        </div>
      )}
    </article>
  );
}

export default function Home() {
  const currentYear = new Date().getFullYear();
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [report, setReport] = useState<BaseToneReport | null>(null);
  const [generating, setGenerating] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [error, setError] = useState('');
  const [showDemoSurvey, setShowDemoSurvey] = useState(false);
  const [downloading, setDownloading] = useState<'plain' | 'share' | null>(null);
  const [qrCode, setQrCode] = useState('');
  const plainExportRef = useRef<HTMLElement>(null);
  const shareExportRef = useRef<HTMLElement>(null);

  const years = useMemo(() => Array.from({ length: currentYear - 1899 }, (_, i) => currentYear - i), [currentYear]);
  const days = useMemo(() => Array.from({ length: daysInMonth(Number(form.year), Number(form.month)) }, (_, i) => i + 1), [form.year, form.month]);

  useEffect(() => {
    const saved = sessionStorage.getItem('shiji-base-tone-report');
    const savedForm = sessionStorage.getItem('shiji-base-tone-form');
    const params = new URLSearchParams(window.location.search);
    if (saved) {
      setReport(JSON.parse(saved));
      if (savedForm) setForm(JSON.parse(savedForm));
    }
    if (params.get('survey') === 'done' && saved) {
      sessionStorage.setItem('shiji-base-tone-unlocked', 'true');
      setUnlocked(true);
      window.history.replaceState({}, '', window.location.pathname);
      setTimeout(() => document.getElementById('report')?.scrollIntoView({ behavior: 'smooth' }), 120);
    } else if (sessionStorage.getItem('shiji-base-tone-unlocked') === 'true') {
      setUnlocked(true);
    }
  }, []);

  useEffect(() => {
    const base = typeof window === 'undefined' ? '' : `${window.location.origin}${window.location.pathname}?from=share_card`;
    if (base) QRCode.toDataURL(base, { width: 220, margin: 2, color: { dark: '#26332d', light: '#fffaf1' } }).then(setQrCode);
  }, [report]);

  function update<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
    setError('');
  }

  function validate() {
    if (!form.year || !form.month || !form.day || !form.hour) return '请先完整填写公历出生日期和出生时辰。';
    const selectedDate = new Date(Number(form.year), Number(form.month) - 1, Number(form.day), 12);
    if (selectedDate.getTime() > Date.now()) return '出生日期不能晚于今天。';
    if (!form.focus || !form.effective || !form.overload) return '请完成三道现实选择题。';
    return '';
  }

  function handleGenerate(event: React.FormEvent) {
    event.preventDefault();
    const nextError = validate();
    if (nextError) {
      setError(nextError);
      document.getElementById('start')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    setGenerating(true);
    setTimeout(() => {
      try {
        const nextReport = generateReport(form);
        setReport(nextReport);
        setUnlocked(false);
        sessionStorage.setItem('shiji-base-tone-report', JSON.stringify(nextReport));
        sessionStorage.setItem('shiji-base-tone-form', JSON.stringify(form));
        sessionStorage.removeItem('shiji-base-tone-unlocked');
        setGenerating(false);
        setTimeout(() => document.getElementById('report')?.scrollIntoView({ behavior: 'smooth' }), 100);
      } catch {
        setGenerating(false);
        setError('这次没有顺利生成。请确认日期与时辰后再试一次。');
      }
    }, 680);
  }

  function openSurvey() {
    const url = process.env.NEXT_PUBLIC_WJX_URL;
    if (url) {
      window.location.assign(url);
    } else {
      setShowDemoSurvey(true);
    }
  }

  function simulateSurveyComplete() {
    sessionStorage.setItem('shiji-base-tone-unlocked', 'true');
    setUnlocked(true);
    setShowDemoSurvey(false);
  }

  async function downloadCard(kind: 'plain' | 'share') {
    const target = kind === 'plain' ? plainExportRef.current : shareExportRef.current;
    if (!target || !report) return;
    setDownloading(kind);
    try {
      await document.fonts.ready;
      const dataUrl = await toPng(target, {
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: '#f6f1e7',
      });
      const link = document.createElement('a');
      link.download = kind === 'plain' ? '识己·底色-收藏版.png' : '识己·底色-分享版.png';
      link.href = dataUrl;
      link.click();
    } finally {
      setDownloading(null);
    }
  }

  return (
    <main>
      <section className="hero-shell">
        <nav className="brandbar" aria-label="主导航">
          <a className="brandmark" href="#top" aria-label="识己底色首页"><span className="brand-seal">识</span><span>识己 · 底色</span></a>
          <span className="nav-note">免费自我观察卡</span>
        </nav>

        <div className="hero" id="top">
          <div className="season-orbit" aria-hidden="true"><span className="orbit-dot orbit-dot-a" /><span className="orbit-dot orbit-dot-b" /><span className="orbit-line" /></div>
          <div className="hero-copy">
            <p className="eyebrow">先看见底色，再展开地图</p>
            <h1>你如何进入状态，<br />又在何时开始消耗？</h1>
            <p className="hero-lead">用简化出生结构与三项现实选择，生成一张可以在日常中验证的观察卡。它不替你定义自己，只给你一个开始看见自己的位置。</p>
            <a className="primary-action" href="#start">生成我的底色<span aria-hidden="true">↘</span></a>
            <p className="privacy-line">约 2 分钟 · 不注册 · 不收邮箱</p>
          </div>

          <article className="sample-card" aria-label="底色卡示例">
            <div className="sample-wash" aria-hidden="true" />
            <p className="card-kicker">你的底色</p><h2>冬夜里的篝火</h2>
            <p className="card-body">当想法能够进入表达、试做或成果雏形时，状态更容易被组织起来。真正开始消耗你的，未必是事情本身，而是回应已经结束，思考却还没有形成出口。</p>
            <div className="observation-line"><span>可以观察</span><p>我是在继续形成新结论，还是已经进入没有新信息的重复处理？</p></div>
            <span className="card-index">BASE / 01</span>
          </article>
        </div>

        <div className="step-strip" aria-label="生成流程">
          {[['01', '填写出生信息', '公历年月日与真太阳时辰'], ['02', '看见你的底色', '一段描述、两个条件、一个观察'], ['03', '完成需求调研', '提交后保存收藏版与分享版']].map(([number, title, detail]) => (
            <div className="step-item" key={number}><span>{number}</span><div><strong>{title}</strong><p>{detail}</p></div></div>
          ))}
        </div>
      </section>

      <section className="form-section" id="start">
        <div className="section-heading">
          <p className="eyebrow">从这里开始</p>
          <h2>填写你的出生信息</h2>
          <p>使用公历日期，以及你按真太阳时确认的时辰。</p>
        </div>

        <form className="generator-form" onSubmit={handleGenerate}>
          <fieldset className="form-block">
            <legend><span>01</span><div><strong>出生日期与时辰</strong><small>只用于生成当前报告</small></div></legend>
            <div className="date-grid">
              <label><span>出生年份</span><select value={form.year} onChange={e => update('year', e.target.value)}><option value="">请选择</option>{years.map(year => <option value={year} key={year}>{year} 年</option>)}</select></label>
              <label><span>出生月份</span><select value={form.month} onChange={e => { update('month', e.target.value); update('day', ''); }}><option value="">请选择</option>{Array.from({ length: 12 }, (_, i) => i + 1).map(month => <option value={month} key={month}>{month} 月</option>)}</select></label>
              <label><span>出生日期</span><select value={form.day} onChange={e => update('day', e.target.value)}><option value="">请选择</option>{days.map(day => <option value={day} key={day}>{day} 日</option>)}</select></label>
              <label className="hour-field"><span>出生时辰</span><select value={form.hour} onChange={e => update('hour', e.target.value as HourOption)}><option value="">请选择</option>{HOURS.map(hour => <option value={hour.value} key={hour.value}>{hour.label}</option>)}</select></label>
            </div>
            <p className="solar-note"><span>真太阳时说明</span>以上区间以真太阳时为准。如果尚未校正，可以先按出生证明或家人记录的钟表时间选择；接近时辰交界时，本次结果只作为观察入口。</p>
          </fieldset>

          <fieldset className="form-block">
            <legend><span>02</span><div><strong>你现在最想了解什么？</strong><small>选择一个最接近的方向</small></div></legend>
            <ChoiceGroup name="focus" value={form.focus} options={FOCUS_OPTIONS} onChange={value => update('focus', value as FormData['focus'])} />
          </fieldset>

          <fieldset className="form-block">
            <legend><span>03</span><div><strong>最近一次状态比较在线时，哪个条件最接近？</strong><small>不必选理想答案，只选真实发生过的</small></div></legend>
            <ChoiceGroup name="effective" value={form.effective} options={EFFECTIVE_OPTIONS} onChange={value => update('effective', value as FormData['effective'])} />
          </fieldset>

          <fieldset className="form-block">
            <legend><span>04</span><div><strong>当你开始消耗时，哪个信号通常最先出现？</strong><small>选择最早出现，而不是最严重的表现</small></div></legend>
            <ChoiceGroup name="overload" value={form.overload} options={OVERLOAD_OPTIONS} onChange={value => update('overload', value as FormData['overload'])} />
          </fieldset>

          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="submit-zone">
            <button className="submit-button" type="submit" disabled={generating}>{generating ? '正在整理你的结构与选择…' : '生成我的底色'}<span>{generating ? '···' : '→'}</span></button>
            <p>出生信息和选择只用于本次生成，不会自动进入完整版分析。</p>
          </div>
        </form>
      </section>

      {report && (
        <section className="report-section" id="report">
          <div className="section-heading report-heading"><p className="eyebrow">你的报告已生成</p><h2>先读完，再决定是否保存</h2><p>完整报告已在页面展示；提交需求调研后，可以下载两种长图。</p></div>
          <article className={`result-card tone-${report.imageKey.split('-')[0]}`}><div className="result-glow" aria-hidden="true" /><ReportContent report={report} /></article>

          <div className="report-actions">
            {!unlocked ? (
              <div className="locked-panel">
                <span className="lock-mark">调研后解锁</span>
                <h3>告诉我们，你真正期待完整报告回答什么</h3>
                <p>约 2 分钟。提交后即可保存收藏版与带可裁切二维码的分享版。</p>
                <button type="button" onClick={openSurvey}>填写需求调研，解锁保存 <span>↗</span></button>
                {!process.env.NEXT_PUBLIC_WJX_URL && <small>当前为开发预览，问卷星链接配置后会在此打开。</small>}
              </div>
            ) : (
              <div className="unlocked-panel">
                <p className="unlock-success">已完成调研 · 下载已解锁</p>
                <div className="download-grid">
                  <button type="button" onClick={() => downloadCard('plain')} disabled={downloading !== null}><span>收藏版</span><strong>{downloading === 'plain' ? '正在生成…' : '保存我的底色'}</strong><small>完整正文，不带二维码</small></button>
                  <button type="button" onClick={() => downloadCard('share')} disabled={downloading !== null}><span>分享版</span><strong>{downloading === 'share' ? '正在生成…' : '生成分享长图'}</strong><small>底部二维码可独立裁去</small></button>
                </div>
              </div>
            )}
            <button className="text-action" type="button" onClick={() => document.getElementById('start')?.scrollIntoView({ behavior: 'smooth' })}>修改信息，重新生成</button>
          </div>
        </section>
      )}

      <section className="boundary-section">
        <div><p className="eyebrow">一张卡，与一张地图</p><h2>底色给你一个入口，<br />地图展开完整的自己。</h2></div>
        <div className="boundary-copy"><p>免费版不判断格局、喜用、大运、流年和具体事件。它只从有限结构与现实选择中，找到一条值得继续观察的线。</p><p>《识己 · 自我认知地图》会在完整资料、八字与紫微独立研判和现实校准的基础上，展开八个维度。</p><a href={process.env.NEXT_PUBLIC_FULL_REPORT_URL || '#top'}>了解完整自我认知地图 <span>→</span></a></div>
      </section>

      <footer className="site-footer"><span>识己 · 底色</span><p>不是为了定义你，而是帮助你看见更多选择。</p><small>© {currentYear} SHIJI</small></footer>

      {showDemoSurvey && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="demo-title">
          <div className="survey-demo">
            <button className="modal-close" type="button" onClick={() => setShowDemoSurvey(false)} aria-label="关闭">×</button>
            <span className="demo-label">开发预览</span>
            <h2 id="demo-title">问卷星链接尚未配置</h2>
            <p>正式上线后，这里会进入你的问卷星需求调研，并在提交后自动返回当前报告页。</p>
            <button type="button" className="demo-unlock" onClick={simulateSurveyComplete}>模拟已提交调研，测试下载</button>
          </div>
        </div>
      )}

      {report && (
        <div className="export-stage" aria-hidden="true">
          <section ref={plainExportRef}><ExportCard report={report} qrCode={qrCode} share={false} /></section>
          <section ref={shareExportRef}><ExportCard report={report} qrCode={qrCode} share /></section>
        </div>
      )}
    </main>
  );
}
