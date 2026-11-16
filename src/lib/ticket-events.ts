import {
  createRecord,
  listRecords,
  type PocketBaseList,
  type PocketBaseListOptions,
  type PocketBaseRequestOptions,
} from "@/lib/pocketbase";
import type {
  TicketEventRecord,
  TicketEventWriteData,
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
    expand: options.expand ?? "editor_id",
    filter: conditions.length ? conditions.join(" && ") : undefined,
  });
}

export function createTicketEvent(
  data: TicketEventWriteData,
  options?: PocketBaseRequestOptions,
): Promise<TicketEventRecord> {
  return createRecord("ticket_events", data, options);
}
