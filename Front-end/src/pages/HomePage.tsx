import { 
  Box, 
  Typography, 
  Card, 
  CardContent, 
  Grid, 
  Alert,
  LinearProgress,
  Chip,
  Button,
  Paper,
  Stack,
  Avatar,
  Divider,
  IconButton
} from '@mui/material';
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
  Warning,
  TrendingUp,
  Add,
  Notifications,
  ArrowForward,
  Home,
  Assignment
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useMemo } from 'react';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();

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

  const { data: handoverCases } = useQuery({
    queryKey: ['handover', 'all'],
    queryFn: () => handoverApi.getAllCases(),
    refetchInterval: 60000,
  });

  const { data: defectCases } = useQuery({
    queryKey: ['defects', 'all'],
    queryFn: () => defectApi.getAllDefects(),
    refetchInterval: 60000,
  });

  // Calculate urgent actions
  const urgentActions = useMemo(() => {
    const actions = [];
    
    if (handoverStats?.blocked && handoverStats.blocked > 0) {
      actions.push({
        type: 'blocked_handover',
        count: handoverStats.blocked,
        message: `${handoverStats.blocked} handover cases blocked`,
        severity: 'error' as const,
        action: () => navigate('/handover?filter=blocked')
      });
    }
    
    if (defectStats?.critical && defectStats.critical > 0) {
      actions.push({
        type: 'critical_defect',
        count: defectStats.critical,
        message: `${defectStats.critical} critical defects need attention`,
        severity: 'error' as const,
        action: () => navigate('/defects?priority=critical')
      });
    }
    
    if (handoverStats?.ready && handoverStats.ready > 0) {
      actions.push({
        type: 'ready_handover',
        count: handoverStats.ready,
        message: `${handoverStats.ready} units ready for handover`,
        severity: 'success' as const,
        action: () => navigate('/handover?filter=ready')
      });
    }
    
    return actions;
  }, [handoverStats, defectStats, navigate]);

  // Calculate handover pipeline percentages
  const handoverPipeline = useMemo(() => {
    const total = handoverStats?.total || 0;
    if (total === 0) return null;
    
    return {
      pending: ((handoverStats?.pending || 0) / total) * 100,
      ready: ((handoverStats?.ready || 0) / total) * 100,
      completed: ((handoverStats?.completed || 0) / total) * 100,
      blocked: ((handoverStats?.blocked || 0) / total) * 100,
    };
  }, [handoverStats]);

  const gradientCards = [
    {
      title: 'Total Handovers',
      value: handoverStats?.total || 0,
      subtitle: `${handoverStats?.ready || 0} ready to handover`,
      icon: <Home sx={{ fontSize: 40 }} />,
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      action: () => navigate('/handover')
    },
    {
      title: 'Active Defects',
      value: (defectStats?.reported || 0) + (defectStats?.assigned || 0),
      subtitle: `${defectStats?.critical || 0} critical priority`,
      icon: <Build sx={{ fontSize: 40 }} />,
      gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      action: () => navigate('/defects')
    },
    {
      title: 'Owner Onboarding',
      value: onboardingStats?.in_progress || 0,
      subtitle: `${onboardingStats?.completed || 0} completed`,
      icon: <PersonAdd sx={{ fontSize: 40 }} />,
      gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      action: () => navigate('/onboarding')
    },
    {
      title: 'Success Rate',
      value: handoverStats?.total 
        ? Math.round(((handoverStats?.completed || 0) / handoverStats.total) * 100) + '%'
        : '0%',
      subtitle: `${handoverStats?.completed || 0} units delivered`,
      icon: <TrendingUp sx={{ fontSize: 40 }} />,
      gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
      action: () => {}
    },
  ];

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, color: '#1a237e' }}>
          Post-Sales Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Welcome back! Here's what's happening with your properties today.
        </Typography>
      </Box>

      {/* Urgent Actions Alert */}
      {urgentActions.length > 0 && (
        <Paper 
          elevation={0} 
          sx={{ 
            p: 3, 
            mb: 3, 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            borderRadius: 2
          }}
        >
          <Stack sx={{ flexDirection: 'row' }} spacing={2} alignItems="center" sx={{ mb: 2 }}>
            <Notifications sx={{ fontSize: 32 }} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Urgent Actions Required
            </Typography>
          </Stack>
          <Grid container spacing={2}>
            {urgentActions.map((action, index) => (
              <Grid item xs={12} md={4} key={index}>
                <Paper 
                  sx={{ 
                    p: 2, 
                    bgcolor: 'rgba(255,255,255,0.95)',
                    cursor: 'pointer',
                    transition: 'transform 0.2s',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: 4
                    }
                  }}
                  onClick={action.action}
                >
                  <Stack sx={{ flexDirection: 'row' }} spacing={1} alignItems="center">
                    <Chip 
                      label={action.count} 
                      color={action.severity}
                      size="small"
                      sx={{ fontWeight: 700 }}
                    />
                    <Typography variant="body2" sx={{ flex: 1, color: 'text.primary' }}>
                      {action.message}
                    </Typography>
                    <ArrowForward fontSize="small" color="action" />
                  </Stack>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Paper>
      )}

      {/* Gradient Metric Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {gradientCards.map((card, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card 
              sx={{ 
                background: card.gradient,
                color: 'white',
                cursor: 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-8px)',
                  boxShadow: 8
                }
              }}
              onClick={card.action}
            >
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box>
                    <Typography variant="h3" sx={{ fontWeight: 700, mb: 0.5 }}>
                      {card.value}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      {card.title}
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 56, height: 56 }}>
                    {card.icon}
                  </Avatar>
                </Box>
                <Typography variant="caption" sx={{ opacity: 0.8 }}>
                  {card.subtitle}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Handover Pipeline */}
      {handoverPipeline && (
        <Paper elevation={0} sx={{ p: 3, mb: 4, border: '1px solid', borderColor: 'divider' }}>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
            Handover Pipeline
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Box sx={{ mb: 3 }}>
                <Stack sx={{ flexDirection: 'row', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">Pending</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {handoverStats?.pending || 0} ({handoverPipeline.pending.toFixed(0)}%)
                  </Typography>
                </Stack>
                <LinearProgress 
                  variant="determinate" 
                  value={handoverPipeline.pending} 
                  sx={{ height: 8, borderRadius: 1, bgcolor: '#f5f5f5' }}
                  color="warning"
                />
              </Box>
              
              <Box sx={{ mb: 3 }}>
                <Stack sx={{ flexDirection: 'row', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">Ready</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {handoverStats?.ready || 0} ({handoverPipeline.ready.toFixed(0)}%)
                  </Typography>
                </Stack>
                <LinearProgress 
                  variant="determinate" 
                  value={handoverPipeline.ready} 
                  sx={{ height: 8, borderRadius: 1, bgcolor: '#f5f5f5' }}
                  color="success"
                />
              </Box>
            </Grid>

            <Grid item xs={12} md={6}>
              <Box sx={{ mb: 3 }}>
                <Stack sx={{ flexDirection: 'row', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">Completed</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {handoverStats?.completed || 0} ({handoverPipeline.completed.toFixed(0)}%)
                  </Typography>
                </Stack>
                <LinearProgress 
                  variant="determinate" 
                  value={handoverPipeline.completed} 
                  sx={{ height: 8, borderRadius: 1, bgcolor: '#f5f5f5' }}
                  color="primary"
                />
              </Box>
              
              <Box sx={{ mb: 3 }}>
                <Stack sx={{ flexDirection: 'row', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">Blocked</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {handoverStats?.blocked || 0} ({handoverPipeline.blocked.toFixed(0)}%)
                  </Typography>
                </Stack>
                <LinearProgress 
                  variant="determinate" 
                  value={handoverPipeline.blocked} 
                  sx={{ height: 8, borderRadius: 1, bgcolor: '#f5f5f5' }}
                  color="error"
                />
              </Box>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* Performance Metrics & Quick Actions */}
      <Grid container spacing={3}>
        {/* Performance Metrics */}
        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{ p: 3, height: '100%', border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
              Performance Metrics
            </Typography>
            
            <Box sx={{ mb: 3 }}>
              <Stack sx={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">Defect Resolution Rate</Typography>
                <Chip 
                  label={defectStats?.total 
                    ? `${Math.round(((defectStats?.resolved || 0) / defectStats.total) * 100)}%`
                    : '0%'
                  }
                  size="small" 
                  color="success"
                  sx={{ fontWeight: 600 }}
                />
              </Stack>
              <Typography variant="body2">
                {defectStats?.resolved || 0} of {defectStats?.total || 0} defects resolved
              </Typography>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Box sx={{ mb: 3 }}>
              <Stack sx={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">Onboarding Completion</Typography>
                <Chip 
                  label={onboardingStats?.total 
                    ? `${Math.round(((onboardingStats?.completed || 0) / onboardingStats.total) * 100)}%`
                    : '0%'
                  }
                  size="small" 
                  color="primary"
                  sx={{ fontWeight: 600 }}
                />
              </Stack>
              <Typography variant="body2">
                {onboardingStats?.completed || 0} of {onboardingStats?.total || 0} owners onboarded
              </Typography>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Box>
              <Stack sx={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">Critical Issues</Typography>
                <Chip 
                  label={defectStats?.critical || 0}
                  size="small" 
                  color={defectStats?.critical ? "error" : "default"}
                  sx={{ fontWeight: 600 }}
                />
              </Stack>
              <Typography variant="body2">
                Requires immediate attention
              </Typography>
            </Box>
          </Paper>
        </Grid>

        {/* Quick Actions */}
        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{ p: 3, height: '100%', border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
              Quick Actions
            </Typography>
            
            <Stack spacing={2}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<Add />}
                sx={{ 
                  justifyContent: 'flex-start', 
                  py: 1.5,
                  textTransform: 'none',
                  fontWeight: 600
                }}
                onClick={() => navigate('/defects/new')}
              >
                Report New Defect
              </Button>

              <Button
                fullWidth
                variant="outlined"
                startIcon={<Assignment />}
                sx={{ 
                  justifyContent: 'flex-start', 
                  py: 1.5,
                  textTransform: 'none',
                  fontWeight: 600
                }}
                onClick={() => navigate('/handover')}
              >
                View All Handover Cases
              </Button>

              <Button
                fullWidth
                variant="outlined"
                startIcon={<PersonAdd />}
                sx={{ 
                  justifyContent: 'flex-start', 
                  py: 1.5,
                  textTransform: 'none',
                  fontWeight: 600
                }}
                onClick={() => navigate('/onboarding')}
              >
                Manage Owner Onboarding
              </Button>

              <Button
                fullWidth
                variant="outlined"
                startIcon={<Build />}
                sx={{ 
                  justifyContent: 'flex-start', 
                  py: 1.5,
                  textTransform: 'none',
                  fontWeight: 600
                }}
                onClick={() => navigate('/defects?status=assigned')}
              >
                Track Active Repairs
              </Button>
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      {/* System Status Info */}
      <Alert severity="success" sx={{ mt: 4 }}>
        <strong>System Status:</strong> All services operational • Last updated: {new Date().toLocaleTimeString()}
      </Alert>
    </Box>
  );
};
