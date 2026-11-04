"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
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
  RefreshCw,
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
import type { AuthSession } from "@/lib/auth";
import { PocketBaseRequestError } from "@/lib/pocketbase";
import { listTickets } from "@/lib/tickets";
import {
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  type RoomValue,
  type TicketCategory,
  type TicketRecord,
  type TicketStatus,
} from "@/types/pocketbase";

type DashboardView = "overview" | "new-ticket";
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

  if (view === "new-ticket") {
    return (
      <UserTicketPanel
        audience="technik"
        onBack={() => setView("overview")}
        onLogout={onLogout}
        session={session}
      />
    );
  }

  const displayName = session.user.email.split("@")[0]?.replace(/[._-]+/g, " ") || "Techniku";
  const shownTickets = view === "overview" ? visibleTickets.slice(0, 4) : visibleTickets;
  const newCount = tickets.filter((ticket) => ticket.status === "nowe").length;
  const inProgressCount = tickets.filter((ticket) => ticket.status === "w realizacji").length;
  const closedCount = tickets.filter((ticket) => ticket.status === "zamknięte").length;
  const maxCategoryCount = Math.max(1, ...categoryCounts.map((item) => item.count));
  const topRoom = roomCounts[0];

  function refreshTickets() {
    setIsLoading(true);
    void fetchTickets();
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
        </nav>

        <div className="sidebar-bottom">
          <div className="tech-profile">
            <span className="tech-profile-avatar">{displayName.slice(0, 1).toUpperCase()}</span>
            <span className="tech-profile-copy"><strong>{displayName}</strong><small>Technik</small></span>
            <button className="tech-logout" onClick={onLogout} type="button" aria-label="Wyloguj się"><LogOut size={16} /></button>
          </div>
        </div>
      </aside>

      <section className="technician-main">
        <header className="technician-topbar">
          <div className="breadcrumb"><span>Helpdesk</span><ChevronRight size={14} /><strong>Przegląd</strong></div>
          <div className="topbar-actions">
            <Button
              aria-label="Odśwież zgłoszenia"
              className="notification-button"
              disabled={isLoading}
              onClick={refreshTickets}
              size="icon"
              type="button"
              variant="outline"
            >
              <RefreshCw className={isLoading ? "spin" : ""} size={17} />
            </Button>
            <div className="topbar-profile"><span className="tech-profile-avatar">{displayName.slice(0, 1).toUpperCase()}</span><span>{displayName}</span></div>
          </div>
        </header>

        <div className="technician-content">
          <div className="dashboard-title-row">
            <div>
              <p className="dashboard-kicker">PANEL ZESPOŁU TECHNICZNEGO</p>
              <h1>Dzień dobry, {displayName}<span>.</span></h1>
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
                    <CardTitle>Najnowsze zgłoszenia</CardTitle>
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
                    {shownTickets.map((ticket) => <TicketTableRow key={ticket.id} ticket={ticket} />)}
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

function TicketTableRow({ ticket }: { ticket: TicketRecord }) {
  const priorityVariant = ticket.priority === "wysoki" ? "destructive" : ticket.priority === "średni" ? "warning" : "secondary";
  const statusVariant = ticket.status === "zamknięte" ? "success" : ticket.status === "w realizacji" ? "secondary" : "outline";
  return (
    <TableRow className="demo-ticket-row">
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
