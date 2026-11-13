import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from './supabase';

const sections = ['Dashboard','Inventory','Shipments','Sales','Agents','Stock Transfers','Settlements','Settings'];
const fmt = n => `${Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })} UZS`;
const num = n => Number(n || 0);
const dateNow = () => new Date().toLocaleDateString('en-CA');
const blankLine = () => ({ productId: '', quantity: 1, cost: '', price: '' });
const newParty = () => ({ name: '', date: dateNow(), notes: '', logistics: '', lines: [blankLine()] });
const ui = {
  panel: { background: 'white', padding: 20, marginBottom: 16, border: '1px solid #e2e8f0', borderRadius: 12 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 12 },
  input: { display: 'block', width: '100%', padding: 11, marginTop: 6, border: '1px solid #cbd5e1', borderRadius: 7, boxSizing: 'border-box' },
  button: { padding: '11px 16px', background: '#166534', color: 'white', border: 0, borderRadius: 7, cursor: 'pointer', margin: '4px 4px 4px 0' }
};

export default function App() {
  const [page, setPage] = useState('Dashboard');
  const [user, setUser] = useState(null);
  const [role, setRole] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rows, setRows] = useState([]);
  const [category, setCategory] = useState('');
  const [product, setProduct] = useState({ name: '', categoryId: '' });
  const [party, setParty] = useState(newParty);
  const [editingParty, setEditingParty] = useState(null);
  const [sale, setSale] = useState({ itemId: '', quantity: 1, agent: '' });

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data, error: e }) => {
      if (!active) return;
      if (e) setError(e.message);
      setUser(data?.user || null);
      setLoading(false);
    }).catch(e => { if (active) { setError(e.message); setLoading(false); } });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setUser(session?.user || null);
    });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!user) { setRole(''); setRows([]); setLoading(false); return; }
    let active = true;
    (async () => {
      setLoading(true); setError('');
      try {
        const { data: profile, error: pe } = await supabase.from('user_profiles').select('role').eq('user_id', user.id).single();
        if (pe) throw pe;
        if (!active) return;
        const nextRole = String(profile?.role || '').toLowerCase();
        setRole(nextRole);
        if (nextRole === 'admin') {
          const { data, error: re } = await supabase.from('ce_records').select('*').order('created_at', { ascending: true });
          if (re) throw re;
          if (active) setRows(data || []);
        } else setRows([]);
      } catch (e) { if (active) setError(e.message); }
      finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
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
      await reload(); setNotice('Saved successfully.'); return true;
    } catch (e) { setError(e.message); return false; }
    finally { setBusy(false); }
  };
  const remove = async id => {
    if (!window.confirm('Delete this record?')) return;
    setBusy(true); setError('');
    try {
      const { error: e } = await supabase.from('ce_records').delete().eq('id', id);
      if (e) throw e;
      await reload(); setNotice('Deleted.');
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };
