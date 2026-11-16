import { TICKET_ROOMS } from "@/types/pocketbase";

export const ROOM_OPTIONS = TICKET_ROOMS.map((value) => ({
  value,
  label: `Sala ${value}`,
}));
