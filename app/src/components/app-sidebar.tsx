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
      <SidebarHeader className="border-b px-4 py-4">
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

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {nav.map((item) => (
                <SidebarMenuItem key={item.to}>
                  <NavLink to={item.to} end={item.to === "/"}>
                    {({ isActive }) => (
                      <SidebarMenuButton
                        isActive={isActive}
                        tooltip={item.label}
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

      <SidebarFooter className="border-t">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={toggleTheme} tooltip="Toggle theme">
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
                <SidebarMenuButton isActive={isActive} tooltip="Settings">
                  <Settings className="h-4 w-4" />
                  <span>Settings</span>
                </SidebarMenuButton>
              )}
            </NavLink>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={async () => {
                await logout();
                navigate("/login");
              }}
              tooltip="Sign out"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        <div className="flex items-center gap-2 px-2 py-2 group-data-[collapsible=icon]:hidden">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-muted text-xs">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-1 flex-col min-w-0">
            <span className="truncate text-xs font-medium">
              {user?.displayName ?? user?.email?.split("@")[0] ?? "Account"}
            </span>
            <span className="truncate text-[11px] text-muted-foreground">
              {user?.email}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={async () => {
              await logout();
              navigate("/login");
            }}
          >
            <LogOut className="h-3.5 w-3.5" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
