import OpsPanel from "@/components/ops/OpsPanel";

export default function MainSplitLayout({ left, right }: any) {
  return (
    <div
      className="split-layout"
      style={{
        gap: 16,
        padding: 20,
        minHeight: "calc(100vh - 160px)",
      }}
    >
      <div
        style={{
          borderRadius: 18,
          background: "var(--panel)",
          border: "1px solid var(--border)",
          overflow: "hidden",
          display: "flex",
          minHeight: "70vh",
          boxShadow: "var(--shadow)",
          position: "sticky",
          top: 16,
        }}
      >
        {left}
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          overflowY: "auto",
          paddingRight: 4,
          maxHeight: "calc(100vh - 190px)",
        }}
      >
        {right}
        <OpsPanel />
      </div>
    </div>
  );
}
