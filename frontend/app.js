// 선행지표 대시보드 프론트엔드.
// backend/app.py의 /api/fx, /api/csi, /api/income, /api/alcohol 을 호출해 화면을 채운다.

function scaleY(val, min, max, top, bottom) {
  return bottom - ((val - min) / (max - min)) * (bottom - top);
}

function buildPath(pts) {
  return pts.map((p, i) => (i === 0 ? 'M' : 'L') + p.x + ' ' + p.y).join(' ');
}

function svg(tag, attrs) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

function sourceBadge(source) {
  const span = document.createElement('span');
  span.className = 'source-badge ' + (source === 'live' ? 'live' : 'fallback');
  span.textContent = source === 'live' ? '실시간' : '스냅샷';
  return span;
}

function setSourceLine(elId, data) {
  const el = document.getElementById(elId);
  el.textContent = '';
  el.append('출처: ' + data.source_note + ' ');
  el.append(sourceBadge(data.source));
}

function setInsight(elId, html) {
  document.getElementById(elId).innerHTML = '💡 ' + html;
}

// 상승(증가) = 빨강, 하락(감소) = 파랑. 수치(라벨/텍스트)에만 적용하고 그래프 막대 색에는 쓰지 않는다.
function changeColor(value) {
  return value < 0 ? 'var(--color-fall)' : 'var(--color-rise)';
}

// 문장(innerHTML) 안에 색칠된 증감 표시를 끼워넣을 때 쓰는 헬퍼
function coloredChange(value, text) {
  return `<span style="color:${changeColor(value)}">${text}</span>`;
}

async function getJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(path + ' 요청 실패: ' + res.status);
  return res.json();
}

// 라벨이 너무 촘촘해지지 않도록, 전체 포인트 수에 맞춰 표시할 인덱스만 골라준다.
// (예: 60개월치 월별 데이터라도 8~9개 라벨만 남긴다)
// 마지막 라벨은 항상 포함하되, 그 바로 앞 라벨과 너무 가까우면(겹칠 정도면) 앞 라벨을 뺀다.
function pickLabelIndices(n, maxLabels) {
  if (n <= maxLabels) return new Set(Array.from({ length: n }, (_, i) => i));
  const step = Math.ceil(n / (maxLabels - 1));
  const idxs = [];
  for (let i = 0; i < n; i += step) idxs.push(i);
  const last = n - 1;
  if (idxs[idxs.length - 1] !== last) {
    if (last - idxs[idxs.length - 1] < step * 0.6) idxs.pop();
    idxs.push(last);
  }
  return new Set(idxs);
}

// 기본은 전년동기대비(YoY), 값이 없으면 null.
function yoyPct(pts, idx, back, key) {
  const j = idx - back;
  if (j < 0 || pts[j][key] == null || pts[idx][key] == null) return null;
  const prev = pts[j][key];
  if (!prev) return null;
  return (pts[idx][key] - prev) / prev * 100;
}

function fmtPct(pct, digits = 1) {
  return (pct >= 0 ? '▲ ' : '▼ ') + Math.abs(pct).toFixed(digits) + '%';
}

// ---- 1. 환율 ----
function buildFxInsight(pts) {
  const n = pts.length;
  const latest = pts[n - 1];
  const yoy = yoyPct(pts, n - 1, 12, 'usd');
  const mom = yoyPct(pts, n - 1, 1, 'usd');
  let text;
  if (yoy != null) {
    text = `원/달러 환율이 ${latest.label} ${latest.usd.toLocaleString('ko-KR')}원으로 전년동월대비 ${coloredChange(yoy, fmtPct(yoy))}`;
  } else {
    text = `원/달러 환율이 ${latest.label} 기준 ${latest.usd.toLocaleString('ko-KR')}원입니다`;
  }
  if (mom != null && Math.abs(mom) >= 2) {
    text += ` (전월대비 ${coloredChange(mom, fmtPct(mom))}로 변동폭 확대)`;
  }
  return text;
}

