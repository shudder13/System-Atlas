// QuantFlow skeleton atlas — generated via the /build-atlas skill workflow.
// Re-runs idempotently against the QuantFlow workspace.
// Architect should edit this script (not the generated pack files) and re-run
// `npx tsx scripts/build-quantflow-atlas.ts` to update the pack.

import path from "node:path";
import { exportAtlas } from "../server/atlasFiles";
import { defaultViews, emptyCodeIntelligence } from "../src/lib/atlas";
import type { AtlasEdge, AtlasFlow, AtlasNode, AtlasProject, ViewId } from "../src/types";

const targetRoot = path.resolve("C:/Dev/Projects/QuantFlow");
const now = "2026-05-25T00:00:00.000Z";

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
    metadata: { category: "Reliability", sourceStakeholder: "Operator", priority: "Critical", acceptanceCriteria: ["Every trading action emits a structured log line", "P&L diverges from broker statement by < 0.5% per market", "Anomalous fills (> N stddev from mid) trigger an alert"] }
  }),
  node({
    id: "concern.data_freshness",
    type: "concern",
    name: "Market data freshness",
    criticality: "critical",
    responsibilities: ["Strategies trade on stale data only if data is explicitly marked stale"],
    metadata: { category: "Reliability", sourceStakeholder: "Operator", priority: "Critical", acceptanceCriteria: ["Each ingestion service updates its 'last-tick' Redis key within its SLA window", "Strategies refuse to act when 'last-tick' is older than threshold"] }
  }),
  node({
    id: "concern.polymarket_protocol_drift",
    type: "concern",
    name: "Polymarket protocol drift",
    criticality: "high",
    responsibilities: ["Polymarket changes its WS / REST contract silently; we must detect and adapt"],
    metadata: { category: "Reliability", sourceStakeholder: "Operator", priority: "High", acceptanceCriteria: ["docs-sync container alerts within 1h of docs diff", "LLM impact analysis flags relevant changes against our connector code"] }
  }),

  // ── System ─────────────────────────────────────────────────────────────────
  node({
    id: "system.quantflow",
    type: "system",
    name: "QuantFlow",
    criticality: "critical",
    architectureLevel: "system",
    responsibilities: ["Automated trading + money management for crypto derivatives and prediction markets", "Real-time market data ingestion across Binance, Deribit, Polymarket", "Strategy execution + P&L tracking + admin dashboard"],
    metadata: { businessOwner: "Marius (sole operator)", sla: "Best-effort — no external SLA, but trading strategies tolerate < 5min downtime per outage" }
  }),

  // ── Containers (Docker services) ───────────────────────────────────────────
  node({
    id: "container.db",
    type: "datastore",
    name: "TimescaleDB (quantflow_db)",
    criticality: "critical",
    architectureLevel: "container",
    linkedFiles: ["docker/docker-compose.yml", "alembic/", "docs/DATABASE.md"],
    responsibilities: ["Curated metadata, configuration, strategy state, historical records, time-series hypertables"],
    metadata: {
      dataOwner: "QuantFlow backend",
      retention: "Indefinite for metadata; hypertable retention TBD per table",
      consistency: "Strong (single-node Postgres + TimescaleDB)",
      backupPolicy: "MISSING — TBD. Currently no automated backup.",
      restoreTestCadence: "Never tested",
      lastRestoreTestedAt: "",
      rto: "Unknown — currently a recovery would require manual pg_basebackup or volume restore",
      rpo: "Unknown",
      containsPii: false,
      databaseEngine: "PostgreSQL 17 + TimescaleDB (timescale/timescaledb-ha:pg17-all-builder-amd64)",
      schemaName: "quantflow",
      migrationPolicy: "Alembic forward-only; never edit historic migrations — add new DROP/ALTER instead",
      monthlyCost: "Self-hosted (included in Hetzner VPS cost)",
      sla: "Single instance, no replica"
    }
  }),
  node({
    id: "container.redis",
    type: "cache",
    name: "Redis (quantflow_redis)",
    criticality: "critical",
    architectureLevel: "container",
    linkedFiles: ["docker/docker-compose.yml", "docs/REDIS_SCHEMA.md"],
    responsibilities: ["Real-time prices, order books, computed Greeks, current positions, strategy state"],
    metadata: {
      ttl: "Per-key — many keys live indefinitely while service is running; no global eviction policy set",
      consistency: "Eventual via single-writer-per-key convention",
      containsPii: false
    }
  }),
  node({
    id: "container.admin_api",
    type: "service",
    name: "Admin API (quantflow_admin_api)",
    criticality: "high",
    architectureLevel: "container",
    linkedFiles: ["docker/admin-api/Dockerfile", "src/quantflow/admin/main.py"],
    responsibilities: ["FastAPI HTTP backend for the admin panel", "41 routes covering positions, markets, strategies, vol surface, P&L"],
    invariants: ["No authentication — relies entirely on Docker network isolation + Cloudflare Zero Trust at the edge"],
    metadata: { sla: "Single-user; no formal SLA", scaling: "Single container; no horizontal scaling planned", monthlyCost: "Self-hosted" }
  }),
  node({
    id: "container.admin_panel",
    type: "app",
    name: "Admin Panel (quantflow_admin_panel)",
    criticality: "high",
    architectureLevel: "container",
    linkedFiles: ["docker/admin-panel/Dockerfile", "admin-panel/"],
    responsibilities: ["React + Vite single-page admin dashboard with 15+ pages"],
    metadata: { sla: "Dev-server mode in production for now", scaling: "Single-user" }
  }),
  node({
    id: "container.docs_sync",
    type: "worker",
    name: "Polymarket docs-sync (quantflow_docs_sync)",
    criticality: "medium",
    architectureLevel: "container",
    linkedFiles: ["docker/docs-sync/Dockerfile", "scripts/maintenance/sync_polymarket_docs.py", "docs/external/polymarket/"],
    responsibilities: ["Hourly mirror of docs.polymarket.com via supercronic", "LLM-assisted impact analysis against our connector code", "ntfy push when meaningful drift detected"],
    metadata: { sla: "Best-effort hourly; one missed run is acceptable" }
  }),

  // Ingestion workers
  node({
    id: "container.binance_spot_ingestion",
    type: "worker",
    name: "Binance Spot ingestion",
    criticality: "high",
    architectureLevel: "container",
    linkedFiles: ["docker/binance-ingestion/Dockerfile", "src/quantflow/services/data/ingestion/binance/binance_spot.py"],
    responsibilities: ["Real-time Binance spot price ingestion into Redis"]
  }),
  node({
    id: "container.binance_futures_ingestion",
    type: "worker",
    name: "Binance Futures ingestion",
    criticality: "high",
    architectureLevel: "container",
    linkedFiles: ["src/quantflow/services/data/ingestion/binance/binance_futures.py"],
    responsibilities: ["Real-time Binance USD-M futures ingestion into Redis"]
  }),
  node({
    id: "container.ohlcv_ingestion",
    type: "worker",
    name: "OHLCV ingestion",
    criticality: "medium",
    architectureLevel: "container",
    linkedFiles: ["src/quantflow/services/data/ingestion/binance/ohlcv_ingestion.py"],
    responsibilities: ["Historical OHLCV candles into TimescaleDB hypertable `ohlcvs`"]
  }),
  node({
    id: "container.deribit_options",
    type: "worker",
    name: "Deribit options ingestion",
    criticality: "high",
    architectureLevel: "container",
    linkedFiles: ["src/quantflow/services/data/ingestion/deribit/deribit_options.py"],
    responsibilities: ["Real-time Deribit option chains into Redis for IV/Greeks consumers"]
  }),
  node({
    id: "container.polymarket_ingestion",
    type: "worker",
    name: "Polymarket order book ingestion",
    criticality: "critical",
    architectureLevel: "container",
    linkedFiles: ["src/quantflow/services/data/ingestion/polymarket/polymarket.py"],
    responsibilities: ["Real-time Polymarket order books and market state into Redis + Postgres"],
    invariants: ["Routes egress through polymarket-vpn:8888 (DNS-blocked at host level)"]
  }),
  node({
    id: "container.market_trades_ingestion",
    type: "worker",
    name: "Market trades ingestion",
    criticality: "high",
    architectureLevel: "container",
    linkedFiles: ["src/quantflow/services/data/ingestion/polymarket/market_trades_ingestion.py"],
    responsibilities: ["Streams Polymarket trade events into TimescaleDB `market_trades`"],
    invariants: ["Routes egress through polymarket-vpn:8888"]
  }),
  node({
    id: "container.iv_greeks",
    type: "worker",
    name: "IV / Greeks service",
    criticality: "high",
    architectureLevel: "container",
    linkedFiles: ["src/quantflow/services/data/ingestion/polymarket/iv_greeks_service.py"],
    responsibilities: ["Computes implied vol + Greeks for Polymarket binary options + Deribit options, publishes to Redis"]
  }),
  node({
    id: "container.hyperliquid_funding",
    type: "worker",
    name: "Hyperliquid funding ingestion",
    criticality: "medium",
    architectureLevel: "container",
    linkedFiles: ["src/quantflow/services/data/ingestion/hyperliquid/funding_rates.py"],
    responsibilities: ["Hyperliquid perpetual funding rates into TimescaleDB"]
  }),
  node({
    id: "container.polymarket_market_maker",
    type: "service",
    name: "Polymarket market maker",
    criticality: "critical",
    architectureLevel: "container",
    linkedFiles: ["src/quantflow/services/trading/polymarket_market_maker.py"],
    responsibilities: ["Two-sided quoting on Polymarket markets"],
    invariants: ["Routes egress through polymarket-vpn:8888", "stop_grace_period: 30s to flush in-flight orders cleanly"]
  }),
  node({
    id: "container.queue_anchoring",
    type: "service",
    name: "Queue-anchoring strategy",
    criticality: "critical",
    architectureLevel: "container",
    linkedFiles: ["src/quantflow/services/trading/strategies/queue_anchoring_v2_runner.py", "docs/strategies/queue_anchoring_v2.md"],
    responsibilities: ["Anchors orders to queue positions on Polymarket order books"],
    invariants: ["Routes egress through polymarket-vpn:8888", "stop_grace_period: 30s"]
  }),

  // External egress proxy (lives in InfraVPN, not in this compose)
  node({
    id: "container.polymarket_vpn",
    type: "external_system",
    name: "polymarket-vpn forward proxy",
    criticality: "critical",
    architectureLevel: "system",
    responsibilities: ["HTTP/HTTPS forward proxy on infravpn_default Docker network", "Tailscale-routed egress avoiding the host-level DNS block on polymarket.com"],
    invariants: ["MUST be reachable at http://polymarket-vpn:8888 from infravpn_default network"],
    metadata: { vendor: "Self-hosted (InfraVPN project)", monthlyCost: "Included in Hetzner cost" }
  }),

  // ── External systems ─────────────────────────────────────────────────────
  node({
    id: "external.binance",
    type: "external_system",
    name: "Binance (Spot + USD-M Futures)",
    criticality: "high",
    metadata: { vendor: "Binance", baseUrl: "wss://stream.binance.com / fapi.binance.com", authMode: "API key + secret", rateLimitPerMinute: 1200, rateLimitScope: "api-key", monthlyCost: "$0 (no trading fees beyond per-order rates)" }
  }),
  node({
    id: "external.deribit",
    type: "external_system",
    name: "Deribit",
    criticality: "high",
    metadata: { vendor: "Deribit", baseUrl: "wss://www.deribit.com/ws/api/v2", authMode: "API key + signed", monthlyCost: "$0" }
  }),
  node({
    id: "external.polymarket_clob",
    type: "external_system",
    name: "Polymarket CLOB",
    criticality: "critical",
    invariants: ["DNS-blocked at host level; reachable only via polymarket-vpn:8888"],
    metadata: { vendor: "Polymarket", baseUrl: "clob.polymarket.com", authMode: "EOA + proxy address (Polygon)", rateLimitScope: "api-key" }
  }),
  node({
    id: "external.polymarket_docs",
    type: "external_system",
    name: "docs.polymarket.com",
    criticality: "medium",
    metadata: { vendor: "Polymarket", baseUrl: "docs.polymarket.com" }
  }),
  node({
    id: "external.ntfy",
    type: "external_system",
    name: "ntfy.sh (alert delivery)",
    criticality: "medium",
    responsibilities: ["Push-notification fan-out for QuantFlow alerts (docs drift, ingestion gap, P&L anomaly)"],
    metadata: { vendor: "ntfy.sh (free public)", authMode: "Topic name = both channel and access token" }
  }),
  node({
    id: "external.solana_rpc",
    type: "external_system",
    name: "Solana RPC (Jupiter / mainnet)",
    criticality: "medium",
    metadata: { vendor: "Solana Foundation / Jupiter Aggregator", baseUrl: "api.mainnet-beta.solana.com / quote-api.jup.ag" }
  }),

  // ── Modules (logical) ─────────────────────────────────────────────────────
  node({
    id: "module.connectors",
    type: "module",
    name: "Exchange connectors",
    criticality: "critical",
    architectureLevel: "component",
    linkedFiles: ["src/quantflow/connectors/"],
    responsibilities: ["Thin wrappers around external exchange SDKs (binance_spot, binance_futures, polymarket)"]
  }),
  node({
    id: "module.core_models",
    type: "module",
    name: "Core ORM models",
    criticality: "critical",
    architectureLevel: "component",
    linkedFiles: ["src/quantflow/core/models/"],
    responsibilities: ["SQLAlchemy 2.0 async models — asset, exchange, ohlcv, polymarket, position, db_schemas"]
  }),
  node({
    id: "module.trading_strategies",
    type: "module",
    name: "Trading strategies",
    criticality: "critical",
    architectureLevel: "component",
    linkedFiles: ["src/quantflow/services/trading/strategies/"],
    responsibilities: ["Strategy runners — queue_anchoring v1/v2, convergent_rebalancing, cushion_exit, value_averaging, volatility_harvesting, passive_spread, sports_market_making"]
  }),
  node({
    id: "module.core_utils",
    type: "module",
    name: "Core utils",
    criticality: "high",
    architectureLevel: "component",
    linkedFiles: ["src/quantflow/core/utils/"],
    responsibilities: ["Cross-cutting helpers — redis_utils, math_utils, sizing_utils, taker_protection, ntfy, volatility_surface"]
  }),

  // ── API contract (single big surface — admin/main.py) ────────────────────
  node({
    id: "api.admin",
    type: "api_contract",
    name: "Admin REST API",
    criticality: "high",
    architectureLevel: "container",
    linkedFiles: ["src/quantflow/admin/main.py"],
    responsibilities: ["41 HTTP routes covering positions, markets, P&L, strategies, vol surface, order books"],
    metadata: {
      version: "0",
      authMode: "None (network-isolated; protected by Cloudflare Zero Trust at edge)",
      baseUrl: "http://admin-api:8080 (internal) / https://app.quantpredict.ai (public)",
      idempotent: false,
      idempotencyMechanism: "Most routes are read-only GETs; mutating routes are not idempotent — relies on single-user access"
    }
  }),

  // ── Data entities (selected from DATABASE.md) ────────────────────────────
  node({
    id: "entity.polymarket_markets",
    type: "data_entity",
    name: "polymarket_markets",
    criticality: "high",
    architectureLevel: "data",
    linkedFiles: ["docs/DATABASE.md", "alembic/versions/"],
    responsibilities: ["Polymarket market metadata — title, slug, end_date, tokens, status"],
    metadata: { dataOwner: "polymarket-ingestion", primaryKeys: ["condition_id"], accessPatterns: ["lookup by slug", "join to polymarket_tokens", "filter by end_date for active markets"] }
  }),
  node({
    id: "entity.polymarket_tokens",
    type: "data_entity",
    name: "polymarket_tokens",
    criticality: "high",
    architectureLevel: "data",
    metadata: { dataOwner: "polymarket-ingestion", primaryKeys: ["token_id"], relations: ["polymarket_markets via condition_id"] }
  }),
  node({
    id: "entity.polymarket_trades",
    type: "data_entity",
    name: "polymarket_trades (TimescaleDB hypertable)",
    criticality: "critical",
    architectureLevel: "data",
    metadata: { dataOwner: "market-trades-ingestion", primaryKeys: ["taker_order_id, transaction_hash"], accessPatterns: ["recent trades per market", "user trade history by address"] }
  }),
  node({
    id: "entity.polymarket_positions",
    type: "data_entity",
    name: "polymarket_positions",
    criticality: "critical",
    architectureLevel: "data",
    metadata: { dataOwner: "polymarket-market-maker + queue-anchoring", accessPatterns: ["current positions", "P&L reconciliation"] }
  }),
  node({
    id: "entity.polymarket_orders",
    type: "data_entity",
    name: "polymarket_orders",
    criticality: "high",
    architectureLevel: "data",
    metadata: { dataOwner: "trading strategies" }
  }),
  node({
    id: "entity.market_trades",
    type: "data_entity",
    name: "market_trades (TimescaleDB hypertable)",
    criticality: "high",
    architectureLevel: "data"
  }),
  node({
    id: "entity.ohlcvs",
    type: "data_entity",
    name: "ohlcvs (TimescaleDB hypertable)",
    criticality: "high",
    architectureLevel: "data",
    metadata: { dataOwner: "ohlcv-ingestion", accessPatterns: ["historical price queries by asset+timeframe"] }
  }),
  node({
    id: "entity.strategy_targets",
    type: "data_entity",
    name: "strategy_*_targets tables (group)",
    criticality: "high",
    architectureLevel: "data",
    responsibilities: ["8 per-strategy target tables: value_averaging_targets, volatility_harvesting_targets, convergent_rebalancing_targets, passive_spread_targets, sports_market_making_targets, queue_anchoring_targets, buffer_guard_targets, cushion_exit_targets+orders"]
  }),

  // ── Frontend (one node now; expand per-page later) ────────────────────────
  node({
    id: "page.admin_dashboard",
    type: "page",
    name: "Admin Dashboard (all 15 pages)",
    criticality: "high",
    architectureLevel: "component",
    linkedFiles: ["admin-panel/src/App.tsx", "admin-panel/src/pages/"],
    responsibilities: ["Dashboard, Positions, Markets, CryptoOptions, CryptoPositions, VolatilitySurface, VolatilityCenter, ConstantDollarExposure, ProbabilityDensity, Strategies, OrderBook, CushionExit, QueueAnchoring, QueueAnchoringSimulator"],
    metadata: {
      route: "/ + /positions + /markets + ...",
      layout: "Sidebar nav + content area",
      authRequired: true,
      components: ["React Query for server state (staleTime 5s, refetchInterval 10s)", "Highcharts for time-series + financials", "Plotly for 3D vol surface"],
      dataFetched: ["GET /api/positions", "GET /api/markets", "GET /api/strategies/*", "many more — see admin/main.py"],
      ssrMode: "CSR (Vite SPA)",
      seo: "Behind Cloudflare Zero Trust — no-index"
    }
  }),

  // ── Tech choices (top 8) ──────────────────────────────────────────────────
  node({
    id: "tech.python",
    type: "tech_choice",
    name: "Python 3.11",
    criticality: "critical",
    architectureLevel: "domain",
    metadata: { category: "Language", version: "3.11+", rationale: "Mature scientific + async ecosystem; works with quant libraries (numpy/scipy/pandas) and async HTTP", alternatives: ["TypeScript backend", "Rust"] }
  }),
  node({
    id: "tech.fastapi",
    type: "tech_choice",
    name: "FastAPI + Uvicorn",
    criticality: "high",
    architectureLevel: "domain",
    metadata: { category: "Backend framework", version: "transitive (not pinned in pyproject.toml — known issue)", rationale: "Pydantic-first request validation matches our schema-heavy design", alternatives: ["Starlette raw", "Flask"], reviewCadence: "Pin explicitly in next maintenance pass" }
  }),
  node({
    id: "tech.sqlalchemy_async",
    type: "tech_choice",
    name: "SQLAlchemy 2.0 async + asyncpg",
    criticality: "critical",
    architectureLevel: "domain",
    metadata: { category: "ORM / DB driver", version: ">=2.0.41 + asyncpg >=0.30", rationale: "Async ORM with explicit Mapped types; asyncpg is fastest async Postgres driver" }
  }),
  node({
    id: "tech.timescaledb",
    type: "tech_choice",
    name: "TimescaleDB (on PG17)",
    criticality: "critical",
    architectureLevel: "domain",
    metadata: { category: "Database", version: "pg17-all-builder-amd64", rationale: "Hypertables make time-series queries efficient (ohlcvs, market_trades) while keeping Postgres compatibility for metadata tables", alternatives: ["InfluxDB", "ClickHouse", "plain Postgres"] }
  }),
  node({
    id: "tech.redis",
    type: "tech_choice",
    name: "Redis 7.4",
    criticality: "critical",
    architectureLevel: "domain",
    metadata: { category: "Cache / pub-sub", version: "7.4.4-alpine3.21", rationale: "Sub-ms reads for hot price/Greeks data; pub-sub for cross-service event flow" }
  }),
  node({
    id: "tech.ccxt",
    type: "tech_choice",
    name: "ccxt + per-exchange SDKs",
    criticality: "high",
    architectureLevel: "domain",
    metadata: { category: "Exchange client", version: "ccxt ^4.4.88", rationale: "ccxt for the long tail; per-exchange SDKs (binance-sdk-spot, py-clob-client) where typed coverage matters" }
  }),
  node({
    id: "tech.react_vite",
    type: "tech_choice",
    name: "React 18 + Vite 5 + Tailwind",
    criticality: "high",
    architectureLevel: "domain",
    metadata: { category: "Frontend stack", version: "react ^18.2, vite ^5.0, tailwind ^3.4", rationale: "Familiar SPA stack; React Query handles all server state with simple staleTime config" }
  }),
  node({
    id: "tech.highcharts",
    type: "tech_choice",
    name: "Highcharts + Plotly",
    criticality: "medium",
    architectureLevel: "domain",
    metadata: { category: "Charts", version: "highcharts ^12.5 + plotly ^3.3", rationale: "Highcharts for time-series + financials (candlesticks); Plotly for 3D vol surface", reviewCadence: "Highcharts license review yearly" }
  }),

  // ── Env vars (load-bearing) ───────────────────────────────────────────────
  node({
    id: "env.binance_keys",
    type: "env_var",
    name: "BINANCE_API_KEY / BINANCE_API_SECRET",
    criticality: "critical",
    metadata: { scope: "binance ingestion + trading services", sensitive: true, required: true, envExamplePath: ".env.example", rotationPolicy: "Manual; rotate on suspected compromise" }
  }),
  node({
    id: "env.polymarket_key",
    type: "env_var",
    name: "POLYMARKET_PRIVATE_KEY / POLYMARKET_PROXY_ADDRESS",
    criticality: "critical",
    metadata: { scope: "polymarket connector", sensitive: true, required: true, rotationPolicy: "Manual on Polygon address rotation" }
  }),
  node({
    id: "env.db_creds",
    type: "env_var",
    name: "QUANTFLOW_DB_* (USER / PASSWORD / HOST / PORT / NAME)",
    criticality: "critical",
    metadata: { scope: "all backend services", sensitive: true, required: true, defaultValue: "host=quantflow_db port=5432 db=quantflow user=quantflow_user" }
  }),
  node({
    id: "env.ntfy_topic",
    type: "env_var",
    name: "QUANTFLOW_NTFY_SERVER / TOPIC",
    criticality: "medium",
    metadata: { scope: "alert delivery", sensitive: true, required: false, defaultValue: "https://ntfy.sh", costNotes: "Free tier; topic name is the access token" }
  }),
  node({
    id: "env.polymarket_proxy",
    type: "env_var",
    name: "POLYMARKET_HTTP_PROXY / HTTP_PROXY",
    criticality: "critical",
    metadata: { scope: "all polymarket-touching services + docs-sync", sensitive: false, required: true, defaultValue: "http://polymarket-vpn:8888 (in-container) / http://localhost:18000 (host)" }
  }),
  node({
    id: "env.solana",
    type: "env_var",
    name: "SOLANA_RPC / PHANTOM_WALLET_*",
    criticality: "medium",
    metadata: { scope: "Solana-touching trading code", sensitive: true, required: false }
  }),

  // ── Deployment topology ───────────────────────────────────────────────────
  node({
    id: "deploy.env_prod",
    type: "environment",
    name: "Production",
    criticality: "critical",
    architectureLevel: "deployment"
  }),
  node({
    id: "deploy.region_eu",
    type: "region",
    name: "Hetzner Nuremberg (EU)",
    criticality: "high",
    architectureLevel: "deployment",
    metadata: { cloud: "Hetzner Cloud", region: "nbg1" }
  }),
  node({
    id: "deploy.hetzner_vps",
    type: "deployment_node",
    name: "Hetzner VPS (quantpredict.ai)",
    criticality: "critical",
    architectureLevel: "deployment",
    responsibilities: ["Runs Caddy + the public-facing landing page", "Tailscale node — reaches local QuantFlow Docker stack on home machine"],
    metadata: { cloud: "Hetzner Cloud", region: "nbg1", instanceClass: "shared CPU x86 (4GB)", monthlyCost: "~€5/mo" }
  }),
  node({
    id: "deploy.local_dev_node",
    type: "deployment_node",
    name: "Local Dev (Windows 11 + Docker Desktop)",
    criticality: "critical",
    architectureLevel: "deployment",
    responsibilities: ["Hosts the actual Docker stack (db, redis, all workers, admin-api, admin-panel, docs-sync) — production AND development run here", "Joined to the same Tailnet as the Hetzner VPS"],
    invariants: ["Must be online for the live trading + ingestion stack to work — single point of failure"]
  }),
  node({
    id: "tech.caddy",
    type: "tech_choice",
    name: "Caddy reverse proxy",
    criticality: "high",
    architectureLevel: "domain",
    metadata: { category: "Reverse proxy", rationale: "Automatic HTTPS, simple Caddyfile; lives on Hetzner VPS", alternatives: ["Nginx", "Traefik"] }
  }),
  node({
    id: "tech.cloudflare_zt",
    type: "tech_choice",
    name: "Cloudflare Zero Trust",
    criticality: "high",
    architectureLevel: "domain",
    responsibilities: ["Gates app.quantpredict.ai (the admin app) — landing page on quantpredict.ai is public"],
    metadata: { category: "Edge auth", rationale: "Single-user admin gate without writing auth code", monthlyCost: "Free tier" }
  }),
  node({
    id: "tech.tailscale",
    type: "tech_choice",
    name: "Tailscale (Tailnet)",
    criticality: "critical",
    architectureLevel: "domain",
    responsibilities: ["Mesh VPN: Hetzner VPS can reach local Docker stack as if local"],
    metadata: { category: "Networking", rationale: "Avoids exposing local stack publicly while letting Hetzner Caddy proxy to it" }
  }),

  // ── Decisions (from ARCHITECTURE.md decision table) ───────────────────────
  node({
    id: "decision.hot_cold_data_split",
    type: "decision",
    name: "Redis for real-time, Postgres+TimescaleDB for metadata + history",
    criticality: "critical",
    metadata: { adrStatus: "Accepted" },
    notes: "Redis latency for sub-second reads; Postgres durability + indexability for queries by market/strategy/time. Source: CLAUDE.md 'Data Storage Strategy'."
  }),
  node({
    id: "decision.three_layer_pydantic",
    type: "decision",
    name: "Three-layer Pydantic split (DB / API response / App)",
    criticality: "high",
    metadata: { adrStatus: "Accepted — partial (schemas/ still flat)" },
    notes: "Designed in ARCHITECTURE_PROPOSAL.md; flat schemas/ today is acknowledged drift."
  }),
  node({
    id: "decision.polymarket_via_vpn",
    type: "decision",
    name: "Polymarket egress via polymarket-vpn proxy",
    criticality: "critical",
    metadata: { adrStatus: "Accepted" },
    notes: "Polymarket DNS-blocked at host level; all Polymarket-touching services set HTTP_PROXY=http://polymarket-vpn:8888 and join infravpn_default."
  }),
  node({
    id: "decision.immutable_migrations",
    type: "decision",
    name: "Immutable Alembic migrations (forward-only)",
    criticality: "high",
    metadata: { adrStatus: "Accepted" },
    notes: "Never edit/delete historic migrations; add new DROP/ALTER instead. Source: CLAUDE.md 'Migration Best Practices'."
  }),
  node({
    id: "decision.docker_only_backends",
    type: "decision",
    name: "All backends in Docker; local uvicorn forbidden",
    criticality: "medium",
    metadata: { adrStatus: "Accepted — enforced by PreToolUse hook" }
  }),
  node({
    id: "decision.polymarket_docs_mirror",
    type: "decision",
    name: "Mirror Polymarket docs locally + alarm on drift",
    criticality: "high",
    metadata: { adrStatus: "Accepted" },
    notes: "Hourly supercronic-driven sync into docs/external/polymarket/, LLM impact analysis, ntfy.sh push on relevant drift."
  }),

  // ── Risks ────────────────────────────────────────────────────────────────
  node({
    id: "risk.no_db_backup",
    type: "risk",
    name: "No automated TimescaleDB backup",
    criticality: "critical",
    metadata: { likelihood: "Certain — current state", impact: "Total loss of strategy state, position history, market metadata on disk failure", mitigation: "Add pg_basebackup-on-cron + restic-to-S3 + quarterly restore drill" }
  }),
  node({
    id: "risk.no_admin_auth",
    type: "risk",
    name: "Admin API has no in-app authentication",
    criticality: "high",
    metadata: { likelihood: "Mitigated by Cloudflare ZT + Tailnet", impact: "Anyone past Cloudflare ZT can execute mutating endpoints", mitigation: "Either keep relying on edge auth (acceptable single-user) or add per-route auth before any multi-user exposure" }
  }),
  node({
    id: "risk.single_host",
    type: "risk",
    name: "Local Dev is single point of failure for live trading",
    criticality: "critical",
    metadata: { likelihood: "Host outages happen", impact: "Trading + ingestion stop completely", mitigation: "TBD — move stack to Hetzner or accept the risk explicitly" }
  }),
  node({
    id: "risk.admin_monolith",
    type: "risk",
    name: "admin/main.py is a 3700-line single file with 41 routes",
    criticality: "medium",
    metadata: { likelihood: "Observed", impact: "Slow to navigate, easy to introduce conflicts during AI edits", mitigation: "Split into per-domain APIRouter modules" }
  }),

  // ── Quality scenarios + alerts + runbooks (placeholders — interview later) ─
  node({
    id: "quality.ingestion_freshness",
    type: "quality_scenario",
    name: "Ingestion freshness SLO",
    criticality: "critical",
    confidence: "inferred",
    metadata: { measurement: "Each ingestion worker writes a heartbeat key in Redis every N seconds; alert fires if older than threshold" }
  }),
  node({
    id: "alert.ingestion_gap",
    type: "alert",
    name: "Ingestion gap",
    criticality: "high",
    confidence: "inferred",
    metadata: { severity: "P2", triggerCondition: "Heartbeat key for any ingestion worker older than 2 min", notificationChannel: "ntfy.sh topic", runbookUrl: "runbook.ingestion_gap", owner: "Operator (sole)", onCallRotation: "24x7 (single operator)" }
  }),
  node({
    id: "alert.polymarket_docs_drift",
    type: "alert",
    name: "Polymarket docs drift",
    criticality: "medium",
    metadata: { severity: "P3", triggerCondition: "docs-sync detected meaningful change in docs.polymarket.com endpoints we depend on", notificationChannel: "ntfy.sh topic", runbookUrl: "runbook.docs_drift", owner: "Operator" }
  }),
  node({
    id: "alert.db_disk_full",
    type: "alert",
    name: "TimescaleDB disk near full",
    criticality: "critical",
    confidence: "inferred",
    metadata: { severity: "P1", triggerCondition: "PG volume > 80% full", notificationChannel: "ntfy.sh topic", runbookUrl: "runbook.db_disk", owner: "Operator" }
  }),
  node({
    id: "runbook.ingestion_gap",
    type: "runbook",
    name: "Runbook: ingestion gap",
    criticality: "high",
    confidence: "inferred",
    metadata: {
      whenToUse: "Heartbeat key missing for any ingestion worker",
      steps: ["docker logs quantflow_<service>_ingestion --tail 200", "Check polymarket-vpn reachability if it's a polymarket-related service", "docker compose restart <service>", "Confirm heartbeat resumes in Redis", "If repeats, file a Notion task with the logs"],
      relatedAlerts: ["alert.ingestion_gap"]
    }
  }),
  node({
    id: "runbook.docs_drift",
    type: "runbook",
    name: "Runbook: Polymarket docs drift",
    criticality: "medium",
    metadata: {
      whenToUse: "alert.polymarket_docs_drift fires",
      steps: ["Open the diff that docs-sync wrote in docs/external/polymarket/", "Read the LLM impact analysis comment", "Check the affected connector code in src/quantflow/connectors/polymarket*", "If the change impacts us, file a Notion task to update the connector + Polymarket-related code"],
      relatedAlerts: ["alert.polymarket_docs_drift"]
    }
  }),

  // ── Flows ────────────────────────────────────────────────────────────────
];

