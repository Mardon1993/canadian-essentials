
import React, { useEffect, useState } from "react";
import {
  LayoutDashboard, Package, Truck, ShoppingCart,
  Users, ArrowLeftRight, Wallet, Settings,
  Plus, Search, Bell, Menu, RefreshCw, Pencil
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

const inputStyle = { width: "100%", padding: 12 };

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
  const [editingProductId, setEditingProductId] = useState(null);
  const [productName, setProductName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [productActive, setProductActive] = useState(true);
  const [regularPrice, setRegularPrice] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");

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

    return () => {
      active = false;
    };
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

  function resetProductForm() {
    setEditingProductId(null);
    setProductName("");
    setCategoryId("");
    setDescription("");
    setProductActive(true);
    setRegularPrice("");
    setSalePrice("");
    setShowProductForm(false);
  }

  function startAddProduct() {
    if (role !== "admin") return;

    setError("");
    setSuccess("");
    resetProductForm();
    setShowProductForm(true);
  }

  function startEditProduct(product) {
    if (role !== "admin") return;

    setError("");
    setSuccess("");
    setEditingProductId(product.id);
    setProductName(product.name || "");
    setCategoryId(String(product.category_id ?? ""));
    setDescription(product.description || "");
    setProductActive(product.is_active !== false);

    setRegularPrice(
      product.regular_price_uzs == null
        ? ""
        : String(product.regular_price_uzs)
    );

    setSalePrice(
      product.sale_price_uzs == null
        ? ""
        : String(product.sale_price_uzs)
    );

    setShowProductForm(true);
    setPage("Inventory");

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  }

  async function saveProduct(event) {
    event.preventDefault();

    if (role !== "admin" || saving) return;

    const name = productName.trim();

    if (!name || !categoryId) {
      setError("Product name and category are required.");
      return;
    }

    const duplicate = products.some((product) =>
      product.id !== editingProductId &&
      product.name.toLowerCase() === name.toLowerCase()
    );

    if (duplicate) {
      setError("A product with this name already exists.");
      return;
    }

    const regular =
      regularPrice.trim() === ""
        ? null
        : Number(regularPrice);

    const sale =
      salePrice.trim() === ""
        ? null
        : Number(salePrice);

    if (
      (regular !== null &&
        (!Number.isFinite(regular) || regular < 0)) ||
      (sale !== null &&
        (!Number.isFinite(sale) || sale < 0))
    ) {
      setError("Prices must be valid positive numbers or zero.");
      return;
    }

    if (sale !== null && regular === null) {
      setError("Enter a regular price before adding a sale price.");
      return;
    }

    if (
      sale !== null &&
      regular !== null &&
      sale >= regular
    ) {
      setError("Sale price must be lower than regular price.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    const values = {
      name,
      category_id: Number(categoryId),
      description: description.trim(),
      is_active: productActive,
      regular_price_uzs: regular,
      sale_price_uzs: sale
    };

    try {
      if (editingProductId !== null) {
        const { data, error } = await supabase
          .from("products")
          .update(values)
          .eq("id", editingProductId)
          .select("id");

        if (error) throw error;

        if (!data || data.length === 0) {
          throw new Error(
            "Product was not updated. Check Supabase permissions."
          );
        }
      } else {
        const { error } = await supabase
          .from("products")
          .insert(values);

        if (error) throw error;
      }

      resetProductForm();

      await loadData();

      setSuccess("Product saved successfully!");
    } catch (err) {
      setError(err.message || "Could not save product.");
    } finally {
      setSaving(false);
    }
  }

  async function addAgent() {
    if (role !== "admin") return;

    const name = prompt("Enter new agent name:");

    if (!name?.trim()) return;

    const { error } = await supabase
      .from("agents")
      .insert({
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
    (sum, item) => sum + Number(item.quantity || 0),
    0
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

  const suggestions =
    productName.trim() && editingProductId === null
      ? products.filter((product) =>
          product.name.toLowerCase().includes(
            productName.toLowerCase()
          )
        ).slice(0, 6)
      : [];

  function discountPercent(product) {
    const regular = Number(product.regular_price_uzs);
    const sale = Number(product.sale_price_uzs);

    if (
      product.regular_price_uzs == null ||
      product.sale_price_uzs == null ||
      regular <= 0 ||
      sale >= regular
    ) {
      return null;
    }

    return Math.round(
      ((regular - sale) / regular) * 100
    );
  }

  if (!user) {
    return (
      <div className="app">
        <main className="main">
          <section className="content">
            <div
              className="panel"
              style={{
                maxWidth: 450,
                margin: "70px auto"
              }}
            >
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
                    style={inputStyle}
                  />
                </p>

                <p>
                  <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    style={inputStyle}
                  />
                </p>

                <button
                  className="primary-button"
                  disabled={busy}
                >
                  {busy ? "Signing in..." : "Sign in"}
                </button>
              </form>

              {error && (
                <p style={{ color: "crimson" }}>
                  {error}
                </p>
              )}
            </div>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="app">
      <aside
        className={
          sidebarOpen
            ? "sidebar"
            : "sidebar collapsed"
        }
      >
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
              className={
                page === name
                  ? "nav-item active"
                  : "nav-item"
              }
              onClick={() => setPage(name)}
            >
              <Icon size={19} />
              {sidebarOpen && <span>{name}</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          {sidebarOpen && (
            <span>Secure Workspace</span>
          )}
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <button
            className="icon-button"
            onClick={() =>
              setSidebarOpen(!sidebarOpen)
            }
          >
            <Menu size={21} />
          </button>

          <div className="topbar-right">
            <button
              className="icon-button"
              onClick={loadData}
            >
              <RefreshCw size={19} />
            </button>

            <Search size={19} />
            <Bell size={19} />

            <div className="avatar">
              {user.email?.charAt(0).toUpperCase() || "A"}
            </div>

            <span>{role || "User"}</span>

            <button onClick={logout}>
              Sign out
            </button>
          </div>
        </header>

        <section className="content">
          <div className="page-heading">
            <div>
              <p className="eyebrow">
                CANADIAN ESSENTIALS
              </p>

              <h1>{page}</h1>

              <p className="subtitle">
                Manage your inventory, agents and
                business operations.
              </p>
            </div>

            {page === "Agents" &&
              role === "admin" && (
                <button
                  className="primary-button"
                  onClick={addAgent}
                >
                  <Plus size={18} />
                  Add Agent
                </button>
              )}

            {page === "Inventory" &&
              role === "admin" && (
                <button
                  className="primary-button"
                  onClick={startAddProduct}
                >
                  <Plus size={18} />
                  Add Product
                </button>
              )}
          </div>

          {error && (
            <div className="panel">
              <p style={{ color: "crimson" }}>
                {error}
              </p>
            </div>
          )}

          {success && (
            <div className="panel">
              <p style={{ color: "green" }}>
                {success}
              </p>
            </div>
          )}

          {loading && <p>Loading data...</p>}

          {role !== "admin" && !loading && (
            <div className="panel">
              <h2>Agent Workspace</h2>

              <p>
                Your account is connected.
                Agent-specific inventory and sales
                screens will be enabled after their
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
                      [
                        "Total Inventory",
                        inventoryCount,
                        "Units assigned to agents"
                      ],
                      [
                        "Total Sales",
                        money(totalRevenue),
                        "Recorded sales revenue"
                      ],
                      [
                        "Net Profit",
                        "Pending",
                        "Cost allocation verification required"
                      ],
                      [
                        "Active Agents",
                        activeAgents,
                        "Live agent records"
                      ]
                    ].map(([title, value, detail]) => (
                      <div
                        className="stat-card"
                        key={title}
                      >
                        <p>{title}</p>
                        <h2>{value}</h2>
                        <small>{detail}</small>
                      </div>
                    ))}
                  </div>

                  <div className="panel">
                    <h2>Connected to Supabase</h2>

                    <p>
                      Your dashboard reads inventory,
                      sales, products and agents
                      from the database.

                      Profit calculations will be
                      activated after shipping and
                      expense allocation are verified.
                    </p>
                  </div>

                  <div className="panel">
                    <h2>Business modules</h2>

                    <div className="module-grid">
                      {navigation
                        .slice(1, 7)
                        .map(({ name, icon: Icon }) => (
                          <button
                            className="module"
                            key={name}
                            onClick={() =>
                              setPage(name)
                            }
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
                      <h2>
                        {editingProductId !== null
                          ? "Edit Product"
                          : "Add Product"}
                      </h2>

                      <p className="muted">
                        Manage product information,
                        regular prices and sale prices.
                        Purchase costs and quantities
                        will be managed through shipments.
                      </p>

                      <form onSubmit={saveProduct}>
                        <p>
                          <label>Product Name</label>

                          <input
                            value={productName}
                            onChange={(e) =>
                              setProductName(
                                e.target.value
                              )
                            }
                            placeholder="Product name"
                            required
                            style={inputStyle}
                          />
                        </p>

                        {suggestions.length > 0 && (
                          <div>
                            <p>Existing products:</p>

                            {suggestions.map((product) => (
                              <button
                                key={product.id}
                                type="button"
                                onClick={() =>
                                  setProductName(
                                    product.name
                                  )
                                }
                                style={{
                                  margin: 4,
                                  padding: 8
                                }}
                              >
                                {product.name}
                              </button>
                            ))}
                          </div>
                        )}

                        <p>
                          <label>Category</label>

                          <select
                            value={categoryId}
                            onChange={(e) =>
                              setCategoryId(
                                e.target.value
                              )
                            }
                            required
                            style={inputStyle}
                          >
                            <option value="">
                              Select category
                            </option>

                            {categories.map((category) => (
                              <option
                                key={category.id}
                                value={category.id}
                              >
                                {category.name}
                              </option>
                            ))}
                          </select>
                        </p>

                        <p>
                          <label>Description</label>

                          <input
                            value={description}
                            onChange={(e) =>
                              setDescription(
                                e.target.value
                              )
                            }
                            placeholder="Description (optional)"
                            style={inputStyle}
                          />
                        </p>

                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns:
                              "repeat(auto-fit, minmax(180px, 1fr))",
                            gap: 16
                          }}
                        >
                          <p>
                            <label>
                              Regular Price (UZS)
                            </label>

                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={regularPrice}
                              onChange={(e) =>
                                setRegularPrice(
                                  e.target.value
                                )
                              }
                              placeholder="350000"
                              style={inputStyle}
                            />
                          </p>

                          <p>
                            <label>
                              Sale Price (UZS)
                            </label>

                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={salePrice}
                              onChange={(e) =>
                                setSalePrice(
                                  e.target.value
                                )
                              }
                              placeholder="299000 (optional)"
                              style={inputStyle}
                            />
                          </p>
                        </div>

                        <p>
                          <label>
                            <input
                              type="checkbox"
                              checked={productActive}
                              onChange={(e) =>
                                setProductActive(
                                  e.target.checked
                                )
                              }
                            />{" "}
                            Active product
                          </label>
                        </p>

                        <div
                          style={{
                            display: "flex",
                            gap: 12,
                            flexWrap: "wrap"
                          }}
                        >
                          <button
                            className="primary-button"
                            type="submit"
                            disabled={saving}
                          >
                            {saving
                              ? "Saving..."
                              : editingProductId !== null
                                ? "Save Changes"
                                : "Save Product"}
                          </button>

                          <button
                            type="button"
                            onClick={resetProductForm}
                            disabled={saving}
                          >
                            Cancel
                          </button>
                        </div>
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
                            <th>Regular Price</th>
                            <th>Sale Price</th>
                            <th>Discount</th>
                            <th>Status</th>
                            <th>Actions</th>
                          </tr>
                        </thead>

                        <tbody>
                          {products.map((product) => {
                            const discount =
                              discountPercent(product);

                            return (
                              <tr key={product.id}>
                                <td>
                                  <strong>
                                    {product.name}
                                  </strong>
                                </td>

                                <td>
                                  {categories.find(
                                    (category) =>
                                      category.id ===
                                      product.category_id
                                  )?.name || "—"}
                                </td>

                                <td>
                                  {product.regular_price_uzs == null
                                    ? "—"
                                    : money(
                                        product.regular_price_uzs
                                      )}
                                </td>

                                <td>
                                  {product.sale_price_uzs == null
                                    ? "—"
                                    : (
                                      <strong
                                        style={{
                                          color: "#16803c"
                                        }}
                                      >
                                        {money(
                                          product.sale_price_uzs
                                        )}
                                      </strong>
                                    )}
                                </td>

                                <td>
                                  {discount === null
                                    ? "—"
                                    : `${discount}% OFF`}
                                </td>

                                <td>
                                  {product.is_active
                                    ? "Active"
                                    : "Inactive"}
                                </td>

                                <td>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      startEditProduct(
                                        product
                                      )
                                    }
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: 6,
                                      padding: "8px 12px",
                                      cursor: "pointer"
                                    }}
                                  >
                                    <Pencil size={15} />
                                    Edit
                                  </button>
                                </td>
                              </tr>
                            );
                          })}

                          {products.length === 0 && (
                            <tr>
                              <td colSpan="7">
                                No products added yet.
                              </td>
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
                            <td>
                              <strong>
                                {agent.name}
                              </strong>
                            </td>

                            <td>
                              <span className="status">
                                {agent.is_active
                                  ? "Active"
                                  : "Inactive"}
                              </span>
                            </td>

                            <td>
                              See profit settings
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {![
                "Dashboard",
                "Inventory",
                "Agents"
              ].includes(page) && (
                <div className="panel">
                  <h2>{page}</h2>

                  <p>
                    This section will be activated
                    after its database operations
                    and financial calculations
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
