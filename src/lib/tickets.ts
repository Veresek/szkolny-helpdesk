import {
  createRecord,
  deleteRecord,
  getRecord,
  listRecords,
  updateRecord,
  type PocketBaseList,
  type PocketBaseListOptions,
  type PocketBaseRequestOptions,
} from "@/lib/pocketbase";
import type {
  CreateTicketData,
  RoomValue,
  TicketPriority,
  TicketRecord,
  TicketStatus,
  UpdateTicketData,
} from "@/types/pocketbase";

export interface TicketFilters {
  status?: TicketStatus;
  room?: RoomValue;
  priority?: TicketPriority;
}

export interface ListTicketsOptions extends PocketBaseListOptions {
  filters?: TicketFilters;
}

export function listTickets({ filters, filter, ...options }: ListTicketsOptions = {}): Promise<PocketBaseList<TicketRecord>> {
  const conditions = [
    filters?.status && `status = ${JSON.stringify(filters.status)}`,
    filters?.room && `room = ${JSON.stringify(filters.room)}`,
    filters?.priority && `priority = ${JSON.stringify(filters.priority)}`,
    filter,
  ].filter((condition): condition is string => Boolean(condition));

  return listRecords("tickets", {
    ...options,
    filter: conditions.length ? conditions.join(" && ") : undefined,
  });
}

export function getTicket(
  id: string,
  options?: PocketBaseRequestOptions,
): Promise<TicketRecord> {
  return getRecord("tickets", id, options);
}

export function createTicket(
  data: CreateTicketData,
  options?: PocketBaseRequestOptions,
): Promise<TicketRecord> {
  return createRecord("tickets", data, options);
}

export function updateTicket(
  id: string,
  data: UpdateTicketData,
  options?: PocketBaseRequestOptions,
): Promise<TicketRecord> {
  return updateRecord("tickets", id, data, options);
}

export function deleteTicket(
  id: string,
  options?: PocketBaseRequestOptions,
): Promise<void> {
  return deleteRecord("tickets", id, options);
}

