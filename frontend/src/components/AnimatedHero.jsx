import truckImg from "../assets/truck.png";

function AnimatedHero() {
  return (
    <div className="hero">

      {/* Atmospheric sky: deep gradient + star field + horizon glow */}
      <div className="hero-sky" />

      {/* Breathing sun with slow-spinning ray halo */}
      <div className="sun" />

      {/* 4 cloud layers — different speeds create parallax depth */}
      <div className="cloud cloud-1" />
      <div className="cloud cloud-2" />
      <div className="cloud cloud-3" />
      <div className="cloud cloud-4" />

      {/* Hero headline, subtitle and stats */}
      <div className="hero-content">
        <span className="badge">🚚 QuickHaul · Transport &amp; Logistics</span>

        <h1 className="hero-title">
          Move goods <span>faster.</span>
          <br />
          Track every booking.
        </h1>

        <p className="hero-subtitle">
          Book bikes, vans, or trucks in seconds. Smart pricing,
          automatic driver assignment, and real-time status updates.
        </p>

        <div className="hero-stats">
          <div className="stat">
            <div className="stat-value">3</div>
            <div className="stat-label">Vehicle types</div>
          </div>
          <div className="stat">
            <div className="stat-value">Real-time</div>
            <div className="stat-label">Tracking</div>
          </div>
          <div className="stat">
            <div className="stat-value">Instant</div>
            <div className="stat-label">Assignment</div>
          </div>
        </div>
      </div>

      {/* Road gradient + scrolling dashes */}
      <div className="hero-road">
        <div className="road-lines" />
      </div>

      {/*
        Ground glow comes BEFORE truck in DOM so truck renders on top.
        
        Both share the same CSS animation (truckRoll) so they stay synced.
      */}
      <div className="truck-ground-glow" />

      {/*
        Truck is a wrapper div (left:0, static) with the image inside.
        Only translateX on the wrapper moves — never the left property.
      */}
      <div className="truck-wrapper">
        <img src={truckImg} alt="QuickHaul delivery truck" />
        <div className="package-drop-zone">
          <div className="falling-package">📦</div>
        </div>
      </div>

    </div>
  );
}

export default AnimatedHero;