import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/auth-context";
import { DataProvider } from "@/contexts/data-context";
import { ThemeProvider } from "@/contexts/theme-context";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { AppShell } from "@/components/app-shell";
import { RequireAuth } from "@/components/require-auth";
import { LoginView } from "@/views/login";
import { DashboardView } from "@/views/dashboard";
import { CalendarView } from "@/views/calendar";
import { InvoicesView } from "@/views/invoices";
import { RealtorsView } from "@/views/realtors";
import { SettingsView } from "@/views/settings";
import { SharedView } from "@/views/shared";
import { PlaceholderView } from "@/views/placeholder";

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider delayDuration={100}>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginView />} />
              <Route path="/shared" element={<SharedView />} />
              <Route
                element={
                  <RequireAuth>
                    <DataProvider>
                      <AppShell />
                    </DataProvider>
                  </RequireAuth>
                }
              >
                <Route path="/" element={<DashboardView />} />
                <Route path="/invoices" element={<InvoicesView />} />
                <Route path="/calendar" element={<CalendarView />} />
                <Route path="/realtors" element={<RealtorsView />} />
                <Route path="/settings" element={<SettingsView />} />
              </Route>
              <Route
                path="*"
                element={<PlaceholderView title="Not found" />}
              />
            </Routes>
          </BrowserRouter>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
