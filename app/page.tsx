'use client';

import { toPng } from 'html-to-image';
import QRCode from 'qrcode';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  FOCUS_OPTIONS, QUESTIONS, CHANNEL_LABEL, SEASON_LABEL, daysInMonth, generateMythReport,
  type AnswerKey, type BirthData, type DimensionKey, type Focus, type HourOption, type MythReport,
} from '../lib/report-engine';

// 用 <img> + canvas 取图转 data URL：比 fetch 更稳，在微信内置浏览器/手机 Safari 等
// webview 中也能正常工作（fetch 同源图片在这些环境常被拦截，导致保存图缺图）。
// maxSize：把图缩放到最长边不超过 maxSize，避免导出图（含该 data URL）过大导致手机端
// 渲染整张 SVG 失败（iOS Safari 对 foreignObject 内联图的尺寸有上限，超限会整张空白）。
function loadImage(absolute: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = async () => {
      try { if (img.decode) await withTimeout(img.decode(), 4000, '图片解码'); } catch { /* onload 已说明图片可用 */ }
      resolve(img);
    };
    img.onerror = () => reject(new Error(`图片加载失败 ${absolute}`));
    img.src = absolute;
  });
}

async function assetToDataUrl(path: string, maxSize = 1024, mimeType: 'image/png' | 'image/jpeg' = 'image/png', quality = 0.92): Promise<string> {
  const absolute = new URL(path, window.location.href).href;
  const img = await loadImage(absolute);
  const scale = Math.min(1, maxSize / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('无法创建画布上下文');
  ctx.drawImage(img, 0, 0, w, h);
  return mimeType === 'image/jpeg' ? canvas.toDataURL('image/jpeg', quality) : canvas.toDataURL('image/png');
}

// 给任意 Promise 套一层超时：超时即 reject，确保 toPng 这类「既不 resolve 也不 reject」的
// 挂起（超大 SVG data URL 在手机/webview 中 onload/onerror 都不触发）不会让「正在制作图片」永远灰着。
function withTimeout<T>(promise: Promise<T>, ms: number, label = '操作'): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error(`${label}超时 ${ms}ms`)), ms);
    promise.then(
      value => { window.clearTimeout(timer); resolve(value); },
      error => { window.clearTimeout(timer); reject(error); },
    );
  });
}

// 等一张 <img> 绘制完成；已完成直接返回，未完成最多等 timeoutMs（超时也继续，绝不卡死）。
async function imgReady(image: HTMLImageElement, timeoutMs = 8000): Promise<void> {
  if (!(image.complete && image.naturalWidth > 0)) await new Promise<void>(resolve => {
    const timer = window.setTimeout(() => resolve(), timeoutMs);
    const done = () => { window.clearTimeout(timer); resolve(); };
    image.addEventListener('load', done, { once: true });
    image.addEventListener('error', done, { once: true });
    if (image.complete && image.naturalWidth === 0) { try { image.src = image.src; } catch { /* 忽略 */ } }
  });
  try { if (image.decode) await withTimeout(image.decode(), 4000, '图片解码'); } catch { /* 已加载时继续 */ }
}

const TRANSPARENT_PIXEL = 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';

type DrawBox = { x: number; y: number; width: number; height: number };

function relativeBox(element: Element, root: Element): DrawBox {
  const box = element.getBoundingClientRect();
  const origin = root.getBoundingClientRect();
  return { x: box.left - origin.left, y: box.top - origin.top, width: box.width, height: box.height };
}

function drawContain(ctx: CanvasRenderingContext2D, image: HTMLImageElement, box: DrawBox) {
  const scale = Math.min(box.width / image.naturalWidth, box.height / image.naturalHeight);
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;
  ctx.drawImage(image, box.x + (box.width - width) / 2, box.y + (box.height - height) / 2, width, height);
}

function drawCover(ctx: CanvasRenderingContext2D, image: HTMLImageElement, box: DrawBox, positionY = .5) {
  const scale = Math.max(box.width / image.naturalWidth, box.height / image.naturalHeight);
  const sourceWidth = box.width / scale;
  const sourceHeight = box.height / scale;
  const sourceX = Math.max(0, (image.naturalWidth - sourceWidth) / 2);
  const sourceY = Math.max(0, (image.naturalHeight - sourceHeight) * positionY);
  ctx.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, box.x, box.y, box.width, box.height);
}

