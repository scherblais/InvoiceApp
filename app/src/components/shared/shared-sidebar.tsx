import {
  DollarSign,
  Home,
  Images,
  KanbanSquare,
  Moon,
  Sun,
} from "lucide-react";
import { LumeriaLogo } from "@/components/lumeria-logo";
import { useTheme } from "@/contexts/theme-context";
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

export type SharedPageId = "home" | "board" | "deliveries" | "pricing";

const NAV: { id: SharedPageId; label: string; icon: typeof Home }[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "board", label: "Board", icon: KanbanSquare },
  { id: "deliveries", label: "Deliveries", icon: Images },
  { id: "pricing", label: "Pricing", icon: DollarSign },
];

/**
 * Client-side sidebar, mirroring the photographer's AppSidebar
 * treatment: brand tile in the app-header, nav rows with a
 * left-edge indicator on the active route, a collapsed footer with
 * the theme toggle. No auth / account card since this is a public
 * share page.
 */
export function SharedSidebar({
  active,
  onSelect,
}: {
  active: SharedPageId;
  onSelect: (id: SharedPageId) => void;
}) {
  const { theme, toggleTheme } = useTheme();

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
            <span className="text-xs text-muted-foreground">Client portal</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="gap-0">
        <SidebarGroup className="py-3">
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {NAV.map((item) => {
                const isActive = active === item.id;
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      isActive={isActive}
                      tooltip={item.label}
                      onClick={() => onSelect(item.id)}
                      className="relative h-9 text-[13px] font-medium transition-colors data-[active=true]:bg-accent data-[active=true]:text-foreground data-[active=true]:before:absolute data-[active=true]:before:left-0 data-[active=true]:before:top-1.5 data-[active=true]:before:h-[calc(100%-0.75rem)] data-[active=true]:before:w-[3px] data-[active=true]:before:rounded-r-full data-[active=true]:before:bg-foreground group-data-[collapsible=icon]:data-[active=true]:before:hidden"
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
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
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
