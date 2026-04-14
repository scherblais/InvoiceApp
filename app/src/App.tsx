import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/auth-context";
import { ThemeProvider } from "@/contexts/theme-context";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { AppShell } from "@/components/app-shell";
import { RequireAuth } from "@/components/require-auth";
import { LoginView } from "@/views/login";
import { PlaceholderView } from "@/views/placeholder";

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider delayDuration={100}>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginView />} />
              <Route
                element={
                  <RequireAuth>
                    <AppShell />
                  </RequireAuth>
                }
              >
                <Route
                  path="/"
                  element={
                    <PlaceholderView
                      title="Dashboard"
                      description="Dashboard view ported next."
                    />
                  }
                />
                <Route
                  path="/invoices"
                  element={<PlaceholderView title="Invoicing" />}
                />
                <Route
                  path="/calendar"
                  element={<PlaceholderView title="Calendar" />}
                />
                <Route
                  path="/realtors"
                  element={<PlaceholderView title="Realtors" />}
                />
                <Route
                  path="/settings"
                  element={<PlaceholderView title="Settings" />}
                />
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