// iOS/微信 WebView 偶发让 html-to-image 同时丢失所有位图。移动端先截取纯 HTML，
// 再用原生 Canvas 把人物、四季意象和二维码绘回准确位置，避开 foreignObject 的位图限制。
async function renderMobileComposite(
  root: HTMLElement,
  sources: { hero: string; imagery: string; productQr: string; wechatQr: string },
): Promise<string> {
  const card = root.querySelector('.export-card') as HTMLElement | null;
  const heroSection = root.querySelector('.result-master-hero') as HTMLElement | null;
  const heroCanvas = root.querySelector('.result-master-canvas') as HTMLElement | null;
  const heroImage = root.querySelector('.result-master-art') as HTMLImageElement | null;
  const imagerySection = root.querySelector('.imagery-transition') as HTMLElement | null;
  const imageryImage = root.querySelector('.imagery-transition-art') as HTMLImageElement | null;
  const productImage = root.querySelector('.qr-item:first-child img') as HTMLImageElement | null;
  const wechatImage = root.querySelector('.wechat-qr-crop img') as HTMLImageElement | null;
  if (!card || !heroSection || !heroCanvas || !heroImage || !imagerySection || !imageryImage || !productImage || !wechatImage) {
    throw new Error('导出图层不完整');
  }

  const heroBox = relativeBox(heroImage, root);
  const imageryBox = relativeBox(imageryImage, root);
  const productBox = relativeBox(productImage, root);
  const wechatBox = relativeBox(wechatImage, root);
  const imageryPosition = Number.parseFloat(getComputedStyle(imageryImage).objectPosition.split(' ').at(-1) || '50') / 100;
  const styled = [card, heroSection, heroCanvas, imagerySection];
  const originalStyles = styled.map(element => element.style.cssText);
  const rasterImages = [heroImage, imageryImage, productImage, wechatImage];
  const originalSources = rasterImages.map(image => image.src);

  let overlayUrl = '';
  try {
    card.style.background = 'transparent';
    heroSection.style.background = 'transparent';
    heroCanvas.style.background = 'transparent';
    imagerySection.style.background = 'transparent';
    rasterImages.forEach(image => { image.src = TRANSPARENT_PIXEL; });
    await Promise.all(rasterImages.map(image => imgReady(image, 1500)));
    overlayUrl = await withTimeout(
      toPng(root, { pixelRatio: 1, cacheBust: false, skipFonts: true }),
      30000,
      '生成文字图层',
    );
  } finally {
    styled.forEach((element, index) => { element.style.cssText = originalStyles[index]; });
    rasterImages.forEach((image, index) => { image.src = originalSources[index]; });
  }

  const [overlay, hero, imagery, product, wechat] = await Promise.all([
    loadImage(overlayUrl), loadImage(sources.hero), loadImage(sources.imagery),
    loadImage(sources.productQr), loadImage(sources.wechatQr),
  ]);
  const canvas = document.createElement('canvas');
  canvas.width = overlay.naturalWidth;
  canvas.height = overlay.naturalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('无法创建最终画布');
  ctx.fillStyle = '#f5eee1';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(hero, heroBox.x, heroBox.y, heroBox.width, heroBox.height);
  drawCover(ctx, imagery, imageryBox, Number.isFinite(imageryPosition) ? imageryPosition : .5);
  ctx.drawImage(overlay, 0, 0);

  const insetBox = (image: HTMLImageElement, box: DrawBox) => {
    const style = getComputedStyle(image);
    const left = Number.parseFloat(style.paddingLeft) || 0;
    const right = Number.parseFloat(style.paddingRight) || 0;
    const top = Number.parseFloat(style.paddingTop) || 0;
    const bottom = Number.parseFloat(style.paddingBottom) || 0;
    return { x: box.x + left, y: box.y + top, width: box.width - left - right, height: box.height - top - bottom };
  };
  drawContain(ctx, product, insetBox(productImage, productBox));
  drawContain(ctx, wechat, insetBox(wechatImage, wechatBox));
  return canvas.toDataURL('image/png');
}

// 跨端复制文本：execCommand 在微信/webview 中最可靠；安全上下文下再尝试异步剪贴板。
function copyText(text: string): boolean {
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    ta.style.top = '0';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    ta.setSelectionRange(0, ta.value.length);
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    if (ok) return true;
  } catch { /* 忽略，走下方兜底 */ }
  try {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text);
      return true;
    }
  } catch { /* 忽略 */ }
  return false;
}

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
const ARCHETYPE_POEMS = {
  伏羲: ['静观天地见玄机', '一画开天启人伦', '以慧心照万世不迷'],
  女娲: ['慈心炼石补苍天', '抟土造人藏深情', '以孤身护人间周全'],
  后羿: ['挽弓独对九重天', '神箭无言护苍生', '以孤胆承天下危难'],
  精卫: ['身化微羽魂不灭', '衔木填海志不移', '以寸心撼万古沧溟'],
  大禹: ['三过家门未入内', '凿山导洪身无我', '以凡躯担万民之重'],
  哪吒: ['闹海抽筋不知惧', '剔骨还亲敢担当', '以赤子心守人间安'],
} as const;
const RESULT_HERO_ASSETS: Record<keyof typeof ARCHETYPE_POEMS, { src: string; alt: string }> = {
  伏羲: { src: '/result-heroes/fuxi-v1.png', alt: '伏羲静观山海与星空中的秩序微光' },
  女娲: { src: '/result-heroes/nuwa-v1.png', alt: '女娲在山海云光之间炼石补天' },
  大禹: { src: '/result-heroes/dayu-v1.png', alt: '大禹持杖立于山峡洪流之间' },
  精卫: { src: '/result-heroes/jingwei-v2.png', alt: '精卫衔石面对辽阔沧海' },
  后羿: { src: '/result-heroes/houyi-v4.png', alt: '后羿挽弓立于山海与星空之间' },
  哪吒: { src: '/result-heroes/nezha-v1.png', alt: '哪吒乘风火轮穿过山海云光' },
};

