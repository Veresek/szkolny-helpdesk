"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type SubmitHandler } from "react-hook-form";
import { z } from "zod";
import {
  ArrowRight,
  Check,
  CircleHelp,
  FileImage,
  ClipboardList,
  LayoutDashboard,
  LaptopMinimal,
  LoaderCircle,
  LogOut,
  Plus,
  ShieldCheck,
  TicketCheck,
  Upload,
  Wrench,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { AuthSession } from "@/lib/auth";
import { createTicket, listTickets } from "@/lib/tickets";
import { PocketBaseRequestError, subscribeToTicketChanges } from "@/lib/pocketbase";
import {
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  type RoomValue,
  type TicketRecord,
} from "@/types/pocketbase";

const MAX_PHOTO_SIZE = 5 * 1024 * 1024;
const ROOMS: { value: RoomValue; label: string }[] = [
  { value: "1", label: "Sala 1" },
  { value: "2", label: "Sala 2" },
  { value: "3", label: "Sala 3" },
  { value: "4", label: "Sala 4" },
  { value: "5", label: "Sala 5" },
];

const ticketSchema = z.object({
  title: z.string().trim().min(3, "Tytuł musi mieć co najmniej 3 znaki.").max(120, "Tytuł może mieć maksymalnie 120 znaków."),
  description: z.string().trim().min(10, "Opis musi mieć co najmniej 10 znaków."),
  room: z.enum(["1", "2", "3", "4", "5"], { error: "Wybierz salę." }),
  category: z.enum(TICKET_CATEGORIES, { error: "Wybierz kategorię." }),
  priority: z.enum(TICKET_PRIORITIES, { error: "Wybierz priorytet." }),
  photo: z.custom<FileList>(
    (value): value is FileList =>
      typeof value === "object" && value !== null && "length" in value && "item" in value,
  ).optional().superRefine((files, context) => {
    if (!files?.length) return;

    if (files.length > 1) {
      context.addIssue({ code: "custom", message: "Możesz dodać tylko jedno zdjęcie." });
      return;
    }

    const file = files.item(0);
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      context.addIssue({ code: "custom", message: "Załącznik musi być plikiem graficznym." });
    }
    if (file.size > MAX_PHOTO_SIZE) {
      context.addIssue({ code: "custom", message: "Zdjęcie może mieć maksymalnie 5 MB." });
    }
  }),
});

type TicketFormValues = z.infer<typeof ticketSchema>;

interface UserTicketPanelProps {
  session: AuthSession;
  onLogout: () => void;
  audience?: "uzytkownik" | "technik";
  onBack?: () => void;
  onTicketCreated?: () => void;
  initialView?: "create" | "mine";
}

