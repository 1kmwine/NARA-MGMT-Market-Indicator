"use client";

import { useState } from "react";
import type { InsightSection } from "@/lib/types";

export default function EditableInsight({
  section,
  override,
  fallback,
}: {
  section: InsightSection;
  override: string;
  fallback: React.ReactNode;
}) {
  const [current, setCurrent] = useState(override);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(override);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(text: string) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/insights/${section}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error(`저장 실패: ${res.status}`);
      setCurrent(text);
      setDraft(text);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장 실패");
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <div className="section-insight" style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
        <textarea
          className="input"
          rows={2}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="문구를 입력하세요. 비워두고 저장하면 자동 생성 문구로 돌아갑니다."
          style={{ resize: "vertical", fontWeight: 400, fontSize: 14 }}
          autoFocus
        />
        {error && <span style={{ color: "var(--color-danger-text)", fontSize: 12 }}>{error}</span>}
        <div style={{ display: "flex", gap: "var(--space-2)" }}>
          <button type="button" className="btn" disabled={saving} onClick={() => save(draft)}>
            저장
          </button>
          <button
            type="button"
            className="btn-outline"
            disabled={saving}
            onClick={() => {
              setDraft(current);
              setEditing(false);
              setError(null);
            }}
          >
            취소
          </button>
          {current.trim() && (
            <button type="button" className="btn-outline" disabled={saving} onClick={() => save("")}>
              자동 생성으로 되돌리기
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <p className="section-insight" style={{ display: "flex", alignItems: "flex-start", gap: "var(--space-2)" }}>
      <span>💡 {current.trim() || fallback}</span>
      <button
        type="button"
        onClick={() => setEditing(true)}
        title="문구 수정"
        aria-label="인사이트 문구 수정"
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "var(--color-text-faint)",
          padding: 0,
          fontSize: 13,
          lineHeight: 1.5,
          flexShrink: 0,
        }}
      >
        ✏️
      </button>
    </p>
  );
}
