type SectionHeaderProps = {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
};

export default function SectionHeader({ title, subtitle, right }: SectionHeaderProps) {
  return (
    <div className="section-header">
      <div>
        <h3 className="section-header-title">{title}</h3>
        {subtitle ? <p className="section-header-subtitle">{subtitle}</p> : null}
      </div>
      {right ? <div className="section-header-right">{right}</div> : null}
    </div>
  );
}
