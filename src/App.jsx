
import React, { useState } from "react";
import {
  LayoutDashboard, Package, Truck, ShoppingCart,
  Users, ArrowLeftRight, Wallet, Settings,
  Plus, Search, Bell, Menu
} from "lucide-react";

const navigation = [
  { name: "Dashboard", icon: LayoutDashboard },
  { name: "Inventory", icon: Package },
  { name: "Shipments", icon: Truck },
  { name: "Sales", icon: ShoppingCart },
  { name: "Agents", icon: Users },
  { name: "Stock Transfers", icon: ArrowLeftRight },
  { name: "Settlements", icon: Wallet },
  { name: "Settings", icon: Settings }
];

const initialAgents = [
  { id: 1, name: "Agent 1", status: "Active" },
  { id: 2, name: "Agent 2", status: "Active" }
];

export default function App() {
  const [page, setPage] = useState("Dashboard");
  const [agents, setAgents] = useState(initialAgents);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  function addAgent() {
    const name = prompt("Enter new agent name:");
    if (!name?.trim()) return;

    setAgents((previous) => [
      ...previous,
      { id: Date.now(), name: name.trim(), status: "Demo" }
    ]);
  }

  return (
    <div className="app">
      <aside className={sidebarOpen ? "sidebar" : "sidebar collapsed"}>
        <div className="brand">
          <div className="brand-icon">CE</div>
          {sidebarOpen && (
            <div>
              <strong>Canadian Essentials</strong>
              <small>Business Management</small>
            </div>
          )}
        </div>

        <nav>
          {navigation.map(({ name, icon: Icon }) => (
            <button
              key={name}
              className={page === name ? "nav-item active" : "nav-item"}
              onClick={() => setPage(name)}
            >
              <Icon size={19} />
              {sidebarOpen && <span>{name}</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          {sidebarOpen && <span>Admin Workspace · Preview</span>}
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <button className="icon-button" onClick={() => setSidebarOpen(!sidebarOpen)}>
            <Menu size={21} />
          </button>

          <div className="topbar-right">
            <Search size={19} />
            <Bell size={19} />
            <div className="avatar">A</div>
            <span>Admin</span>
          </div>
        </header>

        <section className="content">
          <div className="page-heading">
            <div>
              <p className="eyebrow">CANADIAN ESSENTIALS</p>
              <h1>{page}</h1>
              <p className="subtitle">
                Manage your inventory, agents and business operations.
              </p>
            </div>

            {page === "Agents" && (
              <button className="primary-button" onClick={addAgent}>
                <Plus size={18} /> Add Agent
              </button>
            )}
          </div>

          {page === "Dashboard" && (
            <>
              <div className="stats">
                {[
                  ["Total Inventory", "—", "Units across all agents"],
                  ["Total Sales", "—", "Sales revenue (UZS)"],
                  ["Net Profit", "—", "After expenses (UZS)"],
                  ["Active Agents", agents.length, "Demo agent list"]
                ].map(([title, value, detail]) => (
                  <div className="stat-card" key={title}>
                    <p>{title}</p>
                    <h2>{value}</h2>
                    <small>{detail}</small>
                  </div>
                ))}
              </div>

              <div className="panel">
                <h2>Welcome to Canadian Essentials</h2>
                <p>
                  Your management dashboard is being prepared.
                  Inventory, sales and financial totals will appear
                  here once we securely connect Supabase.
                </p>
              </div>

              <div className="panel">
                <h2>Business modules</h2>
                <div className="module-grid">
                  {navigation.slice(1, 7).map(({ name, icon: Icon }) => (
                    <button
                      className="module"
                      key={name}
                      onClick={() => setPage(name)}
                    >
                      <Icon size={22} />
                      <span>{name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {page === "Agents" && (
            <div className="panel">
              <h2>Agent Management</h2>
              <p className="muted">
                Demo only — changes are not yet saved to Supabase.
              </p>

              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Agent</th>
                      <th>Status</th>
                      <th>Inventory</th>
                      <th>Profit Share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agents.map((agent) => (
                      <tr key={agent.id}>
                        <td><strong>{agent.name}</strong></td>
                        <td><span className="status">{agent.status}</span></td>
                        <td>—</td>
                        <td>35% default</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {!["Dashboard", "Agents"].includes(page) && (
            <div className="panel">
              <h2>{page}</h2>
              <p>
                The {page.toLowerCase()} module will be connected
                to your Supabase database in a later step.
              </p>
              <p className="muted">
                No live transactions are enabled in this preview.
              </p>
            </div>
          )}

          <p className="preview-note">
            Preview mode · No live financial transactions
          </p>
        </section>
      </main>
    </div>
  );
}