function renderFx(data) {
  setSourceLine('fx-source', data);
  const pts = data.points;
  setInsight('fx-insight', buildFxInsight(pts));

  const vals = pts.flatMap(p => [p.usd, p.eur]).filter(v => v != null);
  const min = Math.min(...vals) - 30, max = Math.max(...vals) + 30;
  // 오른쪽 여백을 넉넉히 둬서(right=640, 캔버스 폭 720) 마지막 값 라벨이 잘리지 않게 한다.
  const top = 30, bottom = 200, left = 44, right = 640;
  const xAt = i => left + (i / (pts.length - 1)) * (right - left);
  const labelIdxs = pickLabelIndices(pts.length, 7);

  const usdPts = pts.map((p, i) => ({ x: xAt(i), y: scaleY(p.usd, min, max, top, bottom) }));
  const eurPts = pts
    .map((p, i) => ({ p, i }))
    .filter(({ p }) => p.eur != null)
    // i를 유지해야 eurByIdx에서 원래 인덱스로 다시 찾을 수 있다 (이전 버전은 i를 빠뜨려서 라벨이 전부 안 나오는 버그가 있었음)
    .map(({ p, i }) => ({ x: xAt(i), y: scaleY(p.eur, min, max, top, bottom), i }));
  const eurByIdx = new Map(eurPts.map(e => [e.i, e]));

  const chart = svg('svg', { width: 720, height: 240, viewBox: '0 0 720 240' });
  for (let i = 0; i < 4; i++) {
    const y = top + (i * (bottom - top)) / 3;
    chart.append(svg('line', { x1: 0, y1: y, x2: 720, y2: y, style: 'stroke:var(--color-divider);stroke-width:1' }));
  }
  chart.append(svg('path', { d: buildPath(usdPts), fill: 'none', style: 'stroke:var(--color-accent-700);stroke-width:3' }));
  if (eurPts.length) {
    chart.append(svg('path', { d: buildPath(eurPts), fill: 'none', style: 'stroke:var(--color-accent-2-700);stroke-width:3;stroke-dasharray:5,5' }));
  }

  const lastIdx = pts.length - 1;
  pts.forEach((p, i) => {
    const isLabeled = labelIdxs.has(i);
    const isLast = i === lastIdx;
    chart.append(svg('circle', { cx: xAt(i), cy: usdPts[i].y, r: p.est ? 2.5 : (isLabeled ? 4 : 2.5), style: `fill:${p.est ? 'var(--color-accent-300)' : 'var(--color-accent-700)'}` }));

    if (!isLabeled) return;

    const dateLabel = svg('text', { x: xAt(i), y: 228, 'text-anchor': 'middle', 'font-size': 11, style: 'fill:var(--color-neutral-600)' });
    dateLabel.textContent = p.label;
    chart.append(dateLabel);

    // USD 값은 선 아래쪽, EUR 값은 선 위쪽에 표시해서 서로 겹치지 않게 한다. 최신 지점만 굵게 강조.
    const usdLabel = svg('text', {
      x: xAt(i), y: usdPts[i].y + 16, 'text-anchor': 'middle',
      'font-size': isLast ? 13 : 10.5, 'font-weight': isLast ? 800 : 700, style: 'fill:var(--color-accent-700)',
    });
    usdLabel.textContent = Math.round(p.usd).toLocaleString('ko-KR');
    chart.append(usdLabel);

    const eurPt = eurByIdx.get(i);
    if (eurPt) {
      const eurLabel = svg('text', {
        x: xAt(i), y: eurPt.y - 10, 'text-anchor': 'middle',
        'font-size': isLast ? 13 : 10.5, 'font-weight': isLast ? 800 : 700, style: 'fill:var(--color-accent-2-700)',
      });
      eurLabel.textContent = Math.round(p.eur).toLocaleString('ko-KR');
      chart.append(eurLabel);
    }
  });

  const container = document.getElementById('fx-chart');
  container.innerHTML = '';
  container.append(chart);
}

