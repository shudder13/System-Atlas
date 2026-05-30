// QuantPredict architecture atlas.
// Regenerator for the pack at C:/Dev/Projects/QuantPredict/architecture/.
// Edit THIS script (not the generated pack files) and re-run:
//   npx tsx scripts/build-quantpredict-atlas.ts
//
// Every fact here was verified against the QuantPredict codebase on 2026-05-30
// (docker-compose, src/quantpredict, DATABASE.md, alembic, pyproject.toml,
// admin-panel/package.json, .env.example, scripts/deploy). Repo, Python package,
// DB, containers, and domain are all "quantpredict" (the folder was renamed from
// "QuantFlow" on 2026-05-30).

import path from "node:path";
import { exportAtlas } from "../server/atlasFiles";
import { defaultViews, emptyCodeIntelligence } from "../src/lib/atlas";
import type { AtlasEdge, AtlasFlow, AtlasNode, AtlasProject, ViewId } from "../src/types";

const targetRoot = path.resolve("C:/Dev/Projects/QuantPredict");
const now = "2026-05-30T00:00:00.000Z";

const layoutsByView: Partial<Record<ViewId, Record<string, { x: number; y: number }>>> = {};
function place(view: ViewId, id: string, x: number, y: number) {
  layoutsByView[view] ??= {};
  layoutsByView[view]![id] = { x, y };
}

function node(partial: Omit<AtlasNode, "owner" | "status" | "confidence" | "responsibilities" | "dependencies" | "invariants" | "linkedFiles" | "linkedTests" | "risks" | "metadata"> & Partial<AtlasNode>): AtlasNode {
  return {
    owner: partial.owner ?? "architecture",
    status: partial.status ?? "active",
    confidence: partial.confidence ?? "manual",
    responsibilities: partial.responsibilities ?? [],
    dependencies: partial.dependencies ?? [],
    invariants: partial.invariants ?? [],
    linkedFiles: partial.linkedFiles ?? [],
    linkedTests: partial.linkedTests ?? [],
    risks: partial.risks ?? [],
    metadata: partial.metadata ?? {},
    ...partial
  } as AtlasNode;
}

function edge(id: string, source: string, target: string, type: AtlasEdge["type"], extras: Partial<AtlasEdge> = {}): AtlasEdge {
  return { id, source, target, type, ...extras };
}