const edges: AtlasEdge[] = [
  // System decomposition
  edge("e.sys_contains_db", "system.quantflow", "container.db", "contains"),
  edge("e.sys_contains_redis", "system.quantflow", "container.redis", "contains"),
  edge("e.sys_contains_admin_api", "system.quantflow", "container.admin_api", "contains"),
  edge("e.sys_contains_admin_panel", "system.quantflow", "container.admin_panel", "contains"),
  edge("e.sys_contains_docs_sync", "system.quantflow", "container.docs_sync", "contains"),

  // Ingestion workers
  ...[
    "binance_spot_ingestion","binance_futures_ingestion","ohlcv_ingestion","deribit_options","polymarket_ingestion",
    "market_trades_ingestion","iv_greeks","hyperliquid_funding","polymarket_market_maker","queue_anchoring"
  ].map((s) => edge(`e.sys_contains_${s}`, "system.quantflow", `container.${s}`, "contains")),

  // Container → datastore reads/writes
  edge("e.binance_spot_writes_redis", "container.binance_spot_ingestion", "container.redis", "writes"),
  edge("e.binance_fut_writes_redis", "container.binance_futures_ingestion", "container.redis", "writes"),
  edge("e.deribit_writes_redis", "container.deribit_options", "container.redis", "writes"),
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
  edge("e.qa_writes_db", "container.queue_anchoring", "container.db", "writes"),
  edge("e.api_reads_db", "container.admin_api", "container.db", "reads"),
  edge("e.api_reads_redis", "container.admin_api", "container.redis", "reads"),
  edge("e.api_exposes", "container.admin_api", "api.admin", "exposes"),
  edge("e.panel_calls_api", "container.admin_panel", "api.admin", "calls", { protocol: "HTTP/JSON", interaction: "sync" }),

  // External egress via VPN
  edge("e.poly_via_vpn", "container.polymarket_ingestion", "container.polymarket_vpn", "depends_on", { description: "HTTP_PROXY env var" }),
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

  // Docs-sync notifications
  edge("e.docs_pushes_ntfy", "container.docs_sync", "external.ntfy", "calls"),

  // API contract → data entities (reads)
  edge("e.api_models_markets", "api.admin", "entity.polymarket_markets", "models"),
  edge("e.api_models_positions", "api.admin", "entity.polymarket_positions", "models"),
  edge("e.api_models_trades", "api.admin", "entity.polymarket_trades", "models"),
  edge("e.api_models_orders", "api.admin", "entity.polymarket_orders", "models"),
  edge("e.api_models_ohlcvs", "api.admin", "entity.ohlcvs", "models"),
  edge("e.api_models_strategy_targets", "api.admin", "entity.strategy_targets", "models"),
  edge("e.db_owns_polymarket_markets", "container.db", "entity.polymarket_markets", "owns"),
  edge("e.db_owns_polymarket_trades", "container.db", "entity.polymarket_trades", "owns"),
  edge("e.db_owns_market_trades", "container.db", "entity.market_trades", "owns"),
  edge("e.db_owns_ohlcvs", "container.db", "entity.ohlcvs", "owns"),
  edge("e.db_owns_strategy_targets", "container.db", "entity.strategy_targets", "owns"),

  // Frontend page
  edge("e.panel_contains_dashboard", "container.admin_panel", "page.admin_dashboard", "contains"),
  edge("e.dashboard_uses_api", "page.admin_dashboard", "api.admin", "depends_on"),

  // Tech choices applied to system + containers
  edge("e.sys_uses_python", "system.quantflow", "tech.python", "depends_on"),
  edge("e.api_uses_fastapi", "container.admin_api", "tech.fastapi", "depends_on"),
  edge("e.api_uses_sqlalchemy", "container.admin_api", "tech.sqlalchemy_async", "depends_on"),
  edge("e.db_uses_timescale", "container.db", "tech.timescaledb", "depends_on"),
  edge("e.redis_uses_redis", "container.redis", "tech.redis", "depends_on"),
  edge("e.connectors_use_ccxt", "module.connectors", "tech.ccxt", "depends_on"),
  edge("e.panel_uses_react", "container.admin_panel", "tech.react_vite", "depends_on"),
  edge("e.dashboard_uses_charts", "page.admin_dashboard", "tech.highcharts", "depends_on"),

  // Env vars
  edge("e.binance_uses_binance_keys", "container.binance_spot_ingestion", "env.binance_keys", "depends_on"),
  edge("e.poly_uses_poly_key", "container.polymarket_market_maker", "env.polymarket_key", "depends_on"),
  edge("e.qa_uses_poly_key", "container.queue_anchoring", "env.polymarket_key", "depends_on"),
  edge("e.api_uses_db_creds", "container.admin_api", "env.db_creds", "depends_on"),
  edge("e.poly_uses_proxy", "container.polymarket_ingestion", "env.polymarket_proxy", "depends_on"),
  edge("e.docs_uses_proxy", "container.docs_sync", "env.polymarket_proxy", "depends_on"),
  edge("e.docs_uses_ntfy", "container.docs_sync", "env.ntfy_topic", "depends_on"),

  // Modules
  edge("e.poly_uses_connectors", "container.polymarket_ingestion", "module.connectors", "depends_on"),
  edge("e.mm_uses_strategies", "container.polymarket_market_maker", "module.trading_strategies", "depends_on"),
  edge("e.qa_uses_strategies", "container.queue_anchoring", "module.trading_strategies", "depends_on"),
  edge("e.api_uses_models", "container.admin_api", "module.core_models", "depends_on"),
  edge("e.strategies_use_utils", "module.trading_strategies", "module.core_utils", "depends_on"),

  // Deployment
  edge("e.prod_contains_hetzner", "deploy.env_prod", "deploy.hetzner_vps", "contains"),
  edge("e.prod_contains_local", "deploy.env_prod", "deploy.local_dev_node", "contains"),
  edge("e.region_contains_hetzner", "deploy.region_eu", "deploy.hetzner_vps", "contains"),
  edge("e.local_deploys_sys", "system.quantflow", "deploy.local_dev_node", "deploys_to"),
  edge("e.hetzner_uses_caddy", "deploy.hetzner_vps", "tech.caddy", "depends_on"),
  edge("e.hetzner_uses_cf", "deploy.hetzner_vps", "tech.cloudflare_zt", "depends_on"),
  edge("e.hetzner_uses_tailscale", "deploy.hetzner_vps", "tech.tailscale", "depends_on"),
  edge("e.local_uses_tailscale", "deploy.local_dev_node", "tech.tailscale", "depends_on"),

  // Stakeholders + concerns
  edge("e.op_has_no_loss", "stakeholder.operator", "concern.no_silent_money_loss", "has_concern"),
  edge("e.op_has_freshness", "stakeholder.operator", "concern.data_freshness", "has_concern"),
  edge("e.op_has_poly_drift", "stakeholder.operator", "concern.polymarket_protocol_drift", "has_concern"),
  edge("e.decision_addresses_freshness", "decision.hot_cold_data_split", "concern.data_freshness", "addresses"),
  edge("e.decision_addresses_poly_drift", "decision.polymarket_docs_mirror", "concern.polymarket_protocol_drift", "addresses"),

  // Decisions
  edge("e.op_decides_hot_cold", "stakeholder.operator", "decision.hot_cold_data_split", "decides"),
  edge("e.op_decides_three_layer", "stakeholder.operator", "decision.three_layer_pydantic", "decides"),
  edge("e.op_decides_vpn", "stakeholder.operator", "decision.polymarket_via_vpn", "decides"),
  edge("e.op_decides_migrations", "stakeholder.operator", "decision.immutable_migrations", "decides"),
  edge("e.op_decides_docker", "stakeholder.operator", "decision.docker_only_backends", "decides"),
  edge("e.op_decides_docs_mirror", "stakeholder.operator", "decision.polymarket_docs_mirror", "decides"),

  // Risks
  edge("e.risk_backup_to_db", "risk.no_db_backup", "container.db", "risks"),
  edge("e.risk_auth_to_api", "risk.no_admin_auth", "container.admin_api", "risks"),
  edge("e.risk_single_host_to_local", "risk.single_host", "deploy.local_dev_node", "risks"),
  edge("e.risk_monolith_to_api", "risk.admin_monolith", "container.admin_api", "risks"),

  // Quality + alerts + runbooks
  edge("e.quality_traces_freshness", "quality.ingestion_freshness", "concern.data_freshness", "traces_to"),
  edge("e.alert_ingest_to_workers", "alert.ingestion_gap", "container.polymarket_ingestion", "risks"),
  edge("e.alert_drift_to_docs", "alert.polymarket_docs_drift", "container.docs_sync", "risks"),
  edge("e.alert_db_to_db", "alert.db_disk_full", "container.db", "risks"),
  edge("e.runbook_ingest_responds", "runbook.ingestion_gap", "alert.ingestion_gap", "mitigates"),
  edge("e.runbook_drift_responds", "runbook.docs_drift", "alert.polymarket_docs_drift", "mitigates")
];

