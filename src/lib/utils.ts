export { cn } from "cn"

export function formatTicketStatus(status: string): string {
  return status.charAt(0).toLocaleUpperCase("pl-PL") + status.slice(1);
}
