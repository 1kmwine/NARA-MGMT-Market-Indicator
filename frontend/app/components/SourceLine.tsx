export default function SourceLine({ note, source }: { note: string; source: "live" | "fallback" }) {
  return (
    <div className="source-line">
      <span>출처: {note}</span>
      <span className={`source-badge ${source}`}>{source === "live" ? "실시간" : "스냅샷"}</span>
    </div>
  );
}
