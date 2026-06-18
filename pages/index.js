import React, { useState, useEffect } from "react";
import {
  Plus, Trash2, TrendingUp, TrendingDown, Wallet, Target,
  AlertCircle, CheckCircle2, XCircle, Clock, Loader2, Layers, Circle, X,
  ClipboardList, BarChart2,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import {
  MARKETS, COMPETITIONS, STAKE_OPTIONS, STATUS, CLP, todayISO,
  emptySelection, resolveMarket, BIAS_PATTERNS, CONFIDENCE_LEVELS,
  EDGE_THRESHOLD, impliedProbability, calculateEdge, getVerdict,
  LOSS_REASONS, WIN_FACTORS, ADVANCED_CHECKLIST, emptyAdvancedChecklist,
} from "../lib/betting";

// ── Estado vacío para un bloque de análisis previo ───────────────────────
const emptyAnalysisBlock = () => ({
  date: todayISO(),
  competition: COMPETITIONS[0],
  match: "",
  respuestas: emptyAdvancedChecklist(),
});

export default function Home() {
  const [tab, setTab] = useState("simples");
  const [bets, setBets] = useState([]);
  const [combos, setCombos] = useState([]);
  const [bankroll, setBankroll] = useState(500000);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingBankroll, setEditingBankroll] = useState(false);
  const [bankrollInput, setBankrollInput] = useState("");
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    date: todayISO(),
    competition: COMPETITIONS[0],
    match: "",
    market: MARKETS[0],
    odds: "",
    stake: STAKE_OPTIONS[1].value,
    biasPattern: BIAS_PATTERNS[BIAS_PATTERNS.length - 1].id,
    confidence: CONFIDENCE_LEVELS[1].id,
    checklistForma: null,
    checklistValor: null,
  });

  const [comboForm, setComboForm] = useState({
    date: todayISO(),
    stake: STAKE_OPTIONS[1].value,
    selections: [emptySelection(), emptySelection()],
  });

  // ── Estado del Análisis Previo ────────────────────────────────────────
  const [analisisTipo, setAnalisisTipo] = useState(null); // "simple" | "combinada" | null
  const [analisisSimple, setAnalisisSimple] = useState(emptyAnalysisBlock());
  const [analisisSimpleGuardado, setAnalisisSimpleGuardado] = useState(false);
  const [analisisCombinada, setAnalisisCombinada] = useState([emptyAnalysisBlock(), emptyAnalysisBlock()]);
  const [analisisCombinadaGuardado, setAnalisisCombinadaGuardado] = useState(false);
  const [guardandoAnalisis, setGuardandoAnalisis] = useState(false);

  // ── Cargar datos desde Supabase al iniciar ───────────────────────────
  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    const [bancaRes, simplesRes, combinadasRes] = await Promise.all([
      supabase.from("banca").select("*").eq("id", 1).single(),
      supabase.from("apuestas_simples").select("*").order("creado_en", { ascending: false }),
      supabase.from("apuestas_combinadas").select("*, combinada_selecciones(*)").order("creado_en", { ascending: false }),
    ]);
    if (bancaRes.data) setBankroll(Number(bancaRes.data.monto));
    if (simplesRes.data) setBets(simplesRes.data.map(mapBetFromDb));
    if (combinadasRes.data) {
      setCombos(combinadasRes.data.map((c) => ({
        id: c.id, date: c.fecha, stakePct: Number(c.stake_pct),
        stakeAmount: Number(c.monto_apostado), status: c.estado,
        selections: (c.combinada_selecciones || [])
          .sort((a, b) => a.orden - b.orden)
          .map((s) => ({
            id: s.id, competition: s.competencia, match: s.partido,
            market: s.mercado, odds: Number(s.cuota), status: s.estado,
            result: s.goles_local != null ? { homeGoals: s.goles_local, awayGoals: s.goles_visitante } : null,
            razonResultado: s.razon_resultado || null,
            biasPattern: s.patron_sesgo || null, confidence: s.nivel_confianza || null,
            edge: s.edge_calculado != null ? Number(s.edge_calculado) : null,
          })),
      })));
    }
    setLoading(false);
  }

  function mapBetFromDb(b) {
    return {
      id: b.id, date: b.fecha, competition: b.competencia, match: b.partido,
      market: b.mercado, odds: Number(b.cuota), stakePct: Number(b.stake_pct),
      stakeAmount: Number(b.monto_apostado), status: b.estado,
      result: b.goles_local != null ? { homeGoals: b.goles_local, awayGoals: b.goles_visitante } : null,
      razonResultado: b.razon_resultado || null, biasPattern: b.patron_sesgo || null,
      confidence: b.nivel_confianza || null,
      edge: b.edge_calculado != null ? Number(b.edge_calculado) : null,
    };
  }

  // ── Estadísticas ──────────────────────────────────────────────────────
  const singleStats = bets.reduce((acc, b) => {
    if (b.status === STATUS.WON) { acc.won += 1; acc.netPL += b.stakeAmount * b.odds - b.stakeAmount; }
    else if (b.status === STATUS.LOST) { acc.lost += 1; acc.netPL -= b.stakeAmount; }
    else if (b.status === STATUS.PENDING) { acc.pending += 1; }
    acc.totalStaked += b.status !== STATUS.PENDING ? b.stakeAmount : 0;
    return acc;
  }, { won: 0, lost: 0, pending: 0, netPL: 0, totalStaked: 0 });

  const comboStats = combos.reduce((acc, c) => {
    const comboOdds = c.selections.reduce((p, s) => p * s.odds, 1);
    if (c.status === STATUS.WON) { acc.won += 1; acc.netPL += c.stakeAmount * comboOdds - c.stakeAmount; }
    else if (c.status === STATUS.LOST) { acc.lost += 1; acc.netPL -= c.stakeAmount; }
    else if (c.status === STATUS.PENDING) { acc.pending += 1; }
    acc.totalStaked += c.status !== STATUS.PENDING ? c.stakeAmount : 0;
    return acc;
  }, { won: 0, lost: 0, pending: 0, netPL: 0, totalStaked: 0 });

  const totalNetPL = singleStats.netPL + comboStats.netPL;
  const currentBankroll = bankroll + totalNetPL;
  const activeStats = tab === "simples" ? singleStats : tab === "combinadas" ? comboStats : null;
  const decided = activeStats ? activeStats.won + activeStats.lost : 0;
  const winRate = decided > 0 && activeStats ? (activeStats.won / decided) * 100 : 0;
  const roi = activeStats && activeStats.totalStaked > 0 ? (activeStats.netPL / activeStats.totalStaked) * 100 : 0;

  // ── Panel de rendimiento ──────────────────────────────────────────────
  const allDecidedItems = [
    ...bets.filter((b) => b.status === STATUS.WON || b.status === STATUS.LOST)
      .map((b) => ({ market: b.market, competition: b.competition, stakePct: b.stakePct, status: b.status, razonResultado: b.razonResultado })),
    ...combos.flatMap((c) => c.selections
      .filter((s) => s.status === STATUS.WON || s.status === STATUS.LOST)
      .map((s) => ({ market: s.market, competition: s.competition, stakePct: c.stakePct, status: s.status, razonResultado: s.razonResultado }))),
  ];

  function buildBreakdown(items, keyFn) {
    const groups = {};
    items.forEach((item) => {
      const key = keyFn(item);
      if (!groups[key]) groups[key] = { won: 0, lost: 0 };
      if (item.status === STATUS.WON) groups[key].won += 1;
      else groups[key].lost += 1;
    });
    return Object.entries(groups)
      .map(([key, v]) => ({ key, won: v.won, lost: v.lost, total: v.won + v.lost, pct: (v.won / (v.won + v.lost)) * 100 }))
      .sort((a, b) => b.total - a.total);
  }

  const byMarket = buildBreakdown(allDecidedItems, (i) => i.market);
  const byLeague = buildBreakdown(allDecidedItems, (i) => i.competition);
  const byStake = buildBreakdown(allDecidedItems, (i) => {
    const opt = STAKE_OPTIONS.find((s) => s.value === i.stakePct);
    return opt ? opt.label : `${(i.stakePct * 100).toFixed(1)}%`;
  });
  const lossReasonCounts = {};
  allDecidedItems.filter((i) => i.status === STATUS.LOST && i.razonResultado).forEach((i) => {
    lossReasonCounts[i.razonResultado] = (lossReasonCounts[i.razonResultado] || 0) + 1;
  });
  const byLossReason = Object.entries(lossReasonCounts).map(([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count);
  const overallDecided = allDecidedItems.length;
  const overallWon = allDecidedItems.filter((i) => i.status === STATUS.WON).length;
  const overallWinRate = overallDecided > 0 ? (overallWon / overallDecided) * 100 : 0;

  // ── Guardar análisis previo en Supabase ───────────────────────────────
  const guardarAnalisisSimple = async () => {
    if (!analisisSimple.match.trim()) return;
    setGuardandoAnalisis(true);
    await supabase.from("checklist_analisis").insert({
      fecha: analisisSimple.date, competencia: analisisSimple.competition,
      partido: analisisSimple.match.trim(),
      pregunta_1: analisisSimple.respuestas.xg_vs_goles,
      pregunta_2: analisisSimple.respuestas.brecha_cuotas,
      pregunta_3: analisisSimple.respuestas.xg_concedido,
      pregunta_4: analisisSimple.respuestas.racha_presion,
      pregunta_5: analisisSimple.respuestas.forma_menos_favorito,
    });
    setAnalisisSimpleGuardado(true);
    setGuardandoAnalisis(false);
  };

  const guardarAnalisisCombinada = async () => {
    const validos = analisisCombinada.filter((b) => b.match.trim());
    if (validos.length < 2) return;
    setGuardandoAnalisis(true);
    for (const bloque of validos) {
      await supabase.from("checklist_analisis").insert({
        fecha: bloque.date, competencia: bloque.competition, partido: bloque.match.trim(),
        pregunta_1: bloque.respuestas.xg_vs_goles, pregunta_2: bloque.respuestas.brecha_cuotas,
        pregunta_3: bloque.respuestas.xg_concedido, pregunta_4: bloque.respuestas.racha_presion,
        pregunta_5: bloque.respuestas.forma_menos_favorito,
      });
    }
    setAnalisisCombinadaGuardado(true);
    setGuardandoAnalisis(false);
  };

  const irACrearApuestaSimple = () => {
    setForm((prev) => ({
      ...prev,
      date: analisisSimple.date,
      competition: analisisSimple.competition,
      match: analisisSimple.match,
    }));
    setTab("simples");
    setShowForm(true);
    resetAnalisis();
  };

  const irACrearCombinada = () => {
    const validos = analisisCombinada.filter((b) => b.match.trim());
    setComboForm((prev) => ({
      ...prev,
      date: validos[0]?.date || todayISO(),
      selections: validos.map((b) => ({
        ...emptySelection(),
        competition: b.competition,
        match: b.match,
        date: b.date,
      })),
    }));
    setTab("combinadas");
    setShowForm(true);
    resetAnalisis();
  };

  const resetAnalisis = () => {
    setAnalisisTipo(null);
    setAnalisisSimple(emptyAnalysisBlock());
    setAnalisisSimpleGuardado(false);
    setAnalisisCombinada([emptyAnalysisBlock(), emptyAnalysisBlock()]);
    setAnalisisCombinadaGuardado(false);
  };

  const updateAnalisisCombinada = (idx, field, value) => {
    const bloques = [...analisisCombinada];
    if (field === "respuesta") {
      bloques[idx] = { ...bloques[idx], respuestas: { ...bloques[idx].respuestas, [value.id]: value.val } };
    } else {
      bloques[idx] = { ...bloques[idx], [field]: value };
    }
    setAnalisisCombinada(bloques);
  };

  const addBloqueCombinada = () => {
    if (analisisCombinada.length >= 3) return;
    setAnalisisCombinada([...analisisCombinada, emptyAnalysisBlock()]);
  };

  const removeBloqueCombinada = (idx) => {
    if (analisisCombinada.length <= 2) return;
    setAnalisisCombinada(analisisCombinada.filter((_, i) => i !== idx));
  };

  const bloquesValidos = analisisCombinada.filter((b) => b.match.trim()).length;

  // ── Crear apuesta simple ─────────────────────────────────────────────
  const addBet = async () => {
    if (!form.match.trim() || !form.odds) return;
    setSaving(true);
    const stakeAmount = Math.round(currentBankroll * form.stake);
    const confidenceLevel = CONFIDENCE_LEVELS.find((c) => c.id === form.confidence);
    const edge = calculateEdge(confidenceLevel.probability, parseFloat(form.odds));
    const { data, error } = await supabase.from("apuestas_simples").insert({
      fecha: form.date, competencia: form.competition, partido: form.match.trim(),
      mercado: form.market, cuota: parseFloat(form.odds), stake_pct: form.stake,
      monto_apostado: stakeAmount, estado: STATUS.PENDING,
      patron_sesgo: form.biasPattern, nivel_confianza: form.confidence,
      edge_calculado: edge, checklist_forma: form.checklistForma, checklist_valor: form.checklistValor,
    }).select().single();
    if (!error && data) {
      setBets([mapBetFromDb(data), ...bets]);
      setForm({ ...form, match: "", odds: "", biasPattern: BIAS_PATTERNS[BIAS_PATTERNS.length - 1].id, confidence: CONFIDENCE_LEVELS[1].id, checklistForma: null, checklistValor: null });
      setShowForm(false);
    }
    setSaving(false);
  };

  // ── Crear combinada ──────────────────────────────────────────────────
  const addCombo = async () => {
    const validSelections = comboForm.selections.filter((s) => s.match.trim() && s.odds);
    if (validSelections.length < 2) return;
    setSaving(true);
    const stakeAmount = Math.round(currentBankroll * comboForm.stake);
    const { data: comboData, error: comboError } = await supabase.from("apuestas_combinadas")
      .insert({ fecha: comboForm.date, stake_pct: comboForm.stake, monto_apostado: stakeAmount, estado: STATUS.PENDING })
      .select().single();
    if (comboError || !comboData) { setSaving(false); return; }
    const selectionsToInsert = validSelections.map((s, idx) => {
      const confidenceLevel = CONFIDENCE_LEVELS.find((c) => c.id === s.confidence) || CONFIDENCE_LEVELS[1];
      const edge = calculateEdge(confidenceLevel.probability, parseFloat(s.odds));
      return {
        combinada_id: comboData.id, competencia: s.competition, partido: s.match.trim(),
        mercado: s.market, cuota: parseFloat(s.odds), estado: STATUS.PENDING, orden: idx,
        patron_sesgo: s.biasPattern || BIAS_PATTERNS[BIAS_PATTERNS.length - 1].id,
        nivel_confianza: s.confidence || CONFIDENCE_LEVELS[1].id, edge_calculado: edge,
      };
    });
    const { data: selData } = await supabase.from("combinada_selecciones").insert(selectionsToInsert).select();
    const newCombo = {
      id: comboData.id, date: comboData.fecha, stakePct: Number(comboData.stake_pct),
      stakeAmount: Number(comboData.monto_apostado), status: comboData.estado,
      selections: (selData || []).map((s) => ({
        id: s.id, competition: s.competencia, match: s.partido, market: s.mercado,
        odds: Number(s.cuota), status: s.estado, result: null,
        biasPattern: s.patron_sesgo, confidence: s.nivel_confianza,
        edge: s.edge_calculado != null ? Number(s.edge_calculado) : null,
      })),
    };
    setCombos([newCombo, ...combos]);
    setComboForm({ date: todayISO(), stake: STAKE_OPTIONS[1].value, selections: [emptySelection(), emptySelection()] });
    setShowForm(false);
    setSaving(false);
  };

  // ── Eliminar ──────────────────────────────────────────────────────────
  const deleteBet = async (id) => { await supabase.from("apuestas_simples").delete().eq("id", id); setBets(bets.filter((b) => b.id !== id)); };
  const deleteCombo = async (id) => { await supabase.from("apuestas_combinadas").delete().eq("id", id); setCombos(combos.filter((c) => c.id !== id)); };

  // ── Aplicar resultado a apuesta simple ──────────────────────────────
  const applyResultToBet = async (betId, homeGoals, awayGoals, reason) => {
    const bet = bets.find((b) => b.id === betId);
    if (!bet) return;
    const resolved = resolveMarket(bet.market, homeGoals, awayGoals, null, null);
    const newStatus = resolved || STATUS.PENDING;
    await supabase.from("apuestas_simples").update({ estado: newStatus, goles_local: homeGoals, goles_visitante: awayGoals, razon_resultado: reason }).eq("id", betId);
    setBets(bets.map((b) => (b.id === betId ? { ...b, status: newStatus, result: { homeGoals, awayGoals }, razonResultado: reason } : b)));
  };

  // ── Aplicar resultado a selección de combinada ───────────────────────
  const applyResultToSelection = async (comboId, selId, homeGoals, awayGoals, reason) => {
    const combo = combos.find((c) => c.id === comboId);
    if (!combo) return;
    const sel = combo.selections.find((s) => s.id === selId);
    if (!sel) return;
    const resolved = resolveMarket(sel.market, homeGoals, awayGoals, null, null);
    const newSelStatus = resolved || STATUS.PENDING;
    await supabase.from("combinada_selecciones").update({ estado: newSelStatus, goles_local: homeGoals, goles_visitante: awayGoals, razon_resultado: reason }).eq("id", selId);
    const newSelections = combo.selections.map((s) => s.id === selId ? { ...s, status: newSelStatus, result: { homeGoals, awayGoals }, razonResultado: reason } : s);
    const allDecided = newSelections.every((s) => s.status !== STATUS.PENDING);
    const anyLost = newSelections.some((s) => s.status === STATUS.LOST);
    const allWonOrVoid = newSelections.every((s) => s.status === STATUS.WON || s.status === STATUS.VOID);
    let comboStatus = STATUS.PENDING;
    if (anyLost) comboStatus = STATUS.LOST;
    else if (allDecided && allWonOrVoid) comboStatus = STATUS.WON;
    await supabase.from("apuestas_combinadas").update({ estado: comboStatus }).eq("id", comboId);
    setCombos(combos.map((c) => (c.id === comboId ? { ...c, selections: newSelections, status: comboStatus } : c)));
  };

  // ── Banca ─────────────────────────────────────────────────────────────
  const startEditBankroll = () => { setBankrollInput(String(bankroll)); setEditingBankroll(true); };
  const confirmBankroll = async () => {
    const val = parseFloat(bankrollInput.replace(/[^\d.]/g, ""));
    if (!isNaN(val) && val > 0) { await supabase.from("banca").update({ monto: val }).eq("id", 1); setBankroll(val); }
    setEditingBankroll(false);
  };

  // ── Combo form helpers ───────────────────────────────────────────────
  const updateSelection = (idx, field, value) => {
    const sels = [...comboForm.selections];
    sels[idx] = { ...sels[idx], [field]: value };
    setComboForm({ ...comboForm, selections: sels });
  };
  const addSelection = () => { if (comboForm.selections.length >= 3) return; setComboForm({ ...comboForm, selections: [...comboForm.selections, emptySelection()] }); };
  const removeSelection = (idx) => { if (comboForm.selections.length <= 2) return; setComboForm({ ...comboForm, selections: comboForm.selections.filter((_, i) => i !== idx) }); };
  const comboPreviewOdds = comboForm.selections.filter((s) => s.odds).reduce((p, s) => p * parseFloat(s.odds || 1), 1);

  // ── Cálculo en vivo del Edge ─────────────────────────────────────────
  const formConfidenceLevel = CONFIDENCE_LEVELS.find((c) => c.id === form.confidence);
  const formImpliedProb = form.odds ? impliedProbability(parseFloat(form.odds)) : 0;
  const formEdge = form.odds ? calculateEdge(formConfidenceLevel.probability, parseFloat(form.odds)) : null;
  const formVerdict = formEdge != null ? getVerdict(formEdge) : null;

  if (loading) {
    return (
      <div style={styles.loadingScreen}>
        <Loader2 className="spin" size={28} color="#D4A537" />
        <span style={{ marginTop: 12, color: "#9A9488", fontSize: 14 }}>Cargando registro…</span>
        <style>{spinKeyframes}</style>
      </div>
    );
  }

  return (
    <div style={styles.app}>
      <style>{spinKeyframes}</style>

      <div style={styles.header}>
        <div style={styles.headerTop}>
          <div>
            <div style={styles.eyebrow}>APUESTAS TRACKER · EN VIVO</div>
            <h1 style={styles.title}>Mis apuestas</h1>
          </div>
        </div>
        <div style={styles.bankrollCard}>
          <div style={styles.bankrollLeft}>
            <Wallet size={16} color="#D4A537" />
            <span style={styles.bankrollLabel}>Banca actual</span>
          </div>
          {editingBankroll ? (
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <input autoFocus type="number" value={bankrollInput} onChange={(e) => setBankrollInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && confirmBankroll()} style={styles.bankrollInput} />
              <button onClick={confirmBankroll} style={styles.bankrollConfirm}>OK</button>
            </div>
          ) : (
            <button onClick={startEditBankroll} style={styles.bankrollValue}>{CLP(currentBankroll)}</button>
          )}
        </div>
      </div>

      <div style={styles.tabs}>
        <button style={{ ...styles.tabBtn, ...(tab === "simples" ? styles.tabBtnActive : {}) }} onClick={() => { setTab("simples"); setShowForm(false); }}>
          <Circle size={12} /> Simples
        </button>
        <button style={{ ...styles.tabBtn, ...(tab === "combinadas" ? styles.tabBtnActive : {}) }} onClick={() => { setTab("combinadas"); setShowForm(false); }}>
          <Layers size={12} /> Combinadas
        </button>
        <button style={{ ...styles.tabBtn, ...(tab === "analisis" ? styles.tabBtnActive : {}) }} onClick={() => { setTab("analisis"); setShowForm(false); }}>
          <ClipboardList size={12} /> Análisis
        </button>
        <button style={{ ...styles.tabBtn, ...(tab === "rendimiento" ? styles.tabBtnActive : {}) }} onClick={() => { setTab("rendimiento"); setShowForm(false); }}>
          <BarChart2 size={12} /> Rendimiento
        </button>
      </div>

      {activeStats && (
        <div style={styles.kpiRow}>
          <KpiCard icon={<Target size={14} color="#D4A537" />} label="Acierto" value={decided > 0 ? `${winRate.toFixed(0)}%` : "—"} sub={`${activeStats.won}G · ${activeStats.lost}P`} />
          <KpiCard icon={activeStats.netPL >= 0 ? <TrendingUp size={14} color="#3FA66B" /> : <TrendingDown size={14} color="#C75450" />} label="P&L Neto" value={CLP(activeStats.netPL)} valueColor={activeStats.netPL >= 0 ? "#3FA66B" : "#C75450"} sub={`ROI ${roi.toFixed(1)}%`} />
          <KpiCard icon={<Clock size={14} color="#9A9488" />} label="Pendientes" value={activeStats.pending} sub="por resolver" />
        </div>
      )}

      {(tab === "simples" || tab === "combinadas") && (
        <>
          {!showForm ? (
            <button style={styles.addBtn} onClick={() => setShowForm(true)}>
              <Plus size={17} />
              {tab === "simples" ? "Registrar nueva apuesta" : "Registrar nueva combinada"}
            </button>
          ) : tab === "simples" ? (
            <div style={styles.formCard}>
              <div style={styles.formTitle}>Nueva apuesta</div>
              <label style={styles.formLabel}>Fecha del partido</label>
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} style={styles.input} />
              <label style={styles.formLabel}>Competencia</label>
              <select value={form.competition} onChange={(e) => setForm({ ...form, competition: e.target.value })} style={styles.input}>
                {COMPETITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <label style={styles.formLabel}>Partido</label>
              <input type="text" placeholder="Ej: España vs Cabo Verde" value={form.match} onChange={(e) => setForm({ ...form, match: e.target.value })} style={styles.input} />
              <label style={styles.formLabel}>Mercado</label>
              <select value={form.market} onChange={(e) => setForm({ ...form, market: e.target.value })} style={styles.input}>
                {MARKETS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
              <div style={{ display: "flex", gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <label style={styles.formLabel}>Cuota</label>
                  <input type="number" step="0.01" placeholder="1.65" value={form.odds} onChange={(e) => setForm({ ...form, odds: e.target.value })} style={styles.input} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={styles.formLabel}>Stake</label>
                  <select value={form.stake} onChange={(e) => setForm({ ...form, stake: parseFloat(e.target.value) })} style={styles.input}>
                    {STAKE_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
              </div>

              <div style={styles.protocolBox}>
                <div style={styles.protocolTitle}>Análisis de lo ya analizado</div>
                <label style={styles.formLabel}>Paso 1 — ¿Qué patrón de sesgo detectas?</label>
                <select value={form.biasPattern} onChange={(e) => setForm({ ...form, biasPattern: e.target.value })} style={styles.input}>
                  {BIAS_PATTERNS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                </select>
                <div style={styles.protocolHint}>{BIAS_PATTERNS.find((p) => p.id === form.biasPattern)?.hint}</div>
                <label style={styles.formLabel}>Paso 2 — Nivel de confianza</label>
                <div style={styles.confidenceRow}>
                  {CONFIDENCE_LEVELS.map((c) => (
                    <button key={c.id} onClick={() => setForm({ ...form, confidence: c.id })}
                      style={{ ...styles.confidenceBtn, ...(form.confidence === c.id ? styles.confidenceBtnActive : {}) }}>
                      {c.label}
                    </button>
                  ))}
                </div>
                {form.odds && (
                  <div style={styles.edgeBox}>
                    <div style={styles.edgeRow}><span>Tu probabilidad</span><strong>{(formConfidenceLevel.probability * 100).toFixed(0)}%</strong></div>
                    <div style={styles.edgeRow}><span>Probabilidad implícita</span><strong>{(formImpliedProb * 100).toFixed(1)}%</strong></div>
                    <div style={styles.edgeRow}>
                      <span>Edge</span>
                      <strong style={{ color: formEdge >= 0 ? "#3FA66B" : "#C75450" }}>{formEdge >= 0 ? "+" : ""}{(formEdge * 100).toFixed(1)}%</strong>
                    </div>
                    <div style={{ ...styles.verdictBadge, ...(formVerdict === "apostar" ? styles.verdictGood : styles.verdictBad) }}>
                      {formVerdict === "apostar" ? `✅ Apostar (Edge +${(formEdge * 100).toFixed(1)}%)` : `⚠️ Pasar (Edge ${(formEdge * 100).toFixed(1)}%)`}
                    </div>
                  </div>
                )}
                <label style={styles.formLabel}>Checklist rápido</label>
                <div style={styles.checklistRow}>
                  <span style={styles.checklistQuestion}>¿Analizaste forma/contexto antes de ver la cuota?</span>
                  <div style={styles.checklistBtns}>
                    <button onClick={() => setForm({ ...form, checklistForma: true })} style={{ ...styles.miniBtn, ...(form.checklistForma === true ? styles.miniBtnActive : {}) }}>Sí</button>
                    <button onClick={() => setForm({ ...form, checklistForma: false })} style={{ ...styles.miniBtn, ...(form.checklistForma === false ? styles.miniBtnActiveNo : {}) }}>No</button>
                  </div>
                </div>
                <div style={styles.checklistRow}>
                  <span style={styles.checklistQuestion}>¿La cuota tiene valor real según tu estimación?</span>
                  <div style={styles.checklistBtns}>
                    <button onClick={() => setForm({ ...form, checklistValor: true })} style={{ ...styles.miniBtn, ...(form.checklistValor === true ? styles.miniBtnActive : {}) }}>Sí</button>
                    <button onClick={() => setForm({ ...form, checklistValor: false })} style={{ ...styles.miniBtn, ...(form.checklistValor === false ? styles.miniBtnActiveNo : {}) }}>No</button>
                  </div>
                </div>
              </div>

              {form.odds && (
                <div style={styles.stakePreview}>
                  Apostarás <strong>{CLP(currentBankroll * form.stake)}</strong> · Retorno potencial <strong>{CLP(currentBankroll * form.stake * parseFloat(form.odds || 0))}</strong>
                </div>
              )}
              <div style={styles.formActions}>
                <button style={styles.cancelBtn} onClick={() => setShowForm(false)}>Cancelar</button>
                <button style={styles.saveBtn} onClick={addBet} disabled={saving}>{saving ? "Guardando…" : "Guardar apuesta"}</button>
              </div>
            </div>
          ) : (
            <div style={styles.formCard}>
              <div style={styles.formTitle}>Nueva combinada</div>
              <div style={styles.comboHint}>Máx. 3 selecciones · Ganas solo si TODAS aciertan</div>
              <label style={styles.formLabel}>Fecha</label>
              <input type="date" value={comboForm.date} onChange={(e) => setComboForm({ ...comboForm, date: e.target.value })} style={styles.input} />
              {comboForm.selections.map((sel, idx) => {
                const selConfidence = CONFIDENCE_LEVELS.find((c) => c.id === sel.confidence) || CONFIDENCE_LEVELS[1];
                const selEdge = sel.odds ? calculateEdge(selConfidence.probability, parseFloat(sel.odds)) : null;
                const selVerdict = selEdge != null ? getVerdict(selEdge) : null;
                return (
                  <div key={idx} style={styles.selectionBlock}>
                    <div style={styles.selectionHeader}>
                      <span style={styles.selectionNum}>Selección {idx + 1}</span>
                      {comboForm.selections.length > 2 && (
                        <button onClick={() => removeSelection(idx)} style={styles.removeSelBtn}><X size={13} /></button>
                      )}
                    </div>
                    <select value={sel.competition} onChange={(e) => updateSelection(idx, "competition", e.target.value)} style={styles.inputSmall}>
                      {COMPETITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <input type="text" placeholder="Partido" value={sel.match} onChange={(e) => updateSelection(idx, "match", e.target.value)} style={{ ...styles.inputSmall, marginTop: 7 }} />
                    <select value={sel.market} onChange={(e) => updateSelection(idx, "market", e.target.value)} style={{ ...styles.inputSmall, marginTop: 7 }}>
                      {MARKETS.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <input type="number" step="0.01" placeholder="Cuota" value={sel.odds} onChange={(e) => updateSelection(idx, "odds", e.target.value)} style={{ ...styles.inputSmall, marginTop: 7 }} />
                    <select value={sel.biasPattern} onChange={(e) => updateSelection(idx, "biasPattern", e.target.value)} style={{ ...styles.inputSmall, marginTop: 7 }}>
                      {BIAS_PATTERNS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                    </select>
                    <div style={styles.confidenceRowSmall}>
                      {CONFIDENCE_LEVELS.map((c) => (
                        <button key={c.id} onClick={() => updateSelection(idx, "confidence", c.id)}
                          style={{ ...styles.confidenceBtnSmall, ...(sel.confidence === c.id ? styles.confidenceBtnActive : {}) }}>
                          {c.label.replace(" confianza", "")}
                        </button>
                      ))}
                    </div>
                    {sel.odds && (
                      <div style={{ ...styles.verdictBadge, marginTop: 8, ...(selVerdict === "apostar" ? styles.verdictGood : styles.verdictBad) }}>
                        {selVerdict === "apostar" ? `✅ Edge +${(selEdge * 100).toFixed(1)}%` : `⚠️ Edge ${(selEdge * 100).toFixed(1)}%`}
                      </div>
                    )}
                  </div>
                );
              })}
              {comboForm.selections.length < 3 && (
                <button onClick={addSelection} style={styles.addSelectionBtn}><Plus size={13} /> Añadir selección</button>
              )}
              <label style={styles.formLabel}>Stake</label>
              <select value={comboForm.stake} onChange={(e) => setComboForm({ ...comboForm, stake: parseFloat(e.target.value) })} style={styles.input}>
                {STAKE_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
              {comboPreviewOdds > 1 && (
                <div style={styles.stakePreview}>
                  Cuota combinada <strong>{comboPreviewOdds.toFixed(2)}</strong> · Apostarás <strong>{CLP(currentBankroll * comboForm.stake)}</strong> · Retorno potencial <strong>{CLP(currentBankroll * comboForm.stake * comboPreviewOdds)}</strong>
                </div>
              )}
              <div style={styles.formActions}>
                <button style={styles.cancelBtn} onClick={() => setShowForm(false)}>Cancelar</button>
                <button style={styles.saveBtn} onClick={addCombo} disabled={saving}>{saving ? "Guardando…" : "Guardar combinada"}</button>
              </div>
            </div>
          )}

          <div style={styles.listSection}>
            {tab === "simples" ? (
              bets.length === 0 ? <EmptyState text="Aún no has registrado apuestas simples." /> :
                bets.map((bet) => <BetCard key={bet.id} bet={bet} onApplyResult={applyResultToBet} onDelete={() => deleteBet(bet.id)} />)
            ) : combos.length === 0 ? <EmptyState text="Aún no has registrado combinadas." /> :
              combos.map((combo) => <ComboCard key={combo.id} combo={combo} onApplyResult={applyResultToSelection} onDelete={() => deleteCombo(combo.id)} />)
            }
          </div>
        </>
      )}

      {tab === "analisis" && (
        <AnalisisPrevioPanel
          analisisTipo={analisisTipo}
          setAnalisisTipo={setAnalisisTipo}
          analisisSimple={analisisSimple}
          setAnalisisSimple={setAnalisisSimple}
          analisisSimpleGuardado={analisisSimpleGuardado}
          analisisCombinada={analisisCombinada}
          analisisCombinadaGuardado={analisisCombinadaGuardado}
          bloquesValidos={bloquesValidos}
          guardandoAnalisis={guardandoAnalisis}
          onGuardarSimple={guardarAnalisisSimple}
          onGuardarCombinada={guardarAnalisisCombinada}
          onIrApuestaSimple={irACrearApuestaSimple}
          onIrCombinada={irACrearCombinada}
          onReset={resetAnalisis}
          onUpdateCombinada={updateAnalisisCombinada}
          onAddBloque={addBloqueCombinada}
          onRemoveBloque={removeBloqueCombinada}
        />
      )}

      {tab === "rendimiento" && (
        <PerformancePanel
          overallDecided={overallDecided}
          overallWinRate={overallWinRate}
          byMarket={byMarket}
          byLeague={byLeague}
          byStake={byStake}
          byLossReason={byLossReason}
        />
      )}

      <div style={styles.footer}>
        Pídele a Claude en el chat que busque los resultados y aplícalos aquí con el botón ✓ de cada partido.
      </div>
    </div>
  );
}

// ── Bloque de análisis (partido + 5 preguntas) ────────────────────────────
function BloqueAnalisis({ bloque, onChange, titulo }) {
  return (
    <div style={{ marginBottom: 16 }}>
      {titulo && <div style={{ fontSize: 12, fontWeight: 700, color: "#D4A537", marginBottom: 8 }}>{titulo}</div>}
      <label style={styles.formLabel}>Fecha</label>
      <input type="date" value={bloque.date} onChange={(e) => onChange("date", e.target.value)} style={styles.input} />
      <label style={styles.formLabel}>Competencia</label>
      <select value={bloque.competition} onChange={(e) => onChange("competition", e.target.value)} style={styles.input}>
        {COMPETITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
      <label style={styles.formLabel}>Partido</label>
      <input type="text" placeholder="Ej: España vs Marruecos" value={bloque.match} onChange={(e) => onChange("match", e.target.value)} style={styles.input} />

      <div style={{ marginTop: 14, borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 14 }}>
        {ADVANCED_CHECKLIST.map((pregunta, idx) => (
          <div key={pregunta.id} style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: "#D4A537", marginBottom: 2 }}>
              P{idx + 1} · {pregunta.patron}
            </div>
            <div style={{ fontSize: 12, color: "#F5F1E8", fontWeight: 600, marginBottom: 2 }}>{pregunta.pregunta}</div>
            <div style={{ fontSize: 10.5, color: "#9A9488", marginBottom: 6 }}>{pregunta.descripcion}</div>
            {pregunta.opciones.map((opcion) => (
              <button key={opcion.value} onClick={() => onChange("respuesta", { id: pregunta.id, val: opcion.value })}
                style={{
                  display: "block", width: "100%", textAlign: "left",
                  background: bloque.respuestas[pregunta.id] === opcion.value ? "rgba(212,165,55,0.15)" : "#14171B",
                  border: bloque.respuestas[pregunta.id] === opcion.value ? "1px solid #D4A537" : "1px solid rgba(255,255,255,0.08)",
                  color: bloque.respuestas[pregunta.id] === opcion.value ? "#D4A537" : "#C9C2B3",
                  borderRadius: 8, padding: "7px 10px", fontSize: 11.5, marginBottom: 4,
                  cursor: "pointer", fontFamily: "inherit",
                }}>
                {opcion.label}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Panel de Análisis Previo ──────────────────────────────────────────────
function AnalisisPrevioPanel({
  analisisTipo, setAnalisisTipo,
  analisisSimple, setAnalisisSimple, analisisSimpleGuardado,
  analisisCombinada, analisisCombinadaGuardado, bloquesValidos,
  guardandoAnalisis,
  onGuardarSimple, onGuardarCombinada,
  onIrApuestaSimple, onIrCombinada, onReset,
  onUpdateCombinada, onAddBloque, onRemoveBloque,
}) {
  // Pantalla inicial: elegir tipo
  if (!analisisTipo) {
    return (
      <div style={styles.listSection}>
        <div style={{ ...styles.panelOverallCard, textAlign: "center", padding: "28px 16px" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#F5F1E8", marginBottom: 6 }}>Análisis previo al partido</div>
          <div style={{ fontSize: 11.5, color: "#9A9488", marginBottom: 20 }}>¿Para qué tipo de apuesta vas a analizar?</div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setAnalisisTipo("simple")}
              style={{ flex: 1, background: "rgba(212,165,55,0.12)", border: "1px solid rgba(212,165,55,0.35)", color: "#D4A537", borderRadius: 10, padding: "14px 8px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              <Circle size={16} style={{ display: "block", margin: "0 auto 6px" }} />
              Apuesta Simple
            </button>
            <button onClick={() => setAnalisisTipo("combinada")}
              style={{ flex: 1, background: "rgba(212,165,55,0.12)", border: "1px solid rgba(212,165,55,0.35)", color: "#D4A537", borderRadius: 10, padding: "14px 8px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              <Layers size={16} style={{ display: "block", margin: "0 auto 6px" }} />
              Combinada
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Análisis guardado (simple)
  if (analisisTipo === "simple" && analisisSimpleGuardado) {
    return (
      <div style={styles.listSection}>
        <div style={{ ...styles.panelOverallCard, textAlign: "left" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#3FA66B", marginBottom: 6 }}>✅ Análisis guardado</div>
          <div style={{ fontSize: 13, color: "#F5F1E8", fontWeight: 600 }}>{analisisSimple.match}</div>
          <div style={{ fontSize: 11, color: "#76705F", marginTop: 2 }}>{analisisSimple.competition} · {analisisSimple.date}</div>
          <div style={{ fontSize: 11, color: "#9A9488", marginTop: 6 }}>
            {Object.values(analisisSimple.respuestas).filter(Boolean).length} de 5 preguntas respondidas
          </div>
        </div>
        <button onClick={onIrApuestaSimple} style={{ ...styles.saveBtn, width: "100%", marginTop: 4 }}>
          Crear apuesta simple con este análisis →
        </button>
        <button onClick={onReset} style={{ ...styles.cancelBtn, width: "100%", marginTop: 8 }}>
          Nuevo análisis
        </button>
      </div>
    );
  }

  // Análisis guardado (combinada)
  if (analisisTipo === "combinada" && analisisCombinadaGuardado) {
    return (
      <div style={styles.listSection}>
        <div style={{ ...styles.panelOverallCard, textAlign: "left" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#3FA66B", marginBottom: 8 }}>✅ Análisis guardado</div>
          {analisisCombinada.filter((b) => b.match.trim()).map((b, idx) => (
            <div key={idx} style={{ marginBottom: 6 }}>
              <div style={{ fontSize: 12.5, color: "#F5F1E8", fontWeight: 600 }}>Partido {idx + 1}: {b.match}</div>
              <div style={{ fontSize: 11, color: "#76705F" }}>{b.competition} · {b.date}</div>
            </div>
          ))}
        </div>
        <button onClick={onIrCombinada} style={{ ...styles.saveBtn, width: "100%", marginTop: 4 }}>
          Crear combinada con estos análisis →
        </button>
        <button onClick={onReset} style={{ ...styles.cancelBtn, width: "100%", marginTop: 8 }}>
          Nuevo análisis
        </button>
      </div>
    );
  }

  // Formulario simple
  if (analisisTipo === "simple") {
    return (
      <div style={styles.listSection}>
        <div style={styles.formCard}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={styles.formTitle}>Análisis previo — Simple</div>
            <button onClick={onReset} style={{ background: "none", border: "none", color: "#9A9488", cursor: "pointer", fontSize: 11 }}>← Cambiar</button>
          </div>
          <BloqueAnalisis
            bloque={analisisSimple}
            onChange={(field, value) => {
              if (field === "respuesta") {
                setAnalisisSimple((prev) => ({ ...prev, respuestas: { ...prev.respuestas, [value.id]: value.val } }));
              } else {
                setAnalisisSimple((prev) => ({ ...prev, [field]: value }));
              }
            }}
          />
          <div style={{ fontSize: 11, color: "#76705F", textAlign: "center", marginBottom: 12 }}>
            {Object.values(analisisSimple.respuestas).filter(Boolean).length} de 5 preguntas respondidas
          </div>
          <button
            onClick={onGuardarSimple}
            disabled={!analisisSimple.match.trim() || guardandoAnalisis}
            style={{ ...styles.saveBtn, width: "100%", opacity: !analisisSimple.match.trim() ? 0.5 : 1 }}>
            {guardandoAnalisis ? "Guardando…" : "Guardar análisis"}
          </button>
        </div>
      </div>
    );
  }

  // Formulario combinada
  if (analisisTipo === "combinada") {
    return (
      <div style={styles.listSection}>
        <div style={styles.formCard}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={styles.formTitle}>Análisis previo — Combinada</div>
            <button onClick={onReset} style={{ background: "none", border: "none", color: "#9A9488", cursor: "pointer", fontSize: 11 }}>← Cambiar</button>
          </div>
          <div style={{ fontSize: 11, color: "#9A9488", marginBottom: 14 }}>
            Analiza cada partido por separado. Con 2 o 3 partidos listos podrás crear la combinada.
          </div>

          {analisisCombinada.map((bloque, idx) => (
            <div key={idx} style={{ ...styles.selectionBlock, marginBottom: 12 }}>
              <div style={styles.selectionHeader}>
                <span style={styles.selectionNum}>Partido {String.fromCharCode(65 + idx)}</span>
                {analisisCombinada.length > 2 && (
                  <button onClick={() => onRemoveBloque(idx)} style={styles.removeSelBtn}><X size={13} /></button>
                )}
              </div>
              <BloqueAnalisis
                bloque={bloque}
                onChange={(field, value) => onUpdateCombinada(idx, field, value)}
              />
            </div>
          ))}

          {analisisCombinada.length < 3 && (
            <button onClick={onAddBloque} style={styles.addSelectionBtn}>
              <Plus size={13} /> Añadir Partido {String.fromCharCode(65 + analisisCombinada.length)}
            </button>
          )}

          <div style={{ fontSize: 11, color: bloquesValidos >= 2 ? "#3FA66B" : "#76705F", textAlign: "center", margin: "12px 0" }}>
            {bloquesValidos} de {analisisCombinada.length} partidos con nombre completo
            {bloquesValidos >= 2 ? " · Listo para crear combinada" : " · Necesitas al menos 2"}
          </div>

          <button
            onClick={onGuardarCombinada}
            disabled={bloquesValidos < 2 || guardandoAnalisis}
            style={{ ...styles.saveBtn, width: "100%", opacity: bloquesValidos < 2 ? 0.5 : 1 }}>
            {guardandoAnalisis ? "Guardando…" : "Guardar análisis y crear combinada"}
          </button>
        </div>
      </div>
    );
  }

  return null;
}

function PerformancePanel({ overallDecided, overallWinRate, byMarket, byLeague, byStake, byLossReason }) {
  if (overallDecided === 0) {
    return (
      <div style={styles.listSection}>
        <EmptyState text="Aún no hay apuestas resueltas para analizar. Cuando apliques resultados, aquí verás tu rendimiento desglosado." />
      </div>
    );
  }
  return (
    <div style={styles.listSection}>
      <div style={styles.panelOverallCard}>
        <div style={styles.panelOverallLabel}>Acierto general</div>
        <div style={styles.panelOverallValue}>{overallWinRate.toFixed(0)}%</div>
        <div style={styles.panelOverallSub}>{overallDecided} apuestas/selecciones resueltas</div>
      </div>
      <BreakdownSection title="% acierto por mercado" rows={byMarket} />
      <BreakdownSection title="% acierto por liga/competencia" rows={byLeague} />
      <BreakdownSection title="% acierto por nivel de stake" rows={byStake} />
      <div style={styles.panelSectionTitle}>Causas de pérdida más comunes</div>
      {byLossReason.length === 0 ? (
        <div style={styles.panelEmptyHint}>Aún no hay causas registradas.</div>
      ) : (
        byLossReason.map((r) => (
          <div key={r.reason} style={styles.lossReasonRow}>
            <span style={styles.lossReasonText}>{r.reason}</span>
            <span style={styles.lossReasonCount}>{r.count}×</span>
          </div>
        ))
      )}
    </div>
  );
}

function BreakdownSection({ title, rows }) {
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={styles.panelSectionTitle}>{title}</div>
      {rows.length === 0 ? <div style={styles.panelEmptyHint}>Sin datos suficientes todavía.</div> : (
        rows.map((row) => (
          <div key={row.key} style={styles.breakdownRow}>
            <span style={styles.breakdownKey}>{row.key}</span>
            <div style={styles.breakdownBarWrap}>
              <div style={{ ...styles.breakdownBar, width: `${row.pct}%`, background: row.pct >= 50 ? "#3FA66B" : "#C75450" }} />
            </div>
            <span style={styles.breakdownPct}>{row.pct.toFixed(0)}% ({row.won}/{row.total})</span>
          </div>
        ))
      )}
    </div>
  );
}

function EmptyState({ text }) {
  return <div style={styles.emptyState}><AlertCircle size={22} color="#9A9488" /><span style={{ marginTop: 8 }}>{text}</span></div>;
}

function KpiCard({ icon, label, value, valueColor, sub }) {
  return (
    <div style={styles.kpiCard}>
      <div style={styles.kpiIconRow}>{icon}<span style={styles.kpiLabel}>{label}</span></div>
      <div style={{ ...styles.kpiValue, color: valueColor || "#EDE8DC" }}>{value}</div>
      <div style={styles.kpiSub}>{sub}</div>
    </div>
  );
}

const STATUS_CONFIG = {
  [STATUS.PENDING]: { color: "#9A9488", bg: "rgba(154,148,136,0.12)", icon: <Clock size={13} />, label: "Pendiente" },
  [STATUS.WON]: { color: "#3FA66B", bg: "rgba(63,166,107,0.12)", icon: <CheckCircle2 size={13} />, label: "Ganado" },
  [STATUS.LOST]: { color: "#C75450", bg: "rgba(199,84,80,0.12)", icon: <XCircle size={13} />, label: "Perdido" },
  [STATUS.VOID]: { color: "#D4A537", bg: "rgba(212,165,55,0.12)", icon: <AlertCircle size={13} />, label: "Nulo" },
};

function BetCard({ bet, onApplyResult, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [home, setHome] = useState("");
  const [away, setAway] = useState("");
  const [pendingStatus, setPendingStatus] = useState(null);
  const [reason, setReason] = useState("");
  const cfg = STATUS_CONFIG[bet.status] || STATUS_CONFIG[STATUS.PENDING];
  const pnl = bet.status === STATUS.WON ? bet.stakeAmount * bet.odds - bet.stakeAmount : bet.status === STATUS.LOST ? -bet.stakeAmount : 0;

  const calculateStatus = () => {
    if (home === "" || away === "") return;
    const resolved = resolveMarket(bet.market, parseInt(home, 10), parseInt(away, 10), null, null);
    setPendingStatus(resolved || STATUS.PENDING);
  };

  const submit = () => {
    onApplyResult(bet.id, parseInt(home, 10), parseInt(away, 10), reason || null);
    setEditing(false); setPendingStatus(null); setReason("");
  };

  const reasonOptions = pendingStatus === STATUS.WON ? WIN_FACTORS : pendingStatus === STATUS.LOST ? LOSS_REASONS : [];

  return (
    <div style={{ ...styles.betCard, borderLeft: `3px solid ${cfg.color}` }}>
      <div style={styles.betCardTop}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={styles.betMatch}>{bet.match}</div>
          <div style={styles.betMeta}>{bet.competition} · {bet.date}</div>
        </div>
        <div style={{ ...styles.statusBadge, color: cfg.color, background: cfg.bg }}>{cfg.icon}{cfg.label}</div>
      </div>
      <div style={styles.betMarket}>{bet.market} <span style={styles.betOdds}>@ {bet.odds.toFixed(2)}</span></div>
      {bet.result && <div style={styles.resultLine}>⚽ Marcador: {bet.result.homeGoals} – {bet.result.awayGoals}</div>}
      {bet.razonResultado && <div style={styles.resultLine}>📋 {bet.razonResultado}</div>}
      {editing && pendingStatus === null && (
        <div style={styles.scoreForm}>
          <div style={styles.scoreRow}>
            <span style={styles.scoreLabel}>Final</span>
            <input type="number" min="0" value={home} onChange={(e) => setHome(e.target.value)} style={styles.scoreInput} placeholder="0" />
            <span style={styles.scoreDash}>–</span>
            <input type="number" min="0" value={away} onChange={(e) => setAway(e.target.value)} style={styles.scoreInput} placeholder="0" />
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            <button onClick={() => setEditing(false)} style={styles.scoreCancelBtn}>Cancelar</button>
            <button onClick={calculateStatus} style={styles.scoreApplyBtn}>Continuar</button>
          </div>
        </div>
      )}
      {editing && pendingStatus !== null && (
        <div style={styles.reasonBox}>
          <span style={styles.reasonLabel}>
            Resultado: {pendingStatus === STATUS.WON ? "Ganado ✓" : pendingStatus === STATUS.LOST ? "Perdido ✗" : "Nulo"}
            {reasonOptions.length > 0 && " — ¿por qué?"}
          </span>
          {reasonOptions.length > 0 && (
            <select value={reason} onChange={(e) => setReason(e.target.value)} style={styles.reasonSelect}>
              <option value="">Selecciona una razón…</option>
              {reasonOptions.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          )}
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            <button onClick={() => { setEditing(false); setPendingStatus(null); }} style={styles.scoreCancelBtn}>Cancelar</button>
            <button onClick={submit} style={styles.scoreApplyBtn}>Guardar resultado</button>
          </div>
        </div>
      )}
      <div style={styles.betCardBottom}>
        <span style={styles.betStake}>Stake: {CLP(bet.stakeAmount)}</span>
        {bet.status !== STATUS.PENDING && <span style={{ color: pnl >= 0 ? "#3FA66B" : "#C75450", fontWeight: 600 }}>{pnl >= 0 ? "+" : ""}{CLP(pnl)}</span>}
        <div style={{ display: "flex", gap: 6, marginLeft: "auto" }}>
          {bet.status === STATUS.PENDING && !editing && (
            <button onClick={() => setEditing(true)} style={styles.iconBtn} title="Ingresar resultado"><CheckCircle2 size={14} /></button>
          )}
          <button onClick={onDelete} style={styles.iconBtnDanger} title="Eliminar"><Trash2 size={14} /></button>
        </div>
      </div>
    </div>
  );
}

function ComboSelectionRow({ combo, sel, onApplyResult }) {
  const [editing, setEditing] = useState(false);
  const [home, setHome] = useState("");
  const [away, setAway] = useState("");
  const [pendingStatus, setPendingStatus] = useState(null);
  const [reason, setReason] = useState("");
  const selCfg = STATUS_CONFIG[sel.status] || STATUS_CONFIG[STATUS.PENDING];

  const calculateStatus = () => {
    if (home === "" || away === "") return;
    const resolved = resolveMarket(sel.market, parseInt(home, 10), parseInt(away, 10), null, null);
    setPendingStatus(resolved || STATUS.PENDING);
  };

  const submit = () => {
    onApplyResult(combo.id, sel.id, parseInt(home, 10), parseInt(away, 10), reason || null);
    setEditing(false); setPendingStatus(null); setReason("");
  };

  const reasonOptions = pendingStatus === STATUS.WON ? WIN_FACTORS : pendingStatus === STATUS.LOST ? LOSS_REASONS : [];

  return (
    <div style={styles.selRow}>
      <div style={{ ...styles.selDot, background: selCfg.color }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={styles.selMatch}>{sel.match}</div>
        <div style={styles.selMarket}>{sel.market} <span style={styles.betOdds}>@ {sel.odds.toFixed(2)}</span></div>
        {sel.result && <div style={styles.selResult}>⚽ {sel.result.homeGoals} – {sel.result.awayGoals}</div>}
        {sel.razonResultado && <div style={styles.selResult}>📋 {sel.razonResultado}</div>}
        {editing && pendingStatus === null && (
          <div style={styles.scoreForm}>
            <div style={styles.scoreRow}>
              <span style={styles.scoreLabel}>Final</span>
              <input type="number" min="0" value={home} onChange={(e) => setHome(e.target.value)} style={styles.scoreInput} placeholder="0" />
              <span style={styles.scoreDash}>–</span>
              <input type="number" min="0" value={away} onChange={(e) => setAway(e.target.value)} style={styles.scoreInput} placeholder="0" />
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
              <button onClick={() => setEditing(false)} style={styles.scoreCancelBtn}>Cancelar</button>
              <button onClick={calculateStatus} style={styles.scoreApplyBtn}>Continuar</button>
            </div>
          </div>
        )}
        {editing && pendingStatus !== null && (
          <div style={styles.reasonBox}>
            <span style={styles.reasonLabel}>
              {pendingStatus === STATUS.WON ? "Ganado ✓" : pendingStatus === STATUS.LOST ? "Perdido ✗" : "Nulo"}
              {reasonOptions.length > 0 && " — ¿por qué?"}
            </span>
            {reasonOptions.length > 0 && (
              <select value={reason} onChange={(e) => setReason(e.target.value)} style={styles.reasonSelect}>
                <option value="">Selecciona una razón…</option>
                {reasonOptions.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            )}
            <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
              <button onClick={() => { setEditing(false); setPendingStatus(null); }} style={styles.scoreCancelBtn}>Cancelar</button>
              <button onClick={submit} style={styles.scoreApplyBtn}>Guardar</button>
            </div>
          </div>
        )}
      </div>
      {sel.status === STATUS.PENDING && !editing ? (
        <button onClick={() => setEditing(true)} style={styles.selEditBtn} title="Ingresar resultado"><CheckCircle2 size={13} /></button>
      ) : (
        <span style={{ ...styles.selStatusTag, color: selCfg.color }}>{selCfg.label}</span>
      )}
    </div>
  );
}

function ComboCard({ combo, onApplyResult, onDelete }) {
  const cfg = STATUS_CONFIG[combo.status] || STATUS_CONFIG[STATUS.PENDING];
  const comboOdds = combo.selections.reduce((p, s) => p * s.odds, 1);
  const pnl = combo.status === STATUS.WON ? combo.stakeAmount * comboOdds - combo.stakeAmount : combo.status === STATUS.LOST ? -combo.stakeAmount : 0;
  return (
    <div style={{ ...styles.betCard, borderLeft: `3px solid ${cfg.color}` }}>
      <div style={styles.betCardTop}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={styles.betMatch}>Combinada · {combo.selections.length} selecciones</div>
          <div style={styles.betMeta}>{combo.date} · Cuota total {comboOdds.toFixed(2)}</div>
        </div>
        <div style={{ ...styles.statusBadge, color: cfg.color, background: cfg.bg }}>{cfg.icon}{cfg.label}</div>
      </div>
      <div style={styles.selectionsWrap}>
        {combo.selections.map((sel) => <ComboSelectionRow key={sel.id} combo={combo} sel={sel} onApplyResult={onApplyResult} />)}
      </div>
      <div style={styles.betCardBottom}>
        <span style={styles.betStake}>Stake: {CLP(combo.stakeAmount)}</span>
        {combo.status !== STATUS.PENDING && <span style={{ color: pnl >= 0 ? "#3FA66B" : "#C75450", fontWeight: 600 }}>{pnl >= 0 ? "+" : ""}{CLP(pnl)}</span>}
        <div style={{ display: "flex", gap: 6, marginLeft: "auto" }}>
          <button onClick={onDelete} style={styles.iconBtnDanger} title="Eliminar"><Trash2 size={14} /></button>
        </div>
      </div>
    </div>
  );
}

const spinKeyframes = `@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } .spin { animation: spin 1s linear infinite; }`;

const styles = {
  app: { fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", background: "#14171B", minHeight: "100vh", color: "#EDE8DC", paddingBottom: 32, maxWidth: 480, margin: "0 auto" },
  loadingScreen: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", background: "#14171B" },
  header: { padding: "20px 18px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" },
  headerTop: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
  eyebrow: { fontSize: 10.5, letterSpacing: "0.12em", color: "#D4A537", fontWeight: 700, marginBottom: 4 },
  title: { fontSize: 22, fontWeight: 700, margin: 0, color: "#F5F1E8", letterSpacing: "-0.01em" },
  bankrollCard: { display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(212,165,55,0.08)", border: "1px solid rgba(212,165,55,0.2)", borderRadius: 12, padding: "12px 14px" },
  bankrollLeft: { display: "flex", alignItems: "center", gap: 7 },
  bankrollLabel: { fontSize: 12.5, color: "#C9C2B3" },
  bankrollValue: { fontSize: 17, fontWeight: 700, color: "#F5F1E8", background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "inherit" },
  bankrollInput: { width: 110, background: "#1E2128", border: "1px solid rgba(212,165,55,0.4)", borderRadius: 7, padding: "6px 8px", color: "#F5F1E8", fontSize: 14 },
  bankrollConfirm: { background: "#D4A537", color: "#14171B", border: "none", borderRadius: 7, padding: "6px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer" },
  tabs: { display: "flex", gap: 5, padding: "14px 18px 0" },
  tabBtn: { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 3, background: "#1B1E24", border: "1px solid rgba(255,255,255,0.06)", color: "#9A9488", borderRadius: 10, padding: "8px 3px", fontSize: 10.5, fontWeight: 600, cursor: "pointer" },
  tabBtnActive: { background: "rgba(212,165,55,0.12)", border: "1px solid rgba(212,165,55,0.35)", color: "#D4A537" },
  kpiRow: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, padding: "14px 18px" },
  kpiCard: { background: "#1B1E24", borderRadius: 11, padding: "11px 10px", border: "1px solid rgba(255,255,255,0.05)" },
  kpiIconRow: { display: "flex", alignItems: "center", gap: 5, marginBottom: 6 },
  kpiLabel: { fontSize: 10.5, color: "#9A9488", fontWeight: 600 },
  kpiValue: { fontSize: 14.5, fontWeight: 700, lineHeight: 1.1, marginBottom: 3 },
  kpiSub: { fontSize: 9.5, color: "#76705F" },
  addBtn: { display: "flex", alignItems: "center", justifyContent: "center", gap: 7, width: "calc(100% - 36px)", margin: "4px 18px 16px", background: "transparent", border: "1.5px dashed rgba(212,165,55,0.4)", color: "#D4A537", borderRadius: 12, padding: "13px", fontSize: 14, fontWeight: 600, cursor: "pointer" },
  formCard: { margin: "4px 18px 16px", background: "#1B1E24", border: "1px solid rgba(212,165,55,0.2)", borderRadius: 14, padding: 16 },
  formTitle: { fontSize: 15, fontWeight: 700, color: "#F5F1E8", marginBottom: 4 },
  comboHint: { fontSize: 11, color: "#9A9488", marginBottom: 12 },
  formLabel: { fontSize: 11.5, color: "#9A9488", fontWeight: 600, display: "block", marginBottom: 5, marginTop: 10 },
  input: { width: "100%", background: "#14171B", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "10px 11px", color: "#F5F1E8", fontSize: 13.5, fontFamily: "inherit", boxSizing: "border-box" },
  inputSmall: { width: "100%", background: "#14171B", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 7, padding: "8px 10px", color: "#F5F1E8", fontSize: 12.5, fontFamily: "inherit", boxSizing: "border-box" },
  stakePreview: { marginTop: 12, fontSize: 11.5, color: "#C9C2B3", background: "rgba(212,165,55,0.07)", borderRadius: 8, padding: "8px 10px", lineHeight: 1.5 },
  formActions: { display: "flex", gap: 8, marginTop: 16 },
  cancelBtn: { flex: 1, background: "transparent", border: "1px solid rgba(255,255,255,0.12)", color: "#C9C2B3", borderRadius: 9, padding: "11px", fontSize: 13, fontWeight: 600, cursor: "pointer" },
  saveBtn: { flex: 1.4, background: "#D4A537", border: "none", color: "#14171B", borderRadius: 9, padding: "11px", fontSize: 13, fontWeight: 700, cursor: "pointer" },
  selectionBlock: { background: "#14171B", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: 10, marginTop: 12 },
  selectionHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 },
  selectionNum: { fontSize: 11, fontWeight: 700, color: "#D4A537", letterSpacing: "0.04em" },
  removeSelBtn: { background: "rgba(199,84,80,0.12)", border: "none", color: "#C75450", borderRadius: 6, width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" },
  addSelectionBtn: { display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", marginTop: 10, background: "rgba(212,165,55,0.08)", border: "1px dashed rgba(212,165,55,0.3)", color: "#D4A537", borderRadius: 9, padding: "9px", fontSize: 12, fontWeight: 600, cursor: "pointer" },
  listSection: { padding: "0 18px", display: "flex", flexDirection: "column", gap: 10 },
  emptyState: { display: "flex", flexDirection: "column", alignItems: "center", color: "#76705F", fontSize: 13, padding: "40px 20px", textAlign: "center" },
  betCard: { background: "#1B1E24", borderRadius: 11, padding: "12px 13px" },
  betCardTop: { display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 6 },
  betMatch: { fontSize: 14, fontWeight: 700, color: "#F5F1E8" },
  betMeta: { fontSize: 11, color: "#76705F", marginTop: 2 },
  statusBadge: { display: "flex", alignItems: "center", gap: 4, fontSize: 10.5, fontWeight: 700, borderRadius: 7, padding: "4px 8px", height: "fit-content", whiteSpace: "nowrap" },
  betMarket: { fontSize: 12.5, color: "#C9C2B3", marginBottom: 6 },
  betOdds: { color: "#D4A537", fontWeight: 700 },
  resultLine: { fontSize: 12, color: "#9A9488", background: "rgba(255,255,255,0.03)", borderRadius: 7, padding: "5px 8px", marginBottom: 8 },
  betCardBottom: { display: "flex", alignItems: "center", gap: 10, fontSize: 12 },
  betStake: { color: "#76705F" },
  selectionsWrap: { display: "flex", flexDirection: "column", gap: 6, marginBottom: 8 },
  selRow: { display: "flex", alignItems: "flex-start", gap: 8, background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: "7px 9px" },
  selDot: { width: 7, height: 7, borderRadius: "50%", marginTop: 4, flexShrink: 0 },
  selMatch: { fontSize: 12.5, fontWeight: 600, color: "#EDE8DC" },
  selMarket: { fontSize: 11, color: "#9A9488", marginTop: 1 },
  selResult: { fontSize: 11, color: "#76705F", marginTop: 2 },
  selStatusTag: { fontSize: 10, fontWeight: 700, whiteSpace: "nowrap" },
  iconBtn: { background: "rgba(212,165,55,0.12)", border: "none", color: "#D4A537", borderRadius: 7, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" },
  iconBtnDanger: { background: "rgba(199,84,80,0.1)", border: "none", color: "#C75450", borderRadius: 7, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" },
  footer: { padding: "16px 24px 0", fontSize: 10.5, color: "#5A5548", textAlign: "center", lineHeight: 1.5 },
  scoreForm: { background: "rgba(212,165,55,0.06)", border: "1px solid rgba(212,165,55,0.2)", borderRadius: 8, padding: 9, marginTop: 7 },
  scoreRow: { display: "flex", alignItems: "center", gap: 7, marginBottom: 6 },
  scoreLabel: { fontSize: 10.5, color: "#9A9488", width: 38, flexShrink: 0 },
  scoreInput: { width: 42, background: "#14171B", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 6, padding: "5px 6px", color: "#F5F1E8", fontSize: 13, textAlign: "center", fontFamily: "inherit" },
  scoreDash: { color: "#76705F", fontSize: 13 },
  scoreCancelBtn: { flex: 1, background: "transparent", border: "1px solid rgba(255,255,255,0.12)", color: "#C9C2B3", borderRadius: 7, padding: "7px", fontSize: 11.5, fontWeight: 600, cursor: "pointer" },
  scoreApplyBtn: { flex: 1.6, background: "#D4A537", border: "none", color: "#14171B", borderRadius: 7, padding: "7px", fontSize: 11.5, fontWeight: 700, cursor: "pointer" },
  selEditBtn: { background: "rgba(212,165,55,0.12)", border: "none", color: "#D4A537", borderRadius: 6, width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 },
  protocolBox: { marginTop: 14, background: "rgba(212,165,55,0.05)", border: "1px solid rgba(212,165,55,0.18)", borderRadius: 10, padding: 12 },
  protocolTitle: { fontSize: 12.5, fontWeight: 700, color: "#D4A537", marginBottom: 4, letterSpacing: "0.02em" },
  protocolHint: { fontSize: 10.5, color: "#9A9488", marginTop: 5, lineHeight: 1.4 },
  confidenceRow: { display: "flex", gap: 6 },
  confidenceRowSmall: { display: "flex", gap: 5, marginTop: 7 },
  confidenceBtnSmall: { flex: 1, background: "#14171B", border: "1px solid rgba(255,255,255,0.1)", color: "#C9C2B3", borderRadius: 7, padding: "6px 3px", fontSize: 10, fontWeight: 600, cursor: "pointer" },
  confidenceBtn: { flex: 1, background: "#14171B", border: "1px solid rgba(255,255,255,0.1)", color: "#C9C2B3", borderRadius: 8, padding: "8px 4px", fontSize: 11, fontWeight: 600, cursor: "pointer" },
  confidenceBtnActive: { background: "rgba(212,165,55,0.18)", border: "1px solid #D4A537", color: "#D4A537" },
  edgeBox: { marginTop: 12, background: "#14171B", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 9, padding: 10 },
  edgeRow: { display: "flex", justifyContent: "space-between", fontSize: 11.5, color: "#C9C2B3", marginBottom: 5 },
  verdictBadge: { textAlign: "center", marginTop: 6, padding: "8px", borderRadius: 7, fontSize: 12.5, fontWeight: 700 },
  verdictGood: { background: "rgba(63,166,107,0.15)", color: "#3FA66B" },
  verdictBad: { background: "rgba(199,84,80,0.15)", color: "#C75450" },
  checklistRow: { marginTop: 10 },
  checklistQuestion: { fontSize: 11.5, color: "#C9C2B3", display: "block", marginBottom: 6 },
  checklistBtns: { display: "flex", gap: 6 },
  miniBtn: { flex: 1, background: "#14171B", border: "1px solid rgba(255,255,255,0.1)", color: "#C9C2B3", borderRadius: 7, padding: "7px", fontSize: 11.5, fontWeight: 600, cursor: "pointer" },
  miniBtnActive: { background: "rgba(63,166,107,0.15)", border: "1px solid #3FA66B", color: "#3FA66B" },
  miniBtnActiveNo: { background: "rgba(199,84,80,0.15)", border: "1px solid #C75450", color: "#C75450" },
  reasonBox: { background: "rgba(212,165,55,0.06)", border: "1px solid rgba(212,165,55,0.2)", borderRadius: 8, padding: 9, marginTop: 7 },
  reasonLabel: { fontSize: 10.5, color: "#9A9488", marginBottom: 6, display: "block" },
  reasonSelect: { width: "100%", background: "#14171B", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 7, padding: "7px 8px", color: "#F5F1E8", fontSize: 11.5, fontFamily: "inherit", boxSizing: "border-box" },
  panelOverallCard: { background: "rgba(212,165,55,0.08)", border: "1px solid rgba(212,165,55,0.2)", borderRadius: 12, padding: "16px", textAlign: "center", marginBottom: 8 },
  panelOverallLabel: { fontSize: 11.5, color: "#9A9488", fontWeight: 600, marginBottom: 4 },
  panelOverallValue: { fontSize: 32, fontWeight: 700, color: "#D4A537", lineHeight: 1 },
  panelOverallSub: { fontSize: 10.5, color: "#76705F", marginTop: 4 },
  panelSectionTitle: { fontSize: 12, fontWeight: 700, color: "#F5F1E8", marginTop: 14, marginBottom: 8 },
  panelEmptyHint: { fontSize: 11, color: "#76705F", fontStyle: "italic" },
  breakdownRow: { display: "flex", alignItems: "center", gap: 8, marginBottom: 7 },
  breakdownKey: { fontSize: 11, color: "#C9C2B3", width: 110, flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  breakdownBarWrap: { flex: 1, height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 4, overflow: "hidden" },
  breakdownBar: { height: "100%", borderRadius: 4 },
  breakdownPct: { fontSize: 10, color: "#9A9488", width: 70, flexShrink: 0, textAlign: "right" },
  lossReasonRow: { display: "flex", justifyContent: "space-between", alignItems: "center", background: "#1B1E24", borderRadius: 8, padding: "8px 10px", marginBottom: 6 },
  lossReasonText: { fontSize: 11.5, color: "#C9C2B3" },
  lossReasonCount: { fontSize: 12, fontWeight: 700, color: "#C75450" },
};
