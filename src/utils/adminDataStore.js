import { supabase } from './supabase';
import { store } from './store';

// ── In-memory cache with Supabase sync ─────────────────
let cache = {};
let loaded = false;

function notify() {
  window.dispatchEvent(new Event('trc-data-updated'));
}

// ── Load all data from Supabase into cache ─────────────
export async function loadAllData() {
  const [ratesRes, payersRes, contractRes, providersRes, rulesRes, labelsRes, groupsRes] =
    await Promise.all([
      supabase.from('rates').select('*'),
      supabase.from('payers').select('*').order('sort_order'),
      supabase.from('contract_payers').select('*').order('name'),
      supabase.from('providers').select('*').order('location, name'),
      supabase.from('billing_rules').select('*').order('payer, sort_order'),
      supabase.from('code_labels').select('*'),
      supabase.from('code_groups').select('*').order('sort_order'),
    ]);

  // Build rates object: { code: { payer: amount } }
  const rates = {};
  for (const r of ratesRes.data || []) {
    if (!rates[r.code]) rates[r.code] = {};
    rates[r.code][r.payer] = Number(r.amount);
  }

  // Payer names in order
  const payers = (payersRes.data || []).map(p => p.name);

  // Contract payers: { name: rate }
  const contractPayers = {};
  for (const cp of contractRes.data || []) {
    contractPayers[cp.name] = Number(cp.rate);
  }

  // Providers map: { location: [names] }
  const providersMap = {};
  for (const p of providersRes.data || []) {
    if (!providersMap[p.location]) providersMap[p.location] = [];
    providersMap[p.location].push(p.name);
  }

  // Billing rules: { payer: [rules] }
  const billingRules = {};
  for (const r of rulesRes.data || []) {
    if (!billingRules[r.payer]) billingRules[r.payer] = [];
    billingRules[r.payer].push(r.rule_text);
  }

  // Code labels: { code: description }
  const codeLabels = {};
  for (const cl of labelsRes.data || []) {
    codeLabels[cl.code] = cl.description;
  }

  // Code groups
  const codeGroups = (groupsRes.data || []).map(g => ({
    key: g.group_key,
    label: g.label,
    codes: g.codes || [],
  }));

  cache = { rates, payers, contractPayers, providersMap, billingRules, codeLabels, codeGroups };
  loaded = true;
  notify();
  return cache;
}

export function isLoaded() { return loaded; }

// ── Getters (read from cache) ──────────────────────────

export function getRates() { return cache.rates || {}; }
export function getPayers() { return cache.payers || []; }
export function getContractPayers() { return cache.contractPayers || {}; }
export function getProviders() { return cache.providersMap || {}; }
export function getBillingRules() { return cache.billingRules || {}; }
export function getCodeLabels() { return cache.codeLabels || {}; }
export function getCodeGroups() { return cache.codeGroups || []; }

export function getAllProviders() {
  const map = getProviders();
  return Object.entries(map).flatMap(([loc, names]) =>
    names.map(n => ({ name: n, location: loc, isOT: n.includes('(OT)') }))
  );
}

// ── Rate mutations ─────────────────────────────────────

export async function setRate(code, payer, value) {
  const amount = Number(value) || 0;
  const { error } = await supabase
    .from('rates')
    .upsert({ code, payer, amount }, { onConflict: 'code,payer' });
  if (error) throw error;
  if (!cache.rates[code]) cache.rates[code] = {};
  cache.rates[code][payer] = amount;
  notify();
}

export async function setRateBulk(code, payerRates) {
  const rows = Object.entries(payerRates).map(([payer, amount]) => ({
    code, payer, amount: Number(amount) || 0,
  }));
  const { error } = await supabase
    .from('rates')
    .upsert(rows, { onConflict: 'code,payer' });
  if (error) throw error;
  if (!cache.rates[code]) cache.rates[code] = {};
  for (const [p, a] of Object.entries(payerRates)) {
    cache.rates[code][p] = Number(a) || 0;
  }
  notify();
}

export async function deleteRateCode(code) {
  await supabase.from('rates').delete().eq('code', code);
  await supabase.from('code_labels').delete().eq('code', code);
  delete cache.rates[code];
  delete cache.codeLabels[code];
  notify();
}

// ── Payer mutations ────────────────────────────────────

export async function addPayer(name) {
  const payers = getPayers();
  if (payers.includes(name)) return false;
  const { error } = await supabase
    .from('payers')
    .insert({ name, sort_order: payers.length + 1 });
  if (error) throw error;
  // Initialize rates at $0 for all codes
  const allCodes = Object.keys(getRates());
  if (allCodes.length > 0) {
    const rows = allCodes.map(code => ({ code, payer: name, amount: 0 }));
    await supabase.from('rates').upsert(rows, { onConflict: 'code,payer' });
    for (const code of allCodes) {
      if (cache.rates[code]) cache.rates[code][name] = 0;
    }
  }
  cache.payers.push(name);
  notify();
  return true;
}