const flows: AtlasFlow[] = [
  {
    id: "flow.polymarket_order_ingestion",
    name: "Polymarket order book ingestion → strategy decision",
    description: "Real-time Polymarket WS → Redis → strategy reads → order placement back through Polymarket.",
    owner: "architecture",
    criticality: "critical",
    steps: [
      { id: "s1", label: "polymarket-ingestion connects WS via polymarket-vpn:8888", nodeId: "container.polymarket_ingestion" },
      { id: "s2", label: "Order book updates written to Redis keys (see REDIS_SCHEMA.md)", nodeId: "container.redis" },
      { id: "s3", label: "queue-anchoring + market-maker read Redis, decide on quotes", nodeId: "container.queue_anchoring" },
      { id: "s4", label: "Quotes sent to Polymarket CLOB via polymarket-vpn", nodeId: "container.polymarket_vpn" },
      { id: "s5", label: "Trades persisted to TimescaleDB by market-trades-ingestion", nodeId: "container.market_trades_ingestion" }
    ],
    failureModes: ["WS disconnect → fresh-data alarm fires", "polymarket-vpn down → all egress fails", "DB write contention → trade audit gap"],
    acceptanceChecks: ["Heartbeat key < 60s old for each step", "Trade row written within 5s of fill"],
    linkedTests: [],
    notes: ""
  },
  {
    id: "flow.docs_drift_alarm",
    name: "Polymarket docs sync → drift alarm",
    description: "docs-sync mirrors Polymarket docs hourly, runs LLM impact analysis, pushes ntfy notification on meaningful drift.",
    owner: "architecture",
    criticality: "high",
    steps: [
      { id: "s1", label: "supercronic fires sync_polymarket_docs.py every hour", nodeId: "container.docs_sync" },
      { id: "s2", label: "Fetch docs.polymarket.com via polymarket-vpn", nodeId: "container.polymarket_vpn" },
      { id: "s3", label: "Diff against last mirror; if changed, write to docs/external/polymarket/", nodeId: "container.docs_sync" },
      { id: "s4", label: "LLM impact analysis against connector code", nodeId: "container.docs_sync" },
      { id: "s5", label: "Push to ntfy.sh topic", nodeId: "external.ntfy" }
    ],
    failureModes: ["polymarket-vpn down → silent failure if not also alarmed", "ntfy outage → notification lost"],
    acceptanceChecks: ["At least one sync run succeeds per 6h", "Drift in the connector-touching endpoints triggers a notification"],
    linkedTests: [],
    notes: ""
  },
  {
    id: "flow.public_request_path",
    name: "Public request → admin panel",
    description: "Browser → Cloudflare ZT → Hetzner Caddy → Tailnet → local Docker stack admin-panel + admin-api.",
    owner: "architecture",
    criticality: "high",
    steps: [
      { id: "s1", label: "User hits app.quantpredict.ai" },
      { id: "s2", label: "Cloudflare Zero Trust authenticates the user (single operator)", nodeId: "tech.cloudflare_zt" },
      { id: "s3", label: "Cloudflare routes to Hetzner VPS", nodeId: "deploy.hetzner_vps" },
      { id: "s4", label: "Caddy on Hetzner proxies to the local Docker admin-panel via Tailnet", nodeId: "tech.tailscale" },
      { id: "s5", label: "Admin panel renders; calls admin-api over the same Tailnet", nodeId: "container.admin_panel" },
      { id: "s6", label: "Admin API reads DB + Redis, returns JSON", nodeId: "container.admin_api" }
    ],
    failureModes: ["Local Dev node offline → entire app down", "Tailnet partition → 502 from Caddy"],
    acceptanceChecks: ["TLS valid via Caddy auto-cert", "Cloudflare ZT redirect works on first request"],
    linkedTests: [],
    notes: "Landing page on quantpredict.ai is public; only app.quantpredict.ai is behind ZT."
  }
];

