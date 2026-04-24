import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function NavBar() {
  const { logout } = useAuth();

  return (
    <nav className="navbar">
      <h2>Transport Booking</h2>
      <div className="nav-links">
        <Link to="/">Booking</Link>
        <Link to="/history">History</Link>
        <button type="button" onClick={logout}>
          Logout
        </button>
      </div>
    </nav>
  );
}

export default NavBar;
