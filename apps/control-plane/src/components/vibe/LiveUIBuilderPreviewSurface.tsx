export function LiveUIBuilderPreviewSurface() {
  return (
    <article className="vibe-live-preview" aria-label="Live editable luxury hotel preview" data-testid="live-ui-builder-preview-surface">
      <header>
        <p>Here&apos;s your live design. You can edit anything by clicking on it.</p>
        <div>
          <button type="button">Edit</button>
          <button type="button">Version 3</button>
        </div>
      </header>
      <div className="vibe-hotel-preview">
        <div className="vibe-hotel-nav"><span>LUXORA</span><span>Home · Rooms · Experiences · About · Contact</span><button type="button">Book Now</button></div>
        <h2>Your Escape Awaits</h2>
        <p>Experience unparalleled luxury and unforgettable moments.</p>
        <div className="vibe-hotel-actions"><button type="button">Book Your Stay</button><button type="button">Explore Rooms</button></div>
        <div className="vibe-hotel-booking-bar"><span>Check In</span><span>Check Out</span><span>Guests</span><span>Room</span><button type="button">Check Availability</button></div>
      </div>
    </article>
  );
}