const nodes: AtlasNode[] = [
  // ── Stakeholders + concerns ─────────────────────────────────────────────────
  node({
    id: "stakeholder.operator",
    type: "stakeholder",
    name: "Single Operator (Marius)",
    criticality: "high",
    responsibilities: ["Capital allocation and risk tolerance", "Strategy approval and parameter tuning", "Incident response — there is no on-call team"],
    metadata: { role: "Owner / sole operator", influence: "Owner", successCriteria: ["No silent data drift", "Strategies execute without losing money to bugs", "Recovery from any single-component failure is < 1 hour"] }
  }),
  node({
    id: "stakeholder.ai_agent",
    type: "stakeholder",
    name: "AI Coding Agent",
    criticality: "medium",
    responsibilities: ["Implement changes from the atlas + Notion tasks", "Respect invariants captured in this pack"],
    metadata: { role: "Claude / Codex during agentic work", influence: "Implementer" }
  }),
  node({
    id: "concern.no_silent_money_loss",
    type: "concern",
    name: "No silent money loss",
    criticality: "critical",
    responsibilities: ["A bug must never lose money without raising an alarm"],
    metadata: { category: "Reliability", sourceStakeholder: "Operator", priority: "Critical", acceptanceCriteria: ["Trading actions emit structured log lines", "P&L reconstructed from activity events and outlier-monitored (services/data/integrity)", "TakerProtection guards block accidental taker fills"] }
  }),
  node({
    id: "concern.data_freshness",
    type: "concern",
    name: "Market data freshness",
    criticality: "critical",
    responsibilities: ["Strategies must not act on stale market data"],
    metadata: { category: "Reliability", sourceStakeholder: "Operator", priority: "Critical", acceptanceCriteria: ["Each ingestion service writes quantpredict:ingestion:heartbeat:{service} on each loop", "The /live admin view surfaces heartbeat age + per-market errors", "Stale heartbeat is visible (alerting on it is not yet automated)"] }
  }),
  node({
    id: "concern.polymarket_protocol_drift",
    type: "concern",
    name: "Polymarket protocol drift",
    criticality: "high",
    responsibilities: ["Polymarket changes its WS / REST contract silently; we must detect and adapt"],
    metadata: { category: "Reliability", sourceStakeholder: "Operator", priority: "High", acceptanceCriteria: ["docs-sync mirrors docs.polymarket.com hourly", "LLM impact analysis (Gemini/Anthropic) flags changes against connectors/polymarket.py", "ntfy push on meaningful drift"] }
  }),

  // ── System ─────────────────────────────────────────────────────────────────
  node({
    id: "system.quantpredict",
    type: "system",
    name: "QuantPredict",
    criticality: "critical",
    architectureLevel: "system",
    responsibilities: ["Automated trading + money management for crypto derivatives and prediction markets", "Real-time market data ingestion across Binance, Deribit, Polymarket, Hyperliquid", "Strategy execution + P&L tracking + admin console"],
    metadata: { businessOwner: "Marius (sole operator)", sla: "Best-effort — no external SLA", naming: "Repo, Python package, DB, containers, and domain are all 'quantpredict' (folder renamed from 'QuantFlow' on 2026-05-30)", publicDomain: "quantpredict.ai (landing) / app.quantpredict.ai (console)" }
  }),

  // ── Containers (Docker services — `name: quantpredict` in docker-compose.yml) ─
  node({
    id: "container.db",
    type: "datastore",
    name: "TimescaleDB (quantpredict_db)",
    criticality: "critical",
    architectureLevel: "container",
    linkedFiles: ["docker/docker-compose.yml", "alembic/versions/", "docs/DATABASE.md"],
    responsibilities: ["Curated metadata, configuration, strategy state, historical records", "Two TimescaleDB hypertables: ohlcvs, funding_rates"],
    metadata: {
      dataOwner: "QuantPredict backend",
      retention: "Indefinite for metadata; ohlcvs compresses after 7 days",
      consistency: "Strong (single-node Postgres + TimescaleDB)",
      backupPolicy: "MISSING — no automated backup configured",
      restoreTestCadence: "Never tested",
      lastRestoreTestedAt: "",
      rto: "Unknown — recovery would require manual pg_basebackup or volume restore",
      rpo: "Unknown",
      containsPii: false,
      databaseEngine: "timescale/timescaledb-ha:pg17-all-builder-amd64 (PostgreSQL 17 + TimescaleDB)",
      databaseName: "quantpredict",
      hostPort: "5433 → 5432",
      migrationCount: "33 alembic migrations; head 53e63ac79e03 (note: DATABASE.md documents a stale head 19b8982e14dd)",
      migrationPolicy: "Alembic forward-only; never edit historic migrations — add new DROP/ALTER instead",
      volume: "quantpredict_db_data → /home/postgres/pgdata/data",
      sla: "Single instance, no replica"
    }
  }),
  node({
    id: "container.redis",
    type: "cache",
    name: "Redis (quantpredict_redis)",
    criticality: "critical",
    architectureLevel: "container",
    linkedFiles: ["docker/docker-compose.yml", "docs/REDIS_SCHEMA.md", "src/quantpredict/core/utils/redis_utils.py"],
    responsibilities: ["Hot data: prices, order books, Greeks, positions, queue-anchoring state", "Cross-service coordination: heartbeats + per-market error ring buffers"],
    metadata: {
      ttl: "Mostly persistent while a service runs; queue_anchoring state TTL 86400s; init sentinel TTL 300s",
      consistency: "Eventual via single-writer-per-key convention",
      containsPii: false,
      keyNamespaces: ["binance:", "polymarket:", "deribit:", "quantpredict:"],
      image: "redis:7.4.4-alpine3.21",
      hostPort: "6379 → 6379",
      volume: "quantpredict_redis_data → /data"
    }
  }),
  node({
    id: "container.admin_api",
    type: "service",
    name: "Admin API (quantpredict_admin_api)",
    criticality: "high",
    architectureLevel: "container",
    linkedFiles: ["docker/admin-api/Dockerfile", "src/quantpredict/admin/main.py", "src/quantpredict/admin/live.py", "src/quantpredict/admin/smart_money.py", "src/quantpredict/admin/ws_inspector.py"],
    responsibilities: ["FastAPI console backend (FastAPI title 'QuantPredict Console' v1.0.0)", "Surfaces positions, markets, P&L, vol surface, strategies, /live diagnostics, smart-money, WS inspector"],
    invariants: ["No authentication of any kind — relies entirely on Cloudflare Zero Trust at the edge + the Tailnet", "Runs on the LOCAL PC today, not the VPS (per scripts/deploy/README.md)"],
    metadata: { command: "python -m uvicorn quantpredict.admin.main:app --host 0.0.0.0 --port 8080", hostPort: "8080 → 8080", routesThroughProxy: "joins infravpn_default + HTTP_PROXY=http://polymarket-vpn:8888", sla: "Single-user; no formal SLA", scaling: "Single container" }
  }),
  node({
    id: "container.admin_panel",
    type: "app",
    name: "Admin Panel (quantpredict_admin_panel)",
    criticality: "high",
    architectureLevel: "container",
    linkedFiles: ["docker/admin-panel/Dockerfile", "docker/admin-panel/nginx.conf", "admin-panel/"],
    responsibilities: ["React + Vite SPA console (package quantpredict-console)"],
    metadata: { runtime: "compose runs the Dockerfile 'development' target (Vite dev server) on host port 5174", productionServing: "Built dist/ is scp'd to /var/www/admin-panel on the VPS; an nginx production target exists in the Dockerfile but is unused by compose", scaling: "Single-user" }
  }),
  node({
    id: "container.docs_sync",
    type: "worker",
    name: "Polymarket docs-sync (quantpredict_docs_sync)",
    criticality: "medium",
    architectureLevel: "container",
    linkedFiles: ["docker/docs-sync/Dockerfile", "docker/docs-sync/crontab", "scripts/maintenance/sync_polymarket_docs.py", "docs/external/polymarket/"],
    responsibilities: ["Hourly mirror of docs.polymarket.com via supercronic", "LLM-assisted impact analysis (Gemini chain, Anthropic fallback) against connectors/polymarket.py", "ntfy push on meaningful drift"],
    metadata: { command: "supercronic -quiet /app/crontab", proxy: "HTTP_PROXY=http://polymarket-vpn:8888 with NO_PROXY=ntfy.sh,generativelanguage.googleapis.com,api.anthropic.com", sla: "Best-effort hourly; one missed run is acceptable" }
  }),

  // Ingestion workers
  node({ id: "container.binance_spot_ingestion", type: "worker", name: "Binance Spot ingestion", criticality: "high", architectureLevel: "container",
    linkedFiles: ["docker/binance-ingestion/Dockerfile", "src/quantpredict/services/data/ingestion/binance/binance_spot.py"],
    responsibilities: ["BTC/ETH/SOL spot prices → Redis binance:spot:{SYMBOL}", "Writes quantpredict:ingestion:heartbeat:binance_spot"] }),
  node({ id: "container.binance_futures_ingestion", type: "worker", name: "Binance Futures ingestion", criticality: "high", architectureLevel: "container",
    linkedFiles: ["src/quantpredict/services/data/ingestion/binance/binance_futures.py"],
    responsibilities: ["USD-S futures ticker prices → Redis binance:futures:{SYMBOL}", "Writes heartbeat:binance_futures"] }),
  node({ id: "container.ohlcv_ingestion", type: "worker", name: "OHLCV ingestion", criticality: "medium", architectureLevel: "container",
    linkedFiles: ["src/quantpredict/services/data/ingestion/binance/ohlcv_ingestion.py"],
    responsibilities: ["Historical OHLCV candles → TimescaleDB hypertable `ohlcvs` (backfill + continuous)"] }),
  node({ id: "container.deribit_options", type: "worker", name: "Deribit options ingestion", criticality: "high", architectureLevel: "container",
    linkedFiles: ["src/quantpredict/services/data/ingestion/deribit/deribit_options.py"],
    responsibilities: ["Deribit option chains → Redis deribit:* (vol surface source)", "Writes IV snapshots to crypto_option_iv via raw SQL (no ORM model)", "Writes heartbeat:deribit_options"] }),
  node({ id: "container.polymarket_ingestion", type: "worker", name: "Polymarket order book ingestion", criticality: "critical", architectureLevel: "container",
    linkedFiles: ["src/quantpredict/services/data/ingestion/polymarket/polymarket.py", "src/quantpredict/services/data/ingestion/polymarket/pnl_service.py"],
    responsibilities: ["Real-time Polymarket order books + market state → Redis polymarket:{token}:*", "P&L computation (pnl_service): polymarket_trades, market_pnl, portfolio snapshots", "Writes heartbeat:polymarket"],
    invariants: ["Egress via polymarket-vpn:8888 (Polymarket DNS-blocked at host level); joins infravpn_default"] }),
  node({ id: "container.market_trades_ingestion", type: "worker", name: "Market trades ingestion", criticality: "high", architectureLevel: "container",
    linkedFiles: ["src/quantpredict/services/data/ingestion/polymarket/market_trades_ingestion.py"],
    responsibilities: ["Streams followed-market trades → plain table `market_trades` (USD volume)", "Tracks max trade size per token in Redis for cushion-exit"],
    invariants: ["Egress via polymarket-vpn:8888; joins infravpn_default"] }),
  node({ id: "container.iv_greeks", type: "worker", name: "IV / Greeks service", criticality: "high", architectureLevel: "container",
    linkedFiles: ["src/quantpredict/services/data/ingestion/polymarket/iv_greeks_service.py"],
    responsibilities: ["Computes IV + Greeks for Polymarket crypto-option tokens from Deribit surface", "Publishes polymarket:{token}:greeks + portfolio-level greeks", "Writes heartbeat:iv_greeks"] }),
  node({ id: "container.hyperliquid_funding", type: "worker", name: "Hyperliquid funding ingestion", criticality: "medium", architectureLevel: "container",
    linkedFiles: ["src/quantpredict/services/data/ingestion/hyperliquid/funding_rates.py", "src/quantpredict/connectors/hyperliquid.py"],
    responsibilities: ["Hourly Hyperliquid funding history → TimescaleDB hypertable `funding_rates`", "Idempotent resume via MAX(time) + on_conflict upsert"] }),
  node({ id: "container.polymarket_market_maker", type: "service", name: "Polymarket market maker", criticality: "critical", architectureLevel: "container",
    linkedFiles: ["docker/polymarket-market-maker/Dockerfile", "src/quantpredict/services/trading/polymarket_market_maker.py"],
    responsibilities: ["Aggregator engine that runs BaseStrategy subclasses against Polymarket markets"],
    invariants: ["Egress via polymarket-vpn:8888; joins infravpn_default", "stop_grace_period: 30s to flush in-flight orders", "ONLY ConvergentRebalancing is active in code — the other 6 strategies are commented out"] }),
  node({ id: "container.queue_anchoring", type: "service", name: "Queue-anchoring strategy (V2)", criticality: "critical", architectureLevel: "container",
    linkedFiles: ["docker/queue-anchoring/Dockerfile", "src/quantpredict/services/trading/strategies/queue_anchoring_v2_runner.py"],
    responsibilities: ["Anchors orders to queue positions on Polymarket order books (V2 runner)"],
    invariants: ["Egress via polymarket-vpn:8888; joins infravpn_default", "stop_grace_period: 30s", "Compose runs the V2 runner; the V1 runner exists but is not containerized"] }),

  // External egress proxy (lives in InfraVPN, joined as external network infravpn_default)
  node({ id: "container.polymarket_vpn", type: "external_system", name: "polymarket-vpn forward proxy", criticality: "critical", architectureLevel: "system",
    responsibilities: ["HTTP forward proxy on the external infravpn_default Docker network", "ProtonVPN (NL) egress avoiding the host-level DNS block on polymarket.com"],
    invariants: ["MUST be reachable at http://polymarket-vpn:8888 from infravpn_default"],
    metadata: { vendor: "Self-hosted (InfraVPN project, qmcgaw/gluetun → ProtonVPN NL)", monthlyCost: "Included in InfraVPN/Hetzner cost", consumers: "polymarket-ingestion, market-trades-ingestion, polymarket-market-maker, queue-anchoring, admin-api, docs-sync" } }),

  // ── External systems ─────────────────────────────────────────────────────
  node({ id: "external.binance", type: "external_system", name: "Binance (Spot + USD-S Futures)", criticality: "high",
    metadata: { vendor: "Binance", clients: "binance-sdk-spot, binance-sdk-derivatives-trading-usds-futures", authMode: "API key + secret", monthlyCost: "$0 base (per-order fees only)" } }),
  node({ id: "external.deribit", type: "external_system", name: "Deribit", criticality: "high",
    metadata: { vendor: "Deribit", baseUrl: "wss://www.deribit.com/ws/api/v2", purpose: "Option chains → implied vol surface for crypto-option pricing", monthlyCost: "$0" } }),
  node({ id: "external.polymarket_clob", type: "external_system", name: "Polymarket CLOB", criticality: "critical",
    invariants: ["DNS-blocked at host level; reachable only via polymarket-vpn:8888"],
    metadata: { vendor: "Polymarket", client: "py-clob-client-v2 + websocket-client", authMode: "EOA private key + proxy-wallet address (Polygon)", monthlyCost: "Gas + per-trade only" } }),
  node({ id: "external.polymarket_docs", type: "external_system", name: "docs.polymarket.com", criticality: "medium",
    metadata: { vendor: "Polymarket", purpose: "Source of truth for the CLOB API; mirrored hourly by docs-sync" } }),
  node({ id: "external.hyperliquid", type: "external_system", name: "Hyperliquid", criticality: "medium",
    metadata: { vendor: "Hyperliquid", baseUrl: "public /info endpoint (fundingHistory)", authMode: "None (public)", monthlyCost: "$0" } }),
  node({ id: "external.ntfy", type: "external_system", name: "ntfy.sh (alert delivery)", criticality: "medium",
    responsibilities: ["Push-notification fan-out for QuantPredict alerts (docs drift, future ops alerts)"],
    metadata: { vendor: "ntfy.sh", client: "core/utils/ntfy.py NtfyClient", authMode: "Topic name doubles as channel + access token", note: "docs-sync sets NO_PROXY for ntfy.sh (direct, not via VPN)" } }),
  node({ id: "external.llm", type: "external_system", name: "Gemini + Anthropic (docs impact analysis)", criticality: "low",
    responsibilities: ["LLM analysis of Polymarket docs diffs to judge impact on our connector"],
    metadata: { vendor: "Google Gemini (primary chain) + Anthropic (fallback)", authMode: "GEMINI_API_KEY / ANTHROPIC_API_KEY", note: "Only used by docs-sync; NO_PROXY bypasses the VPN for these" } }),
  node({ id: "external.solana", type: "external_system", name: "Solana RPC / Jupiter", criticality: "low",
    metadata: { vendor: "Solana mainnet RPC + Jupiter aggregator", clients: "solders, solana, JUPITER_API", status: "present in deps + env; not wired into a running container", monthlyCost: "$0 public RPC" } }),

  // ── Modules (logical) ─────────────────────────────────────────────────────
  node({ id: "module.connectors", type: "module", name: "Exchange connectors", criticality: "critical", architectureLevel: "component",
    linkedFiles: ["src/quantpredict/connectors/binance_spot.py", "src/quantpredict/connectors/binance_futures.py", "src/quantpredict/connectors/hyperliquid.py", "src/quantpredict/connectors/polymarket.py"],
    responsibilities: ["4 connectors: binance_spot, binance_futures, hyperliquid, polymarket", "No Deribit connector — Deribit access lives in services/data/ingestion/deribit"] }),
  node({ id: "module.core_models", type: "module", name: "Core ORM models", criticality: "critical", architectureLevel: "component",
    linkedFiles: ["src/quantpredict/core/models/"],
    responsibilities: ["SQLAlchemy 2.0 async models: asset, exchange, ohlcv, funding_rate, polymarket (markets/tokens/options/positions/trades/portfolio + all strategy targets), smart_money, venue_fee", "Note: core/models/position.py, core/constants.py, core/exceptions.py are empty stubs"] }),
  node({ id: "module.trading_strategies", type: "module", name: "Trading strategies", criticality: "critical", architectureLevel: "component",
    linkedFiles: ["src/quantpredict/services/trading/strategies/", "src/quantpredict/services/trading/"],
    responsibilities: ["BaseStrategy subclasses: ConvergentRebalancing (ACTIVE), CryptoOptions, ValueAveraging, VolatilityHarvesting, SportsMarketMaking, PassiveSpread, Liquidation (all 6 DISABLED in the market maker)", "Standalone runners: queue_anchoring v1/v2, cushion_exit, polymarket_hf_trader, sp500_backtest", "Other trading services not containerized: binance_market_maker, delta_hedger, token_merger"] }),
  node({ id: "module.core_utils", type: "module", name: "Core utils", criticality: "high", architectureLevel: "component",
    linkedFiles: ["src/quantpredict/core/utils/"],
    responsibilities: ["redis_utils (write_heartbeat, push_market_error, queue-anchoring state)", "taker_protection (multi-layer guards vs accidental taker fills)", "sizing_utils, math_utils, volatility_surface, ntfy, option_parser, trading_utils"] }),
  node({ id: "module.data_integrity", type: "module", name: "Data integrity services", criticality: "high", architectureLevel: "component",
    linkedFiles: ["src/quantpredict/services/data/integrity/anomaly.py", "src/quantpredict/services/data/integrity/cash_reconstruction.py", "src/quantpredict/services/data/integrity/portfolio_outlier_monitor.py"],
    responsibilities: ["anomaly: is portfolio data safe to persist", "cash_reconstruction: rebuild historical cash from activity events", "portfolio_outlier_monitor: auto-fix sandwich outliers in portfolio_history"] }),

  // ── API contract ──────────────────────────────────────────────────────────
  node({ id: "api.admin", type: "api_contract", name: "Admin Console REST API", criticality: "high", architectureLevel: "container",
    linkedFiles: ["src/quantpredict/admin/main.py", "src/quantpredict/admin/live.py", "src/quantpredict/admin/smart_money.py", "src/quantpredict/admin/ws_inspector.py"],
    responsibilities: ["65 route decorators across 4 modules: main.py (41), live.py (13, /live diagnostics), smart_money.py (7, /api/smart-money), ws_inspector.py (4, /api/ws-inspector)"],
    metadata: {
      version: "1.0.0 (FastAPI title 'QuantPredict Console')",
      authMode: "NONE — no auth dependency/middleware anywhere. CORS allows localhost:{3000,5173,5174} only. Public access gated solely by Cloudflare Zero Trust + Tailnet",
      baseUrl: "http://admin-api:8080 (internal) / https://app.quantpredict.ai (public)",
      idempotent: false,
      idempotencyMechanism: "Mostly read-only GETs; mutating routes rely on single-user access, not idempotency keys"
    } }),

  // ── Data entities (verified against models + DATABASE.md + migrations) ──────
  node({ id: "entity.polymarket_markets", type: "data_entity", name: "polymarket_markets", criticality: "high", architectureLevel: "data",
    linkedFiles: ["src/quantpredict/core/models/polymarket.py", "docs/DATABASE.md"],
    responsibilities: ["Polymarket market metadata (question, dates, flags, metrics)"],
    metadata: { dataOwner: "polymarket-ingestion", primaryKeys: ["id (condition_id, str)"], hypertable: false } }),
  node({ id: "entity.polymarket_tokens", type: "data_entity", name: "polymarket_tokens", criticality: "high", architectureLevel: "data",
    responsibilities: ["Per-outcome tradeable tokens (Yes/No/team)"],
    metadata: { dataOwner: "polymarket-ingestion", primaryKeys: ["id (token_id, str)"], relations: ["polymarket_markets via condition_id"], hypertable: false } }),
  node({ id: "entity.polymarket_options", type: "data_entity", name: "polymarket_options", criticality: "medium", architectureLevel: "data",
    responsibilities: ["Crypto-option classification of markets (barrier / binary_call / range)"],
    metadata: { dataOwner: "polymarket-ingestion / option parser", primaryKeys: ["market_id (FK 1:1, ON DELETE CASCADE)"], hypertable: false } }),
  node({ id: "entity.polymarket_orders", type: "data_entity", name: "polymarket_orders", criticality: "high", architectureLevel: "data",
    responsibilities: ["Historical record of placed orders"],
    metadata: { dataOwner: "trading services (market maker / runners)", primaryKeys: ["id (str)"], hypertable: false } }),
  node({ id: "entity.polymarket_positions", type: "data_entity", name: "polymarket_positions", criticality: "critical", architectureLevel: "data",
    responsibilities: ["Snapshot of user positions + P&L"],
    metadata: { dataOwner: "polymarket-ingestion / pnl_service", primaryKeys: ["id (int)"], constraints: ["unique (user_address, token_id)"], hypertable: false } }),
  node({ id: "entity.polymarket_trades", type: "data_entity", name: "polymarket_trades", criticality: "critical", architectureLevel: "data",
    responsibilities: ["User's completed trades, used for P&L"],
    metadata: { dataOwner: "pnl_service", primaryKeys: ["id (str)"], hypertable: false, note: "Model docstring is silent; this is a plain table (NOT a hypertable)" } }),
  node({ id: "entity.market_trades", type: "data_entity", name: "market_trades", criticality: "high", architectureLevel: "data",
    responsibilities: ["ALL trades for followed markets (USD volume tracking)"],
    metadata: { dataOwner: "market-trades-ingestion", primaryKeys: ["composite (id, market_id)"], hypertable: false, note: "Model docstring claims a hypertable, but NO create_hypertable migration exists — it is a plain table" } }),
  node({ id: "entity.pnl_portfolio", type: "data_entity", name: "P&L + portfolio (market_pnl, portfolio_snapshots, portfolio_history)", criticality: "critical", architectureLevel: "data",
    responsibilities: ["market_pnl: aggregated P&L per market/token", "portfolio_snapshots: detailed JSONB snapshots", "portfolio_history: time-series portfolio value for charting (plain table despite docstring)"],
    metadata: { dataOwner: "pnl_service / portfolio service / services/data/integrity", primaryKeys: ["market_pnl unique (market_id, token_id)"], hypertable: false } }),
  node({ id: "entity.ohlcvs", type: "data_entity", name: "ohlcvs (TimescaleDB hypertable)", criticality: "high", architectureLevel: "data",
    responsibilities: ["OHLCV candles for backtesting"],
    metadata: { dataOwner: "ohlcv-ingestion", primaryKeys: ["composite (time, symbol, exchange, timeframe)"], hypertable: true, chunkInterval: "1 day", compression: "after 7 days" } }),
  node({ id: "entity.funding_rates", type: "data_entity", name: "funding_rates (TimescaleDB hypertable)", criticality: "medium", architectureLevel: "data",
    responsibilities: ["Funding-rate history across exchanges (Hyperliquid native + HIP-3 perps)"],
    metadata: { dataOwner: "hyperliquid-funding-ingestion", primaryKeys: ["composite (time, exchange, coin)"], hypertable: true, chunkInterval: "7 days", note: "NOT documented in DATABASE.md (added 2026-05)" } }),
  node({ id: "entity.crypto_option_iv", type: "data_entity", name: "crypto_option_iv", criticality: "medium", architectureLevel: "data",
    responsibilities: ["Per-instrument Deribit IV snapshots"],
    metadata: { dataOwner: "deribit-options (raw SQL — no ORM model)", primaryKeys: ["id (int)"], constraints: ["unique (instrument_name, snapshot_at)"], hypertable: false } }),
  node({ id: "entity.smart_money_wallets", type: "data_entity", name: "smart_money_wallets", criticality: "medium", architectureLevel: "data",
    responsibilities: ["Watched Polymarket trader proxy wallets"],
    metadata: { dataOwner: "admin API (admin/smart_money.py) + background enrichment", primaryKeys: ["address (42-char str)"], hypertable: false, note: "Newest table — migration head 53e63ac79e03; NOT in DATABASE.md" } }),
  node({ id: "entity.strategy_targets", type: "data_entity", name: "Strategy target tables (8 strategies, 9 tables)", criticality: "high", architectureLevel: "data",
    responsibilities: ["value_averaging_targets, volatility_harvesting_targets, convergent_rebalancing_targets, passive_spread_targets, sports_market_making_targets, queue_anchoring_targets, buffer_guard_targets, cushion_exit_targets (+ child cushion_exit_orders)"],
    metadata: { dataOwner: "per-strategy runner + manage_*_strategy admin actions", note: "earnings_contrarian_targets was DROPPED (migration 9c97be43d400). queue_anchoring / buffer_guard / cushion_exit targets have NO unique constraint (duplicates per market allowed)" } }),
  node({ id: "entity.reference_data", type: "data_entity", name: "Reference data (assets, exchanges, venue_fees)", criticality: "low", architectureLevel: "data",
    responsibilities: ["assets: generic asset registry", "exchanges: exchange registry (name unique)", "venue_fees: per-venue fee schedules (JSONB), seeded by migration + edited via admin"],
    metadata: { dataOwner: "seed migrations + admin operator", hypertable: false } }),

  // ── Frontend ────────────────────────────────────────────────────────────────
  node({ id: "page.admin_dashboard", type: "page", name: "Admin Console (SPA)", criticality: "high", architectureLevel: "component",
    linkedFiles: ["admin-panel/src/App.tsx", "admin-panel/src/pages/"],
    responsibilities: ["Multi-page React SPA: positions, markets, crypto options, vol surface, P&L, strategies, order book, /live diagnostics, smart-money, WS inspector"],
    metadata: {
      route: "app.quantpredict.ai (SPA, react-router-dom 6)",
      authRequired: true,
      components: ["@tanstack/react-query 5 for server state", "Highcharts 12 for time-series/financials", "react-plotly for 3D vol surface", "axios HTTP"],
      ssrMode: "CSR (Vite SPA)",
      seo: "Behind Cloudflare Zero Trust — no-index"
    } }),

  // ── Tech choices (verified versions) ────────────────────────────────────────
  node({ id: "tech.python", type: "tech_choice", name: "Python 3.11–3.13", criticality: "critical", architectureLevel: "domain",
    metadata: { category: "Language", version: "requires-python >=3.11,<3.14 (Poetry + PEP 621)", rationale: "Scientific + async ecosystem (numpy/scipy/pandas + asyncio)", alternatives: ["TypeScript backend", "Rust"] } }),
  node({ id: "tech.fastapi", type: "tech_choice", name: "FastAPI + Uvicorn", criticality: "high", architectureLevel: "domain",
    metadata: { category: "Backend framework", version: "fastapi >=0.115,<1.0; uvicorn[standard] >=0.32", rationale: "Pydantic-first request validation matches the schema-heavy design" } }),
  node({ id: "tech.sqlalchemy_async", type: "tech_choice", name: "SQLAlchemy 2.0 async + asyncpg", criticality: "critical", architectureLevel: "domain",
    metadata: { category: "ORM / DB driver", version: "sqlalchemy >=2.0.41; asyncpg >=0.30,<0.31; alembic ^1.16", rationale: "Async ORM with typed Mapped columns; asyncpg is the fastest async Postgres driver" } }),
  node({ id: "tech.timescaledb", type: "tech_choice", name: "TimescaleDB (on PG17)", criticality: "critical", architectureLevel: "domain",
    metadata: { category: "Database", version: "timescaledb-ha pg17", rationale: "Hypertables for time-series (ohlcvs, funding_rates) while keeping Postgres for metadata", alternatives: ["InfluxDB", "ClickHouse", "plain Postgres"] } }),
  node({ id: "tech.redis", type: "tech_choice", name: "Redis 7.4", criticality: "critical", architectureLevel: "domain",
    metadata: { category: "Cache / coordination", version: "server 7.4.4-alpine3.21; client redis[async] >=6.2", rationale: "Sub-ms reads for hot price/Greeks data; heartbeats + error buffers for coordination" } }),
  node({ id: "tech.exchange_clients", type: "tech_choice", name: "Exchange clients (per-exchange SDKs + ccxt)", criticality: "high", architectureLevel: "domain",
    metadata: { category: "Exchange clients", version: "py-clob-client-v2 >=1.0.1; binance-sdk-spot >=4; binance-sdk-derivatives-trading-usds-futures >=3; ccxt >=4.4.88; websocket-client", rationale: "Typed per-exchange SDKs where coverage matters; ccxt for the long tail" } }),
  node({ id: "tech.http_clients", type: "tech_choice", name: "aiohttp + requests (no httpx)", criticality: "medium", architectureLevel: "domain",
    metadata: { category: "HTTP", version: "aiohttp >=3.12; requests[socks] >=2.32", rationale: "aiohttp for async ingestion; requests[socks] for proxied sync calls. httpx is NOT used" } }),
  node({ id: "tech.quant_libs", type: "tech_choice", name: "numpy / scipy / pandas", criticality: "high", architectureLevel: "domain",
    metadata: { category: "Quant libraries", version: "numpy >=2.2; scipy >=1.15; pandas >=2.2; pandas-datareader; yfinance", rationale: "Greeks/IV math, vol-surface fitting, and backtests" } }),
  node({ id: "tech.react_vite", type: "tech_choice", name: "React 18 + Vite 5 + Tailwind 3", criticality: "high", architectureLevel: "domain",
    metadata: { category: "Frontend stack", version: "react ^18.2; vite ^5.0.8; tailwindcss ^3.4; typescript ^5.3; react-query 5; react-router-dom 6", rationale: "Familiar SPA stack; React Query handles all server state" } }),
  node({ id: "tech.charts", type: "tech_choice", name: "Highcharts + Plotly", criticality: "medium", architectureLevel: "domain",
    metadata: { category: "Charts", version: "highcharts ^12.5 + highcharts-react-official; react-plotly.js ^2.6 + plotly.js-dist-min ^3.3", rationale: "Highcharts for time-series/financials; Plotly for the 3D vol surface", reviewCadence: "Highcharts license review yearly" } }),
  node({ id: "tech.supercronic", type: "tech_choice", name: "supercronic (docs-sync cron)", criticality: "low", architectureLevel: "domain",
    metadata: { category: "Scheduling", rationale: "Container-friendly cron for the hourly Polymarket docs sync (no host crontab in Docker)" } }),
  node({ id: "tech.caddy", type: "tech_choice", name: "Caddy reverse proxy", criticality: "high", architectureLevel: "domain",
    metadata: { category: "Reverse proxy", rationale: "Automatic HTTPS; lives on the Hetzner VPS (per operator). No Caddyfile is checked into the repo — an unused nginx production target exists in docker/admin-panel/", alternatives: ["Nginx", "Traefik"] } }),
  node({ id: "tech.cloudflare_zt", type: "tech_choice", name: "Cloudflare Zero Trust", criticality: "high", architectureLevel: "domain",
    responsibilities: ["Gates app.quantpredict.ai; landing page on quantpredict.ai is public"],
    metadata: { category: "Edge auth", rationale: "Single-user admin gate without writing auth code", monthlyCost: "Free tier", alsoUsedFor: "Cache purge in scripts/deploy/admin-panel.sh (CF_ZONE_ID + CF_API_TOKEN)" } }),
  node({ id: "tech.tailscale", type: "tech_choice", name: "Tailscale (Tailnet)", criticality: "critical", architectureLevel: "domain",
    responsibilities: ["Mesh VPN: the Hetzner VPS reaches the local Docker stack as if local"],
    metadata: { category: "Networking", rationale: "Avoids exposing the local stack publicly while letting the VPS proxy to it" } }),

  // ── Env vars (verified against .env.example, QUANTPREDICT_ prefix) ───────────
  node({ id: "env.binance_keys", type: "env_var", name: "BINANCE_API_KEY / BINANCE_API_SECRET", criticality: "critical",
    metadata: { scope: "binance ingestion + trading", sensitive: true, required: true, envExamplePath: ".env.example", rotationPolicy: "Manual; rotate on suspected compromise" } }),
  node({ id: "env.polymarket_key", type: "env_var", name: "POLYMARKET_PRIVATE_KEY / POLYMARKET_PROXY_ADDRESS / POLYMARKET_SIGNATURE_TYPE", criticality: "critical",
    metadata: { scope: "polymarket connector (trading)", sensitive: true, required: true, rotationPolicy: "Manual on Polygon address rotation", note: "PROXY_ADDRESS here = Polymarket account proxy-wallet, NOT a network proxy" } }),
  node({ id: "env.db_creds", type: "env_var", name: "QUANTPREDICT_DB_* (HOST / PORT / USER / PASSWORD / NAME)", criticality: "critical",
    metadata: { scope: "all backend services", sensitive: true, required: true, defaultValue: "host=quantpredict_db port=5432 db=quantpredict" } }),
  node({ id: "env.ntfy", type: "env_var", name: "QUANTPREDICT_NTFY_SERVER / QUANTPREDICT_NTFY_TOPIC", criticality: "medium",
    metadata: { scope: "alert delivery", sensitive: true, required: false, defaultValue: "https://ntfy.sh", note: "Topic name doubles as the access token — treat as sensitive despite the name" } }),
  node({ id: "env.polymarket_proxy", type: "env_var", name: "POLYMARKET_HTTP_PROXY (host) / HTTP_PROXY+HTTPS_PROXY (container)", criticality: "critical",
    metadata: { scope: "polymarket-touching services + docs-sync", sensitive: false, required: true, defaultValue: "container http://polymarket-vpn:8888 / host http://localhost:18000 (Tailscale exit node)" } }),
  node({ id: "env.llm_keys", type: "env_var", name: "GEMINI_API_KEY / ANTHROPIC_API_KEY / LLM_PROVIDER / GEMINI_MODEL_CHAIN", criticality: "medium",
    metadata: { scope: "docs-sync impact analysis", sensitive: true, required: false, note: "Gemini primary chain, Anthropic fallback" } }),
  node({ id: "env.solana", type: "env_var", name: "SOLANA_RPC / JUPITER_API / PHANTOM_WALLET_* (+ TASTYTRADE_*)", criticality: "low",
    metadata: { scope: "Solana + TastyTrade integrations", sensitive: true, required: false, note: "Present in deps/env but not wired into a running container — likely planned/experimental" } }),

  // ── Deployment topology ───────────────────────────────────────────────────
  node({ id: "deploy.env_prod", type: "environment", name: "Production", criticality: "critical", architectureLevel: "deployment",
    metadata: { note: "Production and dev both run on the local PC's Docker stack; only the static admin-panel is deployed to the VPS" } }),
  node({ id: "deploy.region_eu", type: "region", name: "Hetzner Nuremberg (EU)", criticality: "high", architectureLevel: "deployment",
    metadata: { cloud: "Hetzner Cloud", region: "nbg1", tailscaleName: "hetzner-nbg-vpns-and-giga" } }),
  node({ id: "deploy.hetzner_vps", type: "deployment_node", name: "Hetzner VPS (178.104.60.156 / app.quantpredict.ai)", criticality: "critical", architectureLevel: "deployment",
    linkedFiles: ["scripts/deploy/admin-panel.sh", "scripts/deploy/admin-panel-full.sh", "scripts/deploy/README.md"],
    responsibilities: ["Serves the public landing page + the built admin-panel SPA from /var/www/admin-panel", "Caddy reverse proxy + Tailscale node reaching the local Docker stack"],
    metadata: { cloud: "Hetzner Cloud", ip: "178.104.60.156", deployMechanism: "scripts/deploy/admin-panel.sh: npm build → scp dist/ → Cloudflare cache purge", monthlyCost: "~€5/mo" } }),
  node({ id: "deploy.local_dev_node", type: "deployment_node", name: "Local Dev PC (Windows 11 + Docker Desktop)", criticality: "critical", architectureLevel: "deployment",
    responsibilities: ["Hosts the ENTIRE live Docker stack: db, redis, all ingestion + trading workers, admin-api, admin-panel, docs-sync", "Joined to the same Tailnet as the VPS"],
    invariants: ["Must be online for live trading + ingestion + the console API — single point of failure (admin-api is NOT on the VPS)"] }),

  // ── Decisions (ADRs) ────────────────────────────────────────────────────────
  node({ id: "decision.hot_cold_data_split", type: "decision", name: "Redis for real-time, Postgres+TimescaleDB for metadata + history", criticality: "critical",
    metadata: { adrStatus: "Accepted" }, notes: "Redis for sub-second reads; Postgres for durable, queryable history. Source: CLAUDE.md 'Data Storage Strategy'." }),
  node({ id: "decision.three_layer_pydantic", type: "decision", name: "Three-layer model split (DB / API response / App)", criticality: "high",
    metadata: { adrStatus: "Partial" }, notes: "Designed in ARCHITECTURE_PROPOSAL.md; schemas/ is still relatively flat — acknowledged drift." }),
  node({ id: "decision.polymarket_via_vpn", type: "decision", name: "Polymarket egress via polymarket-vpn proxy", criticality: "critical",
    metadata: { adrStatus: "Accepted" }, notes: "Polymarket DNS-blocked at host level; all Polymarket-touching services set HTTP_PROXY=http://polymarket-vpn:8888 and join infravpn_default." }),
  node({ id: "decision.immutable_migrations", type: "decision", name: "Immutable Alembic migrations (forward-only)", criticality: "high",
    metadata: { adrStatus: "Accepted" }, notes: "Never edit/delete historic migrations; add new DROP/ALTER instead. Source: CLAUDE.md." }),
  node({ id: "decision.docker_only_backends", type: "decision", name: "All backends in Docker; local uvicorn forbidden", criticality: "medium",
    metadata: { adrStatus: "Accepted" }, notes: "Enforced by a PreToolUse hook in the dev environment." }),
  node({ id: "decision.polymarket_docs_mirror", type: "decision", name: "Mirror Polymarket docs locally + LLM impact analysis + alarm", criticality: "high",
    metadata: { adrStatus: "Accepted" }, notes: "Hourly supercronic sync into docs/external/polymarket/, Gemini/Anthropic impact analysis, ntfy push on relevant drift." }),

  // ── Risks ────────────────────────────────────────────────────────────────
  node({ id: "risk.no_db_backup", type: "risk", name: "No automated TimescaleDB backup", criticality: "critical",
    metadata: { likelihood: "Certain — current state", impact: "Total loss of strategy state, position history, P&L, market metadata on disk failure", mitigation: "pg_basebackup-on-cron + offsite copy + a tested restore drill" } }),
  node({ id: "risk.single_host", type: "risk", name: "Local Dev PC is a single point of failure for live trading", criticality: "critical",
    metadata: { likelihood: "Host outages happen", impact: "Trading + ingestion + console API all stop", mitigation: "Move the stack (or at least admin-api) to the VPS, or accept the risk explicitly" } }),
  node({ id: "risk.no_admin_auth", type: "risk", name: "Admin API has zero in-app authentication", criticality: "high",
    metadata: { likelihood: "Mitigated by Cloudflare ZT + Tailnet", impact: "Anyone past Cloudflare ZT can call mutating endpoints", mitigation: "Keep relying on edge auth (acceptable single-user) OR add per-route auth before any multi-user exposure" } }),
  node({ id: "risk.no_quality_gates", type: "risk", name: "No linting / type-checking / CI", criticality: "high",
    metadata: { likelihood: "Certain — current state", impact: "Regressions land unguarded; only manual pytest exists. No ruff, mypy, pre-commit, or .github CI", mitigation: "Add ruff + mypy + pre-commit + a CI workflow (these were stated goals)" } }),
  node({ id: "risk.stale_database_md", type: "risk", name: "DATABASE.md has drifted from the schema", criticality: "medium",
    metadata: { likelihood: "Observed", impact: "Docs claim head 19b8982e14dd (actual 53e63ac79e03); omit funding_rates, smart_money_wallets, venue_fees; mislabel market_trades/portfolio_history as hypertables", mitigation: "Regenerate DATABASE.md from models + migrations; only ohlcvs + funding_rates are hypertables" } }),
  node({ id: "risk.admin_monolith", type: "risk", name: "admin/main.py concentrates 41 routes", criticality: "medium",
    metadata: { likelihood: "Observed", impact: "Hard to navigate; merge-conflict prone during AI edits", mitigation: "Continue the started split into routers (live/smart_money/ws_inspector already extracted)" } }),

  // ── Quality scenario + alerts + runbooks (heartbeat-grounded) ───────────────
  node({ id: "quality.ingestion_freshness", type: "quality_scenario", name: "Ingestion freshness SLO", criticality: "critical",
    metadata: { measurement: "Each ingestion service writes quantpredict:ingestion:heartbeat:{service} each loop (write_heartbeat in redis_utils); read_heartbeat_age_seconds + the /live admin view surface the age. Alerting on staleness is not yet automated." } }),
  node({ id: "alert.ingestion_gap", type: "alert", name: "Ingestion gap (heartbeat stale)", criticality: "high",
    metadata: { severity: "P2", triggerCondition: "quantpredict:ingestion:heartbeat:{service} age exceeds threshold (binance_spot/binance_futures/deribit_options/polymarket/iv_greeks)", notificationChannel: "Currently surfaced in the /live admin view; ntfy push NOT yet wired for this", runbookUrl: "runbook.ingestion_gap", owner: "Operator (sole)", onCallRotation: "Single operator", status: "Mechanism exists (heartbeat keys); automated alerting is a gap" } }),
  node({ id: "alert.polymarket_docs_drift", type: "alert", name: "Polymarket docs drift", criticality: "medium",
    metadata: { severity: "P3", triggerCondition: "docs-sync detects a meaningful change in docs.polymarket.com after LLM impact analysis", notificationChannel: "ntfy.sh topic (wired)", runbookUrl: "runbook.docs_drift", owner: "Operator" } }),
  node({ id: "alert.db_disk_full", type: "alert", name: "TimescaleDB disk near full", criticality: "critical", confidence: "inferred",
    metadata: { severity: "P1", triggerCondition: "PG data volume > 80% full", notificationChannel: "Not yet wired", runbookUrl: "runbook.db_disk", owner: "Operator", status: "INFERRED — no disk monitor exists today; recommended given hypertable growth" } }),
  node({ id: "runbook.ingestion_gap", type: "runbook", name: "Runbook: ingestion gap", criticality: "high",
    metadata: { whenToUse: "A heartbeat key is stale / the /live view flags a service",
      steps: ["Open the /live admin view to see which service + last heartbeat age", "docker logs quantpredict_<service> --tail 200", "If a polymarket-* service: check polymarket-vpn reachability (curl -x http://polymarket-vpn:8888)", "docker compose up -d --force-recreate <service>", "Confirm the heartbeat key refreshes in Redis", "If it recurs, file a Notion task with logs"],
      relatedAlerts: ["alert.ingestion_gap"] } }),
  node({ id: "runbook.docs_drift", type: "runbook", name: "Runbook: Polymarket docs drift", criticality: "medium",
    metadata: { whenToUse: "alert.polymarket_docs_drift fires (ntfy)",
      steps: ["Open the diff docs-sync wrote under docs/external/polymarket/", "Read the LLM impact-analysis summary", "Check connectors/polymarket.py against the changed endpoint", "If impacted, file a Notion task to update the connector + dependent ingestion/trading code"],
      relatedAlerts: ["alert.polymarket_docs_drift"] } })
];

