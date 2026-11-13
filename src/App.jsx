
import React, { useEffect, useState } from "react";
import {
  LayoutDashboard, Package, Truck, ShoppingCart,
  Users, ArrowLeftRight, Wallet, Settings,
  Plus, Search, Bell, Menu, RefreshCw
} from "lucide-react";
import { supabase } from "./supabase";

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

const money = (value) =>
  Number(value || 0).toLocaleString("en-US") + " UZS";

export default function App() {
  const [page, setPage] = useState("Dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [agents, setAgents] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [user, setUser] = useState(null);
  const [role, setRole] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [showProductForm, setShowProductForm] = useState(false);
  const [productName, setProductName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;

    supabase.auth.getUser().then(({ data, error }) => {
      if (!active) return;
      if (error) setError(error.message);
      setUser(data?.user || null);
    });

    const { data: listener } =
      supabase.auth.onAuthStateChange((_event, session) => {
        if (active) setUser(session?.user || null);
      });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setRole("");
      setProducts([]);
      setCategories([]);
      setAgents([]);
      setInventory([]);
      setSales([]);
      setLoading(false);
      return;
    }

    let active = true;

    async function initialize() {
      setLoading(true);
      setError("");

      const { data, error } = await supabase
        .from("user_profiles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      if (!active) return;

      if (error || !data) {
        setError(error?.message || "No user profile found.");
        setRole("");
        setLoading(false);
        return;
      }

      setRole(data.role);
      setLoading(false);
    }

    initialize();
    return () => { active = false; };
  }, [user]);

  useEffect(() => {
    if (!user || role !== "admin") return;
    loadData();
  }, [user, role]);

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const results = await Promise.all([
        supabase.from("products").select("*").order("name"),
        supabase.from("categories").select("*").order("name"),
        supabase.from("agents").select("*").order("name"),
        supabase.from("agent_inventory").select("*"),
        supabase.from("sales").select("*")
      ]);

      const failure = results.find((result) => result.error);
      if (failure) throw failure.error;

      setProducts(results[0].data || []);
      setCategories(results[1].data || []);
      setAgents(results[2].data || []);
      setInventory(results[3].data || []);
      setSales(results[4].data || []);
    } catch (err) {
      setError(err.message || "Could not load data.");
    } finally {
      setLoading(false);
    }
  }

  async function login(event) {
    event.preventDefault();
    setBusy(true);
    setError("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) setError(error.message);
    setBusy(false);
  }

  async function logout() {
    const { error } = await supabase.auth.signOut();
    if (error) setError(error.message);
  }

  async function addProduct(event) {
    event.preventDefault();

    const name = productName.trim();

    if (!name || !categoryId || role !== "admin") return;

    if (products.some(
      (product) => product.name.toLowerCase() === name.toLowerCase()
    )) {
      setError("This product already exists. Select it from inventory.");
      return;
    }

    setSaving(true);
    setError("");

    const { error } = await supabase.from("products").insert({
      name,
      category_id: Number(categoryId),
      description: description.trim(),
      is_active: true
    });

    if (error) {
      setError(error.message);
    } else {
      setProductName("");
      setCategoryId("");
      setDescription("");
      setShowProductForm(false);
      await loadData();
    }

    setSaving(false);
  }

  async function addAgent() {
    if (role !== "admin") return;

    const name = prompt("Enter new agent name:");
    if (!name?.trim()) return;

    const { error } = await supabase.from("agents").insert({
      name: name.trim(),
      is_active: true
    });

    if (error) {
      setError(error.message);
    } else {
      await loadData();
    }
  }

  const inventoryCount = inventory.reduce(
    (sum, item) => sum + Number(item.quantity || 0), 0
  );

  const totalRevenue = sales.reduce(
    (sum, sale) =>
      sum +
      Number(sale.quantity || 0) *
      Number(sale.unit_selling_price_uzs || 0),
    0
  );

  const activeAgents = agents.filter(
    (agent) => agent.is_active
  ).length;

  const suggestions = productName.trim()
    ? products.filter((product) =>
        product.name.toLowerCase().includes(
          productName.toLowerCase()
        )
      ).slice(0, 6)
    : [];

  if (!user) {
    return (
      <div className="app">
        <main className="main">
          <section className="content">
            <div className="panel" style={{ maxWidth: 450, margin: "70px auto" }}>
              <h1>Canadian Essentials</h1>
              <p>Sign in to manage your business.</p>

              <form onSubmit={login}>
                <p>
                  <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    style={{ width: "100%", padding: 12 }}
                  />
                </p>
                <p>
                  <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    style={{ width: "100%", padding: 12 }}
                  />
                </p>
                <button className="primary-button" disabled={busy}>
                  {busy ? "Signing in..." : "Sign in"}
                </button>
              </form>

              {error && <p style={{ color: "crimson" }}>{error}</p>}
            </div>
          </section>
        </main>
      </div>
    );
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
          {sidebarOpen && <span>Secure Workspace</span>}
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <button
            className="icon-button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <Menu size={21} />
          </button>

          <div className="topbar-right">
            <button className="icon-button" onClick={loadData}>
              <RefreshCw size={19} />
            </button>
            <Search size={19} />
            <Bell size={19} />
            <div className="avatar">
              {user.email?.charAt(0).toUpperCase() || "A"}
            </div>
            <span>{role || "User"}</span>
            <button onClick={logout}>Sign out</button>
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

            {page === "Agents" && role === "admin" && (
              <button className="primary-button" onClick={addAgent}>
                <Plus size={18} /> Add Agent
              </button>
            )}

            {page === "Inventory" && role === "admin" && (
              <button
                className="primary-button"
                onClick={() => setShowProductForm(!showProductForm)}
              >
                <Plus size={18} /> Add Product
              </button>
            )}
          </div>

          {error && (
            <div className="panel">
              <p style={{ color: "crimson" }}>{error}</p>
            </div>
          )}

          {loading && <p>Loading data...</p>}

          {role !== "admin" && !loading && (
            <div className="panel">
              <h2>Agent Workspace</h2>
              <p>
                Your account is connected. Agent-specific inventory
                and sales screens will be enabled after their
                permissions are configured.
              </p>
            </div>
          )}

          {role === "admin" && !loading && (
            <>
              {page === "Dashboard" && (
                <>
                  <div className="stats">
                    {[
                      ["Total Inventory", inventoryCount, "Units assigned to agents"],
                      ["Total Sales", money(totalRevenue), "Recorded sales revenue"],
                      ["Net Profit", "Pending", "Cost allocation verification required"],
                      ["Active Agents", activeAgents, "Live agent records"]
                    ].map(([title, value, detail]) => (
                      <div className="stat-card" key={title}>
                        <p>{title}</p>
                        <h2>{value}</h2>
                        <small>{detail}</small>
                      </div>
                    ))}
                  </div>

                  <div className="panel">
                    <h2>Connected to Supabase</h2>
                    <p>
                      Your dashboard now reads inventory, sales,
                      products and agents from the database.
                      Profit calculations will be activated after
                      we verify shipping and expense allocation.
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

              {page === "Inventory" && (
                <>
                  {showProductForm && (
                    <div className="panel">
                      <h2>Add Product</h2>
                      <p className="muted">
                        Register a product name and category.
                        Quantities and purchase prices will be
                        recorded with shipment batches.
                      </p>

                      <form onSubmit={addProduct}>
                        <p>
                          <input
                            value={productName}
                            onChange={(e) => setProductName(e.target.value)}
                            placeholder="Product name"
                            required
                            style={{ width: "100%", padding: 12 }}
                          />
                        </p>

                        {suggestions.length > 0 && (
                          <div>
                            <p>Existing products:</p>
                            {suggestions.map((product) => (
                              <button
                                key={product.id}
                                type="button"
                                onClick={() => setProductName(product.name)}
                                style={{ margin: 4, padding: 8 }}
                              >
                                {product.name}
                              </button>
                            ))}
                          </div>
                        )}

                        <p>
                          <select
                            value={categoryId}
                            onChange={(e) => setCategoryId(e.target.value)}
                            required
                            style={{ width: "100%", padding: 12 }}
                          >
                            <option value="">Select category</option>
                            {categories.map((category) => (
                              <option key={category.id} value={category.id}>
                                {category.name}
                              </option>
                            ))}
                          </select>
                        </p>

                        <p>
                          <input
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Description (optional)"
                            style={{ width: "100%", padding: 12 }}
                          />
                        </p>

                        <button
                          className="primary-button"
                          type="submit"
                          disabled={saving}
                        >
                          {saving ? "Saving..." : "Save Product"}
                        </button>
                      </form>
                    </div>
                  )}

                  <div className="panel">
                    <h2>Product Catalogue</h2>
                    <div className="table-wrapper">
                      <table>
                        <thead>
                          <tr>
                            <th>Product</th>
                            <th>Category</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {products.map((product) => (
                            <tr key={product.id}>
                              <td><strong>{product.name}</strong></td>
                              <td>
                                {categories.find(
                                  (category) =>
                                    category.id === product.category_id
                                )?.name || "—"}
                              </td>
                              <td>
                                {product.is_active ? "Active" : "Inactive"}
                              </td>
                            </tr>
                          ))}
                          {products.length === 0 && (
                            <tr>
                              <td colSpan="3">No products added yet.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}

              {page === "Agents" && (
                <div className="panel">
                  <h2>Agent Management</h2>
                  <div className="table-wrapper">
                    <table>
                      <thead>
                        <tr>
                          <th>Agent</th>
                          <th>Status</th>
                          <th>Profit Share</th>
                        </tr>
                      </thead>
                      <tbody>
                        {agents.map((agent) => (
                          <tr key={agent.id}>
                            <td><strong>{agent.name}</strong></td>
                            <td>
                              <span className="status">
                                {agent.is_active ? "Active" : "Inactive"}
                              </span>
                            </td>
                            <td>See profit settings</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {!["Dashboard", "Inventory", "Agents"].includes(page) && (
                <div className="panel">
                  <h2>{page}</h2>
                  <p>
                    This section will be activated after its
                    database operations and financial calculations
                    have been tested.
                  </p>
                </div>
              )}
            </>
          )}
        </section>
      </main>
    </div>
  );
}
