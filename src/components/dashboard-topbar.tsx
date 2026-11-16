import { ChevronRight, LogOut } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

interface DashboardTopbarProps {
  title: string;
  email: string;
  onLogout: () => void;
}

export function DashboardTopbar({ title, email, onLogout }: DashboardTopbarProps) {
  return (
    <header className="technician-topbar">
      <div className="breadcrumb">
        <span>Helpdesk</span>
        <ChevronRight size={14} />
        <strong>{title}</strong>
      </div>
      <div className="topbar-actions">
        <div className="topbar-profile">
          <span className="tech-profile-avatar">{email.slice(0, 1).toUpperCase()}</span>
          <span>{email}</span>
        </div>
        <button className="topbar-logout" onClick={onLogout} type="button" aria-label="Wyloguj się">
          <LogOut size={16} />
          <span>Wyloguj się</span>
        </button>
        <ThemeToggle />
      </div>
    </header>
  );
}
