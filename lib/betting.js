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
  "Seguí mi checklist de análisis completo",
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
// CHECKLIST RÁPIDO PRE-APUESTA (3 preguntas)
// ─────────────────────────────────────────────────────────────────────────
export const emptyChecklist = () => ({
  analizoForma: null,      // true/false
  cuotaConValor: null,     // true/false
  nivelConfianza: null,    // 'baja' | 'media' | 'alta' (mismo que CONFIDENCE_LEVELS)
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