const SYS = "system.quantpredict";

const edges: AtlasEdge[] = [
  // System decomposition
  edge("e.sys_contains_db", SYS, "container.db", "contains"),
  edge("e.sys_contains_redis", SYS, "container.redis", "contains"),
  edge("e.sys_contains_admin_api", SYS, "container.admin_api", "contains"),
  edge("e.sys_contains_admin_panel", SYS, "container.admin_panel", "contains"),
  ...[
    "docs_sync", "binance_spot_ingestion", "binance_futures_ingestion", "ohlcv_ingestion", "deribit_options",
    "polymarket_ingestion", "market_trades_ingestion", "iv_greeks", "hyperliquid_funding",
    "polymarket_market_maker", "queue_anchoring"
  ].map((s) => edge(`e.sys_contains_${s}`, SYS, `container.${s}`, "contains")),

  // Container → datastore reads/writes
  edge("e.binance_spot_writes_redis", "container.binance_spot_ingestion", "container.redis", "writes"),
  edge("e.binance_fut_writes_redis", "container.binance_futures_ingestion", "container.redis", "writes"),
  edge("e.deribit_writes_redis", "container.deribit_options", "container.redis", "writes"),
  edge("e.deribit_writes_db", "container.deribit_options", "container.db", "writes", { description: "crypto_option_iv via raw SQL" }),
  edge("e.poly_writes_redis", "container.polymarket_ingestion", "container.redis", "writes"),
  edge("e.poly_writes_db", "container.polymarket_ingestion", "container.db", "writes"),
  edge("e.ohlcv_writes_db", "container.ohlcv_ingestion", "container.db", "writes"),
  edge("e.market_trades_writes_db", "container.market_trades_ingestion", "container.db", "writes"),
  edge("e.iv_greeks_writes_redis", "container.iv_greeks", "container.redis", "writes"),
  edge("e.iv_greeks_reads_redis", "container.iv_greeks", "container.redis", "reads"),
  edge("e.hl_writes_db", "container.hyperliquid_funding", "container.db", "writes"),
  edge("e.mm_reads_redis", "container.polymarket_market_maker", "container.redis", "reads"),
  edge("e.mm_writes_db", "container.polymarket_market_maker", "container.db", "writes"),
  edge("e.qa_reads_redis", "container.queue_anchoring", "container.redis", "reads"),
  edge("e.qa_writes_redis", "container.queue_anchoring", "container.redis", "writes", { description: "queue-anchoring state (TTL 86400s)" }),
  edge("e.qa_writes_db", "container.queue_anchoring", "container.db", "writes"),
  edge("e.api_reads_db", "container.admin_api", "container.db", "reads"),
  edge("e.api_reads_redis", "container.admin_api", "container.redis", "reads"),
  edge("e.api_exposes", "container.admin_api", "api.admin", "exposes"),
  edge("e.panel_calls_api", "container.admin_panel", "api.admin", "calls", { protocol: "HTTP/JSON", interaction: "sync" }),

  // Egress via VPN
  edge("e.poly_via_vpn", "container.polymarket_ingestion", "container.polymarket_vpn", "depends_on", { description: "HTTP_PROXY" }),
  edge("e.mt_via_vpn", "container.market_trades_ingestion", "container.polymarket_vpn", "depends_on"),
  edge("e.mm_via_vpn", "container.polymarket_market_maker", "container.polymarket_vpn", "depends_on"),
  edge("e.qa_via_vpn", "container.queue_anchoring", "container.polymarket_vpn", "depends_on"),
  edge("e.api_via_vpn", "container.admin_api", "container.polymarket_vpn", "depends_on"),
  edge("e.docs_via_vpn", "container.docs_sync", "container.polymarket_vpn", "depends_on"),
  edge("e.vpn_to_polymarket", "container.polymarket_vpn", "external.polymarket_clob", "calls", { protocol: "WS + REST" }),
  edge("e.vpn_to_polymarket_docs", "container.polymarket_vpn", "external.polymarket_docs", "calls"),

  // Direct external (no proxy)
  edge("e.binance_spot_to_binance", "container.binance_spot_ingestion", "external.binance", "calls", { protocol: "WS" }),
  edge("e.binance_fut_to_binance", "container.binance_futures_ingestion", "external.binance", "calls"),
  edge("e.ohlcv_to_binance", "container.ohlcv_ingestion", "external.binance", "calls"),
  edge("e.deribit_to_deribit", "container.deribit_options", "external.deribit", "calls"),
  edge("e.hl_to_hyperliquid", "container.hyperliquid_funding", "external.hyperliquid", "calls"),
  edge("e.docs_calls_llm", "container.docs_sync", "external.llm", "calls", { description: "direct (NO_PROXY)" }),
  edge("e.docs_pushes_ntfy", "container.docs_sync", "external.ntfy", "calls", { description: "direct (NO_PROXY)" }),

  // Ownership: db owns entities
  edge("e.db_owns_markets", "container.db", "entity.polymarket_markets", "owns"),
  edge("e.db_owns_tokens", "container.db", "entity.polymarket_tokens", "owns"),
  edge("e.db_owns_options", "container.db", "entity.polymarket_options", "owns"),
  edge("e.db_owns_orders", "container.db", "entity.polymarket_orders", "owns"),
  edge("e.db_owns_positions", "container.db", "entity.polymarket_positions", "owns"),
  edge("e.db_owns_ptrades", "container.db", "entity.polymarket_trades", "owns"),
  edge("e.db_owns_mtrades", "container.db", "entity.market_trades", "owns"),
  edge("e.db_owns_pnl", "container.db", "entity.pnl_portfolio", "owns"),
  edge("e.db_owns_ohlcvs", "container.db", "entity.ohlcvs", "owns"),
  edge("e.db_owns_funding", "container.db", "entity.funding_rates", "owns"),
  edge("e.db_owns_iv", "container.db", "entity.crypto_option_iv", "owns"),
  edge("e.db_owns_smart", "container.db", "entity.smart_money_wallets", "owns"),
  edge("e.db_owns_targets", "container.db", "entity.strategy_targets", "owns"),
  edge("e.db_owns_ref", "container.db", "entity.reference_data", "owns"),

  // Writers → entities
  edge("e.poly_writes_markets", "container.polymarket_ingestion", "entity.polymarket_markets", "writes"),
  edge("e.poly_writes_tokens", "container.polymarket_ingestion", "entity.polymarket_tokens", "writes"),
  edge("e.poly_writes_pnl", "container.polymarket_ingestion", "entity.pnl_portfolio", "writes", { description: "pnl_service" }),
  edge("e.poly_writes_ptrades", "container.polymarket_ingestion", "entity.polymarket_trades", "writes", { description: "pnl_service" }),
  edge("e.mt_writes_mtrades", "container.market_trades_ingestion", "entity.market_trades", "writes"),
  edge("e.ohlcv_writes_ohlcvs", "container.ohlcv_ingestion", "entity.ohlcvs", "writes"),
  edge("e.hl_writes_funding", "container.hyperliquid_funding", "entity.funding_rates", "writes"),
  edge("e.deribit_writes_iv", "container.deribit_options", "entity.crypto_option_iv", "writes"),
  edge("e.qa_writes_targets", "container.queue_anchoring", "entity.strategy_targets", "writes"),
  edge("e.mm_writes_orders", "container.polymarket_market_maker", "entity.polymarket_orders", "writes"),

  // API → entities (reads)
  edge("e.api_models_markets", "api.admin", "entity.polymarket_markets", "models"),
  edge("e.api_models_positions", "api.admin", "entity.polymarket_positions", "models"),
  edge("e.api_models_pnl", "api.admin", "entity.pnl_portfolio", "models"),
  edge("e.api_models_smart", "api.admin", "entity.smart_money_wallets", "models"),
  edge("e.api_models_targets", "api.admin", "entity.strategy_targets", "models"),

  // Frontend
  edge("e.panel_contains_dashboard", "container.admin_panel", "page.admin_dashboard", "contains"),
  edge("e.dashboard_uses_api", "page.admin_dashboard", "api.admin", "depends_on"),

  // Modules ← used by containers
  edge("e.poly_uses_connectors", "container.polymarket_ingestion", "module.connectors", "depends_on"),
  edge("e.binance_uses_connectors", "container.binance_spot_ingestion", "module.connectors", "depends_on"),
  edge("e.hl_uses_connectors", "container.hyperliquid_funding", "module.connectors", "depends_on"),
  edge("e.mm_uses_strategies", "container.polymarket_market_maker", "module.trading_strategies", "depends_on"),
  edge("e.qa_uses_strategies", "container.queue_anchoring", "module.trading_strategies", "depends_on"),
  edge("e.api_uses_models", "container.admin_api", "module.core_models", "depends_on"),
  edge("e.strategies_use_utils", "module.trading_strategies", "module.core_utils", "depends_on"),
  edge("e.poly_uses_integrity", "container.polymarket_ingestion", "module.data_integrity", "depends_on", { description: "pnl/portfolio safety checks" }),
  edge("e.integrity_addresses_loss", "module.data_integrity", "concern.no_silent_money_loss", "addresses"),
  edge("e.taker_addresses_loss", "module.core_utils", "concern.no_silent_money_loss", "addresses", { description: "TakerProtection guards" }),

  // Tech choices
  edge("e.sys_uses_python", SYS, "tech.python", "depends_on"),
  edge("e.api_uses_fastapi", "container.admin_api", "tech.fastapi", "depends_on"),
  edge("e.api_uses_sqlalchemy", "container.admin_api", "tech.sqlalchemy_async", "depends_on"),
  edge("e.db_uses_timescale", "container.db", "tech.timescaledb", "depends_on"),
  edge("e.redis_uses_redis", "container.redis", "tech.redis", "depends_on"),
  edge("e.connectors_use_clients", "module.connectors", "tech.exchange_clients", "depends_on"),
  edge("e.connectors_use_http", "module.connectors", "tech.http_clients", "depends_on"),
  edge("e.iv_uses_quant", "container.iv_greeks", "tech.quant_libs", "depends_on"),
  edge("e.panel_uses_react", "container.admin_panel", "tech.react_vite", "depends_on"),
  edge("e.dashboard_uses_charts", "page.admin_dashboard", "tech.charts", "depends_on"),
  edge("e.docs_uses_supercronic", "container.docs_sync", "tech.supercronic", "depends_on"),

  // Env vars
  edge("e.binance_uses_keys", "container.binance_spot_ingestion", "env.binance_keys", "depends_on"),
  edge("e.mm_uses_poly_key", "container.polymarket_market_maker", "env.polymarket_key", "depends_on"),
  edge("e.qa_uses_poly_key", "container.queue_anchoring", "env.polymarket_key", "depends_on"),
  edge("e.api_uses_db_creds", "container.admin_api", "env.db_creds", "depends_on"),
  edge("e.poly_uses_proxy", "container.polymarket_ingestion", "env.polymarket_proxy", "depends_on"),
  edge("e.docs_uses_ntfy", "container.docs_sync", "env.ntfy", "depends_on"),
  edge("e.docs_uses_llm_keys", "container.docs_sync", "env.llm_keys", "depends_on"),

  // Deployment
  edge("e.prod_contains_hetzner", "deploy.env_prod", "deploy.hetzner_vps", "contains"),
  edge("e.prod_contains_local", "deploy.env_prod", "deploy.local_dev_node", "contains"),
  edge("e.region_contains_hetzner", "deploy.region_eu", "deploy.hetzner_vps", "contains"),
  edge("e.local_deploys_sys", SYS, "deploy.local_dev_node", "deploys_to"),
  edge("e.hetzner_uses_caddy", "deploy.hetzner_vps", "tech.caddy", "depends_on"),
  edge("e.hetzner_uses_cf", "deploy.hetzner_vps", "tech.cloudflare_zt", "depends_on"),
  edge("e.hetzner_uses_tailscale", "deploy.hetzner_vps", "tech.tailscale", "depends_on"),
  edge("e.local_uses_tailscale", "deploy.local_dev_node", "tech.tailscale", "depends_on"),

  // Stakeholders + concerns + decisions
  edge("e.op_has_no_loss", "stakeholder.operator", "concern.no_silent_money_loss", "has_concern"),
  edge("e.op_has_freshness", "stakeholder.operator", "concern.data_freshness", "has_concern"),
  edge("e.op_has_poly_drift", "stakeholder.operator", "concern.polymarket_protocol_drift", "has_concern"),
  edge("e.decision_addresses_freshness", "decision.hot_cold_data_split", "concern.data_freshness", "addresses"),
  edge("e.decision_addresses_poly_drift", "decision.polymarket_docs_mirror", "concern.polymarket_protocol_drift", "addresses"),
  edge("e.op_decides_hot_cold", "stakeholder.operator", "decision.hot_cold_data_split", "decides"),
  edge("e.op_decides_three_layer", "stakeholder.operator", "decision.three_layer_pydantic", "decides"),
  edge("e.op_decides_vpn", "stakeholder.operator", "decision.polymarket_via_vpn", "decides"),
  edge("e.op_decides_migrations", "stakeholder.operator", "decision.immutable_migrations", "decides"),
  edge("e.op_decides_docker", "stakeholder.operator", "decision.docker_only_backends", "decides"),
  edge("e.op_decides_docs_mirror", "stakeholder.operator", "decision.polymarket_docs_mirror", "decides"),

  // Risks
  edge("e.risk_backup_to_db", "risk.no_db_backup", "container.db", "risks", { description: "no automated backup of the only durable store" }),
  edge("e.risk_single_host_to_local", "risk.single_host", "deploy.local_dev_node", "risks", { description: "entire stack on one PC" }),
  edge("e.risk_auth_to_api", "risk.no_admin_auth", "container.admin_api", "risks", { description: "no in-app auth" }),
  edge("e.risk_quality_to_sys", "risk.no_quality_gates", SYS, "risks", { description: "no lint/type-check/CI" }),
  edge("e.risk_stale_to_db", "risk.stale_database_md", "container.db", "risks", { description: "DATABASE.md drifted from schema" }),
  edge("e.risk_monolith_to_api", "risk.admin_monolith", "container.admin_api", "risks", { description: "main.py concentrates 41 routes" }),

  // Quality + alerts + runbooks
  edge("e.quality_traces_freshness", "quality.ingestion_freshness", "concern.data_freshness", "traces_to"),
  edge("e.alert_ingest_to_workers", "alert.ingestion_gap", "container.polymarket_ingestion", "risks", { description: "stale heartbeat = ingestion stalled" }),
  edge("e.alert_drift_to_docs", "alert.polymarket_docs_drift", "container.docs_sync", "risks", { description: "fires from docs-sync analysis" }),
  edge("e.alert_db_to_db", "alert.db_disk_full", "container.db", "risks", { description: "hypertable growth fills the volume" }),
  edge("e.runbook_ingest_responds", "runbook.ingestion_gap", "alert.ingestion_gap", "mitigates", { description: "response procedure" }),
  edge("e.runbook_drift_responds", "runbook.docs_drift", "alert.polymarket_docs_drift", "mitigates", { description: "response procedure" })
];