// ── Layouts per view ────────────────────────────────────────────────────────
place("overview", "stakeholder.operator", 60, 60);
place("overview", "stakeholder.ai_agent", 60, 200);
place("overview", "concern.no_silent_money_loss", 60, 340);
place("overview", "concern.data_freshness", 60, 480);
place("overview", "concern.polymarket_protocol_drift", 60, 620);
place("overview", "system.quantflow", 400, 60);
place("overview", "container.admin_api", 400, 220);
place("overview", "container.admin_panel", 700, 220);
place("overview", "container.db", 400, 380);
place("overview", "container.redis", 700, 380);
place("overview", "external.binance", 1020, 80);
place("overview", "external.deribit", 1020, 200);
place("overview", "external.polymarket_clob", 1020, 320);
place("overview", "container.polymarket_vpn", 1020, 460);

place("containers", "container.db", 60, 80);
place("containers", "container.redis", 320, 80);
place("containers", "container.admin_api", 580, 80);
place("containers", "container.admin_panel", 840, 80);
place("containers", "api.admin", 580, 240);
place("containers", "container.binance_spot_ingestion", 60, 240);
place("containers", "container.binance_futures_ingestion", 320, 240);
place("containers", "container.deribit_options", 60, 400);
place("containers", "container.polymarket_ingestion", 320, 400);
place("containers", "container.market_trades_ingestion", 580, 400);
place("containers", "container.iv_greeks", 840, 400);
place("containers", "container.polymarket_market_maker", 60, 560);
place("containers", "container.queue_anchoring", 320, 560);
place("containers", "container.ohlcv_ingestion", 580, 560);
place("containers", "container.hyperliquid_funding", 840, 560);
place("containers", "container.docs_sync", 1100, 80);
place("containers", "container.polymarket_vpn", 1100, 240);

