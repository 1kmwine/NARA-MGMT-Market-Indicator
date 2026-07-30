import type { AlcoholResponse, CsiResponse, FxResponse, IncomeResponse } from "./types";

// 배포 환경(Docker Compose)에서는 서비스명 backend:8000, 로컬 개발에서는 localhost:8000.
const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";

async function getJSON<T>(path: string): Promise<T> {
  const res = await fetch(`${BACKEND_URL}${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`${path} 요청 실패: ${res.status}`);
  return res.json() as Promise<T>;
}

export const getFx = () => getJSON<FxResponse>("/api/fx");
export const getCsi = () => getJSON<CsiResponse>("/api/csi");
export const getIncome = () => getJSON<IncomeResponse>("/api/income");
export const getAlcohol = () => getJSON<AlcoholResponse>("/api/alcohol");
