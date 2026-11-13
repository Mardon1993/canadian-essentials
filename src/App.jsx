
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
        supabase.from("parties").select("*")
          .order("created_at", { ascending: false }),
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
