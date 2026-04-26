import SectionHeader from "@/components/ui/SectionHeader";

type PanelProps = {
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  subtitle?: string;
};

export default function Panel({ title, subtitle, children, footer }: PanelProps) {
  return (
    <section className="surface-card panel">
      {title ? <SectionHeader title={title} subtitle={subtitle} /> : null}
      <div>{children}</div>
      {footer ? <div className="panel-footer">{footer}</div> : null}
    </section>
  );
}
