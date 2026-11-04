import {
  createRecord,
  getRecord,
  listRecords,
  updateRecord,
  type PocketBaseList,
  type PocketBaseListOptions,
  type PocketBaseRequestOptions,
} from "@/lib/pocketbase";
import type {
  CreateTicketEventData,
  TicketEventRecord,
  UpdateTicketEventData,
} from "@/types/pocketbase";

export interface ListTicketEventsOptions extends PocketBaseListOptions {
  ticketId?: string;
}

export function listTicketEvents({
  ticketId,
  filter,
  ...options
}: ListTicketEventsOptions = {}): Promise<PocketBaseList<TicketEventRecord>> {
  const conditions = [
    ticketId && `relation = ${JSON.stringify(ticketId)}`,
    filter,
  ].filter((condition): condition is string => Boolean(condition));

  return listRecords("ticket_events", {
    ...options,
    filter: conditions.length ? conditions.join(" && ") : undefined,
  });
}

export function getTicketEvent(
  id: string,
  options?: PocketBaseRequestOptions,
): Promise<TicketEventRecord> {
  return getRecord("ticket_events", id, options);
}

export function createTicketEvent(
  data: CreateTicketEventData,
  options?: PocketBaseRequestOptions,
): Promise<TicketEventRecord> {
  return createRecord("ticket_events", data, options);
}

export function updateTicketEvent(
  id: string,
  data: UpdateTicketEventData,
  options?: PocketBaseRequestOptions,
): Promise<TicketEventRecord> {
  return updateRecord("ticket_events", id, data, options);
}
