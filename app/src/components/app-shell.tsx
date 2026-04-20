import { Outlet, useLocation } from "react-router-dom";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { AppSidebar } from "@/components/app-sidebar";
import { CommandMenu } from "@/components/command-menu";

export function AppShell() {
  // Keying the outlet wrapper by pathname forces a remount on every
  // navigation, which in turn replays the animate-in classes below
  // so each view fades into place instead of appearing instantly.
  const location = useLocation();

  return (
    <SidebarProvider className="h-svh min-h-svh">
      <AppSidebar />
      <SidebarInset className="h-svh overflow-hidden">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4 md:hidden">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <span className="text-sm font-semibold">Lumeria Media</span>
        </header>
        <main className="flex-1 overflow-auto">
          <div
            key={location.pathname}
            className="h-full animate-in fade-in-0 slide-in-from-bottom-1 duration-200 ease-out motion-reduce:animate-none"
          >
            <Outlet />
          </div>
        </main>
      </SidebarInset>
      <CommandMenu />
    </SidebarProvider>
  );
}