const flows: AtlasFlow[] = [
  {
    id: "flow.polymarket_order_ingestion",
    name: "Polymarket order book ingestion → strategy decision",
    description: "Real-time Polymarket WS → Redis → strategy reads → order placement back through Polymarket, all egressing via polymarket-vpn.",
    owner: "architecture",
    criticality: "critical",
    steps: [
      { id: "s1", label: "polymarket-ingestion connects WS via polymarket-vpn:8888", nodeId: "container.polymarket_ingestion" },
      { id: "s2", label: "Order books → Redis polymarket:{token}:* (bids/asks/top_of_book)", nodeId: "container.redis" },
      { id: "s3", label: "queue-anchoring (V2) + market-maker read Redis, decide quotes", nodeId: "container.queue_anchoring" },
      { id: "s4", label: "Orders sent to Polymarket CLOB via polymarket-vpn", nodeId: "container.polymarket_vpn" },
      { id: "s5", label: "market-trades-ingestion persists fills to market_trades; pnl_service updates P&L", nodeId: "container.market_trades_ingestion" }
    ],
    failureModes: ["WS disconnect → heartbeat goes stale (visible in /live)", "polymarket-vpn down → all Polymarket egress fails", "Duplicate target rows (no unique constraint on queue_anchoring_targets)"],
    acceptanceChecks: ["heartbeat:polymarket fresh", "TakerProtection blocks accidental taker fills"],
    linkedTests: [],
    notes: ""
  },
  {
    id: "flow.docs_drift_alarm",
    name: "Polymarket docs sync → LLM impact analysis → drift alarm",
    description: "docs-sync mirrors Polymarket docs hourly via supercronic, runs an LLM impact analysis, and pushes an ntfy notification on meaningful drift.",
    owner: "architecture",
    criticality: "high",
    steps: [
      { id: "s1", label: "supercronic fires sync_polymarket_docs.py hourly", nodeId: "container.docs_sync" },
      { id: "s2", label: "Fetch docs.polymarket.com via polymarket-vpn", nodeId: "container.polymarket_vpn" },
      { id: "s3", label: "Diff vs last mirror; write changes to docs/external/polymarket/", nodeId: "container.docs_sync" },
      { id: "s4", label: "Gemini/Anthropic impact analysis vs connectors/polymarket.py (direct, NO_PROXY)", nodeId: "external.llm" },
      { id: "s5", label: "ntfy push on meaningful drift (direct, NO_PROXY)", nodeId: "external.ntfy" }
    ],
    failureModes: ["polymarket-vpn down → fetch fails silently if not separately alarmed", "LLM quota/error → no impact verdict", "ntfy outage → notification lost"],
    acceptanceChecks: ["At least one successful sync per 6h", "Connector-relevant changes trigger a push"],
    linkedTests: [],
    notes: ""
  },
  {
    id: "flow.public_request_path",
    name: "Public request → admin console",
    description: "Browser → Cloudflare ZT → VPS (Caddy, static SPA) → Tailnet → local admin-api on the PC.",
    owner: "architecture",
    criticality: "high",
    steps: [
      { id: "s1", label: "User hits app.quantpredict.ai" },
      { id: "s2", label: "Cloudflare Zero Trust authenticates the single operator", nodeId: "tech.cloudflare_zt" },
      { id: "s3", label: "Hetzner VPS serves the static SPA from /var/www/admin-panel (Caddy)", nodeId: "deploy.hetzner_vps" },
      { id: "s4", label: "SPA calls admin-api over the Tailnet to the local PC", nodeId: "tech.tailscale" },
      { id: "s5", label: "admin-api reads DB + Redis, returns JSON", nodeId: "container.admin_api" }
    ],
    failureModes: ["Local PC offline → console API + all trading down", "Tailnet partition → API unreachable from the VPS"],
    acceptanceChecks: ["Cloudflare ZT redirect works on first request", "admin-api reachable over Tailnet"],
    linkedTests: [],
    notes: "Landing page on quantpredict.ai is public; only app.quantpredict.ai is gated. admin-api runs on the PC, not the VPS (scripts/deploy/README.md)."
  },
  {
    id: "flow.ingestion_heartbeat",
    name: "Ingestion heartbeat → freshness monitoring",
    description: "Each ingestion service writes a Redis heartbeat every loop; the /live admin view surfaces the age and per-market errors.",
    owner: "architecture",
    criticality: "high",
    steps: [
      { id: "s1", label: "Service writes quantpredict:ingestion:heartbeat:{service} (write_heartbeat)", nodeId: "module.core_utils" },
      { id: "s2", label: "Errors pushed to quantpredict:errors:{market_id} ring buffer (push_market_error)", nodeId: "container.redis" },
      { id: "s3", label: "/live admin routes read heartbeat age + errors", nodeId: "api.admin" },
      { id: "s4", label: "Operator watches the /live page; automated ntfy alerting is a gap", nodeId: "page.admin_dashboard" }
    ],
    failureModes: ["No automated alert if the operator isn't watching /live", "A crashed service stops writing the heartbeat (detectable, not yet alarmed)"],
    acceptanceChecks: ["Every ingestion service writes a heartbeat each loop", "/live shows age for binance_spot/binance_futures/deribit_options/polymarket/iv_greeks"],
    linkedTests: [],
    notes: "This is the substrate for alert.ingestion_gap — the mechanism exists; automated alerting does not yet."
  }
];