place("data", "container.db", 60, 80);
place("data", "container.redis", 360, 80);
place("data", "entity.polymarket_markets", 60, 240);
place("data", "entity.polymarket_tokens", 360, 240);
place("data", "entity.polymarket_positions", 660, 240);
place("data", "entity.polymarket_orders", 960, 240);
place("data", "entity.polymarket_trades", 60, 400);
place("data", "entity.market_trades", 360, 400);
place("data", "entity.ohlcvs", 660, 400);
place("data", "entity.strategy_targets", 960, 400);

place("deployment", "deploy.env_prod", 60, 80);
place("deployment", "deploy.region_eu", 360, 80);
place("deployment", "deploy.hetzner_vps", 660, 80);
place("deployment", "deploy.local_dev_node", 660, 240);
place("deployment", "env.binance_keys", 60, 240);
place("deployment", "env.polymarket_key", 60, 400);
place("deployment", "env.db_creds", 360, 240);
place("deployment", "env.ntfy_topic", 360, 400);
place("deployment", "env.polymarket_proxy", 660, 400);
place("deployment", "env.solana", 360, 560);

place("decisions", "decision.hot_cold_data_split", 60, 80);
place("decisions", "decision.three_layer_pydantic", 360, 80);
place("decisions", "decision.polymarket_via_vpn", 660, 80);
place("decisions", "decision.immutable_migrations", 60, 240);
place("decisions", "decision.docker_only_backends", 360, 240);
place("decisions", "decision.polymarket_docs_mirror", 660, 240);

