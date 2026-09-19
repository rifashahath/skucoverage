import { runEngine } from "../../skucoverage-engine/src/engine";
import type { EngineRequest, EngineResponse, Product } from "../../skucoverage-engine/src/types";

export function runAuditEngine(request: EngineRequest): EngineResponse {
  return runEngine(request);
}

export function runCatalogAudit(requestId: string, storeId: string, products: Product[]): EngineResponse {
  return runAuditEngine({ messageType: "audit_full_catalog", requestId, payload: { storeId, products } });
}

export function runWeeklyDiff(requestId: string, currentAudit: unknown, previousAudit: unknown): EngineResponse {
  return runAuditEngine({ messageType: "weekly_diff", requestId, payload: { currentAudit, previousAudit } });
}
