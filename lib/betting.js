// ─────────────────────────────────────────────────────────────────────────
// CONFIG Y LÓGICA DE MERCADOS — compartido por toda la app
// ─────────────────────────────────────────────────────────────────────────

export const MARKETS = [
  "Más de 1.5 goles", "Más de 2.5 goles", "Menos de 1.5 goles", "Menos de 2.5 goles",
  "Ambos Marcan (BTTS Sí)", "Ambos No Marcan (BTTS No)",
  "Doble Oportunidad 1X", "Doble Oportunidad X2",
  "Hándicap Asiático -0.5 Local", "Hándicap Asiático -1 Local", "Hándicap Asiático +0.5 Visitante",
  "Victoria Local (1)", "Empate (X)", "Victoria Visitante (2)",
  "+0.5 goles 1er Tiempo", "Más de 1.5 goles 1er Tiempo",
];

export const COMPETITIONS = [
  "Mundial 2026 🌍", "La Liga 🇪🇸", "Premier League 🏴", "Bundesliga 🇩🇪",
  "Serie A 🇮🇹", "Ligue 1 🇫🇷", "Primeira Liga 🇵🇹", "Eredivisie 🇳🇱",
];

export const STAKE_OPTIONS = [
  { label: "1% — especulativa", value: 0.01 },
  { label: "1.5% — confianza media", value: 0.015 },
  { label: "2% — alta confianza", value: 0.02 },
];

export const STATUS = {
  PENDING: "pendiente",
  WON: "ganado",
  LOST: "perdido",
  VOID: "nulo",
};

export const LOSS_REASONS = [
  "Mal análisis de forma/estadísticas",
  "Mala suerte / varianza normal del fútbol",
  "Lesión o ausencia sorpresa de jugador clave",
  "Rotación inesperada del equipo",
  "Subestimé la cautela táctica (debut, partido decisivo)",
  "Apuesta impulsiva sin seguir mi checklist",
];

export const WIN_FACTORS = [
  "El análisis completo ayudó al resultado",
  "Análisis parcial, pero acerté",
  "Acerté más por intuición que por análisis",
];

// ─────────────────────────────────────────────────────────────────────────
// PROTOCOLO "ANÁLISIS DE LO YA ANALIZADO" — Paso 1: patrones de sesgo
// ─────────────────────────────────────────────────────────────────────────
export const BIAS_PATTERNS = [
  {
    id: "favorito_debut",
    label: "Sobrevaloración de favorito en debut/alta cautela táctica",
    hint: "El mercado pone cuota baja por el nombre del equipo, subestimando la cautela táctica real.",
  },
  {
    id: "sesgo_recencia",
    label: "Sesgo de recencia",
    hint: "Se sobrevaloran las últimas 3-5 victorias sin ponderar el nivel medio real de fondo.",
  },
  {
    id: "favorite_longshot",
    label: "Sesgo favorito-improbable (Favourite-Longshot Bias)",
    hint: "El mercado sobrevalora cuotas altas y subvalora relativamente a los favoritos.",
  },
  {
    id: "infraconversion_xg",
    label: "Equipo infraconvirtiendo su xG",
    hint: "Genera más xG del que convierte en goles reales — regresión a la media sugiere mejora próxima. Valor en Over.",
  },
  {
    id: "sobreconversion_xg",
    label: "Equipo sobreconvirtiendo su xG",
    hint: "Marca más goles de los que su xG predice — racha insostenible. Valor en Under a futuro.",
  },
  {
    id: "falacia_apostador",
    label: "Falacia del apostador disfrazada de regresión a la media",
    hint: "Alerta, no oportunidad: creer que 'ya le toca ganar' sin razón real de mejora de nivel.",
  },
  {
    id: "bloque_defensivo",
    label: "Bloque defensivo bajo de equipo chico contra rival ofensivo",
    hint: "El mercado suele subvalorar cuán efectivo puede ser un planteamiento defensivo cerrado.",
  },
  {
    id: "ninguno",
    label: "Ninguno detectado",
    hint: "No se identifica un patrón claro de sesgo del mercado en este partido.",
  },
];

