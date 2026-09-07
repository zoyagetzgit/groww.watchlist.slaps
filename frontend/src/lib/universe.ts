// Just enough info for the "add a symbol" dropdown. The real profile data
// (volatility, sector, volume baseline) lives on the backend in
// lib/market/universe.ts and never needs to reach the browser - keeping
// this list separate is deliberate, not an oversight, so the scoring logic
// stays server-side where it can change without a frontend redeploy.
export const SYMBOLS = [
  { symbol: "RELIANCE", name: "Reliance Industries" },
  { symbol: "TCS", name: "Tata Consultancy Services" },
  { symbol: "INFY", name: "Infosys" },
  { symbol: "WIPRO", name: "Wipro" },
  { symbol: "HDFCBANK", name: "HDFC Bank" },
  { symbol: "SBIN", name: "State Bank of India" },
  { symbol: "ITC", name: "ITC Limited" },
  { symbol: "ZOMATO", name: "Zomato" },
  { symbol: "TATAMOTORS", name: "Tata Motors" },
  { symbol: "ADANIENT", name: "Adani Enterprises" },
];