function Brand() {
  return <div className="brand"><span className="brand-mark">识</span><span>刘迷糊丨自我探索</span><small>识己</small></div>;
}

function RevelationOrbit() {
  return (
    <div className="revelation-orbit" aria-hidden="true">
      <span className="revelation-ring ring-outer" />
      <span className="revelation-ring ring-middle" />
      <span className="revelation-ring ring-inner" />
      <span className="revelation-sweep" />
      <span className="revelation-core" />
      {Array.from({ length: 6 }, (_, index) => <i style={{ '--slot': index } as React.CSSProperties} key={index} />)}
    </div>
  );
}

function VeiledArchetypes() {
  return (
    <div className="landing-figures" aria-hidden="true">
      <img className="veiled-collage" src="myth-archetypes-hero.jpg" alt="" />
      {Array.from({ length: 6 }, (_, index) => (
        <span className={`veiled-figure figure-${index}`} key={index}><img src={`portraits/${index}.jpg`} alt="" /></span>
      ))}
    </div>
  );
}

function MythPortrait({ index, className = '', dataUrl = '' }: { index: number; className?: string; dataUrl?: string }) {
  // 永远用 <img>：
  // 1. dataUrl（内联小图）优先——导出前会被覆盖成 data URL，html-to-image 不依赖网络。
  // 2. 否则走预切好的 portraits/{index}.jpg（约 60KB），避免页面/保存阶段加载 3.97MB 精灵图。
  //    这是“长时间灰度没下文”的物理根因：myth-archetypes-v1.png 高达 3.97MB，直连都要 50s+。
  const src = dataUrl || `portraits/${index}.jpg`;
  return <img className={`myth-portrait portrait-img ${className}`} src={src} alt="神话原型人物视觉" draggable={false} />;
}

function themeClass(report: MythReport) {
  return `theme-${report.season}-${report.channel}`;
}

function SceneAtmosphere() {
  return <div className="scene-atmosphere" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /><i /></div>;
}

