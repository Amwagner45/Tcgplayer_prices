import { useEffect, useMemo, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  CssBaseline,
  ThemeProvider,
  createTheme,
  type PaletteMode,
} from "@mui/material";
import Dashboard from "./components/Dashboard";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

function buildTheme(mode: PaletteMode) {
  const isDark = mode === "dark";

  return createTheme({
    palette: {
      mode,
      primary: {
        main: isDark ? "#7dd3fc" : "#0f6cbd",
      },
      secondary: {
        main: isDark ? "#34d399" : "#0f9d76",
      },
      success: {
        main: isDark ? "#4ade80" : "#0f9d58",
      },
      warning: {
        main: isDark ? "#fbbf24" : "#b7791f",
      },
      error: {
        main: isDark ? "#fb7185" : "#d13438",
      },
      background: {
        default: isDark ? "#07111f" : "#eef4fb",
        paper: isDark ? "#0d1a2b" : "#fbfdff",
      },
      text: {
        primary: isDark ? "#eef6ff" : "#0f172a",
        secondary: isDark ? "#8aa1ba" : "#52637a",
      },
      divider: isDark ? "rgba(148, 163, 184, 0.18)" : "rgba(15, 23, 42, 0.08)",
    },
    typography: {
      fontFamily: '"IBM Plex Sans", "Segoe UI", sans-serif',
      h1: { fontFamily: '"Space Grotesk", "IBM Plex Sans", sans-serif', fontWeight: 700 },
      h2: { fontFamily: '"Space Grotesk", "IBM Plex Sans", sans-serif', fontWeight: 700 },
      h3: { fontFamily: '"Space Grotesk", "IBM Plex Sans", sans-serif', fontWeight: 700 },
      h4: { fontFamily: '"Space Grotesk", "IBM Plex Sans", sans-serif', fontWeight: 700 },
      h5: { fontFamily: '"Space Grotesk", "IBM Plex Sans", sans-serif', fontWeight: 700 },
      h6: { fontFamily: '"Space Grotesk", "IBM Plex Sans", sans-serif', fontWeight: 700 },
      button: {
        fontWeight: 600,
      },
    },
    shape: {
      borderRadius: 18,
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundImage: isDark
              ? "radial-gradient(circle at top left, rgba(56, 189, 248, 0.14), transparent 28%), radial-gradient(circle at top right, rgba(52, 211, 153, 0.12), transparent 22%), linear-gradient(180deg, #07111f 0%, #09172a 100%)"
              : "radial-gradient(circle at top left, rgba(15, 108, 189, 0.12), transparent 24%), radial-gradient(circle at top right, rgba(15, 157, 118, 0.10), transparent 18%), linear-gradient(180deg, #f3f8fd 0%, #e8f0f8 100%)",
            backgroundAttachment: "fixed",
          },
        },
      },
      MuiPaper: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: {
            backgroundImage: "none",
            backdropFilter: "blur(18px)",
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: "none",
            borderRadius: 999,
            paddingInline: 16,
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            fontWeight: 600,
            borderRadius: 999,
          },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            textTransform: "none",
            fontWeight: 600,
          },
        },
      },
    },
  });
}

function App() {
  const [mode, setMode] = useState<PaletteMode>(() => {
    const stored = window.localStorage.getItem("tcg-dashboard-theme");
    return stored === "dark" || stored === "light" ? stored : "dark";
  });

  useEffect(() => {
    window.localStorage.setItem("tcg-dashboard-theme", mode);
  }, [mode]);

  const theme = useMemo(() => buildTheme(mode), [mode]);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Dashboard
          mode={mode}
          onToggleMode={() =>
            setMode((current) => (current === "dark" ? "light" : "dark"))
          }
        />
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App
