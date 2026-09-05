import { NavLink } from "react-router-dom";

const items = [
  ["Dashboard", "/"],
  ["Revenue Recovery", "/recovery"],
  ["Failed Payments", "/payments"],
  ["Customers", "/customers"],
  ["Analytics", "/analytics"],
  ["Simulator", "/simulator"],
  ["Audit Trail", "/audit"]
];

export default function Sidebar({ onLogout }) {
  return (
    <aside className="sidebar">
      <div className="brand"><span>◈</span> RevenueAI</div>
      <div className="brand-sub">AI Revenue Recovery</div>

      <nav>
        {items.map(([label, to]) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              isActive ? "nav active" : "nav"
            }
          >
            {label}
          </NavLink>
        ))}
      </nav>

      <button className="logout" onClick={onLogout}>
        Logout
      </button>
    </aside>
  );
}