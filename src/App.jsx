    setLoading(true); setError("");
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
      const failure = results.find(result => result.error);
      if (failure) throw failure.error;
      setProducts(results[0].data || []); setCategories(results[1].data || []);
      setAgents(results[2].data || []); setInventory(results[3].data || []);
      setSales(results[4].data || []); setParties(results[5].data || []);
      setPartyItems(results[6].data || []);
    } catch (err) { setError(err.message || "Could not load data."); }
    finally { setLoading(false); }
  }

  async function login(event) {
    event.preventDefault(); setBusy(true); setError("");
    const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
    if (loginError) setError(loginError.message);
    setBusy(false);
  }
  async function logout() {
    const { error: logoutError } = await supabase.auth.signOut();
    if (logoutError) setError(logoutError.message);
  }

  function resetProductForm() {
    setEditingProductId(null); setProductName(""); setCategoryId("");
    setDescription(""); setProductActive(true); setShowProductForm(false);
  }
  function startAddProduct() {
    if (role !== "admin") return;
    setError(""); setSuccess(""); resetProductForm(); setShowProductForm(true);
  }
  function startEditProduct(product) {
    if (role !== "admin") return;
    setError(""); setSuccess(""); setEditingProductId(product.id);
    setProductName(product.name || ""); setCategoryId(String(product.category_id ?? ""));
    setDescription(product.description || ""); setProductActive(product.is_active !== false);
    setShowProductForm(true); setPage("Inventory");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  async function saveProduct(event) {
    event.preventDefault();
    if (role !== "admin" || saving) return;
    const name = productName.trim();
    if (!name || !categoryId) return setError("Product name and category are required.");
    if (products.some(p => p.id !== editingProductId && p.name.toLowerCase() === name.toLowerCase()))
      return setError("A product with this name already exists.");
    setSaving(true); setError(""); setSuccess("");
    // Keep existing historical catalogue price fields untouched on edits.
    // New catalogue entries do not require prices; all new prices belong to Parties.
    const values = { name, category_id: Number(categoryId), description: description.trim(),
      is_active: productActive };
    try {
      if (editingProductId !== null) {
        const { data, error: dbError } = await supabase.from("products").update(values)
          .eq("id", editingProductId).select("id");
        if (dbError) throw dbError;
        if (!data?.length) throw new Error("Product update blocked by permissions.");
      } else {
        const { error: dbError } = await supabase.from("products").insert(values);
        if (dbError) throw dbError;
      }
      resetProductForm(); await loadData(); setSuccess("Product saved successfully!");
    } catch (err) { setError(err.message || "Could not save product."); }
    finally { setSaving(false); }
  }

  const newPartyLine = () => ({ key: `${Date.now()}-${Math.random()}`, id: null,
    product_id: "", quantity: "1", purchaseCad: "", hst: "13", legacyCost: "", selling: "" });
  function resetPartyForm() {
    setShowPartyForm(false); setEditingPartyId(null); setPartyName("");
    setPartyDate(""); setPartyNotes(""); setPartyLogistics("");
    setPartyExchangeRate(""); setPartyLines([]);
  }
  function startNewParty() {
    if (role !== "admin") return;
    setError(""); setSuccess(""); resetPartyForm();
    setPartyName(`Party ${parties.length + 1}`);
    setPartyDate(today()); setPartyLines([newPartyLine()]); setShowPartyForm(true);
  }
  function partyHasSales(id) {
    const ids = new Set(partyItems.filter(x => String(x.party_id) === String(id)).map(x => String(x.id)));
    return sales.some(s => s.party_item_id != null && ids.has(String(s.party_item_id)));
  }
  function editParty(party) {
    if (role !== "admin") return;
    setError(""); setSuccess(""); setEditingPartyId(party.id);
    setPartyName(party.name || ""); setPartyDate(party.shipment_date || "");
    setPartyNotes(party.notes || ""); setPartyLogistics(String(party.logistics_total_uzs ?? ""));
    setPartyExchangeRate(party.exchange_rate == null ? "" : String(party.exchange_rate));
    const lines = partyItems.filter(x => String(x.party_id) === String(party.id)).map(x => ({
      key: `saved-${x.id}`, id: x.id, product_id: String(x.product_id),
      quantity: String(x.quantity_purchased),
      purchaseCad: x.purchase_price_cad == null ? "" : String(x.purchase_price_cad),
      hst: x.hst_percent == null ? "13" : String(x.hst_percent),
      legacyCost: String(x.purchase_cost_uzs ?? ""),
      selling: x.selling_price_uzs == null ? "" : String(x.selling_price_uzs)
    }));
    setPartyLines(lines.length ? lines : [newPartyLine()]); setShowPartyForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function changePartyLine(key, field, value) {
    setPartyLines(lines => lines.map(line => line.key === key ? { ...line, [field]: value } : line));
  }
  const partyUnits = partyLines.reduce((sum, line) => sum + (Number(line.quantity) || 0), 0);
  const partyShippingUnit = partyUnits > 0 ? Number(partyLogistics || 0) / partyUnits : 0;
  const partyLocked = editingPartyId !== null && partyHasSales(editingPartyId);
  const exchangeRate = Number(partyExchangeRate);
  function unitPurchaseCost(line) {
    if (line.purchaseCad !== "" && valid(Number(line.purchaseCad)) &&
        valid(Number(line.hst)) && exchangeRate > 0)
      return Number(line.purchaseCad) * (1 + Number(line.hst) / 100) * exchangeRate;
    // Older shipments saved only the UZS cost. Do not rewrite their costs.
    return line.legacyCost === "" ? 0 : Number(line.legacyCost);
  }
  function effectiveSelling(line) {
    if (line.selling !== "") return Number(line.selling);
    return 0; // No automatic catalogue-price fallback: prices are Party-specific.
  }
  const partyPurchaseTotal = partyLines.reduce((sum, line) =>
    sum + unitPurchaseCost(line) * (Number(line.quantity) || 0), 0);
  const partyExpenseTotal = partyPurchaseTotal + Number(partyLogistics || 0);
  const partyEstimatedRevenue = partyLines.reduce((sum, line) =>
    sum + effectiveSelling(line) * (Number(line.quantity) || 0), 0);
  const partyEstimatedProfit = partyEstimatedRevenue - partyExpenseTotal;

  async function saveParty(event) {
    event.preventDefault();
    if (role !== "admin" || partySaving || partyLocked) return;
    const logistics = partyLogistics.trim() === "" ? 0 : Number(partyLogistics);
    const rate = Number(partyExchangeRate);
    if (!partyName.trim() || !valid(logistics) || !partyLines.length)
      return setError("Enter a party name, products and valid logistics.");
    const seen = new Set();
    for (const line of partyLines) {
      const qty = Number(line.quantity);
      const price = line.selling === "" ? null : Number(line.selling);
      const hasCad = line.purchaseCad !== "";
      const isLegacy = !hasCad && line.id != null && line.legacyCost !== "";
      if (!line.product_id || seen.has(line.product_id) || !Number.isInteger(qty) || qty <= 0 ||
          (price !== null && !valid(price)) ||
          (!hasCad && !isLegacy) ||
          (hasCad && (!valid(Number(line.purchaseCad)) || !valid(Number(line.hst)) || Number(line.hst) > 100 || !Number.isFinite(rate) || rate <= 0)) ||
          (isLegacy && !valid(Number(line.legacyCost)))) {
        return setError("Select each product once. Enter valid quantities, CAD purchase prices, HST and an exchange rate. Existing UZS-only costs can be preserved.");
      }
      seen.add(line.product_id);
    }
    if (partyLines.some(line => line.purchaseCad !== "") && (!Number.isFinite(rate) || rate <= 0))
      return setError("Enter a valid fixed CAD to UZS exchange rate.");
    setPartySaving(true); setError(""); setSuccess("");
    try {
