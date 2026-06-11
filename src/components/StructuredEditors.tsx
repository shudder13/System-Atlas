import { useState } from "react";
import { AtlasNode, AtlasProject, MetadataValue } from "../types";

export function StructuredNodeEditor({
  project,
  node,
  onChange
}: {
  project: AtlasProject;
  node: AtlasNode;
  onChange: (patch: Partial<AtlasNode>) => void;
}) {
  if (["api_contract", "contract"].includes(node.type)) {
    return <ApiContractEditor node={node} onChange={onChange} />;
  }

  if (["schema", "data_entity"].includes(node.type)) {
    return <SchemaEditor project={project} node={node} onChange={onChange} />;
  }

  return null;
}

export function structuredMetadataKeysForNode(type: AtlasNode["type"]) {
  if (["api_contract", "contract"].includes(type)) {
    return new Set(["routeMethod", "routePath", "statusCodes", "requestBody", "responseBody", "handlerFile", "endpoints"]);
  }

  if (["schema", "data_entity"].includes(type)) {
    // Must list exactly what SchemaEditor renders: a key hidden here but not
    // rendered there (accessPatterns, previously) is unreachable in the UI.
    return new Set(["databaseEngine", "schemaName", "entityName", "tables", "columns", "primaryKeys", "indexes", "foreignKeys", "constraints", "relations", "migrationPolicy"]);
  }

  return new Set<string>();
}

function ApiContractEditor({ node, onChange }: { node: AtlasNode; onChange: (patch: Partial<AtlasNode>) => void }) {
  const metadata = node.metadata ?? {};
  const endpoints = parseEndpoints(listValue(metadata.endpoints));

  function updateMetadata(patch: Record<string, MetadataValue>) {
    onChange({ metadata: cleanMetadata({ ...metadata, ...patch }) });
  }

  function updateEndpoint(index: number, patch: Partial<ApiEndpointRow>) {
    const next = endpoints.map((endpoint, itemIndex) => itemIndex === index ? { ...endpoint, ...patch } : endpoint);
    updateMetadata({ endpoints: next.map(formatEndpoint) });
  }

  function addEndpoint() {
    const method = stringValue(metadata.routeMethod) || "GET";
    const path = stringValue(metadata.routePath) || "/";
    updateMetadata({ endpoints: [...endpoints, { method, path, auth: stringValue(metadata.auth), request: "", response: "", status: "200", handler: stringValue(metadata.handlerFile), tests: "" }].map(formatEndpoint) });
  }

  function removeEndpoint(index: number) {
    updateMetadata({ endpoints: endpoints.filter((_, itemIndex) => itemIndex !== index).map(formatEndpoint) });
  }

  return (
    <section className="structured-editor">
      <div className="section-heading">
        <h3>API Contract</h3>
        <span>{endpoints.length} endpoints</span>
      </div>
      <div className="structured-grid">
        <label className="field">Method
          <select value={stringValue(metadata.routeMethod)} onChange={(event) => updateMetadata({ routeMethod: event.target.value })}>
            <option value="">Unset</option>
            {["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"].map((method) => <option key={method} value={method}>{method}</option>)}
          </select>
        </label>
        <label className="field">Path
          <input value={stringValue(metadata.routePath)} placeholder="/resource/:id" onChange={(event) => updateMetadata({ routePath: event.target.value })} />
        </label>
        <label className="field">Handler
          <input value={stringValue(metadata.handlerFile) || stringValue(metadata.sourceFile)} placeholder="src/server/routes.ts" onChange={(event) => updateMetadata({ handlerFile: event.target.value })} />
        </label>
        <label className="field">Status codes
          <input value={listValue(metadata.statusCodes).join(", ")} placeholder="200, 400, 401" onChange={(event) => updateMetadata({ statusCodes: splitCommaList(event.target.value) })} />
        </label>
      </div>
      <label className="field">Request body / params
        <textarea rows={3} value={stringValue(metadata.requestBody)} placeholder="DTO, schema, command, query params, or payload shape" onChange={(event) => updateMetadata({ requestBody: event.target.value })} />
      </label>
      <label className="field">Response body
        <textarea rows={3} value={stringValue(metadata.responseBody)} placeholder="DTO, schema, event, or payload shape" onChange={(event) => updateMetadata({ responseBody: event.target.value })} />
      </label>
      <div className="section-heading">
        <h3>Endpoint List</h3>
        <button type="button" className="compact" onClick={addEndpoint}>Add Endpoint</button>
      </div>
      {endpoints.length ? endpoints.map((endpoint, index) => (
        <div className="structured-row api-endpoint-row" key={`${endpoint.method}-${endpoint.path}-${index}`}>
          <label className="field">Method
            <select value={endpoint.method} onChange={(event) => updateEndpoint(index, { method: event.target.value })}>
              {["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"].map((method) => <option key={method} value={method}>{method}</option>)}
            </select>
          </label>
          <label className="field">Path
            <input value={endpoint.path} onChange={(event) => updateEndpoint(index, { path: event.target.value })} />
          </label>
          <label className="field">Auth
            <input value={endpoint.auth} placeholder="jwt, session, api key" onChange={(event) => updateEndpoint(index, { auth: event.target.value })} />
          </label>
          <label className="field">Status
            <input value={endpoint.status} placeholder="200, 401" onChange={(event) => updateEndpoint(index, { status: event.target.value })} />
          </label>
          <label className="field">Request
            <input value={endpoint.request} placeholder="CreateOrderRequest" onChange={(event) => updateEndpoint(index, { request: event.target.value })} />
          </label>
          <label className="field">Response
            <input value={endpoint.response} placeholder="OrderResponse" onChange={(event) => updateEndpoint(index, { response: event.target.value })} />
          </label>
          <label className="field">Handler
            <input value={endpoint.handler} placeholder="src/api/orders.ts" onChange={(event) => updateEndpoint(index, { handler: event.target.value })} />
          </label>
          <label className="field">Tests
            <input value={endpoint.tests} placeholder="tests/orders.test.ts" onChange={(event) => updateEndpoint(index, { tests: event.target.value })} />
          </label>
          <button type="button" className="danger compact" onClick={() => removeEndpoint(index)}>Remove</button>
        </div>
      )) : <p className="muted">No structured endpoints yet. Add endpoints for multi-route contracts, or fill the single route fields above.</p>}
    </section>
  );
}

