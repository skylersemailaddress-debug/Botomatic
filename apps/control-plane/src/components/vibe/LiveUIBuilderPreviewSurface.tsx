export function LiveUIBuilderPreviewSurface({ headline }: { headline?: string }) {
  return (
    <article className="vibe-live-preview" aria-label="Live editable luxury hotel preview" data-testid="live-ui-builder-preview-surface" data-preview-status="structural-bridge">
      <header>
        <p>Structural bridge preview only (not final rendered UI). Click actions to simulate editable-state updates.</p>
        <div>
          <button type="button">Edit</button>
          <button type="button">Version 3</button>
        </div>
      </header>
      <div className="vibe-hotel-preview">
        <div className="vibe-hotel-nav"><span>LUXORA</span><span>Home · Rooms · Experiences · About · Contact</span><button type="button">Book Now</button></div>
        <h2>{headline ?? "Your Escape Awaits"}</h2>
        <p>Experience unparalleled luxury and unforgettable moments.</p>
        <div className="vibe-hotel-actions"><button type="button">Book Your Stay</button><button type="button">Explore Rooms</button></div>
        <div className="vibe-hotel-booking-bar"><span>Check In</span><span>Check Out</span><span>Guests</span><span>Room</span><button type="button">Check Availability</button></div>
      </div>
    </article>
  );
}
