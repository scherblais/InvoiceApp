import { useMemo, useState } from "react";
import {
  Calendar as CalendarIcon,
  ChevronDown,
  ChevronRight,
  FileText,
  Home,
  LogOut,
  Moon,
  Search,
  Settings2,
  Sun,
  Users,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { LumeriaLogo } from "@/components/lumeria-logo";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/auth-context";
import { useTheme } from "@/contexts/theme-context";

/**
 * Sidebar composition modeled after the shadcn `sidebar-10` block.
 *
 *   [SidebarHeader]
 *     TeamSwitcher — brand chip with a dropdown for account actions
 *     NavMain     — compact top-level quick-jumps (Search, Overview)
 *
 *   [SidebarContent]
 *     NavWorkspaces — "Navigate" group with collapsible entries
 *                     (Invoicing, Calendar) + flat Clients
 *     NavSecondary  — mt-auto: Settings (collapsible), theme toggle,
 *                     sign out
 *
 *   SidebarRail   — right-edge handle for collapse / expand
 *
 * Sub-items drive URL-param state that the target pages read so the
 * sidebar acts as a full-fidelity jump table (e.g. "Unpaid invoices"
 * → /invoices?status=unpaid; the list seeds its filter from the
 * param, and writes back when the user clicks a tab inside).
 */

// ---------- Navigation data ----------

interface NavSub {
  title: string;
  search: string; // "?status=..." or ""
  searchKey: string;
  searchValue: string | null; // null = "no param set" (e.g. All)
}

interface NavEntry {
  title: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  subs?: NavSub[];
}

const workspaceNav: NavEntry[] = [
  {
    title: "Invoicing",
    to: "/invoices",
    icon: FileText,
    subs: [
      { title: "All", search: "", searchKey: "status", searchValue: null },
      { title: "Drafts", search: "?status=drafts", searchKey: "status", searchValue: "drafts" },
      { title: "Unpaid", search: "?status=unpaid", searchKey: "status", searchValue: "unpaid" },
      { title: "Paid", search: "?status=paid", searchKey: "status", searchValue: "paid" },
    ],
  },
  {
    title: "Calendar",
    to: "/calendar",
    icon: CalendarIcon,
    subs: [
      { title: "Agenda", search: "?view=agenda", searchKey: "view", searchValue: "agenda" },
      { title: "Week", search: "?view=week", searchKey: "view", searchValue: "week" },
      { title: "Month", search: "?view=month", searchKey: "view", searchValue: "month" },
      { title: "Board", search: "?view=kanban", searchKey: "view", searchValue: "kanban" },
    ],
  },
  {
    title: "Clients",
    to: "/clients",
    icon: Users,
  },
];

const settingsEntry: NavEntry = {
  title: "Settings",
  to: "/settings",
  icon: Settings2,
  subs: [
    { title: "Pricing", search: "?tab=pricing", searchKey: "tab", searchValue: "pricing" },
    { title: "Tax report", search: "?tab=taxes", searchKey: "tab", searchValue: "taxes" },
    { title: "Account", search: "?tab=account", searchKey: "tab", searchValue: "account" },
  ],
};

// ---------- Building blocks ----------

function TeamSwitcher() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const initials = user?.email ? user.email.slice(0, 2).toUpperCase() : "LM";

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton className="w-fit px-1.5">
              <div className="flex aspect-square size-5 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
                <LumeriaLogo className="size-3" />
              </div>
              <span className="truncate font-medium">Lumeria Media</span>
              <ChevronDown className="opacity-50" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-64 rounded-lg"
            align="start"
            side="bottom"
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Account
            </DropdownMenuLabel>
            <div className="flex items-center gap-2 px-2 py-1.5">
              <div className="flex size-8 items-center justify-center rounded-md bg-muted text-[11px] font-semibold">
                {initials}
              </div>
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-medium">
                  {user?.displayName ?? user?.email?.split("@")[0] ?? "Account"}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {user?.email}
                </span>
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={async () => {
                await logout();
                navigate("/login");
              }}
            >
              <LogOut />
              <span>Sign out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

/** Top header nav: Search (⌘K palette) + Overview. */
function NavMain({ onOpenSearch }: { onOpenSearch: () => void }) {
  const location = useLocation();
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton onClick={onOpenSearch}>
          <Search />
          <span>Search</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <SidebarMenuButton asChild isActive={location.pathname === "/"}>
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              window.history.pushState(null, "", "/");
              window.dispatchEvent(new PopStateEvent("popstate"));
            }}
          >
            <Home />
            <span>Overview</span>
          </a>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