function SchemaEditor({ project, node, onChange }: { project: AtlasProject; node: AtlasNode; onChange: (patch: Partial<AtlasNode>) => void }) {
  const metadata = node.metadata ?? {};
  const columns = parseColumns(listValue(metadata.columns));
  const relations = parseRelations(listValue(metadata.relations));
  const dataTargets = project.nodes.filter((item) => ["datastore", "replica", "schema", "data_entity"].includes(item.type) && item.id !== node.id);

  function updateMetadata(patch: Record<string, MetadataValue>) {
    onChange({ metadata: cleanMetadata({ ...metadata, ...patch }) });
  }

  function updateColumn(index: number, patch: Partial<SchemaColumnRow>) {
    updateMetadata({ columns: columns.map((column, itemIndex) => itemIndex === index ? { ...column, ...patch } : column).map(formatColumn) });
  }

  function updateRelation(index: number, patch: Partial<SchemaRelationRow>) {
    updateMetadata({ relations: relations.map((relation, itemIndex) => itemIndex === index ? { ...relation, ...patch } : relation).map(formatRelation) });
  }

  function addColumn() {
    updateMetadata({ columns: [...columns, { name: "", type: "", nullable: "not null", key: "", defaultValue: "", notes: "" }].map(formatColumn) });
  }

  function addRelation() {
    updateMetadata({ relations: [...relations, { from: node.name, to: dataTargets[0]?.name ?? "", cardinality: "many-to-one", onDelete: "", notes: "" }].map(formatRelation) });
  }

  return (
    <section className="structured-editor">
      <div className="section-heading">
        <h3>Schema Model</h3>
        <span>{columns.length} columns · {relations.length} relations</span>
      </div>
      <div className="structured-grid">
        <label className="field">Engine
          <input value={stringValue(metadata.databaseEngine)} placeholder="Postgres, MySQL, MongoDB" onChange={(event) => updateMetadata({ databaseEngine: event.target.value })} />
        </label>
        <label className="field">{node.type === "schema" ? "Schema name" : "Entity/table name"}
          <input
            value={stringValue(node.type === "schema" ? metadata.schemaName : metadata.entityName)}
            placeholder={node.type === "schema" ? "public" : "orders"}
            onChange={(event) => updateMetadata(node.type === "schema" ? { schemaName: event.target.value } : { entityName: event.target.value })}
          />
        </label>
        <label className="field">Primary keys
          <input value={listValue(metadata.primaryKeys).join(", ")} placeholder="id, tenant_id" onChange={(event) => updateMetadata({ primaryKeys: splitCommaList(event.target.value) })} />
        </label>
        <label className="field">Migration policy
          <input value={stringValue(metadata.migrationPolicy)} placeholder="expand-contract, backfill, rollback plan" onChange={(event) => updateMetadata({ migrationPolicy: event.target.value })} />
        </label>
      </div>

      <div className="section-heading">
        <h3>Columns / Fields</h3>
        <button type="button" className="compact" onClick={addColumn}>Add Column</button>
      </div>
      {columns.length ? columns.map((column, index) => (
        <div className="structured-row schema-column-row" key={`${column.name}-${index}`}>
          <label className="field">Name
            <input value={column.name} onChange={(event) => updateColumn(index, { name: event.target.value })} />
          </label>
          <label className="field">Type
            <input value={column.type} placeholder="uuid, text, timestamptz" onChange={(event) => updateColumn(index, { type: event.target.value })} />
          </label>
          <label className="field">Nullability
            <select value={column.nullable} onChange={(event) => updateColumn(index, { nullable: event.target.value })}>
              <option value="">Unset</option>
              <option value="not null">Not null</option>
              <option value="nullable">Nullable</option>
            </select>
          </label>
          <label className="field">Key
            <select value={column.key} onChange={(event) => updateColumn(index, { key: event.target.value })}>
              <option value="">None</option>
              <option value="pk">PK</option>
              <option value="fk">FK</option>
              <option value="unique">Unique</option>
              <option value="indexed">Indexed</option>
            </select>
          </label>
          <label className="field">Default
            <input value={column.defaultValue} placeholder="now(), gen_random_uuid()" onChange={(event) => updateColumn(index, { defaultValue: event.target.value })} />
          </label>
          <label className="field">Notes
            <input value={column.notes} placeholder="PII, immutable, derived" onChange={(event) => updateColumn(index, { notes: event.target.value })} />
          </label>
          <button type="button" className="danger compact" onClick={() => updateMetadata({ columns: columns.filter((_, itemIndex) => itemIndex !== index).map(formatColumn) })}>Remove</button>
        </div>
      )) : <p className="muted">No columns modeled yet. Add the fields an architect or AI agent must know before changing this schema.</p>}

      <CompactListEditor label="Indexes" values={listValue(metadata.indexes)} placeholder="orders_customer_id_idx" onChange={(values) => updateMetadata({ indexes: values })} />
      <CompactListEditor label="Constraints" values={listValue(metadata.constraints)} placeholder="unique tenant_id + external_id" onChange={(values) => updateMetadata({ constraints: values })} />
      <CompactListEditor label="Foreign keys" values={listValue(metadata.foreignKeys)} placeholder="orders.customer_id -> customers.id on delete restrict" onChange={(values) => updateMetadata({ foreignKeys: values })} />

      <div className="section-heading">
        <h3>Relations</h3>
        <button type="button" className="compact" onClick={addRelation}>Add Relation</button>
      </div>
      {relations.length ? relations.map((relation, index) => (
        <div className="structured-row schema-relation-row" key={`${relation.from}-${relation.to}-${index}`}>
          <label className="field">From
            <input value={relation.from} onChange={(event) => updateRelation(index, { from: event.target.value })} />
          </label>
          <label className="field">To
            <input value={relation.to} list="schema-targets" onChange={(event) => updateRelation(index, { to: event.target.value })} />
          </label>
          <label className="field">Cardinality
            <select value={relation.cardinality} onChange={(event) => updateRelation(index, { cardinality: event.target.value })}>
              <option value="">Unset</option>
              <option value="one-to-one">One to one</option>
              <option value="one-to-many">One to many</option>
              <option value="many-to-one">Many to one</option>
              <option value="many-to-many">Many to many</option>
            </select>
          </label>
          <label className="field">On delete
            <input value={relation.onDelete} placeholder="cascade, restrict, set null" onChange={(event) => updateRelation(index, { onDelete: event.target.value })} />
          </label>
          <label className="field">Notes
            <input value={relation.notes} onChange={(event) => updateRelation(index, { notes: event.target.value })} />
          </label>
          <button type="button" className="danger compact" onClick={() => updateMetadata({ relations: relations.filter((_, itemIndex) => itemIndex !== index).map(formatRelation) })}>Remove</button>
        </div>
      )) : <p className="muted">No relations modeled yet.</p>}
      <datalist id="schema-targets">
        {dataTargets.map((target) => <option key={target.id} value={target.name} />)}
      </datalist>
    </section>
  );
}

