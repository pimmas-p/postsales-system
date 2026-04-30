import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { DashboardLayout } from './layouts/DashboardLayout';
import { HomePage } from './pages/HomePage';
import { HandoverDashboard } from './pages/HandoverDashboard';
import { HandoverDetail } from './pages/HandoverDetail';
import { OnboardingDashboard } from './pages/OnboardingDashboard';
import { OnboardingDetail } from './pages/OnboardingDetail';
import { DefectDashboard } from './pages/DefectDashboard';
import { DefectDetail } from './pages/DefectDetail';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30000, // 30 seconds
    },
  },
});

// Create minimal theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#5b7c99',
    },
    secondary: {
      main: '#6c757d',
    },
    background: {
      default: '#f8f9fa',
      paper: '#ffffff',
    },
    grey: {
      50: '#f8f9fa',
      100: '#e9ecef',
      200: '#dee2e6',
      300: '#ced4da',
      400: '#adb5bd',
      500: '#6c757d',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 600,
      fontSize: '1.75rem',
    },
    h5: {
      fontWeight: 600,
      fontSize: '1.5rem',
    },
    h6: {
      fontWeight: 600,
      fontSize: '1.25rem',
    },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          border: '1px solid #e9ecef',
        },
      },
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<DashboardLayout />}>
              <Route index element={<HomePage />} />
              <Route path="handover" element={<HandoverDashboard />} />
              <Route path="handover/:id" element={<HandoverDetail />} />
              <Route path="onboarding" element={<OnboardingDashboard />} />
              <Route path="onboarding/:id" element={<OnboardingDetail />} />
              <Route path="defects" element={<DefectDashboard />} />
              <Route path="defects/:id" element={<DefectDetail />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;