// ── Layouts per view ────────────────────────────────────────────────────────
place("overview", "stakeholder.operator", 60, 60);
place("overview", "stakeholder.ai_agent", 60, 200);
place("overview", "concern.no_silent_money_loss", 60, 340);
place("overview", "concern.data_freshness", 60, 480);
place("overview", "concern.polymarket_protocol_drift", 60, 620);
place("overview", SYS, 420, 60);
place("overview", "container.admin_api", 420, 220);
place("overview", "container.admin_panel", 700, 220);
place("overview", "container.db", 420, 380);
place("overview", "container.redis", 700, 380);
place("overview", "external.binance", 1020, 60);
place("overview", "external.deribit", 1020, 170);
place("overview", "external.polymarket_clob", 1020, 280);
place("overview", "external.hyperliquid", 1020, 390);
place("overview", "container.polymarket_vpn", 1020, 500);

place("containers", "container.db", 60, 60);
place("containers", "container.redis", 320, 60);
place("containers", "container.admin_api", 580, 60);
place("containers", "container.admin_panel", 840, 60);
place("containers", "api.admin", 580, 200);
place("containers", "container.binance_spot_ingestion", 60, 220);
place("containers", "container.binance_futures_ingestion", 320, 220);
place("containers", "container.deribit_options", 60, 360);
place("containers", "container.polymarket_ingestion", 320, 360);
place("containers", "container.market_trades_ingestion", 580, 360);
place("containers", "container.iv_greeks", 840, 360);
place("containers", "container.polymarket_market_maker", 60, 500);
place("containers", "container.queue_anchoring", 320, 500);
place("containers", "container.ohlcv_ingestion", 580, 500);
place("containers", "container.hyperliquid_funding", 840, 500);
place("containers", "container.docs_sync", 1100, 60);
place("containers", "container.polymarket_vpn", 1100, 220);