function CompactListEditor({ label, values, placeholder, onChange }: { label: string; values: string[]; placeholder: string; onChange: (values: string[]) => void }) {
  const [draft, setDraft] = useState("");

  return (
    <div className="compact-list-editor">
      <div className="section-heading">
        <h3>{label}</h3>
        <span>{values.length}</span>
      </div>
      <div className="compact-list-input">
        <input value={draft} placeholder={placeholder} onChange={(event) => setDraft(event.target.value)} />
        <button
          type="button"
          className="compact"
          disabled={!draft.trim()}
          onClick={() => {
            onChange([...values, draft.trim()]);
            setDraft("");
          }}
        >
          Add
        </button>
      </div>
      {values.length ? (
        <div className="chip-list">
          {values.map((value) => (
            <span className="chip" key={value}>
              {value}
              <button type="button" onClick={() => onChange(values.filter((item) => item !== value))}>Remove</button>
            </span>
          ))}
        </div>
      ) : <p className="muted">None recorded.</p>}
    </div>
  );
}

type ApiEndpointRow = {
  method: string;
  path: string;
  auth: string;
  request: string;
  response: string;
  status: string;
  handler: string;
  tests: string;
};

type SchemaColumnRow = {
  name: string;
  type: string;
  nullable: string;
  key: string;
  defaultValue: string;
  notes: string;
};

