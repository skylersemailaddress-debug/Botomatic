import StatusBadge from "@/components/ui/StatusBadge";

export default function LaunchGateBanner({
  launchReady,
  caveat,
}: {
  launchReady: boolean;
  caveat?: string;
}) {
  return (
    <div className={`launch-gate-banner ${launchReady ? "is-ready" : "is-blocked"}`}>
      <div>
        <div className="launch-gate-title">{launchReady ? "Launch gates satisfied" : "Launch gates blocked"}</div>
        <div className="launch-gate-subtitle">
          Representative proof. Live deployment blocked by default. Credentialed deployment requires explicit approval.
        </div>
        {caveat ? <div className="launch-gate-caveat">{caveat}</div> : null}
      </div>
      <StatusBadge status={launchReady ? "ready" : "blocked"} />
    </div>
  );
}
