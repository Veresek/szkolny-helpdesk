"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  ClipboardList,
  Clock3,
  LayoutDashboard,
  LogOut,
  Plus,
  Search,
  ShieldCheck,
  TicketCheck,
  Wrench,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UserTicketPanel } from "@/components/user-ticket-panel";
import { listTicketEvents } from "@/lib/ticket-events";
import { createTicketComment, listTicketComments } from "@/lib/ticket-comments";
import type { AuthSession } from "@/lib/auth";
import { PocketBaseRequestError, subscribeToTicketChanges } from "@/lib/pocketbase";
import { listTickets, updateTicket } from "@/lib/tickets";
import { getRecord } from "@/lib/pocketbase";
import {
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  type RoomValue,
  type TicketCategory,
  type TicketRecord,
  type TicketStatus,
} from "@/types/pocketbase";

type DashboardView = "overview" | "new-ticket" | "my-tickets";
type StatusFilter = "Wszystkie" | TicketStatus;

const ROOMS: { value: RoomValue; label: string }[] = [
  { value: "1", label: "Sala 1" },
  { value: "2", label: "Sala 2" },
  { value: "3", label: "Sala 3" },
  { value: "4", label: "Sala 4" },
  { value: "5", label: "Sala 5" },
];

const statusFilters: StatusFilter[] = ["Wszystkie", ...TICKET_STATUSES];

interface TechnicianDashboardProps {
  session: AuthSession;
  onLogout: () => void;
}