export async function renamePayer(oldName, newName) {
  if (oldName === newName) return;
  await supabase.from('payers').update({ name: newName }).eq('name', oldName);
  await supabase.from('rates').update({ payer: newName }).eq('payer', oldName);
  await supabase.from('billing_rules').update({ payer: newName }).eq('payer', oldName);
  // Update cache
  cache.payers = cache.payers.map(p => p === oldName ? newName : p);
  for (const code of Object.keys(cache.rates)) {
    if (cache.rates[code][oldName] !== undefined) {
      cache.rates[code][newName] = cache.rates[code][oldName];
      delete cache.rates[code][oldName];
    }
  }
  if (cache.billingRules[oldName]) {
    cache.billingRules[newName] = cache.billingRules[oldName];
    delete cache.billingRules[oldName];
  }
  notify();
}

export async function deletePayer(name) {
  await supabase.from('payers').delete().eq('name', name);
  await supabase.from('rates').delete().eq('payer', name);
  await supabase.from('billing_rules').delete().eq('payer', name);
  cache.payers = cache.payers.filter(p => p !== name);
  for (const code of Object.keys(cache.rates)) {
    delete cache.rates[code][name];
  }
  delete cache.billingRules[name];
  notify();
}

// ── Contract payer mutations ───────────────────────────

export async function setContractPayer(name, rate) {
  const { error } = await supabase
    .from('contract_payers')
    .upsert({ name, rate: Number(rate) || 0 }, { onConflict: 'name' });
  if (error) throw error;
  cache.contractPayers[name] = Number(rate) || 0;
  notify();
}

export async function deleteContractPayer(name) {
  await supabase.from('contract_payers').delete().eq('name', name);
  delete cache.contractPayers[name];
  notify();
}

// ── Billing rules mutations ────────────────────────────

export async function setPayerRules(payer, rulesArr) {
  // Delete existing rules for this payer then re-insert
  await supabase.from('billing_rules').delete().eq('payer', payer);
  if (rulesArr.length > 0) {
    const rows = rulesArr.map((rule_text, i) => ({ payer, rule_text, sort_order: i }));
    await supabase.from('billing_rules').insert(rows);
  }
  if (rulesArr.length === 0) delete cache.billingRules[payer];
  else cache.billingRules[payer] = rulesArr;
  notify();
}

// ── Code label mutations ───────────────────────────────

export async function setCodeLabel(code, description) {
  const { error } = await supabase
    .from('code_labels')
    .upsert({ code, description }, { onConflict: 'code' });
  if (error) throw error;
  cache.codeLabels[code] = description;
  notify();
}

// ── Provider mutations ─────────────────────────────────

export async function addProvider(location, name, isOT = false) {
  const { error } = await supabase
    .from('providers')
    .insert({ name, location, is_ot: isOT });
  if (error) throw error;
  if (!cache.providersMap[location]) cache.providersMap[location] = [];
  cache.providersMap[location].push(name);
  notify();
  return true;
}

export async function removeProvider(location, name) {
  await supabase.from('providers').delete().eq('name', name).eq('location', location);
  if (cache.providersMap[location]) {
    cache.providersMap[location] = cache.providersMap[location].filter(n => n !== name);
    if (cache.providersMap[location].length === 0) delete cache.providersMap[location];
  }
  notify();
}

export async function addLocation(name) {
  if (cache.providersMap[name]) return false;
  cache.providersMap[name] = [];
  notify();
  return true;
}

export async function removeLocation(name) {
  await supabase.from('providers').delete().eq('location', name);
  delete cache.providersMap[name];
  notify();
}

export async function renameLocation(oldName, newName) {
  if (oldName === newName) return;
  await supabase.from('providers').update({ location: newName }).eq('location', oldName);
  cache.providersMap[newName] = cache.providersMap[oldName] || [];
  delete cache.providersMap[oldName];
  notify();
}

// ── CSV Export / Import ────────────────────────────────

export function exportRatesCSV() {
  const rates = getRates();
  const labels = getCodeLabels();
  const payers = getPayers();
  const codes = Object.keys(rates);
  const header = ['Code', 'Description', ...payers].join(',');
  const rows = codes.map(code => {
    const desc = (labels[code] || '').replace(/,/g, ';');
    const vals = payers.map(p => (rates[code]?.[p] ?? 0).toFixed(2));
    return [code, desc, ...vals].join(',');
  });
  return [header, ...rows].join('\n');
}

export async function importRatesCSV(csvString, user) {
  const lines = csvString.trim().split('\n');
  if (lines.length < 2) return { success: false, error: 'CSV must have a header row and at least one data row.' };

  const headers = lines[0].split(',').map(h => h.trim());
  const payers = headers.slice(2);
  const currentPayers = getPayers();
  const unknownPayers = payers.filter(p => !currentPayers.includes(p));

  let updated = 0;
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map(c => c.trim());
    const code = cols[0];
    if (!code) continue;
    for (let j = 0; j < payers.length; j++) {
      const val = parseFloat(cols[j + 2]);
      if (!isNaN(val)) {
        rows.push({ code, payer: payers[j], amount: val });
        updated++;
      }
    }
  }

  if (rows.length > 0) {
    // Batch upsert in chunks of 500
    for (let i = 0; i < rows.length; i += 500) {
      await supabase.from('rates').upsert(rows.slice(i, i + 500), { onConflict: 'code,payer' });
    }
    // Refresh cache
    await loadAllData();
  }

  if (user) store.pushLog({ user: user.username, action: 'import_rates', detail: `${updated} rate values updated via CSV` });
  return { success: true, updated, unknownPayers };
}
