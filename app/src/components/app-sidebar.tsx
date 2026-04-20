import {
  LayoutDashboard,
  FileText,
  Calendar,
  Users,
  Settings,
  LogOut,
  Moon,
  Sun,
  ChevronRight,
  ChevronsUpDown,
} from "lucide-react";
import { LumeriaLogo } from "@/components/lumeria-logo";
import { NavLink, useNavigate } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar";
import { useAuth } from "@/contexts/auth-context";
import { useTheme } from "@/contexts/theme-context";
import { ActivityBell } from "@/components/activity-bell";

const nav = [
  { label: "Dashboard", icon: LayoutDashboard, to: "/" },
  { label: "Invoicing", icon: FileText, to: "/invoices" },
  { label: "Calendar", icon: Calendar, to: "/calendar" },
  { label: "Clients", icon: Users, to: "/clients" },
];

export function AppSidebar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const initials = user?.email
    ? user.email.slice(0, 2).toUpperCase()
    : "LM";

  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader className="app-header relative justify-center overflow-hidden border-b px-2 py-0">
        {/* Brand block styled like AlignUI's workspace selector — even
           though we only have one workspace, the chevron + hover state
           signals "this is the identity block" and gives the top of
           the sidebar a clear anchor. */}
        <button
          type="button"
          className="flex h-12 items-center gap-2.5 rounded-lg px-2 text-left transition-colors hover:bg-sidebar-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-sidebar"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-xs">
            <LumeriaLogo className="h-4 w-4" />
          </div>
          <div className="flex min-w-0 flex-1 flex-col group-data-[collapsible=icon]:hidden">
            <span className="truncate text-sm font-semibold leading-tight tracking-tight">
              Lumeria Media
            </span>
            <span className="truncate text-[11px] text-muted-foreground">
              Invoicing
            </span>
          </div>
          <ChevronsUpDown
            className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70 group-data-[collapsible=icon]:hidden"
            aria-hidden
          />
        </button>
      </SidebarHeader>

      <SidebarContent className="gap-0">
        <SidebarGroup className="py-3">
          <SidebarGroupLabel className="px-3 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/70">
            Main
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {nav.map((item) => (
                <SidebarMenuItem key={item.to}>
                  <NavLink to={item.to} end={item.to === "/"}>
                    {({ isActive }) => (
                      <SidebarMenuButton
                        isActive={isActive}
                        tooltip={item.label}
                        className="relative h-9 text-[13px] font-medium transition-colors data-[active=true]:bg-card data-[active=true]:text-foreground data-[active=true]:shadow-sm data-[active=true]:ring-1 data-[active=true]:ring-inset data-[active=true]:ring-border data-[active=true]:before:absolute data-[active=true]:before:left-0 data-[active=true]:before:top-1.5 data-[active=true]:before:h-[calc(100%-0.75rem)] data-[active=true]:before:w-[3px] data-[active=true]:before:rounded-r-full data-[active=true]:before:bg-foreground dark:data-[active=true]:before:shadow-[0_0_14px_rgb(255_255_255/0.45)] group-data-[collapsible=icon]:data-[active=true]:before:hidden"
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.label}</span>
                        {isActive ? (
                          <ChevronRight
                            className="ml-auto h-3.5 w-3.5 text-muted-foreground group-data-[collapsible=icon]:hidden"
                            aria-hidden
                          />
                        ) : null}
                      </SidebarMenuButton>
                    )}
                  </NavLink>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="gap-1 border-t py-2">
        <SidebarMenu className="gap-0.5">
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={toggleTheme}
              tooltip="Toggle theme"
              className="h-9 text-[13px] font-medium"
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
              <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <NavLink to="/settings">
              {({ isActive }) => (
                <SidebarMenuButton
                  isActive={isActive}
                  tooltip="Settings"
                  className="relative h-9 text-[13px] font-medium transition-colors data-[active=true]:bg-card data-[active=true]:text-foreground data-[active=true]:shadow-sm data-[active=true]:ring-1 data-[active=true]:ring-inset data-[active=true]:ring-border data-[active=true]:before:absolute data-[active=true]:before:left-0 data-[active=true]:before:top-1.5 data-[active=true]:before:h-[calc(100%-0.75rem)] data-[active=true]:before:w-[3px] data-[active=true]:before:rounded-r-full data-[active=true]:before:bg-foreground dark:data-[active=true]:before:shadow-[0_0_14px_rgb(255_255_255/0.45)] group-data-[collapsible=icon]:data-[active=true]:before:hidden"
                >
                  <Settings className="h-4 w-4" />
                  <span>Settings</span>
                  {isActive ? (
                    <ChevronRight
                      className="ml-auto h-3.5 w-3.5 text-muted-foreground group-data-[collapsible=icon]:hidden"
                      aria-hidden
                    />
                  ) : null}
                </SidebarMenuButton>
              )}
            </NavLink>
          </SidebarMenuItem>
        </SidebarMenu>

        <div className="mx-2 mt-1 flex items-center gap-2 rounded-lg border bg-card px-2 py-2 shadow-xs group-data-[collapsible=icon]:hidden">
          <Avatar className="h-8 w-8">
            <AvatarFallback
              className="bg-muted text-[11px] font-semibold"
            >
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
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            aria-label="Sign out"
            onClick={async () => {
              await logout();
              navigate("/login");
            }}
          >
            <LogOut className="h-3.5 w-3.5" aria-hidden />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
