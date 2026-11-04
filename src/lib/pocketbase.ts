import type {
  CollectionName,
  CollectionRecord,
  CollectionWriteData,
} from "@/types/pocketbase";

const POCKETBASE_URL = process.env.NEXT_PUBLIC_POCKETBASE_URL?.replace(/\/$/, "");

export interface PocketBaseList<T> {
  page: number;
  perPage: number;
  totalItems: number;
  totalPages: number;
  items: T[];
}

export interface PocketBaseRequestOptions {
  token?: string;
  signal?: AbortSignal;
}

export interface PocketBaseListOptions extends PocketBaseRequestOptions {
  page?: number;
  perPage?: number;
  sort?: string;
  filter?: string;
  expand?: string;
}

export interface PocketBaseErrorBody {
  message?: string;
  data?: Record<string, { message?: string; code?: string }>;
}

export class PocketBaseRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly data: PocketBaseErrorBody["data"] = {},
  ) {
    super(message);
    this.name = "PocketBaseRequestError";
  }
}

interface PocketBaseRealtimeConnectEvent {
  lastEventId: string;
}

export function subscribeToTicketChanges(token: string, onChange: () => void): () => void {
  const source = new EventSource(`${getPocketBaseUrl()}/api/realtime`);
  let active = true;

  source.addEventListener("PB_CONNECT", (event) => {
    if (!active) return;
    const { lastEventId: clientId } = event as MessageEvent<string> & PocketBaseRealtimeConnectEvent;
    if (!clientId) return;
    void fetch(`${getPocketBaseUrl()}/api/realtime`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ clientId, subscriptions: ["tickets/*"] }),
    }).catch(() => {
      // EventSource reconnects automatically; a later PB_CONNECT retries subscription.
    });
  });
  source.addEventListener("tickets/*", () => {
    if (active) onChange();
  });

  return () => {
    active = false;
    source.close();
  };
}

function getPocketBaseUrl(): string {
  if (!POCKETBASE_URL) {
    throw new Error("Brakuje zmiennej NEXT_PUBLIC_POCKETBASE_URL.");
  }

  return POCKETBASE_URL;
}

function isFile(value: unknown): value is File {
  return typeof File !== "undefined" && value instanceof File;
}

function isFormData(value: BodyInit): value is FormData {
  return typeof FormData !== "undefined" && value instanceof FormData;
}

function toRequestBody(data: object): BodyInit {
  const entries = Object.entries(data);
  const hasFile = entries.some(([, value]) =>
    Array.isArray(value)
      ? value.some(isFile)
      : isFile(value),
  );

  if (!hasFile) {
    return JSON.stringify(data);
  }

  const formData = new FormData();
  for (const [key, value] of entries) {
    if (value === undefined) continue;

    if (isFile(value)) {
      formData.append(key, value);
    } else if (Array.isArray(value) && value.some(isFile)) {
      for (const item of value) {
        if (isFile(item)) formData.append(key, item);
        else if (typeof item === "string") formData.append(key, item);
      }
    } else if (typeof value === "string") {
      formData.append(key, value);
    } else {
      formData.append(key, JSON.stringify(value));
    }
  }

  return formData;
}

export async function pocketbaseRequest<T>(
  path: string,
  options: PocketBaseRequestOptions & {
    method?: "GET" | "POST" | "PATCH" | "DELETE";
    body?: object;
  } = {},
): Promise<T> {
  const { token, signal, method = "GET", body } = options;
  const headers = new Headers({ Accept: "application/json" });
  if (token) headers.set("Authorization", token);

  let requestBody: BodyInit | undefined;
  if (body) {
    requestBody = toRequestBody(body);
    if (isFormData(requestBody)) {
      // The browser must add the multipart boundary itself.
    } else {
      headers.set("Content-Type", "application/json");
    }
  }

  const response = await fetch(`${getPocketBaseUrl()}${path}`, {
    method,
    headers,
    body: requestBody,
    signal,
    cache: "no-store",
  });

  if (!response.ok) {
    const error = (await response.json().catch(() => ({}))) as PocketBaseErrorBody;
    throw new PocketBaseRequestError(
      error.message ?? `PocketBase zwrócił błąd ${response.status}.`,
      response.status,
      error.data,
    );
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export function listRecords<Name extends CollectionName>(
  collection: Name,
  options: PocketBaseListOptions = {},
): Promise<PocketBaseList<CollectionRecord<Name>>> {
  const params = new URLSearchParams();
  if (options.page !== undefined) params.set("page", String(options.page));
  if (options.perPage !== undefined) params.set("perPage", String(options.perPage));
  if (options.sort) params.set("sort", options.sort);
  if (options.filter) params.set("filter", options.filter);
  if (options.expand) params.set("expand", options.expand);

  const query = params.size ? `?${params.toString()}` : "";
  return pocketbaseRequest(`/api/collections/${collection}/records${query}`, options);
}

export function getRecord<Name extends CollectionName>(
  collection: Name,
  id: string,
  options: PocketBaseRequestOptions = {},
): Promise<CollectionRecord<Name>> {
  return pocketbaseRequest(
    `/api/collections/${collection}/records/${encodeURIComponent(id)}`,
    options,
  );
}

export function createRecord<Name extends CollectionName>(
  collection: Name,
  data: CollectionWriteData<Name>,
  options: PocketBaseRequestOptions = {},
): Promise<CollectionRecord<Name>> {
  return pocketbaseRequest(`/api/collections/${collection}/records`, {
    ...options,
    method: "POST",
    body: data,
  });
}

export function updateRecord<Name extends CollectionName>(
  collection: Name,
  id: string,
  data: CollectionWriteData<Name>,
  options: PocketBaseRequestOptions = {},
): Promise<CollectionRecord<Name>> {
  return pocketbaseRequest(
    `/api/collections/${collection}/records/${encodeURIComponent(id)}`,
    { ...options, method: "PATCH", body: data },
  );
}

export function deleteRecord(
  collection: CollectionName,
  id: string,
  options: PocketBaseRequestOptions = {},
): Promise<void> {
  return pocketbaseRequest(
    `/api/collections/${collection}/records/${encodeURIComponent(id)}`,
    { ...options, method: "DELETE" },
  );
}
