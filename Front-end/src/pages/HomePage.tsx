import { Box, Typography, Card, CardContent, Grid, Alert } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { handoverApi } from '../services/handoverApi';
import { onboardingApi } from '../services/onboardingApi';
import { defectApi } from '../services/defectApi';
import { 
  AssignmentTurnedIn, 
  CheckCircle, 
  HourglassEmpty, 
  Block,
  PersonAdd,
  Build,
  Warning
} from '@mui/icons-material';

export const HomePage: React.FC = () => {
  const { data: handoverStats } = useQuery({
    queryKey: ['handover', 'stats'],
    queryFn: () => handoverApi.getStats(),
    refetchInterval: 30000,
    retry: 1,
    staleTime: 20000,
  });

  const { data: onboardingStats } = useQuery({
    queryKey: ['onboarding', 'stats'],
    queryFn: () => onboardingApi.getStats(),
    refetchInterval: 30000,
    retry: 1,
    staleTime: 20000,
  });

  const { data: defectStats } = useQuery({
    queryKey: ['defects', 'stats'],
    queryFn: () => defectApi.getStats(),
    refetchInterval: 30000,
    retry: 1,
    staleTime: 20000,
  });

  const handoverCards = [
    { title: 'Handover: Total', value: handoverStats?.total || 0, icon: <AssignmentTurnedIn />, color: '#1976d2' },
    { title: 'Handover: Ready', value: handoverStats?.ready || 0, icon: <CheckCircle />, color: '#2e7d32' },
    { title: 'Handover: Pending', value: handoverStats?.pending || 0, icon: <HourglassEmpty />, color: '#ed6c02' },
    { title: 'Handover: Completed', value: handoverStats?.completed || 0, icon: <CheckCircle />, color: '#4caf50' },
    { title: 'Handover: Blocked', value: handoverStats?.blocked || 0, icon: <Block />, color: '#d32f2f' },
  ];

  const onboardingCards = [
    { title: 'Onboarding: Total', value: onboardingStats?.total || 0, icon: <PersonAdd />, color: '#7b1fa2' },
    { title: 'Onboarding: Pending', value: onboardingStats?.pending || 0, icon: <HourglassEmpty />, color: '#ed6c02' },
    { title: 'Onboarding: In Progress', value: onboardingStats?.in_progress || 0, icon: <PersonAdd />, color: '#0288d1' },
    { title: 'Onboarding: Completed', value: onboardingStats?.completed || 0, icon: <CheckCircle />, color: '#2e7d32' },
  ];

  const defectCards = [
    { title: 'Defects: Total', value: defectStats?.total || 0, icon: <Build />, color: '#d84315' },
    { title: 'Defects: Reported', value: defectStats?.reported || 0, icon: <Warning />, color: '#f57c00' },
    { title: 'Defects: Assigned', value: defectStats?.assigned || 0, icon: <Build />, color: '#0288d1' },
    { title: 'Defects: Resolved', value: defectStats?.resolved || 0, icon: <CheckCircle />, color: '#388e3c' },
    { title: 'Defects: Critical', value: defectStats?.critical || 0, icon: <Warning />, color: '#c62828' },
  ];

  const allCards = [...handoverCards, ...onboardingCards, ...defectCards];

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, mb: 3 }}>
        Dashboard
      </Typography>

      <Grid container spacing={3}>
        {allCards.map((card, index) => (
          <Grid item xs={12} sm={6} md={4} lg={2.4} key={index}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Box
                    sx={{
                      p: 1,
                      borderRadius: 2,
                      backgroundColor: `${card.color}20`,
                      color: card.color,
                      display: 'flex',
                      mr: 2,
                    }}
                  >
                    {card.icon}
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {card.title}
                  </Typography>
                </Box>
                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                  {card.value}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Box sx={{ mt: 4 }}>
        <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
          Welcome to Post-Sales Management System
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          This system helps you manage the complete post-sales process including handover readiness,
          owner onboarding, and defect management.
        </Typography>
        
        <Alert severity="info" sx={{ mb: 2 }}>
          <strong>System Status:</strong> All 3 services are now operational! 🎉
        </Alert>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          <strong>• Handover Readiness:</strong> Track KYC, Contract, and Payment completion
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          <strong>• Owner Onboarding:</strong> Manage member registration and documentation
        </Typography>
        <Typography variant="body2" color="text.secondary">
          <strong>• Snagging & Defect:</strong> Report and track defect resolution workflow
        </Typography>
      </Box>
    </Box>
  );
};