export function UserTicketPanel({ session, onLogout, audience = "uzytkownik", onBack, onTicketCreated, initialView = "create" }: UserTicketPanelProps) {
  const [userView, setUserView] = useState<"create" | "mine">(initialView);
  const [createdTicket, setCreatedTicket] = useState<TicketRecord | null>(null);
  const [myTickets, setMyTickets] = useState<TicketRecord[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(true);
  const [ticketsError, setTicketsError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    resetField,
    formState: { errors, isSubmitting },
  } = useForm<TicketFormValues>({
    resolver: zodResolver(ticketSchema),
    defaultValues: {
      title: "",
      description: "",
    },
  });

  const photoRegistration = register("photo");

  const fetchMyTickets = useCallback(async () => {
    try {
      const result = await listTickets({
        token: session.token,
        perPage: 100,
        sort: "-created",
        filter: `user_id = ${JSON.stringify(session.user.id)}`,
      });
      setMyTickets(result.items);
      setTicketsError("");
    } catch (error) {
      setTicketsError(error instanceof Error ? error.message : "Nie udało się pobrać zgłoszeń.");
    } finally {
      setTicketsLoading(false);
    }
  }, [session.token, session.user.id]);

  useEffect(() => {
    void fetchMyTickets();
    const unsubscribe = subscribeToTicketChanges(session.token, () => void fetchMyTickets());
    return unsubscribe;
  }, [fetchMyTickets, session.token]);

  const submitTicket: SubmitHandler<TicketFormValues> = async (values) => {
    setSubmitError("");
    setCreatedTicket(null);

    try {
      const ticket = await createTicket(
        {
          user_id: session.user.id,
          title: values.title,
          description: values.description,
          room: values.room,
          category: values.category,
          priority: values.priority,
          status: "nowe",
          photo: values.photo?.length ? [values.photo.item(0)!] : undefined,
        },
        { token: session.token },
      );
      setCreatedTicket(ticket);
      setMyTickets((current) => [ticket, ...current.filter((item) => item.id !== ticket.id)]);
      onTicketCreated?.();
      reset();
      setSelectedPhoto(null);
    } catch (error) {
      if (error instanceof PocketBaseRequestError) {
        const fieldMessage = Object.values(error.data ?? {})
          .map((field) => field.message)
          .filter(Boolean)
          .join(" ");
        setSubmitError(
          fieldMessage || (error.status === 403
            ? "Twoje konto nie ma uprawnień do tworzenia zgłoszeń."
            : error.message),
        );
      } else {
        setSubmitError(error instanceof Error ? error.message : "Nie udało się wysłać zgłoszenia. Spróbuj ponownie.");
      }
    }
  };

  function signOut() {
    onLogout();
  }

  return (
    <main className="technician-shell user-ticket-shell">
      {(audience === "uzytkownik" || audience === "technik") && (
        <aside className="technician-sidebar user-ticket-sidebar">
          <Link className="tech-brand" href="/" aria-label="Szkolny Helpdesk — strona główna">
            <span className="tech-brand-icon"><Wrench size={18} /></span>
            <span>szkolny<strong>helpdesk</strong></span>
          </Link>
          <div className="sidebar-label">MENU GŁÓWNE</div>
          <nav className="tech-nav" aria-label="Menu użytkownika">
            {audience === "technik" && <Button className="tech-nav-item" onClick={onBack} type="button" variant="ghost"><LayoutDashboard size={17} /> Przegląd</Button>}
            <Button className={userView === "create" ? "tech-nav-item active" : "tech-nav-item"} onClick={() => setUserView("create")} type="button" variant="ghost"><Plus size={17} /> Zgłoś usterkę</Button>
            <Button className={userView === "mine" ? "tech-nav-item active" : "tech-nav-item"} onClick={() => setUserView("mine")} type="button" variant="ghost"><ClipboardList size={17} /> Moje usterki<span className="nav-count">{myTickets.length}</span></Button>
          </nav>
          <div className="sidebar-bottom"><div className="tech-profile"><span className="tech-profile-avatar">{session.user.email.slice(0, 1).toUpperCase()}</span><span className="tech-profile-copy"><strong>{session.user.email}</strong></span><button className="tech-logout" onClick={signOut} type="button" aria-label="Wyloguj się"><LogOut size={16} /></button></div></div>
        </aside>
      )}
      <section className="user-ticket-main">
      <header className="dashboard-header">
        <Link className="brand" href="/" aria-label="Szkolny Helpdesk — strona główna">
          <span className="brand-mark"><Wrench size={19} strokeWidth={2.5} /></span>
          <span className="brand-name">szkolny<span>helpdesk</span></span>
        </Link>
      </header>

      {userView === "mine" ? (
        <section className="user-tickets-page"><h1>Moje usterki</h1><p>Sprawdzaj status swoich zgłoszeń.</p>{ticketsLoading ? <p className="my-tickets-empty">Pobieranie zgłoszeń…</p> : ticketsError ? <p role="alert" className="my-tickets-empty">{ticketsError}</p> : myTickets.length === 0 ? <p className="my-tickets-empty">Nie masz jeszcze zgłoszeń.</p> : <div className="user-tickets-grid">{myTickets.map((ticket) => <Card className="user-ticket-item" key={ticket.id}><div className="user-ticket-item-head"><h2>{ticket.title || "Bez tytułu"}</h2><span className={`my-ticket-status ${ticket.status === "zamknięte" ? "closed" : ticket.status === "w realizacji" ? "progress" : "new"}`}>{ticket.status || "nowe"}</span></div><p>{ticket.description}</p><small>{ticket.room ? `Sala ${ticket.room}` : ""}{ticket.room && ticket.category ? " · " : ""}{ticket.category} · {new Date(ticket.created).toLocaleDateString("pl-PL")}</small></Card>)}</div>}</section>
      ) : <div className="ticket-workspace">
        <Card className="ticket-form-card" role="region" aria-labelledby="ticket-form-title">
          <div className="ticket-form-heading">
            <div className="ticket-heading-icon"><Plus size={19} /></div>
            <div>
              <h2 id="ticket-form-title">Nowe zgłoszenie</h2>
              <p>Uzupełnij informacje oznaczone gwiazdką.</p>
            </div>
          </div>

          {submitError && <div className="ticket-alert ticket-alert-error" role="alert"><CircleHelp size={17} /> {submitError}</div>}
          {createdTicket && (
            <div className="ticket-alert ticket-alert-success" role="status">
              <Check size={17} />
              <span>Zgłoszenie wysłane. Numer zgłoszenia: <strong>{createdTicket.id}</strong></span>
            </div>
          )}

          <form className="ticket-form" onSubmit={handleSubmit(submitTicket)} noValidate>
            <div className="ticket-field">
              <Label className="field-label" htmlFor="ticket-title">Tytuł <span>*</span></Label>
              <Input
                id="ticket-title"
                maxLength={120}
                placeholder="Np. Projektor nie wyświetla obrazu"
                className="auth-input"
                {...register("title")}
                aria-invalid={Boolean(errors.title)}
                aria-describedby={errors.title ? "ticket-title-error" : undefined}
              />
              {errors.title && <p className="field-error" id="ticket-title-error">{errors.title.message}</p>}
            </div>

            <div className="ticket-field">
              <Label className="field-label" htmlFor="ticket-description">Opis usterki <span>*</span></Label>
              <Textarea
                id="ticket-description"
                placeholder="Napisz, co się dzieje i od kiedy występuje problem…"
                rows={5}
                className="auth-input"
                {...register("description")}
                aria-invalid={Boolean(errors.description)}
                aria-describedby={errors.description ? "ticket-description-error" : undefined}
              />
              {errors.description && <p className="field-error" id="ticket-description-error">{errors.description.message}</p>}
            </div>

            <div className="ticket-field-grid">
              <div className="ticket-field">
                <Label className="field-label" htmlFor="ticket-room">Sala <span>*</span></Label>
                <Select id="ticket-room" defaultValue="" {...register("room")} aria-invalid={Boolean(errors.room)}>
                  <option value="" disabled>Wybierz salę</option>
                  {ROOMS.map((room) => <option key={room.value} value={room.value}>{room.label}</option>)}
                </Select>
                {errors.room && <p className="field-error">{errors.room.message}</p>}
              </div>
              <div className="ticket-field">
                <Label className="field-label" htmlFor="ticket-priority">Priorytet <span>*</span></Label>
                <Select id="ticket-priority" defaultValue="" {...register("priority")} aria-invalid={Boolean(errors.priority)}>
                  <option value="" disabled>Wybierz priorytet</option>
                  {TICKET_PRIORITIES.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
                </Select>
                {errors.priority && <p className="field-error">{errors.priority.message}</p>}
              </div>
            </div>

            <div className="ticket-field">
              <Label className="field-label" htmlFor="ticket-category">Kategoria <span>*</span></Label>
              <Select id="ticket-category" defaultValue="" {...register("category")} aria-invalid={Boolean(errors.category)}>
                <option value="" disabled>Wybierz kategorię</option>
                {TICKET_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
              </Select>
              {errors.category && <p className="field-error">{errors.category.message}</p>}
            </div>

            <div className="ticket-field">
              <Label className="field-label" htmlFor="ticket-photo">Zdjęcie <span className="optional-label">opcjonalnie</span></Label>
              <div className="upload-box">
                <input
                  accept="image/*"
                  className="upload-input"
                  id="ticket-photo"
                  type="file"
                  {...photoRegistration}
                  onChange={(event) => {
                    void photoRegistration.onChange(event);
                    setSelectedPhoto(event.currentTarget.files?.[0] ?? null);
                  }}
                  aria-invalid={Boolean(errors.photo)}
                />
                {selectedPhoto ? (
                  <div className="selected-file">
                    <span className="file-icon"><FileImage size={17} /></span>
                    <span className="file-name">{selectedPhoto.name}<small>{(selectedPhoto.size / (1024 * 1024)).toFixed(2)} MB</small></span>
                    <button className="remove-file" onClick={() => { resetField("photo"); setSelectedPhoto(null); }} type="button" aria-label="Usuń załączone zdjęcie"><X size={16} /></button>
                  </div>
                ) : (
                  <label className="upload-label" htmlFor="ticket-photo">
                    <span className="upload-icon"><Upload size={18} /></span>
                    <span><strong>Wybierz zdjęcie</strong><small>Jedno zdjęcie · PNG, JPG, WEBP lub GIF · maks. 5 MB</small></span>
                    <span className="upload-browse">Przeglądaj</span>
                  </label>
                )}
              </div>
              {errors.photo && <p className="field-error">{errors.photo.message}</p>}
            </div>

            <div className="ticket-form-footer">
              <p><ShieldCheck size={15} /> Zgłoszenie zobaczy zespół techniczny.</p>
              <Button aria-busy={isSubmitting} className="ticket-submit" disabled={isSubmitting} type="submit">
                {isSubmitting ? <><LoaderCircle className="spin" size={17} /><span>Wysyłanie…</span></> : <><span>Wyślij zgłoszenie</span><ArrowRight size={17} /> </>}
              </Button>
            </div>
          </form>
        </Card>

        <aside className="ticket-side-column">
          <Card className="my-tickets-card" role="region" aria-label="Moje zgłoszenia">
            <div className="how-card-title"><span className="how-icon"><TicketCheck size={18} /></span><h2>Moje zgłoszenia</h2></div>
            {ticketsLoading ? (
              <p className="my-tickets-empty">Pobieranie zgłoszeń…</p>
            ) : ticketsError ? (
              <p className="my-tickets-empty" role="alert">{ticketsError}</p>
            ) : myTickets.length === 0 ? (
              <p className="my-tickets-empty">Nie masz jeszcze zgłoszeń.</p>
            ) : (
              <ul className="my-tickets-list">
                {myTickets.map((ticket) => (
                  <li key={ticket.id}>
                    <div className="my-ticket-title"><strong>{ticket.title || "Bez tytułu"}</strong><small>{ticket.room ? `Sala ${ticket.room}` : ""}{ticket.room && ticket.category ? " · " : ""}{ticket.category}</small></div>
                    <span className={`my-ticket-status ${ticket.status === "zamknięte" ? "closed" : ticket.status === "w realizacji" ? "progress" : "new"}`}>{ticket.status || "nowe"}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card className="how-card" role="region" aria-label="Jak działa zgłaszanie">
            <div className="how-card-title"><span className="how-icon"><LaptopMinimal size={18} /></span><h2>Jak to działa?</h2></div>
            <ol className="how-steps">
              <li><span>1</span><div><strong>Opisz problem</strong><small>Podaj salę i krótko opisz usterkę.</small></div></li>
              <li><span>2</span><div><strong>Technik otrzyma zgłoszenie</strong><small>Informacja trafi do zespołu technicznego.</small></div></li>
              <li><span>3</span><div><strong>Problem zostanie sprawdzony</strong><small>Zespół zajmie się naprawą.</small></div></li>
            </ol>
          </Card>
          <Card className="help-card">
            <span className="help-card-icon"><CircleHelp size={18} /></span>
            <div><strong>To pilna sprawa?</strong><p>Skontaktuj się bezpośrednio z sekretariatem lub technikiem.</p></div>
          </Card>
        </aside>
      </div>}

      <footer className="dashboard-footer"><span>© 2026 Szkolny Helpdesk</span><span><ShieldCheck size={14} /> Dostęp do ticketów ma wyłącznie zespół techniczny.</span></footer>
      </section>
    </main>
  );
}
