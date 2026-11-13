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
  const [parties, setParties] = useState([]);
  const [partyItems, setPartyItems] = useState([]);
  const [showPartyForm, setShowPartyForm] = useState(false);
  const [editingPartyId, setEditingPartyId] = useState(null);
  const [partyName, setPartyName] = useState("");
  const [partyDate, setPartyDate] = useState("");
  const [partyNotes, setPartyNotes] = useState("");
  const [partyLogistics, setPartyLogistics] = useState("");
  const [partyLines, setPartyLines] = useState([]);
  const [partySaving, setPartySaving] = useState(false);
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
      setParties([]);
      setPartyItems([]);
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
        supabase.from("sales").select("*"),
        supabase.from("parties").select("*").order("created_at", { ascending: false }),
        supabase.from("party_items").select("*")
      ]);

      const failure = results.find((result) => result.error);

      if (failure) throw failure.error;

      setProducts(results[0].data || []);
      setCategories(results[1].data || []);
      setAgents(results[2].data || []);
      setInventory(results[3].data || []);
      setSales(results[4].data || []);
      setParties(results[5].data || []);
      setPartyItems(results[6].data || []);
    } catch (err) {
      setError(err.message || "Could not load data.");
