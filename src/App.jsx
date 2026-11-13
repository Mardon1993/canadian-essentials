import React, { useEffect, useState } from "react";
import { LayoutDashboard, Package, Truck, ShoppingCart, Users, ArrowLeftRight, Wallet, Settings, Plus, Menu, RefreshCw, Pencil } from "lucide-react";
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
const money = value => Number(value || 0).toLocaleString("en-US", { maximumFractionDigits: 2 }) + " UZS";
const cad = value => Number(value || 0).toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " CAD";
const inputStyle = { width: "100%", padding: 12 };
const gridStyle = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(175px, 1fr))", gap: 12 };
const valid = n => Number.isFinite(n) && n >= 0;
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export default function App() {
  const [page, setPage] = useState("Dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [agents, setAgents] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [sales, setSales] = useState([]);
  const [parties, setParties] = useState([]);
  const [partyItems, setPartyItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
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
  const [saving, setSaving] = useState(false);

  const [showPartyForm, setShowPartyForm] = useState(false);
  const [editingPartyId, setEditingPartyId] = useState(null);
  const [partyName, setPartyName] = useState("");
  const [partyDate, setPartyDate] = useState("");
  const [partyNotes, setPartyNotes] = useState("");
  const [partyLogistics, setPartyLogistics] = useState("");
  const [partyExchangeRate, setPartyExchangeRate] = useState("");
  const [partyLines, setPartyLines] = useState([]);
  const [partySaving, setPartySaving] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data, error: authError }) => {
      if (!active) return;
      if (authError) setError(authError.message);
      setUser(data?.user || null);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setUser(session?.user || null);
    });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!user) {
      setRole(""); setProducts([]); setCategories([]); setAgents([]);
      setInventory([]); setSales([]); setParties([]); setPartyItems([]);
      setLoading(false); return;
    }
    let active = true;
    (async () => {
      setLoading(true); setError("");
      const { data, error: profileError } = await supabase.from("user_profiles")
        .select("role").eq("user_id", user.id).single();
      if (!active) return;
      if (profileError || !data) {
        setError(profileError?.message || "No user profile found.");
        setRole(""); setLoading(false); return;
      }
      setRole(data.role); setLoading(false);
    })();
    return () => { active = false; };
  }, [user]);

  useEffect(() => { if (user && role === "admin") loadData(); }, [user, role]);
