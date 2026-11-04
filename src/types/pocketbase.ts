/** Types matching the PocketBase collections deployed on the VPS. */

export type RecordId = string;

/** PocketBase auth record returned by the deployed `users` collection. */
export interface UserRecord {
  id: RecordId;
  created: string;
  updated: string;
  email: string;
  emailVisibility: boolean;
  verified: boolean;
  role: string;
  avatar: string;
}

export interface RegisterUserData {
  email: string;
  password: string;
  passwordConfirm: string;
  role: "uzytkownik";
}

export interface PocketBaseAuthResponse {
  token: string;
  record: UserRecord;
}

/** Common fields present on PocketBase records with automatic timestamps. */
export interface PocketBaseRecord {
  id: RecordId;
  created: string;
  updated: string;
}

export const TICKET_CATEGORIES = [
  "sprzęt komputerowy",
  "multimedia",
  "instalacje",
  "inne",
] as const;
export type TicketCategory = (typeof TICKET_CATEGORIES)[number];

export const TICKET_PRIORITIES = ["niski", "średni", "wysoki"] as const;
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];

export const TICKET_STATUSES = ["nowe", "w realizacji", "zamknięte"] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

/** `room` is currently a select field, not a relation to a rooms collection. */
export type RoomValue = "1" | "2" | "3" | "4" | "5";

/** PocketBase returns a file field as an array of stored file names. */
export type PocketBaseFileInput = File | File[] | string | string[];

/**
 * Current `tickets` record. All custom fields are optional in the database,
 * so an unset select/relation-like value is represented by an empty string.
 */
export interface TicketRecord extends PocketBaseRecord {
  title: string;
  description: string;
  room: RoomValue | "";
  category: TicketCategory | "";
  priority: TicketPriority | "";
  status: TicketStatus | "";
  comment: string;
  photo: string[];
}

/** Writable fields match the current PocketBase `tickets` collection. */
export interface TicketWriteData {
  title?: string;
  description?: string;
  room?: RoomValue | "";
  category?: TicketCategory | "";
  priority?: TicketPriority | "";
  status?: TicketStatus | "";
  comment?: string;
  photo?: PocketBaseFileInput;
}

export type CreateTicketData = TicketWriteData;
export type UpdateTicketData = TicketWriteData;

/**
 * Status history records use editor_id and relation as user/ticket relations.
 */
export interface TicketEventRecord {
  id: RecordId;
  created: string;
  editor_id: string;
  relation: RecordId | "";
  old_status: TicketStatus | "";
  new_status: TicketStatus | "";
  expand?: { editor_id?: UserRecord };
}

export interface TicketEventWriteData {
  editor_id?: string;
  relation?: RecordId | "";
  old_status?: TicketStatus | "";
  new_status?: TicketStatus | "";
}

export interface TicketCommentRecord extends PocketBaseRecord {
  commenter_id: RecordId | "";
  ticket_id: RecordId | "";
  comment: string;
  expand?: { commenter_id?: UserRecord };
}

export interface TicketCommentWriteData {
  commenter_id?: RecordId | "";
  ticket_id?: RecordId | "";
  comment?: string;
}

export type CreateTicketEventData = TicketEventWriteData;
export type UpdateTicketEventData = TicketEventWriteData;

/** Collections confirmed in the VPS migrations. */
export interface PocketBaseCollections {
  users: UserRecord;
  tickets: TicketRecord;
  ticket_events: TicketEventRecord;
  ticket_comments: TicketCommentRecord;
}

export interface PocketBaseWriteData {
  users: RegisterUserData;
  tickets: TicketWriteData;
  ticket_events: TicketEventWriteData;
  ticket_comments: TicketCommentWriteData;
}

export type CollectionName = keyof PocketBaseCollections;
export type CollectionRecord<Name extends CollectionName> =
  PocketBaseCollections[Name];
export type CollectionWriteData<Name extends CollectionName> =
  PocketBaseWriteData[Name];
