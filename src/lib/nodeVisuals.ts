import {
  Boxes,
  CalendarClock,
  Cloud,
  Database,
  DatabaseBackup,
  FileCode2,
  HardDrive,
  Monitor,
  Network,
  Router,
  ScrollText,
  Server,
  ShieldAlert,
  UserRound,
  Workflow
} from "lucide-react";
import type { ComponentType } from "react";
import { AtlasNode } from "../types";

type NodeIcon = ComponentType<{ size?: number; strokeWidth?: number }>;

export const nodeColors: Record<AtlasNode["type"], string> = {
  system: "#0f172a",
  container: "#1d4ed8",
  component: "#7c3aed",
  code_symbol: "#475569",
  actor: "#f97316",
  app: "#2563eb",
  service: "#0f766e",
  module: "#7c3aed",
  worker: "#059669",
  scheduler: "#ca8a04",
  load_balancer: "#dc2626",
  datastore: "#374151",
  replica: "#6b7280",
  queue: "#0891b2",
  cache: "#65a30d",
  external_system: "#be123c",
  file_group: "#4b5563",
  contract: "#9333ea",
  api_contract: "#9333ea",
  event_contract: "#0e7490",
  deployment_node: "#0369a1",
  environment: "#16a34a",
  region: "#0284c7",
  data_entity: "#4338ca",
  schema: "#4f46e5",
  migration: "#92400e",
  decision: "#a16207",
  quality_scenario: "#0f766e",
  threat: "#b91c1c",
  team: "#ea580c",
  flow: "#0284c7",
  risk: "#e11d48"
};

export const nodeIcons: Record<AtlasNode["type"], NodeIcon> = {
  system: Network,
  container: Server,
  component: Boxes,
  code_symbol: FileCode2,
  actor: UserRound,
  app: Monitor,
  service: Server,
  module: Boxes,
  worker: Server,
  scheduler: CalendarClock,
  load_balancer: Router,
  datastore: Database,
  replica: DatabaseBackup,
  queue: Network,
  cache: HardDrive,
  external_system: Cloud,
  file_group: FileCode2,
  contract: ScrollText,
  api_contract: ScrollText,
  event_contract: Network,
  deployment_node: Server,
  environment: Cloud,
  region: Router,
  data_entity: Database,
  schema: Database,
  migration: DatabaseBackup,
  decision: ScrollText,
  quality_scenario: ShieldAlert,
  threat: ShieldAlert,
  team: UserRound,
  flow: Workflow,
  risk: ShieldAlert
};

export function prettyType(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