// ─────────────────────────────────────────────────────────────────────────
// PROTOCOLO — Paso 2: niveles de confianza y cálculo del Edge
// ─────────────────────────────────────────────────────────────────────────
export const CONFIDENCE_LEVELS = [
  { id: "baja", label: "Baja confianza", probability: 0.50 },
  { id: "media", label: "Media confianza", probability: 0.62 },
  { id: "alta", label: "Alta confianza", probability: 0.75 },
];

export const EDGE_THRESHOLD = 0.05; // 5% mínimo para luz verde

export function impliedProbability(odds) {
  if (!odds || odds <= 0) return 0;
  return 1 / odds;
}

export function calculateEdge(confidenceProbability, odds) {
  const implied = impliedProbability(odds);
  return confidenceProbability - implied;
}

export function getVerdict(edge) {
  return edge >= EDGE_THRESHOLD ? "apostar" : "pasar";
}

// ─────────────────────────────────────────────────────────────────────────
// CHECKLIST AVANZADO — 5 preguntas orientadas a recomendar mercado
// Validado con 7 partidos consecutivos (19-20 junio 2026)
// ─────────────────────────────────────────────────────────────────────────
export const ADVANCED_CHECKLIST = [
  {
    id: "como_genera_goles",
    pregunta: "¿Cómo genera goles el favorito?",
    descripcion: "No solo cuántos, sino cómo los produce.",
    nota: "Si el favorito ataca en transición y el rival se cierra → señal Menos de 2.5. Si ambos presionan alto → señal Más de 2.5.",
    opciones: [
      { value: "transicion_rival_cerrado", label: "Transición rápida Y rival se repliega atrás → Menos de 2.5 goles", mercado: "under" },
      { value: "transicion_rival_abierto", label: "Transición rápida Y rival también presiona alto → Más de 2.5 goles / BTTS", mercado: "over" },
      { value: "posesion_rival_abierto", label: "Posesión estática Y rival ataca → Más de 2.5 goles / BTTS", mercado: "over" },
      { value: "posesion_rival_cerrado", label: "Posesión estática Y rival se cierra → Menos de 2.5 goles", mercado: "under" },
    ],
  },
  {
    id: "xg_conversion",
    pregunta: "xG real vs goles marcados en los últimos 5-6 partidos",
    descripcion: "¿El favorito está sobre o infraconvirtiendo sus ocasiones?",
    nota: "⚠️ Esta señal se debilita si el rival juega bloque bajo (ver P5). Un equipo puede infraconvertir y aun así no marcar si el rival se cierra bien.",
    opciones: [
      { value: "sobreconvirtiendo", label: "Marcando más de lo que su xG sugiere (sobreconvirtiendo) → Under / Menos de 2.5 próximo", mercado: "under" },
      { value: "infraconvirtiendo", label: "Marcando menos de lo que su xG sugiere (infraconvirtiendo) → Over / corrección esperada", mercado: "over" },
      { value: "acorde_xg", label: "Marcando acorde a su xG → señal neutra, descartar este punto", mercado: "neutro" },
      { value: "sin_datos", label: "Sin datos de xG disponibles → descartar este punto", mercado: "neutro" },
    ],
  },
  {
    id: "solidez_defensiva",
    pregunta: "Solidez defensiva real de ambos equipos",
    descripcion: "¿Cómo defienden en términos de organización, portero y línea defensiva — no solo cuántos goles reciben?",
    opciones: [
      { value: "ambos_solidos", label: "Ambos con defensa sólida y porteros sin errores recientes → Menos de 2.5 / BTTS No", mercado: "under" },
      { value: "favorito_solido_rival_fragil", label: "Favorito defiende bien, rival tiene defensa frágil o portero con errores → Victoria favorito / Under", mercado: "under" },
      { value: "ambos_fragiles", label: "Ambos con defensa frágil o porteros cometiendo errores → Más de 2.5 / BTTS Sí", mercado: "over" },
      { value: "favorito_fragil_rival_solido", label: "Favorito defiende mal, rival defiende bien → partido impredecible, precaución", mercado: "neutro" },
    ],
  },
  {
    id: "urgencia_puntos",
    pregunta: "Urgencia de puntos y efecto táctico",
    descripcion: "¿Cuál es la situación en la tabla y cómo afecta el planteamiento?",
    nota: "⚠️ Si ambos necesitan ganar pero uno anota muy temprano, la señal Over puede anularse completamente — el partido pasa a ser Under.",
    opciones: [
      { value: "ambos_necesitan_ganar", label: "Ambos necesitan ganar obligatoriamente → Más de 2.5 (ambos arriesgan)", mercado: "over" },
      { value: "uno_necesita_ganar", label: "Solo uno necesita ganar, el otro puede empatar → Menos de 2.5 (el que puede empatar se cierra)", mercado: "under" },
      { value: "ambos_clasificados", label: "Ambos ya clasificados o sin nada en juego → partido impredecible, precaución", mercado: "neutro" },
      { value: "uno_eliminado", label: "Uno ya eliminado, el otro clasifica con empate → Menos de 2.5 (el clasificado no arriesga)", mercado: "under" },
    ],
  },
  {
    id: "estilo_defensivo_rival",
    pregunta: "Estilo defensivo del rival",
    descripcion: "¿El equipo rival defiende con bloque bajo compacto o presiona alto?",
    nota: "Este dato cruza directamente con P1 y P2 — si el rival se cierra, cualquier señal de Over de P2 (infraconversión xG) se debilita.",
    opciones: [
      { value: "bloque_bajo", label: "Bloque bajo compacto y consistente → Menos de 2.5 (debilita señales de Over de P1 y P2)", mercado: "under" },
      { value: "presion_alta", label: "Presión alta → Más de 2.5 / BTTS (deja espacios a la espalda)", mercado: "over" },
      { value: "mixto", label: "Mixto según el marcador (presiona si va perdiendo, se cierra si va ganando) → evaluar ambos mercados", mercado: "neutro" },
      { value: "sin_datos", label: "Sin datos claros del estilo defensivo → descartar este punto", mercado: "neutro" },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────
// PREGUNTA DE CIERRE — cuenta señales y recomienda mercado
// ─────────────────────────────────────────────────────────────────────────
export const CHECKLIST_CIERRE = {
  id: "mercado_recomendado",
  pregunta: "¿Qué mercado recomienda el análisis?",
  descripcion: "Cuenta las señales acumuladas de las 5 preguntas anteriores. 3 o más señales en la misma dirección determinan el mercado recomendado.",
  reglas: [
    { señales: "over", minimo: 3, mercado: "Más de 2.5 goles o BTTS Sí", color: "#3FA66B", icono: "⬆️" },
    { señales: "under", minimo: 3, mercado: "Menos de 2.5 goles", color: "#D4A537", icono: "⬇️" },
    { señales: "mixto", mercado: "Señales mixtas → Pasar, no hay mercado claro", color: "#C75450", icono: "⚠️" },
  ],
};

// Función que calcula el mercado recomendado según las respuestas del checklist
export function calcularMercadoRecomendado(respuestas) {
  const señalesOver = ADVANCED_CHECKLIST.filter(p => {
    const opcion = p.opciones.find(o => o.value === respuestas[p.id]);
    return opcion?.mercado === "over";
  }).length;

  const señalesUnder = ADVANCED_CHECKLIST.filter(p => {
    const opcion = p.opciones.find(o => o.value === respuestas[p.id]);
    return opcion?.mercado === "under";
  }).length;

  if (señalesOver >= 3 && señalesOver > señalesUnder) {
    return { mercado: "Más de 2.5 goles o BTTS Sí", tipo: "over", señalesOver, señalesUnder };
  } else if (señalesUnder >= 3 && señalesUnder > señalesOver) {
    return { mercado: "Menos de 2.5 goles", tipo: "under", señalesOver, señalesUnder };
  } else if (señalesOver >= 3 && señalesUnder >= 3) {
    return { mercado: "Señales mixtas → evalúa ambos mercados y compara Edge", tipo: "mixto", señalesOver, señalesUnder };
  } else {
    return { mercado: "Sin señal clara → Pasar", tipo: "pasar", señalesOver, señalesUnder };
  }
}

// ─────────────────────────────────────────────────────────────────────────
// CHECKLIST RÁPIDO PRE-APUESTA (dentro del formulario de apuesta)
// ─────────────────────────────────────────────────────────────────────────
export const emptyChecklist = () => ({
  analizoForma: null,
  cuotaConValor: null,
});

export const emptyAdvancedChecklist = () => ({
  como_genera_goles: null,
  xg_conversion: null,
  solidez_defensiva: null,
  urgencia_puntos: null,
  estilo_defensivo_rival: null,
});

export const CLP = (n) =>
  new Intl.NumberFormat("es-CL", { maximumFractionDigits: 0 }).format(Math.round(n || 0)) + " CLP";

export const todayISO = () => new Date().toISOString().slice(0, 10);

export const emptySelection = () => ({
  competition: COMPETITIONS[0],
  match: "",
  market: MARKETS[0],
  odds: "",
  biasPattern: BIAS_PATTERNS[BIAS_PATTERNS.length - 1].id,
  confidence: CONFIDENCE_LEVELS[1].id,
});

// Interpreta el marcador final contra el mercado elegido
export function resolveMarket(market, homeGoals, awayGoals, htHomeGoals, htAwayGoals) {
  const total = homeGoals + awayGoals;
  const bothScored = homeGoals > 0 && awayGoals > 0;

  switch (market) {
    case "Más de 1.5 goles": return total > 1.5 ? STATUS.WON : STATUS.LOST;
    case "Más de 2.5 goles": return total > 2.5 ? STATUS.WON : STATUS.LOST;
    case "Menos de 1.5 goles": return total < 1.5 ? STATUS.WON : STATUS.LOST;
    case "Menos de 2.5 goles": return total < 2.5 ? STATUS.WON : STATUS.LOST;
    case "Ambos Marcan (BTTS Sí)": return bothScored ? STATUS.WON : STATUS.LOST;
    case "Ambos No Marcan (BTTS No)": return !bothScored ? STATUS.WON : STATUS.LOST;
    case "Doble Oportunidad 1X": return homeGoals >= awayGoals ? STATUS.WON : STATUS.LOST;
    case "Doble Oportunidad X2": return awayGoals >= homeGoals ? STATUS.WON : STATUS.LOST;
    case "Victoria Local (1)": return homeGoals > awayGoals ? STATUS.WON : STATUS.LOST;
    case "Empate (X)": return homeGoals === awayGoals ? STATUS.WON : STATUS.LOST;
    case "Victoria Visitante (2)": return awayGoals > homeGoals ? STATUS.WON : STATUS.LOST;
    case "Hándicap Asiático -0.5 Local": return homeGoals > awayGoals ? STATUS.WON : STATUS.LOST;
    case "Hándicap Asiático -1 Local":
      if (homeGoals - awayGoals > 1) return STATUS.WON;
      if (homeGoals - awayGoals === 1) return STATUS.VOID;
      return STATUS.LOST;
    case "Hándicap Asiático +0.5 Visitante": return awayGoals >= homeGoals ? STATUS.WON : STATUS.LOST;
    case "+0.5 goles 1er Tiempo":
      if (htHomeGoals == null) return null;
      return (htHomeGoals + htAwayGoals) > 0.5 ? STATUS.WON : STATUS.LOST;
    case "Más de 1.5 goles 1er Tiempo":
      if (htHomeGoals == null) return null;
      return (htHomeGoals + htAwayGoals) > 1.5 ? STATUS.WON : STATUS.LOST;
    default: return null;
  }
}
