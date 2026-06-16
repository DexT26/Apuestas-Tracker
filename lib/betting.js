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

export const CLP = (n) =>
  new Intl.NumberFormat("es-CL", { maximumFractionDigits: 0 }).format(Math.round(n || 0)) + " CLP";

export const todayISO = () => new Date().toISOString().slice(0, 10);

export const emptySelection = () => ({
  competition: COMPETITIONS[0],
  match: "",
  market: MARKETS[0],
  odds: "",
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
