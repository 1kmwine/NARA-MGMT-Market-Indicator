"use client";

import { useEffect, useRef, useState } from "react";

// 차트를 감싸는 컨테이너의 실제 렌더링 폭을 측정해서 돌려준다.
// SVG의 viewBox를 이 값으로 맞추면(=viewBox 1유닛을 실제 화면 1px에 대응) 텍스트가
// 늘어나거나 찌그러지지 않으면서 카드 폭에 꽉 차는 반응형 차트를 그릴 수 있다.
export function useContainerWidth(defaultWidth: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(defaultWidth);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) setWidth(Math.round(w));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, width };
}
