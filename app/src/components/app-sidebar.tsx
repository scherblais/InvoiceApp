import {
  LayoutDashboard,
  FileText,
  Calendar,
  Users,
  Settings,
  LogOut,
  Moon,
  Sun,
} from "lucide-react";
import { LumeriaLogo } from "@/components/lumeria-logo";
import { NavLink, useNavigate } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
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
    <Sidebar collapsible="icon">
      <SidebarHeader className="app-header justify-center border-b px-4 py-0">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <LumeriaLogo className="h-4 w-4" />
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-semibold leading-tight tracking-tight">
              Lumeria Media
            </span>
            <span className="text-xs text-muted-foreground">
              Invoicing
            </span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="gap-0">
        <SidebarGroup className="py-3">
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {nav.map((item) => (
                <SidebarMenuItem key={item.to}>
                  <NavLink to={item.to} end={item.to === "/"}>
                    {({ isActive }) => (
                      <SidebarMenuButton
                        isActive={isActive}
                        tooltip={item.label}
                        className="relative h-9 text-[13px] font-medium transition-colors data-[active=true]:bg-accent data-[active=true]:text-foreground data-[active=true]:before:absolute data-[active=true]:before:left-0 data-[active=true]:before:top-1.5 data-[active=true]:before:h-[calc(100%-0.75rem)] data-[active=true]:before:w-[3px] data-[active=true]:before:rounded-r-full data-[active=true]:before:bg-foreground group-data-[collapsible=icon]:data-[active=true]:before:hidden"
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.label}</span>
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
                  className="relative h-9 text-[13px] font-medium transition-colors data-[active=true]:bg-accent data-[active=true]:text-foreground data-[active=true]:before:absolute data-[active=true]:before:left-0 data-[active=true]:before:top-1.5 data-[active=true]:before:h-[calc(100%-0.75rem)] data-[active=true]:before:w-[3px] data-[active=true]:before:rounded-r-full data-[active=true]:before:bg-foreground group-data-[collapsible=icon]:data-[active=true]:before:hidden"
                >
                  <Settings className="h-4 w-4" />
                  <span>Settings</span>
                </SidebarMenuButton>
              )}
            </NavLink>
          </SidebarMenuItem>
        </SidebarMenu>

        <div className="mx-2 mt-1 flex items-center gap-2 rounded-md border bg-card/50 px-2 py-2 group-data-[collapsible=icon]:hidden">
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