function ResultHero({ report, heroDataUrl = '', exportMode = false }: { report: MythReport; heroDataUrl?: string; exportMode?: boolean }) {
  const archetype = report.archetype as keyof typeof ARCHETYPE_POEMS;
  const hero = RESULT_HERO_ASSETS[archetype];
  return (
    <section className={`result-hero result-master-hero${exportMode ? ' is-export' : ''} archetype-${report.archetypeIndex} tone-${report.dayElement} season-${report.season} ${themeClass(report)}`}>
      <div className="result-master-canvas">
        <img className="result-master-art" src={heroDataUrl || hero.src} alt={hero.alt} draggable={false} />
        <div className="result-master-inner">
          <Brand />
          <div className="result-poem" aria-label={ARCHETYPE_POEMS[archetype].join('，')}>
            {ARCHETYPE_POEMS[archetype].map(line => <span key={line}>{line}</span>)}
          </div>
          <div className="result-master-copy">
            <div className="result-master-identity">
              <p className="result-scene">{SEASON_LABEL[report.season]} · {CHANNEL_LABEL[report.channel]}</p>
              <p className="result-kicker"><span />与你最接近的是<span /></p>
              <h1>{report.archetype}</h1>
              <p className="result-master-role"><span />{report.archetypeTitle}<span /></p>
              <p className="result-line">{report.archetypeLine}</p>
            </div>
            <div className="result-facts result-master-facts">
              <p><i>神话依据</i><span>{report.mythBasis}</span></p>
              <p><i>核心动机</i><span>{report.coreMotivation}</span></p>
              <p><i>阴影</i><span>{report.shadow}</span></p>
              <p className="result-imagery"><i>生命意象</i><span>{report.imageryTitle}</span></p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function DimensionSigil({ report, compact = false }: { report: MythReport; compact?: boolean }) {
  const values = report.dimensionResults.map(dimension => dimension.value);
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const range = maximum - minimum;
  return (
    <div className={`dimension-sigil ${compact ? 'is-compact' : ''}`} aria-label="你的四维纹章">
      {(() => {
        const strong = strongestSet(report);
        return report.dimensionResults.map(dimension => {
          const relative = range > .001 ? (dimension.value - minimum) / range : .48;
          const level = 42 + relative * 58;
          return <div className={strong.has(dimension.key) ? 'sigil-axis is-strongest' : 'sigil-axis'} key={dimension.key}>
            <div className="sigil-track"><i style={{ '--level': `${level}%` } as React.CSSProperties} /></div>
            <span>{SIGIL_LABELS[dimension.key]}</span>
          </div>;
        });
      })()}
    </div>
  );
}

// D18：并列失真处理——最高分并列时不再单独点名，改说“同时亮起”。
function strongestSet(report: MythReport) {
  const max = Math.max(...report.dimensionResults.map(dimension => dimension.value));
  return new Set(report.dimensionResults.filter(dimension => max - dimension.value < 1e-9).map(dimension => dimension.key));
}

function sigilInsight(report: MythReport) {
  const ordered = [...report.dimensionResults].sort((a, b) => b.value - a.value);
  const tied = ordered.filter(dimension => ordered[0].value - dimension.value < 1e-9);
  if (tied.length === 2) return `在你的四维纹章里，「${tied[0].label}」与「${tied[1].label}」同时亮起，互为支点。`;
  if (tied.length > 2) return `在你的四维纹章里，${tied.map(dimension => `「${dimension.label}」`).join('、')}同时亮起，难分主次。`;
  return `在你的四维纹章里，${ordered[0].label}最先亮起，${ordered[1].label}为它提供第二个支点。`;
}

// 长图压缩定稿①的另一半：最强项之外，其余维度用一句话交代位置。
function restInsight(report: MythReport) {
  const strong = strongestSet(report);
  const rest = report.dimensionResults.filter(dimension => !strong.has(dimension.key)).sort((a, b) => b.value - a.value);
  const names = rest.map(dimension => `「${dimension.label}」`);
  if (names.length === 1) return `${names[0]}紧随其后，构成第二支点。`;
  if (names.length === 2) return `${names[0]}与${names[1]}紧随其后，构成第二、第三支点。`;
  if (names.length === 3) return `${names.join('')}紧随其后，构成第二至第四支点。`;
  return '';
}

function ImageryTransition({ report, exportMode = false, imageryDataUrl = '' }: { report: MythReport; exportMode?: boolean; imageryDataUrl?: string }) {
  const artBySeason: Record<MythReport['season'], { src: string; position: string }> = {
    spring: { src: '/imagery-transitions/spring-season-v2.png', position: '72%' },
    summer: { src: '/imagery-transitions/summer-passage-v1.png', position: '50%' },
    autumn: { src: '/imagery-transitions/autumn-maturity-v1.png', position: '66%' },
    winter: { src: '/imagery-transitions/winter-spark-v1.png', position: '88%' },
  };
  const art = artBySeason[report.season];
  const style = ({ '--imagery-position': art.position } as React.CSSProperties);
  return (
    <section className={`imagery-transition${exportMode ? ' is-export' : ''}`} style={style}>
      <img className="imagery-transition-art" src={imageryDataUrl || art.src} alt="" draggable={false} />
      <svg className="imagery-transition-curve" viewBox="0 0 1000 120" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 0H1000V0C805 112 195 112 0 0Z" />
      </svg>
      <span className="imagery-transition-star" aria-hidden="true">✦</span>
    </section>
  );
}

function ReportSections({ report, exportMode = false }: { report: MythReport; exportMode?: boolean }) {
  return (
    <>
      <section className="report-block dimensions-block">
        <div className="section-heading dimensions-heading"><p className="section-index">01</p><h2>你的四维原型轮廓</h2></div>
        {!exportMode && <div className="dimension-overview"><DimensionSigil report={report} compact /><p>{sigilInsight(report)}</p></div>}
        <div className="dimension-list">
          {(() => {
            const strong = strongestSet(report);
            const isTie = strong.size > 1;
            return report.dimensionResults.map(dimension => (
              <article className={strong.has(dimension.key) ? 'is-strongest' : ''} key={dimension.key}>
                <div><h3>{dimension.label}</h3>{strong.has(dimension.key) && <span>{isTie ? '这股力量在这里同样清楚' : '这股力量在这里最清楚'}</span>}</div>
                <p>{dimension.copy}</p>
              </article>
            ));
          })()}
        </div>
        {exportMode && <p className="export-rest-line">{restInsight(report)}</p>}
      </section>

      <section className="report-block life-block">
        <div className="section-heading"><p className="section-index">02</p><h2>你的生命底色</h2></div>
        <div className="imagery-heading"><span>生命意象</span><h3>{report.imageryTitle}</h3><p>{report.imageryLine}</p></div>
        <p>{report.lifeCopy}</p>
      </section>

      <section className="report-block value-block">
        <div className="section-heading"><p className="section-index">03</p><h2>你更可能怎样形成价值</h2></div>
        <div className="value-chain">
          {report.valueChain.map((node, index) => <div key={node}><span>{String(index + 1).padStart(2, '0')}</span><p>{node}</p></div>)}
        </div>
        <p>{report.valueSummary}</p>
      </section>

      <section className="report-block proposition-block">
        <div className="section-heading"><p className="section-index">04</p><h2>这股力量也需要一个落点</h2></div>
        <p>{report.coreProposition}</p>
      </section>

      <section className="report-block action-block">
        <div className="section-heading"><p className="section-index">05</p><h2>当下的你</h2></div>
        <div className="action-grid">
          <article><span>一个早期信号</span><p>{report.earlySignal}</p></article>
          <article><span>可以观察</span><p>{report.observation}</p></article>
          <article><span>一个小行动</span><p>{report.smallAction}</p></article>
        </div>
      </section>
    </>
  );
}

function MapBridge() {
  return <section className="map-bridge"><p className="section-index">继续探索</p><h2>从神话原型到真实完整的自己</h2><p>如果你还想进一步理解：这些倾向怎样形成、不同维度如何互相影响，以及你当前正在面对什么——《识己 · 自我认知地图》会在完整资料和现实校准的基础上，展开八个自我认知维度、原局核心解析与行动启示。</p></section>;
}

function ExportCard({ report, productQr, wechatQrDataUrl = '', heroDataUrl = '', imageryDataUrl = '' }: { report: MythReport; productQr: string; wechatQrDataUrl?: string; heroDataUrl?: string; imageryDataUrl?: string }) {
  return (
    <article className={`export-card archetype-${report.archetypeIndex} tone-${report.dayElement} season-${report.season} ${themeClass(report)}`}>
      <ResultHero report={report} heroDataUrl={heroDataUrl} exportMode />
      <ImageryTransition report={report} exportMode imageryDataUrl={imageryDataUrl} />
      <div className="export-content"><ReportSections report={report} /><MapBridge /></div>
      <div className="export-sign">刘迷糊丨自我探索 · 识己</div>
      <div className="qr-zone">
        <div className="qr-item"><div><strong><b>识己</b><span>神话原型</span></strong></div><img src={productQr} alt="产品二维码" /></div>
        <div className="qr-item"><div><strong><b>识己</b><span>自我认知地图</span></strong></div><div className="wechat-qr-crop">{wechatQrDataUrl ? <img src={wechatQrDataUrl} alt="刘迷糊个人二维码" /> : <img src="wechat-qr-400.png" alt="刘迷糊个人二维码" />}</div></div>
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
  const [showShareGuide, setShowShareGuide] = useState(false);
  const [productQr, setProductQr] = useState('');
  const [wechatQrDataUrl, setWechatQrDataUrl] = useState('');
  const [resultHeroDataUrl, setResultHeroDataUrl] = useState('');
  const [imageryDataUrl, setImageryDataUrl] = useState('');
  const exportRef = useRef<HTMLDivElement>(null);
  const surveyActive = useRef(false);
  const surveyLeft = useRef(false);
  const surveyOpenedAt = useRef(0);
  const popupTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const answerTransitioning = useRef(false);

  const years = useMemo(() => Array.from({ length: currentYear - 1899 }, (_, index) => currentYear - index), [currentYear]);
  const days = useMemo(() => Array.from({ length: daysInMonth(Number(birth.year), Number(birth.month)) }, (_, index) => index + 1), [birth.year, birth.month]);
  const currentQuestion = QUESTIONS[questionIndex];

  useEffect(() => {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    // 每次正常打开或刷新都从产品开屏进入，避免旧草稿让用户直接落到中间页。
    // 站外调研返回仍由下方 PENDING_KEY 独立恢复报告。
    sessionStorage.removeItem(DRAFT_KEY);
    if (process.env.NODE_ENV === 'development' && new URLSearchParams(window.location.search).get('preview') === 'houyi') {
      const base = generateMythReport(
        Array.from({ length: 18 }, () => 'A' as AnswerKey),
        { year: '1990', month: '6', day: '15', hour: 'unknown' },
        'overall',
      );
      setReport({
        ...base,
        archetype: '后羿',
        archetypeIndex: 4,
        archetypeTitle: '守护者',
        archetypeLine: '当问题真正出现，你更容易锁定关键位置，站出来让事情发生改变。',
        mythBasis: '尧之时十日并出，焦禾稼、杀草木，民无所食；尧乃使羿上射十日，下杀猰貐、凿齿、九婴、大风、封豨、修蛇，万民皆喜（《淮南子·本经训》）。',
        coreMotivation: '出手——能解决的事，别让它烂在那儿。',
        shadow: '把“出手”变成“抢”，用解决代替理解。',
        season: 'summer',
        channel: 'output',
        imageryTitle: '夏·穿行',
        imageryShort: '夏·穿行',
      });
      setStage('report');
      return;
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
    assetToDataUrl('/wechat-qr-400.png', 400).then(setWechatQrDataUrl).catch(() => {});
  }, []);

  useEffect(() => {
    if (!report) return;
    setResultHeroDataUrl('');
    setImageryDataUrl('');
    const hero = RESULT_HERO_ASSETS[report.archetype as keyof typeof RESULT_HERO_ASSETS];
    const imageryPath: Record<MythReport['season'], string> = {
      spring: '/imagery-transitions/spring-season-v2.png', summer: '/imagery-transitions/summer-passage-v1.png',
      autumn: '/imagery-transitions/autumn-maturity-v1.png', winter: '/imagery-transitions/winter-spark-v1.png',
    };
    assetToDataUrl(hero.src, 900, 'image/jpeg', .84).then(setResultHeroDataUrl).catch(() => {});
    assetToDataUrl(imageryPath[report.season], 900, 'image/jpeg', .84).then(setImageryDataUrl).catch(() => {});
  }, [report?.archetype, report?.season]);

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

  function returnToOpening() {
    sessionStorage.removeItem(DRAFT_KEY); localStorage.removeItem(PENDING_KEY);
    setStage('landing'); setAnswers([]); setQuestionIndex(0); setBirth(EMPTY_BIRTH); setFocus(''); setReport(null);
    setUnlocked(SURVEY_GATING !== 'on'); setPendingAvailable(false); setError(''); setMessage(''); setHasSaved(false); setSavedImage('');
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  function chooseAnswer(answer: AnswerKey) {
    if (answerTransitioning.current) return;
    answerTransitioning.current = true;
    const next = [...answers]; next[questionIndex] = answer; setAnswers(next);
    if (questionIndex < 17) setTimeout(() => { setQuestionIndex(questionIndex + 1); answerTransitioning.current = false; }, 220);
    else setTimeout(() => { setStage('birth'); answerTransitioning.current = false; }, 220);
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
    const firstMissing = QUESTIONS.findIndex((_, index) => !ANSWER_KEYS.includes(answers[index]));
    if (firstMissing >= 0) {
      setQuestionIndex(firstMissing); setStage('questions');
      setError('有一道题还没有记录，请补充后再继续。');
      return;
    }
    try {
      const normalizedBirth: BirthData = { ...birth, hour: birth.hour || 'unknown' };
      const next = generateMythReport([...answers], normalizedBirth, focus); setReport(next); setStage('making'); setMakingStep(0);
      [650, 1350, 2100].forEach((delay, index) => window.setTimeout(() => setMakingStep(index + 1), delay));
      window.setTimeout(() => setStage('reveal'), 2850);
    } catch (reportError) {
      console.error('Unable to create report:', reportError);
      setError('这次没有顺利制作，请稍后再试一次；你刚才的答案仍然保留。');
    }
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
      // 字体就绪（最多等 5s，避免个别 webview 里 document.fonts.ready 不触发导致永久挂起）。
      try { if (document.fonts?.ready) await withTimeout(document.fonts.ready, 5000, '字体就绪'); } catch { /* 字体超时不阻断导出 */ }
      // 导出使用与网页相同的主视觉与四季弧形图，并将图片内联，避免移动端截图丢图。
      let heroUrl = resultHeroDataUrl;
      let seasonUrl = imageryDataUrl;
      let wechatUrl = wechatQrDataUrl;
      let productUrl = productQr;
      const hero = RESULT_HERO_ASSETS[report.archetype as keyof typeof RESULT_HERO_ASSETS];
      const seasonPath: Record<MythReport['season'], string> = {
        spring: '/imagery-transitions/spring-season-v2.png', summer: '/imagery-transitions/summer-passage-v1.png',
        autumn: '/imagery-transitions/autumn-maturity-v1.png', winter: '/imagery-transitions/winter-spark-v1.png',
      };
      if (!heroUrl) try { heroUrl = await withTimeout(assetToDataUrl(hero.src, 900, 'image/jpeg', .84), 12000, '准备人物主视觉'); } catch { /* 使用页面资源兜底 */ }
      if (!seasonUrl) try { seasonUrl = await withTimeout(assetToDataUrl(seasonPath[report.season], 900, 'image/jpeg', .84), 12000, '准备生命意象'); } catch { /* 使用页面资源兜底 */ }
      if (!wechatUrl) {
        try { wechatUrl = await withTimeout(assetToDataUrl('/wechat-qr-400.png', 400), 6000, '准备个人二维码'); } catch { /* 用已有值兜底 */ }
      }
      if (!productUrl) {
        const siteUrl = `${window.location.origin}${window.location.pathname}`;
        try { productUrl = await QRCode.toDataURL(siteUrl, { width: 260, margin: 2, color: { dark: '#17323c', light: '#eef3f2' } }); } catch { /* 保留空码兜底 */ }
      }
      const heroSource = heroUrl || new URL(hero.src, window.location.href).href;
      const imagerySource = seasonUrl || new URL(seasonPath[report.season], window.location.href).href;
      const wechatSource = wechatUrl || new URL('/wechat-qr-400.png', window.location.href).href;
      if (!productUrl) throw new Error('产品二维码尚未准备好');
      const exportHero = exportRef.current.querySelector('.result-master-art') as HTMLImageElement | null;
      if (exportHero) exportHero.src = heroSource;
      const exportImagery = exportRef.current.querySelector('.imagery-transition-art') as HTMLImageElement | null;
      if (exportImagery) exportImagery.src = imagerySource;
      const wechatImg = exportRef.current.querySelector('.wechat-qr-crop img') as HTMLImageElement | null;
      if (wechatImg) wechatImg.src = wechatSource;
      const productImg = exportRef.current.querySelector('.qr-item:first-child img') as HTMLImageElement | null;
      if (productImg && productUrl) productImg.src = productUrl;
      // 等所有内联图绘制完成（最长 8s/张，超时也继续，不卡死）。
      const embeddedImages = Array.from(exportRef.current.querySelectorAll('img'));
      await Promise.all(embeddedImages.map(image => imgReady(image, 8000)));
      // 给 WebKit 额外留出解码/绘制时间。实测 500ms 可稳定渲染 background-image，800ms 更稳。
      await new Promise<void>(resolve => setTimeout(resolve, 800));
      // skipFonts:true 跳过 web 字体抓取（避免字体文件在微信/webview 加载慢导致 toPng 永久挂起）；
      // 外层 withTimeout 作最后兜底：toPng 超时即报错提示，而非「正在制作图片」一直灰着没下文。
      const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      const dataUrl = isMobile
        ? await renderMobileComposite(exportRef.current, {
            hero: heroSource, imagery: imagerySource, productQr: productUrl, wechatQr: wechatSource,
          })
        : await withTimeout(
            toPng(exportRef.current, { pixelRatio: 1, cacheBust: false, backgroundColor: '#f5eee1', skipFonts: true }),
            30000, '生成图片'
          );
      if (isMobile) setSavedImage(dataUrl);
      else { const link = document.createElement('a'); link.download = `识己·神话原型-${report.archetype}.png`; link.href = dataUrl; link.click(); }
      setHasSaved(true); setMessage('图片已经准备好。你可以把它留给自己，也可以邀请朋友一起来看看。');
    } catch (saveError) {
      console.error('Unable to create result image:', saveError);
      setMessage('图片暂时没有制作成功，请稍后重试，或换手机浏览器打开再保存。');
    }
    finally { setSaving(false); }
  }

  async function shareProduct() {
    if (!report) return;
    const pageUrl = `${window.location.origin}${window.location.pathname}`;
    const text = `快来看看你最像的神话人物是谁～我是「${report.archetype}」${report.archetypeTitle}\n\n${pageUrl}`;
    const isWeChat = /micromessenger/i.test(navigator.userAgent);
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isWeChat) {
      // 微信内置浏览器无法用 API 唤起原生分享面板（需后端签名的 JS-SDK）。
      // 改为：顺手复制链接 + 弹出引导浮层，让用户点右上角 ··· 分享。
      copyText(text);
      setShowShareGuide(true);
      return;
    }
    try {
      if (isMobile && navigator.share) {
        try {
          await navigator.share({
            title: '你的生命故事里，住着哪位神话人物？',
            text: `我是「${report.archetype}」${report.archetypeTitle}。约 3 分钟，看看与你最接近的神话原型。`,
            url: pageUrl,
          });
          return;
        } catch (shareError) {
          if ((shareError as DOMException)?.name === 'AbortError') return;
          // 其他错误（如被拦截）继续走复制兜底
        }
      }
      const copied = copyText(text);
      if (copied) setMessage('链接已复制，可以发给朋友了。');
      else setMessage('复制失败，请长按上方网址手动发送给朋友。');
    } catch {
      const copied = copyText(text);
      if (copied) setMessage('链接已复制，可以发给朋友了。');
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
        <section className="landing-screen cosmic-stage">
          <div className="landing-content"><Brand /><div className="landing-message"><p className="landing-product">识己 · 神话原型</p><h1>你的生命故事里，<br />住着哪位神话人物？</h1></div><div className="landing-cta"><button className="primary-button light" onClick={startFresh}>看见我的神话<span>→</span></button>{pendingAvailable && <button className="resume-button" onClick={continuePending}>继续刚才的报告</button>}</div></div>
        </section>
      )}

      {stage === 'intro' && (
        <section className="flow-screen intro-screen cosmic-stage"><Brand /><div className="intro-layout"><RevelationOrbit /><div className="screen-copy"><h1>从第一反应开始</h1><p className="intro-lines">没有正确答案<br />选「日常里的你」<br />不是「你应该成为的你」</p><button className="primary-button light" onClick={() => setStage('questions')}>开始<span>→</span></button><p className="expectation-line">约 3 分钟 · 18 题 · 完全隐私</p></div></div></section>
      )}

      {stage === 'questions' && currentQuestion && (
        <section className="flow-screen question-screen"><Brand /><div className="question-progress"><div className="progress-track"><i style={{ width: `${((questionIndex + 1) / 18) * 100}%` }} /></div><span>{String(questionIndex + 1).padStart(2, '0')} / 18</span></div><div className="question-card"><h1>{currentQuestion.text}</h1><div className="answer-list">{ANSWER_KEYS.map(key => <button className={answers[questionIndex] === key ? 'is-selected' : ''} key={`${questionIndex}-${key}`} onClick={() => chooseAnswer(key)}><span>{currentQuestion.options[key]}</span><i /></button>)}</div>{error && <p className="error" role="alert">{error}</p>}<button className="back-link" disabled={questionIndex === 0} onClick={() => { answerTransitioning.current = false; setError(''); setQuestionIndex(index => Math.max(0, index - 1)); }}>← 上一题</button></div></section>
      )}

      {stage === 'birth' && (
        <section className="flow-screen form-screen"><Brand /><div className="screen-copy wide"><p className="eyebrow">你的神话原型已经渐渐清晰</p><h1>让它落进你的生命底色</h1><p className="cosmic-copy">同一股力量，落在不同的时间里，长出来的样子并不一样。</p><div className="form-card"><h2>出生时空</h2><div className="date-grid"><label><span>年份｜公历</span><select value={birth.year} onChange={event => setBirth(previous => ({ ...previous, year: event.target.value }))}><option value="">选择</option>{years.map(year => <option value={year} key={year}>{year}</option>)}</select></label><label><span>月份</span><select value={birth.month} onChange={event => setBirth(previous => ({ ...previous, month: event.target.value, day: '' }))}><option value="">选择</option>{Array.from({ length: 12 }, (_, index) => index + 1).map(month => <option value={month} key={month}>{month}</option>)}</select></label><label><span>日期</span><select value={birth.day} onChange={event => setBirth(previous => ({ ...previous, day: event.target.value }))}><option value="">选择</option>{days.map(day => <option value={day} key={day}>{day}</option>)}</select></label></div><fieldset className="hour-picker"><legend>出生时辰｜选填</legend>{HOURS.map(item => { const [name, time] = item.label.split('｜'); return <button type="button" className={`${birth.hour === item.value ? 'is-selected' : ''} ${item.value === 'unknown' ? 'is-unknown' : ''}`} key={item.value} onClick={() => setBirth(previous => ({ ...previous, hour: item.value }))}><strong>{name}</strong>{time && <span>{time}</span>}</button>; })}</fieldset></div>{error && <p className="error" role="alert">{error}</p>}<button className="primary-button" onClick={continueBirth}>继续<span>→</span></button></div></section>
      )}

      {stage === 'focus' && (
        <section className="flow-screen focus-screen"><Brand /><div className="screen-copy wide"><p className="eyebrow">最后一题</p><h1>选一个此刻最关心的方向</h1><div className="focus-list">{FOCUS_OPTIONS.map(option => <button className={focus === option.value ? 'is-selected' : ''} key={option.value} onClick={() => { setFocus(option.value); setError(''); }}><div><strong>{option.title}</strong><span>{option.detail}</span></div><i /></button>)}</div>{error && <p className="error" role="alert">{error}</p>}<button className="primary-button" onClick={makeReport}>查看我的神话<span>→</span></button></div></section>
      )}

      {stage === 'making' && (
        <section className="making-screen cosmic-stage" onClick={() => report && setStage('reveal')}><Brand /><div className="making-layout"><RevelationOrbit /><div className="making-copy"><p className={makingStep >= 0 ? 'active' : ''}>正在整理你的四维轮廓</p><p className={makingStep >= 1 ? 'active' : ''}>正在看见你的神话原型</p><p className={makingStep >= 2 ? 'active' : ''}>你的生命底色正在绽放</p><strong className={makingStep >= 3 ? 'active' : ''}>看见了</strong></div></div></section>
      )}

      {(stage === 'reveal' || stage === 'report') && report && (
        <section className={`report-page tone-${report.dayElement} season-${report.season} ${themeClass(report)}`}><ResultHero report={report} /><ImageryTransition report={report} /><div className="report-content" id="report-content"><ReportSections report={report} /><MapBridge /><section className="save-area" id="save-area"><div className="save-actions">{renderGate()}<button className="share-button" type="button" onClick={shareProduct}>分享给朋友<span>↗</span></button><button className="secondary-button" type="button" onClick={returnToOpening}>重新制作<span>↻</span></button></div>{message && <p className="status-message" role="status">{message}</p>}</section></div></section>
      )}

      {surveyPrompt && <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="survey-title"><div className="survey-modal"><button className="modal-close" onClick={() => setSurveyPrompt(false)} aria-label="关闭">×</button><p className="eyebrow">保存之前</p><h2 id="survey-title">完成后，记得回来</h2><p>问卷将在新页面打开。提交后，请返回这里保存你的《识己 · 神话原型》。</p><p className="modal-note">本次结果已经为你临时保留。</p><button className="primary-button" onClick={goToSurvey}>去填写调研<span>↗</span></button><button className="text-button" onClick={() => setSurveyPrompt(false)}>暂时不填</button></div></div>}

      {savedImage && <div className="image-modal"><div><button onClick={() => setSavedImage('')} aria-label="关闭">×</button><p>长按图片保存到相册</p><img src={savedImage} alt="识己神话原型长图" /></div></div>}

      {showShareGuide && (
        <div className="share-guide" role="dialog" aria-modal="true" onClick={() => setShowShareGuide(false)}>
          <div className="share-guide-card" onClick={event => event.stopPropagation()}>
            <div className="share-guide-corner"><span>···</span></div>
            <p className="share-guide-title">分享给朋友</p>
            <p>点击右上角 <b>···</b>，选择「发送给朋友」分享给好友，或「分享到朋友圈」。</p>
            <p className="share-guide-note">链接已自动复制，也可以直接粘贴给朋友 👌</p>
            <button className="primary-button" type="button" onClick={() => setShowShareGuide(false)}>知道了</button>
          </div>
        </div>
      )}

      {report && <div className="export-stage" aria-hidden="true"><div ref={exportRef}><ExportCard report={report} productQr={productQr} wechatQrDataUrl={wechatQrDataUrl} heroDataUrl={resultHeroDataUrl} imageryDataUrl={imageryDataUrl} /></div></div>}
    </main>
  );
}
