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

// Create theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
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

