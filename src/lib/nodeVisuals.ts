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
  flow: "#0284c7",
  risk: "#e11d48"
};

export const nodeIcons: Record<AtlasNode["type"], NodeIcon> = {
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
  flow: Workflow,
  risk: ShieldAlert
};

export function prettyType(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

