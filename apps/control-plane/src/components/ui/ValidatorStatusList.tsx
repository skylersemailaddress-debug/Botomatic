import StatusBadge from "@/components/ui/StatusBadge";

export type ValidatorItem = {
  name: string;
  status: string;
  summary: string;
};

export default function ValidatorStatusList({ items }: { items: ValidatorItem[] }) {
  return (
    <div className="validator-list">
      {items.map((item) => (
        <div key={item.name} className="validator-row">
          <div className="validator-main">
            <div className="validator-name">{item.name}</div>
            <div className="validator-summary">{item.summary}</div>
          </div>
          <StatusBadge status={item.status} />
        </div>
      ))}
    </div>
  );
}
