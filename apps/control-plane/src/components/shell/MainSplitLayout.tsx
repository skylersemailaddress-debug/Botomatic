export default function MainSplitLayout({ left, right }: any) {
  return (
    <div style={{ display: "flex", height: "calc(100vh - 48px)" }}>
      <div style={{ width: "60%", borderRight: "1px solid var(--border)" }}>
        {left}
      </div>
      <div style={{ width: "40%" }}>
        {right}
      </div>
    </div>
  );
}