// ---- 2. 소비지출전망CSI ----
// YoY 변화가 유의미할 때(1p 이상)만 YoY로 설명하고, 거의 변동이 없으면(보합)
// "0p 상승"처럼 의미 없는 문장 대신 최근 3개월 추세로 설명을 대체한다.
function buildCsiInsight(pts) {
  const n = pts.length;
  const latest = pts[n - 1];
  const yoy = n - 13 >= 0 ? latest.value - pts[n - 13].value : null;
  const mom = n - 2 >= 0 ? latest.value - pts[n - 2].value : null;

  if (yoy != null && Math.abs(yoy) >= 1) {
    const yoyText = `${yoy >= 0 ? '▲' : '▼'} ${Math.abs(yoy)}p`;
    let text = `소비지출전망CSI가 ${latest.label} ${latest.value}pt로 전년동월대비 ${coloredChange(yoy, yoyText)} ${yoy >= 0 ? '상승' : '하락'}했습니다`;
    if (mom != null && Math.abs(mom) >= 3) {
      const momText = `${mom >= 0 ? '▲' : '▼'} ${Math.abs(mom)}p`;
      text += ` (전월대비도 ${coloredChange(mom, momText)}로 변동폭 확대)`;
    }
    return text;
  }

  const recentIdx = Math.max(0, n - 4);
  const recentDiff = latest.value - pts[recentIdx].value;
  if (recentIdx !== n - 1 && Math.abs(recentDiff) >= 1) {
    const diffText = `${recentDiff >= 0 ? '▲' : '▼'} ${Math.abs(recentDiff)}p`;
    return `소비지출전망CSI가 ${latest.label} ${latest.value}pt로 전년동월과 비슷한 수준이나, 최근 3개월간 ${coloredChange(recentDiff, diffText)} ${recentDiff >= 0 ? '상승' : '하락'}하는 흐름입니다`;
  }
  return `소비지출전망CSI가 ${latest.label} ${latest.value}pt로 뚜렷한 변동 없이 보합권을 유지하고 있습니다`;
}

function renderCsi(data) {
  setSourceLine('csi-source', data);
  const pts = data.points;
  setInsight('csi-insight', buildCsiInsight(pts));

  const vals = pts.map(p => p.value);
  const min = Math.min(...vals, 95) - 5, max = Math.max(...vals, 100) + 5;
  const top = 20, bottom = 170, left = 50, right = 590;
  const xAt = i => left + (i / (pts.length - 1)) * (right - left);
  const labelIdxs = pickLabelIndices(pts.length, 8);

  const chart = svg('svg', { width: 640, height: 210, viewBox: '0 0 640 210' });
  for (let i = 0; i < 3; i++) {
    const y = top + (i * (bottom - top)) / 2;
    chart.append(svg('line', { x1: 0, y1: y, x2: 640, y2: y, style: 'stroke:var(--color-divider);stroke-width:1' }));
  }
  const baselineY = scaleY(100, min, max, top, bottom);
  chart.append(svg('line', { x1: 0, y1: baselineY, x2: 640, y2: baselineY, style: 'stroke:var(--color-neutral-500);stroke-width:1;stroke-dasharray:3,4' }));

  const linePts = pts.map((p, i) => ({ x: xAt(i), y: scaleY(p.value, min, max, top, bottom) }));
  chart.append(svg('path', { d: buildPath(linePts), fill: 'none', style: 'stroke:var(--color-accent-700);stroke-width:2' }));

  pts.forEach((p, i) => {
    const isLabeled = labelIdxs.has(i);
    chart.append(svg('circle', { cx: xAt(i), cy: linePts[i].y, r: isLabeled ? 4 : 2, style: 'fill:var(--color-bg);stroke:var(--color-accent-700);stroke-width:2' }));
    if (isLabeled) {
      const valLabel = svg('text', { x: xAt(i), y: linePts[i].y - 10, 'text-anchor': 'middle', 'font-size': 11.5, 'font-weight': 700, style: 'fill:var(--color-text)' });
      valLabel.textContent = p.value;
      chart.append(valLabel);
      const axisLabel = svg('text', { x: xAt(i), y: bottom + 30, 'text-anchor': 'middle', 'font-size': 10.5, style: 'fill:var(--color-neutral-700)' });
      axisLabel.textContent = p.label;
      chart.append(axisLabel);
    }
  });

  const container = document.getElementById('csi-chart');
  container.innerHTML = '';
  container.append(chart);
}

// ---- 3. 처분가능소득 (YoY %) ----
// 0% 기준선을 고정하고, 양수는 기준선 위로/음수는 기준선 아래로 자라는 막대그래프.
// 분기 라벨은 막대 길이와 무관하게 항상 같은 y좌표(축 위치)에 고정된다.
function toMillion(krw) {
  return (krw / 1000000).toFixed(1) + '백만원';
}