export function TechnicianDashboard({ session, onLogout }: TechnicianDashboardProps) {
  const [view, setView] = useState<DashboardView>("overview");
  const [tickets, setTickets] = useState<TicketRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [lastLoadedAt, setLastLoadedAt] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("Wszystkie");
  const [roomFilter, setRoomFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTicket, setSelectedTicket] = useState<TicketRecord | null>(null);
  const [ticketEvents, setTicketEvents] = useState<import("@/types/pocketbase").TicketEventRecord[]>([]);
  const [statusSaving, setStatusSaving] = useState(false);
  const [ticketComments, setTicketComments] = useState<import("@/types/pocketbase").TicketCommentRecord[]>([]);
  const [commentDraft, setCommentDraft] = useState("");
  const [commentSaving, setCommentSaving] = useState(false);

  const fetchTickets = useCallback(async (signal?: AbortSignal) => {
    try {
      const allTickets: TicketRecord[] = [];
      let page = 1;
      let totalPages = 1;

      do {
        const result = await listTickets({
          token: session.token,
          page,
          perPage: 200,
          sort: "-created",
          signal,
        });
        allTickets.push(...result.items);
        totalPages = result.totalPages;
        page += 1;
      } while (page <= totalPages && !signal?.aborted);

      if (signal?.aborted) return;
      setTickets(allTickets);
      setLoadError("");
      setLastLoadedAt(new Date().toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" }));
    } catch (error) {
      if (signal?.aborted) return;
      setLoadError(
        error instanceof PocketBaseRequestError && error.status === 403
          ? "Konto technika nie ma uprawnień do odczytu zgłoszeń. Sprawdź reguły tickets.listRule i tickets.viewRule."
          : error instanceof Error
            ? error.message
            : "Nie udało się pobrać zgłoszeń. Spróbuj ponownie.",
      );
    } finally {
      if (!signal?.aborted) setIsLoading(false);
    }
  }, [session.token]);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => void fetchTickets(controller.signal), 0);
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [fetchTickets]);

  useEffect(() => {
    if (view !== "overview") return;
    const refresh = () => {
      if (document.visibilityState === "visible") void fetchTickets();
    };
    const unsubscribe = subscribeToTicketChanges(session.token, refresh);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      unsubscribe();
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [fetchTickets, session.token, view]);

  const visibleTickets = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase("pl");
    return tickets.filter((ticket) => {
      const matchesStatus = statusFilter === "Wszystkie" || ticket.status === statusFilter;
      const matchesRoom = !roomFilter || ticket.room === roomFilter;
      const matchesPriority = !priorityFilter || ticket.priority === priorityFilter;
      const matchesQuery = !query || [ticket.id, ticket.title, ticket.room, ticket.category]
        .some((value) => value.toLocaleLowerCase("pl").includes(query));
      return matchesStatus && matchesRoom && matchesPriority && matchesQuery;
    });
  }, [priorityFilter, roomFilter, searchQuery, statusFilter, tickets]);

  const categoryCounts = useMemo(() => {
    const counts = new Map<TicketCategory, number>();
    for (const ticket of tickets) {
      if (ticket.category) counts.set(ticket.category, (counts.get(ticket.category) ?? 0) + 1);
    }
    return TICKET_CATEGORIES
      .map((label) => ({ label, count: counts.get(label) ?? 0 }))
      .filter((item) => item.count > 0)
      .sort((a, b) => b.count - a.count);
  }, [tickets]);

  const roomCounts = useMemo(() => {
    const counts = new Map<RoomValue, number>();
    for (const ticket of tickets) {
      if (ticket.room) counts.set(ticket.room, (counts.get(ticket.room) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [tickets]);

  const displayName = session.user.email.split("@")[0]?.replace(/[._-]+/g, " ") || "Techniku";
  const shownTickets = visibleTickets;
  const newCount = tickets.filter((ticket) => ticket.status === "nowe").length;
  const inProgressCount = tickets.filter((ticket) => ticket.status === "w realizacji").length;
  const closedCount = tickets.filter((ticket) => ticket.status === "zamknięte").length;
  const maxCategoryCount = Math.max(1, ...categoryCounts.map((item) => item.count));
  const topRoom = roomCounts[0];

  function refreshTickets() {
    setIsLoading(true);
    void fetchTickets();
  }

  useEffect(() => {
    if (!selectedTicket) { setTicketEvents([]); setTicketComments([]); setCommentDraft(""); return; }
    void listTicketEvents({ ticketId: selectedTicket.id, token: session.token, sort: "-created", perPage: 100 })
      .then(async (result) => {
        const items = await Promise.all(result.items.map(async (item) => {
          if (item.expand?.editor_id?.email || !item.editor_id) return item;
          try { return { ...item, expand: { ...item.expand, editor_id: await getRecord("users", item.editor_id, { token: session.token }) } }; }
          catch { return item; }
        }));
        setTicketEvents(items);
      })
      .catch(() => setTicketEvents([]));
    void listTicketComments(selectedTicket.id, { token: session.token, perPage: 100 })
      .then((result) => setTicketComments(result.items))
      .catch(() => setTicketComments([]));
  }, [selectedTicket, session.token]);

  if (view !== "overview") {
    return (
      <UserTicketPanel
        audience="technik"
        onBack={() => setView("overview")}
        initialView={view === "my-tickets" ? "mine" : "create"}
        onTicketCreated={() => {
          setView("overview");
          setIsLoading(true);
          void fetchTickets();
        }}
        onLogout={onLogout}
        session={session}
      />
    );
  }

  async function submitTicketComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const comment = commentDraft.trim();
    if (!selectedTicket || !comment || commentSaving) return;
    setCommentSaving(true);
    try {
      const created = await createTicketComment({ commenter_id: session.user.id, ticket_id: selectedTicket.id, comment }, { token: session.token });
      setTicketComments((current) => [...current, { ...created, expand: { commenter_id: session.user } }]);
      setCommentDraft("");
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Nie udało się dodać komentarza.");
    } finally { setCommentSaving(false); }
  }

  async function changeTicketStatus(status: TicketStatus) {
    if (!selectedTicket || statusSaving || status === selectedTicket.status) return;
    setStatusSaving(true);
    try {
      const oldStatus = selectedTicket.status;
      const updated = await updateTicket(selectedTicket.id, { status }, { token: session.token });
      await import("@/lib/ticket-events").then(({ createTicketEvent }) => createTicketEvent({
        editor_id: session.user.id, relation: selectedTicket.id, old_status: oldStatus, new_status: status,
      }, { token: session.token }));
      setTickets((current) => current.map((ticket) => ticket.id === updated.id ? updated : ticket));
      setSelectedTicket(updated);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Nie udało się zmienić statusu.");
    } finally { setStatusSaving(false); }
  }

  return (
    <main className="technician-shell">
      <aside className="technician-sidebar">
        <Link className="tech-brand" href="/" aria-label="Szkolny Helpdesk — strona główna">
          <span className="tech-brand-icon"><Wrench size={18} /></span>
          <span>szkolny<strong>helpdesk</strong></span>
        </Link>

        <div className="sidebar-label">MENU GŁÓWNE</div>
        <nav className="tech-nav" aria-label="Menu technika">
          <Button
            className={view === "overview" ? "tech-nav-item active" : "tech-nav-item"}
            onClick={() => setView("overview")}
            type="button"
            variant="ghost"
          >
            <LayoutDashboard size={17} /> Przegląd
          </Button>
          <Button className="tech-nav-item" onClick={() => setView("new-ticket")} type="button" variant="ghost"><Plus size={17} /> Zgłoś usterkę</Button>
          <Button className="tech-nav-item" onClick={() => setView("my-tickets")} type="button" variant="ghost"><ClipboardList size={17} /> Moje usterki</Button>
        </nav>

        <div className="sidebar-bottom">
          <div className="tech-profile">
            <span className="tech-profile-avatar">{displayName.slice(0, 1).toUpperCase()}</span>
            <span className="tech-profile-copy"><strong>{session.user.email}</strong></span>
            <button className="tech-logout" onClick={onLogout} type="button" aria-label="Wyloguj się"><LogOut size={16} /></button>
          </div>
        </div>
      </aside>

      <section className="technician-main">
        <header className="technician-topbar">
          <div className="breadcrumb"><span>Helpdesk</span><ChevronRight size={14} /><strong>Przegląd</strong></div>
          <div className="topbar-actions">
            <div className="topbar-profile"><span className="tech-profile-avatar">{displayName.slice(0, 1).toUpperCase()}</span><span>{session.user.email}</span></div>
          </div>
        </header>

        <div className="technician-content">
          <div className="dashboard-title-row">
            <div>
              <p className="dashboard-kicker">PANEL ZESPOŁU TECHNICZNEGO</p>
              <p className="dashboard-subtitle">
                {lastLoadedAt ? `Przegląd zgłoszeń zaktualizowany o ${lastLoadedAt}.` : "Bieżący przegląd zgłoszeń w Twojej szkole."}
              </p>
            </div>
            <Button className="primary-action" onClick={() => setView("new-ticket")} type="button">
              <Plus size={17} /> Nowe zgłoszenie
            </Button>
          </div>

          {loadError && (
            <div className="dashboard-error" role="alert">
              <CircleAlert size={18} /><span>{loadError}</span>
              <Button onClick={refreshTickets} size="sm" type="button" variant="outline">Spróbuj ponownie</Button>
            </div>
          )}

          <div className="stats-grid">
            <StatCard label="Wszystkie zgłoszenia" value={isLoading ? "—" : String(tickets.length)} note="w bazie PocketBase" icon={<TicketCheck size={17} />} color="forest" />
            <StatCard label="Nowe" value={isLoading ? "—" : String(newCount)} note="czekają na obsługę" icon={<Clock3 size={17} />} color="amber" />
            <StatCard label="W realizacji" value={isLoading ? "—" : String(inProgressCount)} note="aktywne zgłoszenia" icon={<Wrench size={17} />} color="blue" />
            <StatCard label="Zamknięte" value={isLoading ? "—" : String(closedCount)} note="wszystkie zamknięte" icon={<CheckCircle2 size={17} />} color="green" />
          </div>

          <div className="dashboard-grid">
            <Card className="ticket-list-card">
              <CardHeader className="ticket-list-header">
                <div className="ticket-list-title">
                  <div>
                    <CardTitle>Wszystkie zgłoszenia</CardTitle>
                    <CardDescription>{isLoading ? "Pobieranie danych z PocketBase…" : lastLoadedAt ? `Zaktualizowano o ${lastLoadedAt}` : "Dane z kolekcji tickets"}</CardDescription>
                  </div>
                </div>
                <div className="ticket-toolbar">
                  <div className="ticket-search"><Search size={18} /><Input aria-label="Szukaj zgłoszeń" onChange={(event) => setSearchQuery(event.target.value)} placeholder="Szukaj po tytule lub ID…" value={searchQuery} /></div>
                  <div className="ticket-filters" aria-label="Filtruj zgłoszenia">
                    {statusFilters.map((filter) => <Button className={statusFilter === filter ? "filter-chip selected" : "filter-chip"} key={filter} onClick={() => setStatusFilter(filter)} size="sm" type="button" variant={statusFilter === filter ? "secondary" : "ghost"}>{filter}</Button>)}
                    <Select aria-label="Filtruj po sali" className="filter-select" onChange={(event) => setRoomFilter(event.target.value)} value={roomFilter}>
                      <option value="">Wszystkie sale</option>
                      {ROOMS.map((room) => <option key={room.value} value={room.value}>{room.label}</option>)}
                    </Select>
                    <Select aria-label="Filtruj po priorytecie" className="filter-select" onChange={(event) => setPriorityFilter(event.target.value)} value={priorityFilter}>
                      <option value="">Priorytety</option>
                      {TICKET_PRIORITIES.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="ticket-table-content">
                <Table className="technician-table">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="ticket-id-col">ID</TableHead>
                      <TableHead>Zgłoszenie</TableHead>
                      <TableHead>Sala</TableHead>
                      <TableHead>Priorytet</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Utworzono</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {shownTickets.map((ticket) => <TicketTableRow key={ticket.id} ticket={ticket} onClick={() => setSelectedTicket(ticket)} />)}
                    {shownTickets.length === 0 && (
                      <TableRow><TableCell className="empty-table" colSpan={6}>
                        {isLoading ? "Ładowanie zgłoszeń…" : loadError ? "Brak danych do wyświetlenia." : "Brak zgłoszeń dla wybranych filtrów."}
                      </TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {view === "overview" && (
              <div className="insight-column">
                <Card className="insight-card">
                  <CardHeader className="insight-header"><div><CardTitle>Zgłoszenia według kategorii</CardTitle><CardDescription>Na podstawie pobranych ticketów</CardDescription></div></CardHeader>
                  <CardContent className="category-chart">
                    <div className="chart-total"><strong>{isLoading ? "—" : tickets.length}</strong><span>zgłoszeń łącznie</span></div>
                    {categoryCounts.length > 0 ? categoryCounts.map((category, index) => (
                      <div className="category-bar-row" key={category.label}>
                        <div className="category-label"><span>{category.label}</span><strong>{category.count}</strong></div>
                        <div className="bar-track"><span style={{ width: `${(category.count / maxCategoryCount) * 100}%`, backgroundColor: ["#477c64", "#8bab61", "#d8a255", "#9ca9a0"][index % 4] }} /></div>
                      </div>
                    )) : <p className="insight-empty">{isLoading ? "Wczytywanie kategorii…" : "Brak danych o kategoriach."}</p>}
                  </CardContent>
                </Card>
                <Card className="insight-card room-card">
                  <CardHeader className="insight-header"><div><CardTitle>Najwięcej zgłoszeń</CardTitle><CardDescription>Sala z największą liczbą ticketów</CardDescription></div></CardHeader>
                  <CardContent className="room-highlight">
                    <span className="room-icon"><ClipboardList size={18} /></span>
                    <div><strong>{topRoom ? `Sala ${topRoom[0]}` : isLoading ? "Ładowanie…" : "Brak danych"}</strong><small>{topRoom ? `${topRoom[1]} zgłoszeń` : "Sala z największą liczbą usterek"}</small></div>
                    {topRoom && <Badge variant="secondary">#{topRoom[0]}</Badge>}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>

          <footer className="technician-footer"><span>© 2026 Szkolny Helpdesk</span><span><ShieldCheck size={14} /> Zalogowano bezpiecznie jako technik</span></footer>
        </div>
      </section>
      {selectedTicket && <div className="ticket-modal-backdrop" role="presentation" onClick={() => setSelectedTicket(null)}>
        <section className="ticket-detail-modal" role="dialog" aria-modal="true" aria-labelledby="ticket-detail-title" onClick={(event) => event.stopPropagation()}>
          <button className="ticket-modal-close" type="button" aria-label="Zamknij" onClick={() => setSelectedTicket(null)}>×</button>
          <p className="dashboard-kicker">SZCZEGÓŁY ZGŁOSZENIA · {selectedTicket.id}</p>
          <div className="ticket-detail-columns">
            <div className="ticket-detail-main">
              <section className="ticket-detail-section">
                <h2 id="ticket-detail-title">{selectedTicket.title || "Bez tytułu"}</h2>
                <p className="ticket-detail-description">{selectedTicket.description || "Brak opisu."}</p>
                {(Array.isArray(selectedTicket.photo) ? selectedTicket.photo : typeof selectedTicket.photo === "string" ? [selectedTicket.photo] : []).filter(Boolean).map((photo) => <img className="ticket-detail-photo" key={photo} src={`${process.env.NEXT_PUBLIC_POCKETBASE_URL}/api/files/tickets/${selectedTicket.id}/${encodeURIComponent(photo)}`} alt="Zdjęcie do zgłoszenia" />)}
              </section>
              <section className="ticket-detail-section ticket-status-section">
                <label className="ticket-status-control">Status<Select value={selectedTicket.status} disabled={statusSaving} onChange={(event) => void changeTicketStatus(event.target.value as TicketStatus)}>{TICKET_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}</Select></label>
                <h3>Historia statusów</h3>
                <ol className="ticket-event-list">{ticketEvents.map((event) => {
                  const editorEmail = event.expand?.editor_id?.email
                    || (event.editor_id === session.user.id ? session.user.email : "");
                  return <li key={event.id}><strong>{event.old_status || "utworzono"} → {event.new_status}</strong><time>{formatTicketDate(event.created)}</time>{editorEmail && <small>{editorEmail}</small>}</li>;
                })}{ticketEvents.length === 0 && <li className="ticket-history-empty">Brak zapisanej historii zmian.</li>}</ol>
              </section>
            </div>
            <aside className="ticket-detail-comments"><h3>Komentarze</h3>
              <form className="ticket-comment-form" onSubmit={submitTicketComment}><Textarea aria-label="Treść komentarza" onChange={(event) => setCommentDraft(event.target.value)} placeholder="Napisz komentarz…" value={commentDraft} /><Button disabled={!commentDraft.trim() || commentSaving} type="submit" size="sm">{commentSaving ? "Zapisywanie…" : "Dodaj komentarz"}</Button></form>
              <ol className="ticket-comment-list">{ticketComments.map((item) => <li key={item.id}><p>{item.comment}</p><small>{item.expand?.commenter_id?.email || item.commenter_id}</small><time>{formatTicketDate(item.created)}</time></li>)}{ticketComments.length === 0 && <li className="ticket-history-empty">Brak komentarzy.</li>}</ol>
            </aside>
          </div>
        </section>
      </div>}
    </main>
  );
}

function StatCard({
  label,
  value,
  note,
  icon,
  color,
}: {
  label: string;
  value: string;
  note: string;
  icon: ReactNode;
  color: "forest" | "amber" | "blue" | "green";
}) {
  return (
    <Card className="stat-card">
      <CardContent className="stat-card-content">
        <div className="stat-top"><span>{label}</span><span className={`stat-icon ${color}`}>{icon}</span></div>
        <div className="stat-number-row"><strong>{value}</strong>{!value.includes("—") && <span className="stat-trend neutral">aktualne</span>}</div>
        <p>{note}</p>
      </CardContent>
    </Card>
  );
}

function TicketTableRow({ ticket, onClick }: { ticket: TicketRecord; onClick: () => void }) {
  const priorityVariant = ticket.priority === "wysoki" ? "destructive" : ticket.priority === "średni" ? "warning" : "secondary";
  const statusVariant = ticket.status === "zamknięte" ? "success" : ticket.status === "w realizacji" ? "secondary" : "outline";
  return (
    <TableRow className="demo-ticket-row clickable-ticket-row" onClick={onClick}>
      <TableCell className="ticket-id" title={ticket.id}>{ticket.id}</TableCell>
      <TableCell className="ticket-subject"><strong>{ticket.title || "Bez tytułu"}</strong><small>{ticket.category || "Bez kategorii"}</small></TableCell>
      <TableCell className="ticket-room">{ticket.room ? `Sala ${ticket.room}` : "—"}</TableCell>
      <TableCell><Badge variant={priorityVariant}>{ticket.priority || "brak"}</Badge></TableCell>
      <TableCell><Badge variant={statusVariant}><span className={`status-dot ${ticket.status === "nowe" ? "new" : ticket.status === "zamknięte" ? "closed" : "progress"}`} />{ticket.status || "brak statusu"}</Badge></TableCell>
      <TableCell className="ticket-time">{formatTicketDate(ticket.created)}</TableCell>
    </TableRow>
  );
}

function formatTicketDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
