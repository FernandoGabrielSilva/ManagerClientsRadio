import {
  Bell,
  FileSpreadsheet,
  FileText,
  LayoutDashboard,
  Settings,
  Trash2,
  Users,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

/** Fonte única da navegação principal, usada pela sidebar e pelo menu mobile. */
export const navGroups: NavGroup[] = [
  {
    label: "Principal",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/clients", label: "Clientes", icon: Users },
      { href: "/reminders", label: "Lembretes", icon: Bell },
    ],
  },
  {
    label: "Gestão",
    items: [
      { href: "/contracts", label: "Contratos", icon: FileText },
      { href: "/spreadsheet", label: "Planilha", icon: FileSpreadsheet },
      { href: "/trash", label: "Lixeira", icon: Trash2 },
    ],
  },
  {
    label: "Configurações",
    items: [{ href: "/settings", label: "Configurações", icon: Settings }],
  },
];

export function isNavItemActive(pathname: string | null, href: string) {
  return pathname === href || Boolean(pathname?.startsWith(`${href}/`));
}