// 차트 우측 상단에 "[단위: ...]" 표기를 넣는 공통 헬퍼. 막대마다 단위 글자를 반복하지 않기 위함.
function unitNote(chart, text, x, y = 16) {
  const label = svg('text', { x, y, 'text-anchor': 'end', 'font-size': 11, style: 'fill:var(--color-neutral-600)' });
  label.textContent = `[단위: ${text}]`;
  chart.append(label);
}

function renderIncome(data) {
  setSourceLine('income-source', data);
  const pts = data.points;
  const latest = pts[pts.length - 1];
  let insight = `가처분소득(실질)이 ${latest.label} 기준 전년동기대비 ${coloredChange(latest.yoy_pct, fmtPct(latest.yoy_pct, 2))} ${latest.yoy_pct >= 0 ? '증가' : '감소'}했습니다`;
  if (latest.value_krw) {
    insight += ` (가구당 월평균 ${toMillion(latest.value_krw)})`;
  }
  setInsight('income-insight', insight);

  // 막대 높이 = 소득 금액(백만원). YoY %는 금액 라벨 바로 아래 괄호로만 표기.
  // 분기 수가 많을 때(13개 등) 라벨이 옆 막대와 겹치지 않도록 폭을 넉넉히 잡는다.
  const width = 760, top = 64, bottom = 170, left = 60, right = 720;
  const vals = pts.map(p => p.value_krw / 1000000);
  const min = Math.min(...vals), max = Math.max(...vals);
  const pad = Math.max((max - min) * 0.15, 0.1);
  const scaleMin = min - pad, scaleMax = max + pad;
  const xAt = i => left + (i / Math.max(pts.length - 1, 1)) * (right - left);
  const barW = 30;

  const chart = svg('svg', { width, height: 210, viewBox: `0 0 ${width} 210` });
  const unit1 = svg('text', { x: right + 20, y: 14, 'text-anchor': 'end', 'font-size': 11, style: 'fill:var(--color-neutral-600)' });
  unit1.textContent = '[단위: 백만원]';
  chart.append(unit1);
  const unit2 = svg('text', { x: right + 20, y: 28, 'text-anchor': 'end', 'font-size': 10, style: 'fill:var(--color-neutral-500)' });
  unit2.textContent = '(괄호 안은 전년동기대비 증감률)';
  chart.append(unit2);

  chart.append(svg('line', { x1: left - 20, y1: bottom, x2: right + 20, y2: bottom, style: 'stroke:var(--color-neutral-500);stroke-width:1.5' }));

  pts.forEach((p, i) => {
    const valMillion = p.value_krw / 1000000;
    const barTop = scaleY(valMillion, scaleMin, scaleMax, top, bottom);
    const barH = bottom - barTop;
    chart.append(svg('rect', { x: xAt(i) - barW / 2, y: barTop, width: barW, height: barH, rx: 4, style: 'fill:var(--color-accent-700)' }));

    const amountLabel = svg('text', {
      x: xAt(i), y: barTop - 20,
      'text-anchor': 'middle', 'font-size': 12, 'font-weight': 700, style: 'fill:var(--color-text)',
    });
    amountLabel.textContent = valMillion.toFixed(1);
    chart.append(amountLabel);

    const yoyLabel = svg('text', {
      x: xAt(i), y: barTop - 7,
      'text-anchor': 'middle', 'font-size': 9.5, 'font-weight': 600,
      style: `fill:${changeColor(p.yoy_pct)}`,
    });
    yoyLabel.textContent = `(${p.yoy_pct >= 0 ? '▲' : '▼'}${Math.abs(p.yoy_pct).toFixed(1)}%)`;
    chart.append(yoyLabel);

    const axisLabel = svg('text', { x: xAt(i), y: bottom + 26, 'text-anchor': 'middle', 'font-size': 11, style: 'fill:var(--color-neutral-600)' });
    axisLabel.textContent = p.label;
    chart.append(axisLabel);
  });

  const container = document.getElementById('income-bars');
  container.innerHTML = '';
  container.append(chart);
}