place("health", "concern.no_silent_money_loss", 60, 80);
place("health", "concern.data_freshness", 60, 240);
place("health", "risk.no_db_backup", 360, 80);
place("health", "risk.no_admin_auth", 360, 240);
place("health", "risk.single_host", 360, 400);
place("health", "risk.admin_monolith", 360, 560);
place("health", "alert.ingestion_gap", 660, 80);
place("health", "alert.polymarket_docs_drift", 660, 240);
place("health", "alert.db_disk_full", 660, 400);
place("health", "runbook.ingestion_gap", 960, 80);
place("health", "runbook.docs_drift", 960, 240);
place("health", "quality.ingestion_freshness", 1260, 80);

place("concerns", "stakeholder.operator", 60, 80);
place("concerns", "stakeholder.ai_agent", 60, 240);
place("concerns", "concern.no_silent_money_loss", 360, 80);
place("concerns", "concern.data_freshness", 360, 240);
place("concerns", "concern.polymarket_protocol_drift", 360, 400);
place("concerns", "decision.hot_cold_data_split", 660, 240);
place("concerns", "decision.polymarket_docs_mirror", 660, 400);

place("domain", "tech.python", 60, 80);
place("domain", "tech.fastapi", 360, 80);
place("domain", "tech.sqlalchemy_async", 660, 80);
place("domain", "tech.timescaledb", 960, 80);
place("domain", "tech.redis", 60, 240);
place("domain", "tech.ccxt", 360, 240);
place("domain", "tech.react_vite", 660, 240);
place("domain", "tech.highcharts", 960, 240);
place("domain", "tech.caddy", 60, 400);
place("domain", "tech.cloudflare_zt", 360, 400);
place("domain", "tech.tailscale", 660, 400);

place("api_surface", "api.admin", 360, 120);
place("api_surface", "container.admin_panel", 60, 120);
place("api_surface", "container.admin_api", 660, 120);
place("api_surface", "page.admin_dashboard", 60, 280);

place("security", "tech.cloudflare_zt", 60, 80);
place("security", "tech.tailscale", 360, 80);
place("security", "container.admin_api", 660, 80);
place("security", "risk.no_admin_auth", 660, 240);

const views = defaultViews().map((view) => ({
  ...view,
  positions: layoutsByView[view.id] ?? {}
}));

const project: AtlasProject = {
  manifest: {
    schemaVersion: 1,
    name: "QuantFlow",
    description: "Automated trading + money management for crypto derivatives and prediction markets. Skeleton atlas built via the /build-atlas skill — extend by editing scripts/build-quantflow-atlas.ts and re-running.",
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
