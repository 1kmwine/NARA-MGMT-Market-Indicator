export type Source = "live" | "fallback";

export type InsightSection = "csi" | "income" | "alcohol" | "fx";
export type Insights = Record<InsightSection, string>;

export type FxBasis = "avg" | "eom";

export interface FxPoint {
  label: string;
  usd: number;
  eur: number | null;
  est: boolean;
}
export interface FxResponse {
  points: FxPoint[];
  basis: FxBasis;
  source: Source;
  source_note: string;
  /** DB에 적재된 시각(ISO). DB를 못 읽어 API를 직접 호출한 경우에만 null. */
  collected_at: string | null;
}

export interface FxLatest {
  date: string;
  usd: number;
  eur: number | null;
  /** 직전 영업일 값. 전일대비 증감 계산용이며, 비교할 값이 없으면 null. */
  usd_prev: number | null;
  eur_prev: number | null;
  source: Source;
  source_note: string;
  collected_at: string | null;
}

export interface CsiPoint {
  label: string;
  value: number;
}
export interface CsiResponse {
  points: CsiPoint[];
  source: Source;
  source_note: string;
  /** DB에 적재된 시각(ISO). DB를 못 읽어 API를 직접 호출한 경우에만 null. */
  collected_at: string | null;
}

export interface IncomePoint {
  label: string;
  yoy_pct: number;
  value_krw: number;
}
export interface IncomeResponse {
  points: IncomePoint[];
  source: Source;
  source_note: string;
  collected_at: string | null;
}

export interface AlcoholPoint {
  label: string;
  yoy_pct: number;
  value_krw: number;
  known: boolean;
}
export interface AlcoholSummary {
  latest_value_krw_month: number;
  latest_period: string;
  yoy_pct: number;
  consecutive_decline_quarters: number;
  source_note: string;
}
export interface AlcoholResponse {
  points: AlcoholPoint[];
  summary: AlcoholSummary;
  source: Source;
  source_note: string;
  collected_at: string | null;
}