// ---- 4. 주류 소비지출 ----
function renderAlcohol(data) {
  setSourceLine('alcohol-source', data);
  const s = data.summary;
  setInsight('alcohol-insight',
    `주류 단독 실질소비가 ${s.consecutive_decline_quarters}분기 연속 감소 중이며, ${s.latest_period} 기준 전년동기대비 ${coloredChange(s.yoy_pct, fmtPct(s.yoy_pct))} 감소했습니다`);

  const card = document.getElementById('alcohol-summary-card');
  card.innerHTML = '';
  const kicker = document.createElement('div');
  kicker.className = 'card-kicker';
  kicker.textContent = `${s.latest_period} 주류 단독 실질 소비지출 (담배 제외)`;
  const value = document.createElement('div');
  value.className = 'kpi-value';
  value.innerHTML = `${s.latest_value_krw_month.toLocaleString('ko-KR')}<span class="kpi-unit">원/월</span>`;
  const meta = document.createElement('div');
  meta.className = 'card-meta';
  meta.style.cssText = `color:${changeColor(s.yoy_pct)};font-weight:700`;
  meta.textContent = `${fmtPct(s.yoy_pct)} 전년동기대비 · ${s.consecutive_decline_quarters}분기 연속 감소`;
  card.append(kicker, value, meta);

  renderAlcoholChart(data.points);
}

// 분기별 주류 실질소비 YoY% 추이 (10분기 연속 감소를 눈으로 보여주는 막대그래프).
// 1~3번 차트와 동일하게 기준선(0%)을 차트 맨 아래에 고정하고, 막대는 그 기준선에서 위로 자란다.
// 분기 라벨은 막대 길이와 무관하게 항상 기준선 바로 아래, 같은 y좌표에 고정된다.
function renderAlcoholChart(points) {
  const container = document.getElementById('alcohol-chart');
  container.innerHTML = '';
  if (!points || !points.length) return;

  const title = document.createElement('div');
  title.style.cssText = 'font-size:12.5px;font-weight:700;color:var(--color-neutral-700);margin-bottom:var(--space-2)';
  title.textContent = '분기별 전년동기대비 증감률 추이';
  container.append(title);

  // top을 넉넉히 잡아서 가장 높은 막대의 라벨이 우측 상단 단위 표기와 겹치지 않게 한다.
  const width = 640, top = 64, baselineY = 170, left = 40, right = 600;
  const maxAbs = Math.max(...points.map(p => Math.abs(p.yoy_pct)), 1);
  const pxPerPct = (baselineY - top) / maxAbs;
  const xAt = i => left + (i / Math.max(points.length - 1, 1)) * (right - left);
  const barW = 34;

  const chart = svg('svg', { width, height: 210, viewBox: `0 0 ${width} 210` });
  unitNote(chart, '원', right + 10);
  chart.append(svg('line', { x1: left - 10, y1: baselineY, x2: right + 10, y2: baselineY, style: 'stroke:var(--color-neutral-500);stroke-width:1.5' }));

  points.forEach((p, i) => {
    const known = p.known !== false;
    const h = Math.max(2, Math.round(Math.abs(p.yoy_pct) * pxPerPct));
    // 막대 색은 다른 차트와 같은 단색(accent-700). 추세 보간 구간은 불투명도만 낮춰 톤을 통일한다.
    chart.append(svg('rect', {
      x: xAt(i) - barW / 2, y: baselineY - h, width: barW, height: h, rx: 4,
      style: `fill:var(--color-accent-700);opacity:${known ? 1 : 0.35}`,
    }));

    if (known) {
      // 3번 차트와 같은 비중: 금액(원)이 굵고 크게 메인, 증감율(%)은 작고 얇게 보조.
      // 단위(원)는 우측 상단에 한 번만 표기, 막대 위에는 숫자만.
      if (p.value_krw) {
        const amountLabel = svg('text', { x: xAt(i), y: baselineY - h - 22, 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 700, style: 'fill:var(--color-text)' });
        amountLabel.textContent = p.value_krw.toLocaleString('ko-KR');
        chart.append(amountLabel);
      }

      const valueLabel = svg('text', { x: xAt(i), y: baselineY - h - 8, 'text-anchor': 'middle', 'font-size': 9.5, 'font-weight': 600, style: `fill:${changeColor(p.yoy_pct)}` });
      valueLabel.textContent = `(${p.yoy_pct >= 0 ? '▲' : '▼'}${Math.abs(p.yoy_pct).toFixed(1)}%)`;
      chart.append(valueLabel);
    }

    const axisLabel = svg('text', { x: xAt(i), y: baselineY + 20, 'text-anchor': 'middle', 'font-size': 11, style: 'fill:var(--color-neutral-600)' });
    axisLabel.textContent = p.label;
    chart.append(axisLabel);
  });

  container.append(chart);
}

