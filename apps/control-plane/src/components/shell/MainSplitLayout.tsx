import OpsPanel from "@/components/ops/OpsPanel";

export default function MainSplitLayout({ left, right }: any) {
  return (
    <div
      style={{
        display: "flex",
        gap: 16,
        padding: 20,
        height: "calc(100vh - 56px)",
      }}
    >
      <div
        style={{
          flex: 1,
          borderRadius: 18,
          background: "var(--panel)",
          border: "1px solid var(--border)",
          overflow: "hidden",
          display: "flex",
        }}
      >
        {left}
      </div>

      <div
        style={{
          width: 420,
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        {right}
        <OpsPanel />
      </div>
    </div>
  );
}
