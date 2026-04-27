import OpsPanel from "@/components/ops/OpsPanel";

export default function MainSplitLayout({ left, right }: any) {
  return (
    <div className="split-layout" style={{ padding: 20, minHeight: "calc(100vh - 160px)" }}>
      <div className="split-left-rail">
        {left}
      </div>

      <div className="split-right-rail">
        {right}
        <OpsPanel />
      </div>
    </div>
  );
}