// ---- 상단 KPI 카드 4개 (4개 섹션과 1:1 대응, 기본 비교 기준: 전년동기대비 YoY) ----
function renderKpis(fx, csi, income, alcohol) {
  const latestFx = fx.points[fx.points.length - 1];
  const latestCsi = csi.points[csi.points.length - 1];
  const latestIncome = income.points[income.points.length - 1];
  const latestAlcohol = alcohol.summary;

  const fxUsdYoy = yoyPct(fx.points, fx.points.length - 1, 12, 'usd');
  const csiYoyIdx = csi.points.length - 13;
  const csiYoy = csiYoyIdx >= 0 ? latestCsi.value - csi.points[csiYoyIdx].value : null;

  const cards = [
    {
      kicker: '환율 (USD·EUR/KRW)',
      value: `${latestFx.usd.toLocaleString('ko-KR')}<span class="kpi-unit">원</span>`,
      meta: fxUsdYoy != null ? `${fmtPct(fxUsdYoy)} 전년동월대비 (달러)` : `${latestFx.label} 월평균`,
      metaChangeValue: fxUsdYoy,
      sub: latestFx.eur != null ? `유로 ${Math.round(latestFx.eur).toLocaleString('ko-KR')}원` : null,
    },
    {
      kicker: '소비지출전망CSI',
      value: `${latestCsi.value}`,
      meta: csiYoy != null ? `${csiYoy >= 0 ? '▲' : '▼'} ${Math.abs(csiYoy)}p 전년동월대비` : latestCsi.label,
      metaChangeValue: csiYoy,
    },
    {
      kicker: '가처분소득 (실질)',
      value: toMillion(latestIncome.value_krw),
      meta: `${fmtPct(latestIncome.yoy_pct, 2)} 전년동기대비`,
      metaChangeValue: latestIncome.yoy_pct,
    },
    {
      kicker: '주류 실질소비지출',
      value: `${latestAlcohol.latest_value_krw_month.toLocaleString('ko-KR')}<span class="kpi-unit">원/월</span>`,
      metaChangeValue: latestAlcohol.yoy_pct,
      meta: `${fmtPct(latestAlcohol.yoy_pct)} 전년동기대비`,
    },
  ];

  const grid = document.getElementById('kpi-grid');
  grid.innerHTML = '';
  cards.forEach(c => {
    const div = document.createElement('div');
    div.className = 'card elev-sm';
    const metaColor = c.metaChangeValue != null ? changeColor(c.metaChangeValue) : 'inherit';
    div.innerHTML = `
      <div class="card-kicker">${c.kicker}</div>
      <div class="kpi-value">${c.value}</div>
      <div class="card-meta" style="font-weight:700;color:${metaColor}">${c.meta}</div>
      ${c.sub ? `<div class="card-meta">${c.sub}</div>` : ''}
    `;
    grid.append(div);
  });
}

async function main() {
  document.getElementById('data-as-of').textContent =
    new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }) + ' 조회';

  try {
    const [fx, csi, income, alcohol] = await Promise.all([
      getJSON('/api/fx'),
      getJSON('/api/csi'),
      getJSON('/api/income'),
      getJSON('/api/alcohol'),
    ]);

    renderKpis(fx, csi, income, alcohol);
    renderFx(fx);
    renderCsi(csi);
    renderIncome(income);
    renderAlcohol(alcohol);
  } catch (err) {
    console.error(err);
    document.getElementById('kpi-grid').innerHTML =
      `<div class="card elev-sm"><div class="card-kicker">오류</div><div class="card-body">데이터를 불러오지 못했습니다: ${err.message}<br>백엔드(uvicorn)가 실행 중인지 확인하세요.</div></div>`;
  }
}

main();
