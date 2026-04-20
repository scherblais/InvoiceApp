import { useMemo } from "react";
import {
  LayoutDashboard,
  FileText,
  Calendar as CalendarIcon,
  Users,
  Settings,
  LogOut,
  Moon,
  Sun,
} from "lucide-react";
import { LumeriaLogo } from "@/components/lumeria-logo";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/auth-context";
import { useTheme } from "@/contexts/theme-context";
import { ActivityBell } from "@/components/activity-bell";

/**
 * Navigation tree, structured after the shadcn `sidebar-03` block:
 * each top-level entry can optionally declare sub-items, rendered
 * via SidebarMenuSub. Sub-items drive URL-param state the target
 * pages read (invoice filter, calendar view, settings tab) so the
 * sidebar acts as a full-fidelity jump table instead of just top-
 * level navigation.
 */
interface NavItem {
  title: string;
  to: string; // pathname only
  icon: React.ComponentType<{ className?: string }>;
  items?: { title: string; search?: string; activeSearchKey?: string; activeSearchValue?: string | null }[];
}

const mainNav: NavItem[] = [
  { title: "Overview", to: "/", icon: LayoutDashboard },
  {
    title: "Invoicing",
    to: "/invoices",
    icon: FileText,
    items: [
      { title: "All", activeSearchKey: "status", activeSearchValue: null },
      { title: "Drafts", search: "?status=drafts", activeSearchKey: "status", activeSearchValue: "drafts" },
      { title: "Unpaid", search: "?status=unpaid", activeSearchKey: "status", activeSearchValue: "unpaid" },
      { title: "Paid", search: "?status=paid", activeSearchKey: "status", activeSearchValue: "paid" },
    ],
  },
  {
    title: "Calendar",
    to: "/calendar",
    icon: CalendarIcon,
    items: [
      { title: "Agenda", search: "?view=agenda", activeSearchKey: "view", activeSearchValue: "agenda" },
      { title: "Week", search: "?view=week", activeSearchKey: "view", activeSearchValue: "week" },
      { title: "Month", search: "?view=month", activeSearchKey: "view", activeSearchValue: "month" },
      { title: "Board", search: "?view=kanban", activeSearchKey: "view", activeSearchValue: "kanban" },
    ],
  },
  { title: "Clients", to: "/clients", icon: Users },
];

const settingsNav: NavItem = {
  title: "Settings",
  to: "/settings",
  icon: Settings,
  items: [
    { title: "Pricing", search: "?tab=pricing", activeSearchKey: "tab", activeSearchValue: "pricing" },
    { title: "Tax report", search: "?tab=taxes", activeSearchKey: "tab", activeSearchValue: "taxes" },
    { title: "Account", search: "?tab=account", activeSearchKey: "tab", activeSearchValue: "account" },
  ],
};

export function AppSidebar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const initials = user?.email ? user.email.slice(0, 2).toUpperCase() : "LM";

  const currentSearch = useMemo(
    () => new URLSearchParams(location.search),
    [location.search]
  );

  // Top-level item is active when the pathname matches. For sub-items
  // we also check the matching URL param so "Drafts" highlights only
  // when `?status=drafts` is present, not on every `/invoices` visit.
  const isRouteActive = (to: string) =>
    to === "/" ? location.pathname === "/" : location.pathname.startsWith(to);

  const isSubActive = (
    to: string,
    key: string | undefined,
    value: string | null | undefined
  ) => {
    if (!isRouteActive(to)) return false;
    if (!key) return true;
    const current = currentSearch.get(key);
    // A null/undefined target value means "parent route, no filter set"
    if (value == null) return current == null || current === "";
    return current === value;
  };

  return (
    <Sidebar>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <button
                type="button"
                onClick={() => navigate("/")}
                className="w-full text-left"
              >
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <LumeriaLogo className="size-4" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-medium">Lumeria Media</span>
                  <span className="text-xs text-muted-foreground">
                    Invoicing
                  </span>
                </div>
              </button>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {mainNav.map((item) => {
              const active = isRouteActive(item.to);
              return (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton
                    asChild
                    isActive={active && !item.items}
                  >
                    <button
                      type="button"
                      onClick={() => navigate(item.to)}
                      className="w-full text-left font-medium"
                    >
                      <item.icon className="size-4" />
                      <span>{item.title}</span>
                    </button>
                  </SidebarMenuButton>
                  {item.items?.length ? (
                    <SidebarMenuSub>
                      {item.items.map((sub) => {
                        const subActive = isSubActive(
                          item.to,
                          sub.activeSearchKey,
                          sub.activeSearchValue
                        );
                        return (
                          <SidebarMenuSubItem key={sub.title}>
                            <SidebarMenuSubButton
                              asChild
                              isActive={subActive}
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  navigate(`${item.to}${sub.search ?? ""}`)
                                }
                                className="w-full text-left"
                              >
                                {sub.title}
                              </button>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        );
                      })}
                    </SidebarMenuSub>
                  ) : null}
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>

        {/* Settings lives as its own group at the bottom of content
           so its submenu is always reachable without scrolling past
           the main nav. */}
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={
                  isRouteActive(settingsNav.to) && !settingsNav.items
                }
              >
                <button
                  type="button"
                  onClick={() => navigate(settingsNav.to)}
                  className="w-full text-left font-medium"
                >
                  <settingsNav.icon className="size-4" />
                  <span>{settingsNav.title}</span>
                </button>
              </SidebarMenuButton>
              {settingsNav.items?.length ? (
                <SidebarMenuSub>
                  {settingsNav.items.map((sub) => {
                    const subActive = isSubActive(
                      settingsNav.to,
                      sub.activeSearchKey,
                      sub.activeSearchValue
                    );
                    return (
                      <SidebarMenuSubItem key={sub.title}>
                        <SidebarMenuSubButton asChild isActive={subActive}>
                          <button
                            type="button"
                            onClick={() =>
                              navigate(
                                `${settingsNav.to}${sub.search ?? ""}`
                              )
                            }
                            className="w-full text-left"
                          >
                            {sub.title}
                          </button>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    );
                  })}
                </SidebarMenuSub>
              ) : null}
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={toggleTheme}>
              {theme === "dark" ? (
                <Sun className="size-4" />
              ) : (
                <Moon className="size-4" />
              )}
              <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        <div className="flex items-center gap-2 px-2 py-1.5">
          <Avatar className="size-7">
            <AvatarFallback className="text-[10px] font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-xs font-medium">
              {user?.displayName ?? user?.email?.split("@")[0] ?? "Account"}
            </span>
            <span className="truncate text-[11px] text-muted-foreground">
              {user?.email}
            </span>
          </div>
          <ActivityBell />
          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-muted-foreground hover:text-foreground"
            aria-label="Sign out"
            onClick={async () => {
              await logout();
              navigate("/login");
            }}
          >
            <LogOut className="size-3.5" aria-hidden />
          </Button>
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
