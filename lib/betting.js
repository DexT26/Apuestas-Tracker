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
// CHECKLIST AVANZADO PRE-APUESTA — 6 preguntas + pregunta de cierre
// Orden: datos reales primero, brecha de cuotas al final
// ─────────────────────────────────────────────────────────────────────────
export const ADVANCED_CHECKLIST = [
  {
    id: "xg_vs_goles",
    pregunta: "xG del favorito (últimos 5-6 partidos) vs goles recibidos por el rival (últimos 5-6 partidos)",
    descripcion: "¿Ambos datos apuntan en la misma dirección, o se contradicen?",
    patron: "Patrones 4 y 5 (infra/sobreconversión de xG)",
    esDatoReal: true,
    opciones: [
      { value: "misma_direccion", label: "Apuntan en la misma dirección → señal a favor del análisis" },
      { value: "contradiccion", label: "Se contradicen → alerta, cuidado con el Over solo por xG" },
      { value: "sin_datos", label: "Sin datos suficientes → descartar este punto" },
    ],
  },
  {
    id: "xg_concedido",
    pregunta: "xG concedido (en contra) del equipo rival en los últimos 5-6 partidos",
    descripcion: "¿Es consistentemente bajo (bloque sólido real) o recibió pocos goles pero permitió muchas ocasiones?",
    patron: "Patrón 7 (bloque defensivo)",
    esDatoReal: true,
    opciones: [
      { value: "bloque_solido", label: "xG concedido bajo → bloque defensivo real y consistente" },
      { value: "defensa_suerte", label: "Pocos goles pero xG concedido alto → defensa con suerte, vulnerable" },
      { value: "sin_datos", label: "Sin datos suficientes → descartar este punto" },
    ],
  },
  {
    id: "racha_ambos",
    pregunta: "Composición de la racha reciente de ambos equipos (últimos 5-9 partidos)",
    descripcion: "¿Mayoría victorias claras o empates/resultados ajustados? ¿Hay presión mediática relevante?",
    patron: "Patrón 2 (sesgo de recencia) y alerta para Patrón 6 (falacia del apostador)",
    esDatoReal: true,
    opciones: [
      { value: "ambos_solida", label: "Ambos con racha sólida (mayoría victorias claras) → señal neutra" },
      { value: "favorito_solida_rival_debil", label: "Favorito racha sólida, rival racha débil → refuerza al favorito" },
      { value: "favorito_debil_rival_solida", label: "Favorito racha débil, rival racha sólida → alerta, mercado puede ignorar la forma real del menos favorito" },
      { value: "ambos_debil", label: "Ambos con racha débil → partido impredecible, precaución" },
      { value: "presion_relevante", label: "Hay presión mediática/afición relevante → factor adicional a considerar" },
    ],
  },
  {
    id: "forma_menos_favorito",
    pregunta: "¿El equipo menos favorecido ganó 3 o más de sus últimos 5-6 partidos?",
    descripcion: "Si sí, y su cuota para ganar sigue siendo muy alta (longshot), el favorito puede estar relativamente sobrevalorado.",
    patron: "Patrón 3 (Favourite-Longshot Bias)",
    esDatoReal: true,
    opciones: [
      { value: "buena_forma_cuota_alta", label: "3+ victorias recientes Y cuota alta → favorito posiblemente sobrevalorado" },
      { value: "no_llega_3", label: "No llega a 3 victorias → sin señal de este patrón" },
      { value: "sin_datos", label: "Sin datos suficientes → descartar este punto" },
    ],
  },
  {
    id: "valor_mercado",
    pregunta: "Brecha de valor de mercado total entre ambos equipos (Transfermarkt)",
    descripcion: "Mide el nivel real de la plantilla independientemente de resultados recientes.",
    patron: "Complementa Patrón 1 y Patrón 3",
    esDatoReal: true,
    opciones: [
      { value: "brecha_grande", label: "Favorito vale 3x o más → favoritismo justificado por calidad real" },
      { value: "brecha_moderada", label: "Favorito vale entre 1.5x y 3x → partido más parejo de lo que sugiere la cuota" },
      { value: "brecha_pequeña", label: "Menos de 1.5x de diferencia → alerta, cuota del favorito puede estar muy inflada" },
      { value: "sin_datos", label: "Sin datos disponibles → descartar este punto" },
    ],
  },
  {
    id: "brecha_cuotas",
    pregunta: "Brecha entre cuota Local y cuota Visitante",
    descripcion: "Si la brecha es grande: ¿hay bajas de titulares o menor motivación real del favorito?",
    patron: "Patrón 1 (sobrevaloración de favorito)",
    esDatoReal: false,
    opciones: [
      { value: "brecha_chica", label: "Brecha chica → mercado no da mucho peso a la localía" },
      { value: "brecha_grande_ok", label: "Brecha grande, sin alertas → ventaja de localía sólida" },
      { value: "brecha_grande_alerta", label: "Brecha grande + bajas o menor motivación → alerta, posible sobrevaloración" },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────
// PREGUNTA DE CIERRE DEL CHECKLIST
// ─────────────────────────────────────────────────────────────────────────
export const CHECKLIST_CIERRE = {
  id: "partido_cerrado",
  pregunta: "¿El análisis apunta a un partido cerrado?",
  descripcion: "Si 3 o más preguntas anteriores sugieren partido defensivo, pocas ocasiones, o equipos de nivel similar → evaluar Menos de 2.5 goles como mercado prioritario antes de apostar a resultado directo.",
  opciones: [
    { value: "si_cerrado", label: "Sí, 3 o más señales apuntan a partido cerrado → evaluar Menos de 2.5 goles primero ⚠️", alerta: true },
    { value: "no_cerrado", label: "No, el partido tiene perfil abierto → continuar con mercado de resultado" },
    { value: "mixto", label: "Señales mixtas → evaluar ambos mercados y comparar Edge" },
  ],
};

// ─────────────────────────────────────────────────────────────────────────
// CHECKLIST RÁPIDO PRE-APUESTA (dentro del formulario de apuesta)
// ─────────────────────────────────────────────────────────────────────────
export const emptyChecklist = () => ({
  analizoForma: null,
  cuotaConValor: null,
});

export const emptyAdvancedChecklist = () => ({
  xg_vs_goles: null,
  xg_concedido: null,
  racha_ambos: null,
  forma_menos_favorito: null,
  valor_mercado: null,
  brecha_cuotas: null,
  partido_cerrado: null,
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
