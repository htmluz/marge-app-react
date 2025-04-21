import "./App.css";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { RouterProvider } from "react-router";
import { AuthProvider } from "@/contexts/AuthContext";
import { router } from "./routes";
import { TimestampProvider } from "./contexts/TimestampContext";

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <AuthProvider>
        <TimestampProvider>
          <RouterProvider router={router} />
        </TimestampProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