place("data", "container.db", 60, 60);
place("data", "container.redis", 60, 220);
place("data", "entity.polymarket_markets", 340, 60);
place("data", "entity.polymarket_tokens", 600, 60);
place("data", "entity.polymarket_options", 860, 60);
place("data", "entity.polymarket_orders", 1120, 60);
place("data", "entity.polymarket_positions", 340, 200);
place("data", "entity.polymarket_trades", 600, 200);
place("data", "entity.market_trades", 860, 200);
place("data", "entity.pnl_portfolio", 1120, 200);
place("data", "entity.ohlcvs", 340, 340);
place("data", "entity.funding_rates", 600, 340);
place("data", "entity.crypto_option_iv", 860, 340);
place("data", "entity.smart_money_wallets", 1120, 340);
place("data", "entity.strategy_targets", 340, 480);
place("data", "entity.reference_data", 600, 480);

place("schema_model", "container.db", 60, 60);
place("schema_model", "entity.ohlcvs", 360, 60);
place("schema_model", "entity.funding_rates", 660, 60);
place("schema_model", "entity.strategy_targets", 360, 220);
place("schema_model", "entity.pnl_portfolio", 660, 220);

place("deployment", "deploy.env_prod", 60, 60);
place("deployment", "deploy.region_eu", 360, 60);
place("deployment", "deploy.hetzner_vps", 660, 60);
place("deployment", "deploy.local_dev_node", 660, 220);
place("deployment", "env.binance_keys", 60, 220);
place("deployment", "env.polymarket_key", 60, 360);
place("deployment", "env.db_creds", 360, 360);
place("deployment", "env.ntfy", 360, 500);
place("deployment", "env.polymarket_proxy", 660, 400);
place("deployment", "env.llm_keys", 960, 220);
place("deployment", "env.solana", 960, 360);

