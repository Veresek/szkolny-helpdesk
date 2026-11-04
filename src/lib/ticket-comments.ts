import { createRecord, listRecords, type PocketBaseListOptions } from "@/lib/pocketbase";
import type { PocketBaseList, TicketCommentRecord, TicketCommentWriteData } from "@/types/pocketbase";

export function listTicketComments(ticketId: string, options: PocketBaseListOptions = {}): Promise<PocketBaseList<TicketCommentRecord>> {
  return listRecords("ticket_comments", {
    ...options,
    filter: `ticket_id = ${JSON.stringify(ticketId)}`,
    sort: options.sort ?? "created",
    expand: "commenter_id",
  });
}

export function createTicketComment(data: TicketCommentWriteData, options: PocketBaseListOptions = {}): Promise<TicketCommentRecord> {
  return createRecord("ticket_comments", data, options);
}
