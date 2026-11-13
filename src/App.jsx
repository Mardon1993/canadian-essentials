      setUser(data?.user || null);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user || null));
    return () => { live = false; sub.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!user) { setRole(''); setRows([]); return; }
    let live = true;
    (async () => {
      setLoading(true);
      const { data: profile, error: pe } = await supabase.from('user_profiles').select('role').eq('user_id', user.id).single();
      if (!live) return;
      if (pe) { setError(`Profile: ${pe.message}`); setRole(''); setLoading(false); return; }
      setRole(String(profile?.role || '').toLowerCase());
      const { data, error: re } = await supabase.from('ce_records').select('*').order('created_at', { ascending: true });
      if (!live) return;
      if (re) setError(`Database: ${re.message}`);
      else { setRows(data || []); setError(''); }
      setLoading(false);
    })();
    return () => { live = false; };
  }, [user]);

  const reload = async () => {
    const { data, error: e } = await supabase.from('ce_records').select('*').order('created_at', { ascending: true });
    if (e) throw e;
    setRows(data || []);
  };
  const save = async (kind, payload, id = null) => {
    setBusy(true); setError(''); setNotice('');
    try {
      const query = id
        ? supabase.from('ce_records').update({ payload }).eq('id', id)
        : supabase.from('ce_records').insert({ kind, payload, owner_id: user.id });
      const { error: e } = await query;
      if (e) throw e;
      await reload();
      setNotice('Saved successfully.');
      return true;
    } catch (e) { setError(e.message); return false; }
    finally { setBusy(false); }
  };
  const remove = async id => {
    if (!window.confirm('Delete this record?')) return;
    setBusy(true); setError('');
    try {
      const { error: e } = await supabase.from('ce_records').delete().eq('id', id);
      if (e) throw e;
      await reload();
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  const records = kind => rows.filter(r => r.kind === kind);
  const categories = records('category');
  const products = records('product');
  const parties = records('party');
  const sales = records('sale');
  const productName = id => products.find(p => p.id === id)?.payload?.name || 'Unknown product';
  const partyItems = useMemo(() => parties.flatMap(p => (p.payload.lines || []).map((line, i) => ({ ...line, key: `${p.id}:${i}`, partyId: p.id, partyName: p.payload.name, logistics: asNumber(p.payload.logistics), partyTotalQty: (p.payload.lines || []).reduce((s, l) => s + asNumber(l.quantity), 0) }))), [parties]);
  const soldQty = key => sales.filter(s => s.payload.itemKey === key).reduce((s, r) => s + asNumber(r.payload.quantity), 0);
  const available = item => asNumber(item.quantity) - soldQty(item.key);
  const itemLogistics = item => item.partyTotalQty > 0 ? item.logistics / item.partyTotalQty : 0;
  const totalCost = item => asNumber(item.cost) + itemLogistics(item);
  const partyTotals = p => {
    const lines = p.payload.lines || [];
    const cost = lines.reduce((s, l) => s + asNumber(l.quantity) * asNumber(l.cost), 0);
    const revenue = lines.reduce((s, l) => s + asNumber(l.quantity) * asNumber(l.price), 0);
    const logistics = asNumber(p.payload.logistics);
    return { cost, revenue, logistics, profit: revenue - cost - logistics };
  };
  const totalRevenue = sales.reduce((s, r) => s + asNumber(r.payload.revenue), 0);
  const totalSaleProfit = sales.reduce((s, r) => s + asNumber(r.payload.profit), 0);
  const onLogin = async e => {
    e.preventDefault(); setBusy(true); setError('');
    const { error: e2 } = await supabase.auth.signInWithPassword({ email, password });
    if (e2) setError(e2.message);
    setBusy(false);
  };
  const addCategory = async e => {
    e.preventDefault();
    if (!category.trim()) return;
    if (await save('category', { name: category.trim() })) setCategory('');
  };
  const addProduct = async e => {
    e.preventDefault();
    if (!product.name.trim() || !product.categoryId) { setError('Enter a product name and choose a category.'); return; }
    if (await save('product', { name: product.name.trim(), categoryId: product.categoryId })) setProduct({ name: '', categoryId: '' });
  };
  const changeLine = (i, key, value) => setParty(p => ({ ...p, lines: p.lines.map((line, j) => j === i ? { ...line, [key]: value } : line) }));
  const onPartySave = async e => {
    e.preventDefault();
    if (!party.name.trim() || !party.lines.length || party.lines.some(l => !l.productId || !Number.isInteger(Number(l.quantity)) || asNumber(l.quantity) <= 0 || l.cost === '' || l.price === '' || asNumber(l.cost) < 0 || asNumber(l.price) < 0) || asNumber(party.logistics) < 0) {
      setError('Enter a Party name and valid product, quantity, initial price and selling price for every line.'); return;
    }
    if (editingParty && sales.some(s => (s.payload.itemKey || '').startsWith(`${editingParty}:`))) {
      setError('This Party has recorded sales. Editing it is locked to preserve historical profit calculations.'); return;
    }
    const ok = await save('party', { ...party, logistics: asNumber(party.logistics), lines: party.lines.map(l => ({ ...l, quantity: asNumber(l.quantity), cost: asNumber(l.cost), price: asNumber(l.price) })) }, editingParty);
    if (ok) { setParty({ name: '', date: dateNow(), notes: '', logistics: '', lines: [blankLine()] }); setEditingParty(null); }
  };
  const onSaleSave = async e => {
    e.preventDefault();
    const item = partyItems.find(i => i.key === sale.itemId);
    const quantity = Number(sale.quantity);
    if (!item || !Number.isInteger(quantity) || quantity <= 0 || quantity > available(item)) { setError('Choose an item and a valid quantity within available stock.'); return; }
    const revenue = quantity * asNumber(item.price);
    const profit = revenue - quantity * totalCost(item);
    if (await save('sale', { itemKey: item.key, partyId: item.partyId, productId: item.productId, quantity, agent: sale.agent.trim(), revenue, profit, unitCost: totalCost(item), unitPrice: asNumber(item.price), date: dateNow() })) setSale({ itemId: '', quantity: 1, agent: '' });
  };
  const field = (label, value, onChange, type = 'text', extras = {}) => <label style={{ display: 'block', fontSize: 13, fontWeight: 600 }}>{label}<input style={ui.input} type={type} value={value} onChange={e => onChange(e.target.value)} {...extras}/></label>;
  const btn = (label, onClick, extra = {}) => <button type="button" disabled={busy} onClick={onClick} style={{ ...ui.button, ...extra }}>{label}</button>;
  const metric = (name, value) => <div style={ui.panel}><div style={{ color: '#64748b', fontSize: 13 }}>{name}</div><strong style={{ fontSize: 21 }}>{value}</strong></div>;

  if (loading) return <div style={{ padding: 40 }}>Loading Canadian Essentials...</div>;
  if (!user) return <main style={{ maxWidth: 400, margin: '10vh auto', padding: 25, fontFamily: 'Arial' }}><h1>Canadian Essentials</h1><p>Sign in to your business dashboard.</p><form onSubmit={onLogin} style={{ display: 'grid', gap: 12 }}>{field('Email', email, setEmail, 'email', { required: true })}{field('Password', password, setPassword, 'password', { required: true })}<button style={ui.button} disabled={busy}>Sign in</button></form>{error && <p style={{ color: '#b91c1c' }}>{error}</p>}</main>;
  if (role !== 'admin') return <main style={{ padding: 30, fontFamily: 'Arial' }}><h2>Canadian Essentials</h2><p>Agent dashboard is not activated yet. Your account is signed in, but financial information is not shown until agent-specific permissions are configured.</p>{error && <p style={{ color: 'crimson' }}>{error}</p>}{btn('Sign out', () => supabase.auth.signOut())}</main>;

  return <div style={{ minHeight: '100vh', background: '#f1f5f9', fontFamily: 'Arial, sans-serif', color: '#0f172a' }}>
    <header style={{ background: '#14532d', color: 'white', padding: '16px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}><strong style={{ fontSize: 22 }}>Canadian Essentials</strong><span>{user.email} · Admin</span></header>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: 14, background: '#dcfce7' }}>{sections.map(s => <button key={s} onClick={() => { setPage(s); setError(''); setNotice(''); }} style={{ ...ui.button, background: page === s ? '#14532d' : 'white', color: page === s ? 'white' : '#14532d', border: '1px solid #86efac' }}>{s}</button>)}</div>
    <main style={{ maxWidth: 1150, margin: 'auto', padding: 18 }}><h1>{page}</h1>{error && <div style={{ ...ui.panel, color: '#b91c1c', borderColor: '#fecaca' }}>{error}</div>}{notice && <div style={{ ...ui.panel, color: '#166534' }}>{notice}</div>}
    {page === 'Dashboard' && <><div style={ui.grid}>{metric('Products', products.length)}{metric('Parties', parties.length)}{metric('Units in stock', partyItems.reduce((s, i) => s + available(i), 0))}{metric('Sales revenue', fmt(totalRevenue))}{metric('Realized profit (estimated)', fmt(totalSaleProfit))}</div><div style={ui.panel}><p>Use Inventory to create product names and categories. Then use Shipments to record Party costs and Sales to reduce stock.</p></div></>}
    {page === 'Inventory' && <><div style={ui.panel}><h3>Add category</h3><form onSubmit={addCategory} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}><input style={{ ...ui.input, maxWidth: 340 }} placeholder="Category name" value={category} onChange={e => setCategory(e.target.value)}/><button disabled={busy} style={ui.button}>Add category</button></form><p>{categories.map(c => c.payload.name).join(' · ') || 'No categories yet'}</p></div><div style={ui.panel}><h3>Add product</h3><form onSubmit={addProduct} style={{ ...ui.grid, alignItems: 'end' }}>{field('Product name', product.name, v => setProduct(p => ({ ...p, name: v })))}<label style={{ fontSize: 13, fontWeight: 600 }}>Category<select style={ui.input} value={product.categoryId} onChange={e => setProduct(p => ({ ...p, categoryId: e.target.value }))}><option value="">Choose category</option>{categories.map(c => <option key={c.id} value={c.id}>{c.payload.name}</option>)}</select></label><button style={ui.button} disabled={busy}>Add product</button></form></div><div style={ui.panel}><h3>Product list</h3>{products.length ? products.map(p => <p key={p.id}><strong>{p.payload.name}</strong> — {categories.find(c => c.id === p.payload.categoryId)?.payload.name || 'Uncategorized'}</p>) : 'No products yet'}</div></>}
    {page === 'Shipments' && <><div style={ui.panel}><h3>{editingParty ? 'Edit Party' : 'New Party'}</h3><form onSubmit={onPartySave}><div style={ui.grid}>{field('Party name', party.name, v => setParty(p => ({ ...p, name: v })), 'text', { required: true })}{field('Date', party.date, v => setParty(p => ({ ...p, date: v })), 'date')}{field('Notes (optional)', party.notes, v => setParty(p => ({ ...p, notes: v })))}</div><h4>Products and prices (UZS per unit)</h4>{party.lines.map((line, i) => <div key={i} style={{ ...ui.grid, marginBottom: 12, padding: 12, background: '#f8fafc', borderRadius: 8 }}><label style={{ fontSize: 13 }}>Product<select style={ui.input} value={line.productId} onChange={e => changeLine(i, 'productId', e.target.value)}><option value="">Choose product</option>{products.map(p => <option key={p.id} value={p.id}>{p.payload.name}</option>)}</select></label>{field('Quantity', line.quantity, v => changeLine(i, 'quantity', v), 'number', { min: 1, step: 1 })}{field('Initial price / unit', line.cost, v => changeLine(i, 'cost', v), 'number', { min: 0, step: 'any' })}{field('Selling price / unit', line.price, v => changeLine(i, 'price', v), 'number', { min: 0, step: 'any' })}{btn('Remove line', () => setParty(p => ({ ...p, lines: p.lines.filter((_, j) => j !== i) })), { background: '#991b1b' })}</div>)}{btn('+ Add product line', () => setParty(p => ({ ...p, lines: [...p.lines, blankLine()] })))}<div style={{ marginTop: 18, maxWidth: 350 }}>{field('TOTAL logistics for this Party (UZS)', party.logistics, v => setParty(p => ({ ...p, logistics: v })), 'number', { min: 0, step: 'any' })}</div>{(() => { const t = partyTotals({ payload: party }); return <div style={{ margin: '16px 0', lineHeight: 1.9 }}><div>Initial product costs: <b>{fmt(t.cost)}</b></div><div>Logistics: <b>{fmt(t.logistics)}</b></div><div>Expected revenue: <b>{fmt(t.revenue)}</b></div><div>Estimated profit: <b>{fmt(t.profit)}</b></div></div>; })()}<button disabled={busy} style={ui.button}>{editingParty ? 'Save Party changes' : 'Save Party'}</button> {editingParty && btn('Cancel edit', () => { setEditingParty(null); setParty({ name: '', date: dateNow(), notes: '', logistics: '', lines: [blankLine()] }); }, { background: '#64748b' })}</form></div><div style={ui.panel}><h3>Party history</h3>{parties.length === 0 ? <p>No Parties saved yet.</p> : parties.map(p => { const t = partyTotals(p); const hasSales = sales.some(s => (s.payload.itemKey || '').startsWith(`${p.id}:`)); return <div key={p.id} style={{ borderTop: '1px solid #e2e8f0', padding: '14px 0' }}><strong>{p.payload.name}</strong> — {p.payload.date}<p>Products: {(p.payload.lines || []).map(l => `${productName(l.productId)} × ${l.quantity}`).join(', ')}</p><p>Purchase: {fmt(t.cost)} · Logistics: {fmt(t.logistics)} · Expected revenue: {fmt(t.revenue)} · Estimated profit: <b>{fmt(t.profit)}</b></p>{!hasSales && btn('Edit Party', () => { setEditingParty(p.id); setParty({ ...p.payload, lines: (p.payload.lines || []).map(l => ({ ...l })) }); window.scrollTo(0, 0); })} {!hasSales && btn('Delete', () => remove(p.id), { background: '#991b1b' })}{hasSales && <small>Locked because sales have been recorded.</small>}</div>; })}</div></>}
    {page === 'Sales' && <><div style={ui.panel}><h3>Record a sale</h3><form onSubmit={onSaleSave} style={{ ...ui.grid, alignItems: 'end' }}><label style={{ fontSize: 13 }}>Product from Party<select style={ui.input} value={sale.itemId} onChange={e => setSale(p => ({ ...p, itemId: e.target.value }))}><option value="">Choose available stock</option>{partyItems.filter(i => available(i) > 0).map(i => <option key={i.key} value={i.key}>{productName(i.productId)} · {i.partyName} · {available(i)} available · {fmt(i.price)}</option>)}</select></label>{field('Quantity', sale.quantity, v => setSale(p => ({ ...p, quantity: v })), 'number', { min: 1, step: 1 })}{field('Agent name (optional)', sale.agent, v => setSale(p => ({ ...p, agent: v })))}<button disabled={busy} style={ui.button}>Record sale</button></form></div><div style={ui.panel}><h3>Sales history</h3>{sales.length ? sales.map(s => <p key={s.id}>{s.payload.date} · {productName(s.payload.productId)} × {s.payload.quantity} · Revenue {fmt(s.payload.revenue)} · Profit {fmt(s.payload.profit)} {s.payload.agent ? `· ${s.payload.agent}` : ''}</p>) : 'No sales yet'}</div></>}