place("decisions", "decision.hot_cold_data_split", 60, 60);
place("decisions", "decision.three_layer_pydantic", 360, 60);
place("decisions", "decision.polymarket_via_vpn", 660, 60);
place("decisions", "decision.immutable_migrations", 60, 220);
place("decisions", "decision.docker_only_backends", 360, 220);
place("decisions", "decision.polymarket_docs_mirror", 660, 220);

place("health", "concern.no_silent_money_loss", 60, 60);
place("health", "concern.data_freshness", 60, 200);
place("health", "risk.no_db_backup", 340, 60);
place("health", "risk.single_host", 340, 200);
place("health", "risk.no_admin_auth", 340, 340);
place("health", "risk.no_quality_gates", 340, 480);
place("health", "risk.stale_database_md", 340, 620);
place("health", "risk.admin_monolith", 340, 760);
place("health", "alert.ingestion_gap", 660, 60);
place("health", "alert.polymarket_docs_drift", 660, 200);
place("health", "alert.db_disk_full", 660, 340);
place("health", "runbook.ingestion_gap", 960, 60);
place("health", "runbook.docs_drift", 960, 200);
place("health", "quality.ingestion_freshness", 1240, 60);

place("concerns", "stakeholder.operator", 60, 60);
place("concerns", "stakeholder.ai_agent", 60, 220);
place("concerns", "concern.no_silent_money_loss", 360, 60);
place("concerns", "concern.data_freshness", 360, 200);
place("concerns", "concern.polymarket_protocol_drift", 360, 340);
place("concerns", "decision.hot_cold_data_split", 660, 200);
place("concerns", "decision.polymarket_docs_mirror", 660, 340);

