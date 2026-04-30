import { 
  Box, 
  Typography, 
  Card, 
  CardContent, 
  Alert,
  LinearProgress,
  Chip,
  Button,
  Paper,
  Divider,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { handoverApi } from '../services/handoverApi';
import { onboardingApi } from '../services/onboardingApi';
import { defectApi } from '../services/defectApi';
import { 
  PersonAdd,
  Build,
  Add,
  Home,
  Assignment,
  TrendingUp,
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

  const statCards = [
    {
      title: 'Total Handovers',
      value: handoverStats?.total || 0,
      subtitle: `${handoverStats?.ready || 0} ready`,
      icon: <Home sx={{ fontSize: 32, color: '#5b7c99' }} />,
      action: () => navigate('/handover')
    },
    {
      title: 'Active Defects',
      value: (defectStats?.reported || 0) + (defectStats?.scheduled || 0),
      subtitle: `${defectStats?.critical || 0} critical`,
      icon: <Build sx={{ fontSize: 32, color: '#5b7c99' }} />,
      action: () => navigate('/defects')
    },
    {
      title: 'Owner Onboarding',
      value: onboardingStats?.in_progress || 0,
      subtitle: `${onboardingStats?.completed || 0} completed`,
      icon: <PersonAdd sx={{ fontSize: 32, color: '#5b7c99' }} />,
      action: () => navigate('/onboarding')
    },
    {
      title: 'Success Rate',
      value: handoverStats?.total 
        ? Math.round(((handoverStats?.completed || 0) / handoverStats.total) * 100) + '%'
        : '0%',
      subtitle: `${handoverStats?.completed || 0} delivered`,
      icon: <TrendingUp sx={{ fontSize: 32, color: '#5b7c99' }} />,
      action: () => {}
    },
  ];

  return (
    <div style={{ padding: '0 20px' }}>
      {/* Header */}
      <div className="mb-4">
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
          Post-Sales Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Welcome back! Here's what's happening with your properties today.
        </Typography>
      </div>

      {/* Stat Cards - Bootstrap Grid */}
      <div className="row g-3 mb-4">
        {statCards.map((card, index) => (
          <div className="col-3" key={index}>
            <Card 
              sx={{ 
                cursor: 'pointer',
                transition: 'box-shadow 0.2s',
                '&:hover': {
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                },
                height: '100%'
              }}
              onClick={card.action}
            >
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {card.title}
                    </Typography>
                    <Typography variant="h3" sx={{ fontWeight: 600, mb: 0.5 }}>
                      {card.value}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {card.subtitle}
                    </Typography>
                  </Box>
                  <Box>
                    {card.icon}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>

      {/* Handover Pipeline */}
      {handoverPipeline && (
        <Paper sx={{ p: 3, mb: 4 }}>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
            Handover Pipeline
          </Typography>
          <div className="row">
            <div className="col-6">
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">Pending</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {handoverStats?.pending || 0} ({handoverPipeline.pending.toFixed(0)}%)
                  </Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={handoverPipeline.pending} 
                  sx={{ height: 8, borderRadius: 1, bgcolor: '#f5f5f5' }}
                  color="warning"
                />
              </Box>
              
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">Ready</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {handoverStats?.ready || 0} ({handoverPipeline.ready.toFixed(0)}%)
                  </Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={handoverPipeline.ready} 
                  sx={{ height: 8, borderRadius: 1, bgcolor: '#f5f5f5' }}
                  color="success"
                />
              </Box>
            </div>

            <div className="col-6">
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">Completed</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {handoverStats?.completed || 0} ({handoverPipeline.completed.toFixed(0)}%)
                  </Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={handoverPipeline.completed} 
                  sx={{ height: 8, borderRadius: 1, bgcolor: '#f5f5f5' }}
                  color="primary"
                />
              </Box>
              
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">Blocked</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {handoverStats?.blocked || 0} ({handoverPipeline.blocked.toFixed(0)}%)
                  </Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={handoverPipeline.blocked} 
                  sx={{ height: 8, borderRadius: 1, bgcolor: '#f5f5f5' }}
                  color="error"
                />
              </Box>
            </div>
          </div>
        </Paper>
      )}

      {/* Performance Metrics & Quick Actions */}
      <div className="row g-3">
        {/* Performance Metrics */}
        <div className="col-6">
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
              Performance Metrics
            </Typography>
            
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">Defect Resolution Rate</Typography>
                <Chip 
                  label={defectStats?.total 
                    ? `${Math.round(((defectStats?.closed || 0) / defectStats.total) * 100)}%`
                    : '0%'
                  }
                  size="small" 
                  color="success"
                  sx={{ fontWeight: 600 }}
                />
              </Box>
              <Typography variant="body2">
                {defectStats?.closed || 0} of {defectStats?.total || 0} defects resolved
              </Typography>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
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
              </Box>
              <Typography variant="body2">
                {onboardingStats?.completed || 0} of {onboardingStats?.total || 0} owners onboarded
              </Typography>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">Critical Issues</Typography>
                <Chip 
                  label={defectStats?.critical || 0}
                  size="small" 
                  color={defectStats?.critical ? "error" : "default"}
                  sx={{ fontWeight: 600 }}
                />
              </Box>
              <Typography variant="body2">
                Requires immediate attention
              </Typography>
            </Box>
          </Paper>
        </div>

        {/* Quick Actions */}
        <div className="col-6">
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
              Quick Actions
            </Typography>
            
            <div className="d-flex flex-column gap-2">
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
                onClick={() => navigate('/defects')}
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
            </div>
          </Paper>
        </div>
      </div>

      {/* System Status Info */}
      <Alert severity="info" sx={{ mt: 4 }}>
        <strong>System Status:</strong> All services operational • Last updated: {new Date().toLocaleTimeString()}
      </Alert>
    </div>
  );
};