type SchemaRelationRow = {
  from: string;
  to: string;
  cardinality: string;
  onDelete: string;
  notes: string;
};

function stringValue(value: MetadataValue) {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

function listValue(value: MetadataValue) {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string" && value.trim()) return [value];
  return [];
}

function splitCommaList(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function cleanMetadata(metadata: Record<string, MetadataValue>) {
  const next: Record<string, MetadataValue> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (value === undefined || value === "") continue;
    if (Array.isArray(value) && value.length === 0) continue;
    next[key] = value;
  }
  return next;
}

function parseEndpoints(rows: string[]): ApiEndpointRow[] {
  return rows.map((row) => {
    const parts = splitStructured(row, 8);
    return {
      method: parts[0] || "GET",
      path: parts[1] || "/",
      auth: parts[2],
      request: parts[3],
      response: parts[4],
      status: parts[5],
      handler: parts[6],
      tests: parts[7]
    };
  });
}

function formatEndpoint(row: ApiEndpointRow) {
  return [row.method, row.path, row.auth, row.request, row.response, row.status, row.handler, row.tests].map(cleanStructuredPart).join(" | ");
}

function parseColumns(rows: string[]): SchemaColumnRow[] {
  return rows.map((row) => {
    const parts = splitStructured(row, 6);
    return {
      name: parts[0],
      type: parts[1],
      nullable: parts[2],
      key: parts[3],
      defaultValue: parts[4],
      notes: parts[5]
    };
  });
}

function formatColumn(row: SchemaColumnRow) {
  return [row.name, row.type, row.nullable, row.key, row.defaultValue, row.notes].map(cleanStructuredPart).join(" | ");
}

function parseRelations(rows: string[]): SchemaRelationRow[] {
  return rows.map((row) => {
    const parts = splitStructured(row, 5);
    return {
      from: parts[0],
      to: parts[1],
      cardinality: parts[2],
      onDelete: parts[3],
      notes: parts[4]
    };
  });
}

function formatRelation(row: SchemaRelationRow) {
  return [row.from, row.to, row.cardinality, row.onDelete, row.notes].map(cleanStructuredPart).join(" | ");
}

function splitStructured(value: string, length: number) {
  const parts = value.split("|").map((item) => item.trim());
  while (parts.length < length) parts.push("");
  return parts.slice(0, length);
}

function cleanStructuredPart(value: string) {
  return value.replace(/\s*\|\s*/g, " / ").trim();
}