place("domain", "tech.python", 60, 60);
place("domain", "tech.fastapi", 320, 60);
place("domain", "tech.sqlalchemy_async", 580, 60);
place("domain", "tech.timescaledb", 840, 60);
place("domain", "tech.redis", 1100, 60);
place("domain", "tech.exchange_clients", 60, 220);
place("domain", "tech.http_clients", 320, 220);
place("domain", "tech.quant_libs", 580, 220);
place("domain", "tech.react_vite", 840, 220);
place("domain", "tech.charts", 1100, 220);
place("domain", "tech.supercronic", 60, 380);
place("domain", "tech.caddy", 320, 380);
place("domain", "tech.cloudflare_zt", 580, 380);
place("domain", "tech.tailscale", 840, 380);

place("api_surface", "container.admin_panel", 60, 120);
place("api_surface", "api.admin", 360, 120);
place("api_surface", "container.admin_api", 660, 120);
place("api_surface", "page.admin_dashboard", 60, 300);

place("security", "tech.cloudflare_zt", 60, 60);
place("security", "tech.tailscale", 360, 60);
place("security", "container.admin_api", 660, 60);
place("security", "risk.no_admin_auth", 660, 220);
place("security", "container.polymarket_vpn", 360, 220);
place("security", "external.polymarket_clob", 60, 220);

const views = defaultViews().map((view) => ({
  ...view,
  positions: layoutsByView[view.id] ?? {}
}));

const project: AtlasProject = {
  manifest: {
    schemaVersion: 1,
    name: "QuantPredict",
    description: "Automated trading + money management for crypto derivatives and prediction markets. Repo, package, DB, containers, and domain are all 'quantpredict' (folder renamed from QuantFlow on 2026-05-30). Verified against the codebase 2026-05-30. Regenerate via scripts/build-quantpredict-atlas.ts in the System Atlas repo.",
    owner: "architecture",
    updatedAt: now
  },
  nodes,
  edges,
  flows,
  views,
  proposals: [],
  versions: [],
  evidence: [],
  intelligence: emptyCodeIntelligence()
};

async function main() {
  const result = await exportAtlas(targetRoot, project);
  const errors = result.issues.filter((i) => i.severity === "error");
  const warnings = result.issues.filter((i) => i.severity === "warning");
  console.log(`Wrote ${result.files.length} files under ${path.join(targetRoot, "architecture")}`);
  console.log(`Validation: ${errors.length} errors, ${warnings.length} warnings`);
  if (errors.length) {
    for (const issue of errors) console.log(`  ERROR ${issue.code}: ${issue.message}${issue.targetId ? ` (${issue.targetId})` : ""}`);
    process.exit(1);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
