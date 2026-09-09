import { fetchCausas } from "../api/causas.js";
import { countCauseNodes } from "../core/inicio-analysis.js";

export async function countDeepContracts(contracts) {
  const results = await Promise.all((contracts || []).map(async (contract) => {
    try { return countCauseNodes((await fetchCausas("arbol", { contract_id: contract.id }))?.tree) > 5 ? 1 : 0; } catch (_error) { return 0; }
  }));
  return results.reduce((total, value) => total + value, 0);
}