/** "Navigate" group: collapsible Invoicing/Calendar + flat Clients. */
function NavWorkspaces() {
  const location = useLocation();
  const navigate = useNavigate();
  const currentSearch = useMemo(
    () => new URLSearchParams(location.search),
    [location.search]
  );

  const isRouteActive = (to: string) =>
    to === "/" ? location.pathname === "/" : location.pathname.startsWith(to);
  const isSubActive = (to: string, key: string, value: string | null) => {
    if (!isRouteActive(to)) return false;
    const current = currentSearch.get(key);
    if (value == null) return current == null || current === "";
    return current === value;
  };

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Navigate</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {workspaceNav.map((item) =>
            item.subs?.length ? (
              <CollapsibleNavEntry
                key={item.to}
                entry={item}
                activeRoute={isRouteActive(item.to)}
                isSubActive={(sub) =>
                  isSubActive(item.to, sub.searchKey, sub.searchValue)
                }
                onNavigate={(url) => navigate(url)}
              />
            ) : (
              <SidebarMenuItem key={item.to}>
                <SidebarMenuButton
                  asChild
                  isActive={isRouteActive(item.to)}
                >
                  <a
                    href={item.to}
                    onClick={(e) => {
                      e.preventDefault();
                      navigate(item.to);
                    }}
                  >
                    <item.icon />
                    <span>{item.title}</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          )}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

/** One collapsible nav entry — top-level link + nested sub-items. */
function CollapsibleNavEntry({
  entry,
  activeRoute,
  isSubActive,
  onNavigate,
}: {
  entry: NavEntry;
  activeRoute: boolean;
  isSubActive: (sub: NavSub) => boolean;
  onNavigate: (url: string) => void;
}) {
  // Default the section to open when we're currently inside it so
  // users don't have to re-expand to find the active sub-item.
  const [open, setOpen] = useState(activeRoute);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <SidebarMenuItem>
        <SidebarMenuButton
          asChild
          isActive={activeRoute}
        >
          <a
            href={entry.to}
            onClick={(e) => {
              e.preventDefault();
              onNavigate(entry.to);
            }}
          >
            <entry.icon />
            <span>{entry.title}</span>
          </a>
        </SidebarMenuButton>
        <CollapsibleTrigger asChild>
          <SidebarMenuAction
            className="data-[state=open]:rotate-90"
            showOnHover
          >
            <ChevronRight />
            <span className="sr-only">Toggle {entry.title} submenu</span>
          </SidebarMenuAction>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {entry.subs!.map((sub) => (
              <SidebarMenuSubItem key={sub.title}>
                <SidebarMenuSubButton
                  asChild
                  isActive={isSubActive(sub)}
                >
                  <a
                    href={`${entry.to}${sub.search}`}
                    onClick={(e) => {
                      e.preventDefault();
                      onNavigate(`${entry.to}${sub.search}`);
                    }}
                  >
                    {sub.title}
                  </a>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}

/** Bottom nav (mt-auto): Settings (collapsible) + theme toggle. */
function NavSecondary() {
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const currentSearch = useMemo(
    () => new URLSearchParams(location.search),
    [location.search]
  );

  const isRouteActive = (to: string) => location.pathname.startsWith(to);
  const isSubActive = (to: string, key: string, value: string | null) => {
    if (!isRouteActive(to)) return false;
    const current = currentSearch.get(key);
    if (value == null) return current == null || current === "";
    return current === value;
  };

  return (
    <SidebarGroup className="mt-auto">
      <SidebarGroupContent>
        <SidebarMenu>
          <CollapsibleNavEntry
            entry={settingsEntry}
            activeRoute={isRouteActive(settingsEntry.to)}
            isSubActive={(sub) =>
              isSubActive(settingsEntry.to, sub.searchKey, sub.searchValue)
            }
            onNavigate={(url) => navigate(url)}
          />
          <SidebarMenuItem>
            <SidebarMenuButton onClick={toggleTheme}>
              {theme === "dark" ? <Sun /> : <Moon />}
              <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

// ---------- Top-level composition ----------

export function AppSidebar() {
  // The ⌘K command palette listens globally for the shortcut; the
  // sidebar's "Search" entry synthesizes that same event so mouse
  // users get the same palette the keyboard flow opens.
  const openSearch = () => {
    window.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "k",
        metaKey: true,
        bubbles: true,
      })
    );
  };

  return (
    <Sidebar className="border-r-0">
      <SidebarHeader>
        <TeamSwitcher />
        <NavMain onOpenSearch={openSearch} />
      </SidebarHeader>
      <SidebarContent>
        <NavWorkspaces />
        <NavSecondary />
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
