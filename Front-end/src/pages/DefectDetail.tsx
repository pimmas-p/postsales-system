import { 
  Box, 
  Typography, 
  Paper, 
  Grid, 
  Chip, 
  Button,
  Stack,
  Card,
  CardContent,
  Divider,
  Avatar,
  Alert,
  CircularProgress,
  IconButton,
  ImageList,
  ImageListItem
} from '@mui/material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { defectApi } from '../services/defectApi';
import { 
  ArrowBack,
  Build,
  Warning,
  CheckCircle,
  Schedule,
  Person,
  Home,
  CalendarToday,
  Assignment,
  ShieldOutlined,
  History,
  PhotoCamera,
  AttachFile
} from '@mui/icons-material';
import { StatusChip } from '../components/StatusChip';
import { format } from 'date-fns';
import { API_BASE_URL } from '../lib/api';

export const DefectDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: defect, isLoading } = useQuery({
    queryKey: ['defects', id],
    queryFn: () => defectApi.getDefectById(id!),
    enabled: !!id,
  });

  // Fetch warranty information
  const { data: warranty } = useQuery({
    queryKey: ['defects', id, 'warranty'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/api/defects/${id}/warranty`);
      if (!response.ok) return null;
      const data = await response.json();
      return data.data;
    },
    enabled: !!id,
  });

  // Fetch unit history
  const { data: unitHistory } = useQuery({
    queryKey: ['defects', id, 'unit-history'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/api/defects/${id}/unit-history`);
      if (!response.ok) return null;
      const data = await response.json();
      return data.data;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!defect) {
    return (
      <Box>
        <Alert severity="error">Defect case not found</Alert>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/defects')} sx={{ mt: 2 }}>
          Back to Defects
        </Button>
      </Box>
    );
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'default';
      default: return 'default';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'electrical': return '⚡';
      case 'plumbing': return '🚰';
      case 'structural': return '🏗️';
      case 'hvac': return '❄️';
      case 'door_window': return '🚪';
      case 'cosmetic': return '🎨';
      default: return '🔧';
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Button 
          startIcon={<ArrowBack />} 
          onClick={() => navigate('/defects')}
          sx={{ mb: 2 }}
        >
          Back to Defects
        </Button>
        
        <Stack sx={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
              {defect.title}
            </Typography>
            <Stack sx={{ flexDirection: 'row', alignItems: 'center' }} spacing={2}>
              <Chip label={`#${defect.defect_number}`} variant="outlined" size="small" />
              <StatusChip status={defect.status} />
              <Chip 
                label={defect.priority.toUpperCase()} 
                color={getPriorityColor(defect.priority) as any}
                size="small"
                icon={<Warning />}
              />
              <Chip 
                label={`${getCategoryIcon(defect.category)} ${defect.category}`}
                size="small"
                variant="outlined"
              />
            </Stack>
          </Box>
          
          <Stack sx={{ flexDirection: 'row' }} spacing={2}>
            <Button variant="outlined" startIcon={<Assignment />}>
              Assign
            </Button>
            <Button variant="contained" startIcon={<CheckCircle />}>
              Mark Resolved
            </Button>
          </Stack>
        </Stack>
      </Box>

      <Grid container spacing={3}>
        {/* Left Column */}
        <Grid item xs={12} md={8}>
          {/* Defect Information */}
          <Paper elevation={0} sx={{ p: 3, mb: 3, border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              Defect Information
            </Typography>
            
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={6}>
                <Stack sx={{ flexDirection: 'row' }} spacing={1} alignItems="center">
                  <Person color="action" />
                  <Box>
                    <Typography variant="caption" color="text.secondary">Reported By</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{defect.reported_by}</Typography>
                  </Box>
                </Stack>
              </Grid>
              
              <Grid item xs={6}>
                <Stack sx={{ flexDirection: 'row' }} spacing={1} alignItems="center">
                  <CalendarToday color="action" />
                  <Box>
                    <Typography variant="caption" color="text.secondary">Reported Date</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {format(new Date(defect.reported_at), 'MMM dd, yyyy')}
                    </Typography>
                  </Box>
                </Stack>
              </Grid>
              
              <Grid item xs={6}>
                <Stack sx={{ flexDirection: 'row' }} spacing={1} alignItems="center">
                  <Home color="action" />
                  <Box>
                    <Typography variant="caption" color="text.secondary">Unit ID</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{defect.unit_id}</Typography>
                  </Box>
                </Stack>
              </Grid>

              {defect.assigned_to && (
                <Grid item xs={6}>
                  <Stack sx={{ flexDirection: 'row' }} spacing={1} alignItems="center">
                    <Build color="action" />
                    <Box>
                      <Typography variant="caption" color="text.secondary">Assigned To</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{defect.assigned_to}</Typography>
                    </Box>
                  </Stack>
                </Grid>
              )}
            </Grid>

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
              Description
            </Typography>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
              {defect.description || 'No description provided'}
            </Typography>

            {defect.resolution_notes && (
              <>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                  Resolution Notes
                </Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                  {defect.resolution_notes}
                </Typography>
              </>
            )}
          </Paper>

          {/* Photo Gallery */}
          {(defect.photo_before_url || defect.photo_after_url) && (
            <Paper elevation={0} sx={{ p: 3, mb: 3, border: '1px solid', borderColor: 'divider' }}>
              <Stack sx={{ flexDirection: 'row', alignItems: 'center', mb: 2 }} spacing={1}>
                <PhotoCamera color="action" />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Photos
                </Typography>
              </Stack>
              
              <Grid container spacing={2}>
                {defect.photo_before_url && (
                  <Grid item xs={12} sm={6}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="caption" color="text.secondary" gutterBottom>
                          Before Repair
                        </Typography>
                        <Box 
                          component="img"
                          src={defect.photo_before_url}
                          alt="Before repair"
                          sx={{ 
                            width: '100%', 
                            height: 200, 
                            objectFit: 'cover',
                            borderRadius: 1,
                            mt: 1
                          }}
                        />
                      </CardContent>
                    </Card>
                  </Grid>
                )}
                
                {defect.photo_after_url && (
                  <Grid item xs={12} sm={6}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="caption" color="text.secondary" gutterBottom>
                          After Repair
                        </Typography>
                        <Box 
                          component="img"
                          src={defect.photo_after_url}
                          alt="After repair"
                          sx={{ 
                            width: '100%', 
                            height: 200, 
                            objectFit: 'cover',
                            borderRadius: 1,
                            mt: 1
                          }}
                        />
                      </CardContent>
                    </Card>
                  </Grid>
                )}
              </Grid>
            </Paper>
          )}

          {/* Unit History Timeline */}
          {unitHistory && (
            <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider' }}>
              <Stack sx={{ flexDirection: 'row', alignItems: 'center', mb: 2 }} spacing={1}>
                <History color="action" />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Unit History
                </Typography>
              </Stack>
              
              {unitHistory.events && unitHistory.events.length > 0 ? (
                <Stack spacing={2}>
                  {unitHistory.events.slice(0, 5).map((event: any, index: number) => (
                    <Box key={index}>
                      <Stack direction="row" spacing={2}>
                        <Avatar 
                          sx={{ 
                            width: 32, 
                            height: 32, 
                            bgcolor: 'primary.light',
                            fontSize: '0.875rem'
                          }}
                        >
                          {index + 1}
                        </Avatar>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body2" fontWeight={600}>
                            {event.event_type || event.title}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {event.timestamp ? format(new Date(event.timestamp), 'MMM dd, yyyy HH:mm') : 'N/A'}
                          </Typography>
                          {event.description && (
                            <Typography variant="body2" sx={{ mt: 0.5 }}>
                              {event.description}
                            </Typography>
                          )}
                        </Box>
                      </Stack>
                      {index < unitHistory.events.length - 1 && <Divider sx={{ mt: 2 }} />}
                    </Box>
                  ))}
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No history available for this unit
                </Typography>
              )}
            </Paper>
          )}
        </Grid>

        {/* Right Column */}
        <Grid item xs={12} md={4}>
          {/* Warranty Coverage */}
          <Paper 
            elevation={0} 
            sx={{ 
              p: 3, 
              mb: 3, 
              border: '1px solid', 
              borderColor: warranty?.is_covered ? 'success.main' : 'divider',
              bgcolor: warranty?.is_covered ? 'success.50' : 'background.paper'
            }}
          >
            <Stack sx={{ flexDirection: 'row', alignItems: 'center', mb: 2 }} spacing={1}>
              <ShieldOutlined color={warranty?.is_covered ? 'success' : 'action'} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Warranty Coverage
              </Typography>
            </Stack>

            {warranty ? (
              <>
                <Alert 
                  severity={warranty.is_covered ? 'success' : 'warning'}
                  sx={{ mb: 2 }}
                >
                  {warranty.is_covered ? 'This defect is covered by warranty' : 'Not covered by warranty'}
                </Alert>

                <Stack spacing={2}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Contract ID</Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {warranty.contract_id || 'N/A'}
                    </Typography>
                  </Box>

                  {warranty.coverage_end_date && (
                    <Box>
                      <Typography variant="caption" color="text.secondary">Coverage Until</Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {format(new Date(warranty.coverage_end_date), 'MMM dd, yyyy')}
                      </Typography>
                    </Box>
                  )}

                  {warranty.covered_categories && warranty.covered_categories.length > 0 && (
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                        Covered Categories
                      </Typography>
                      <Stack direction="row" spacing={1} flexWrap="wrap">
                        {warranty.covered_categories.map((cat: string, idx: number) => (
                          <Chip key={idx} label={cat} size="small" variant="outlined" />
                        ))}
                      </Stack>
                    </Box>
                  )}
                </Stack>
              </>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Warranty information not available
              </Typography>
            )}
          </Paper>

          {/* Action Panel */}
          <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              Actions
            </Typography>
            
            <Stack spacing={2}>
              <Button 
                fullWidth 
                variant="outlined" 
                startIcon={<Assignment />}
                disabled={!!defect.assigned_to}
              >
                {defect.assigned_to ? 'Already Assigned' : 'Assign to Contractor'}
              </Button>

              <Button 
                fullWidth 
                variant="outlined" 
                startIcon={<Schedule />}
              >
                Schedule Repair
              </Button>

              <Button 
                fullWidth 
                variant="outlined" 
                startIcon={<PhotoCamera />}
              >
                Upload Photos
              </Button>

              <Button 
                fullWidth 
                variant="outlined" 
                startIcon={<AttachFile />}
              >
                Add Notes
              </Button>

              <Divider />

              <Button 
                fullWidth 
                variant="contained" 
                color="success"
                startIcon={<CheckCircle />}
                disabled={defect.status === 'resolved' || defect.status === 'verified'}
              >
                Mark as Resolved
              </Button>
            </Stack>
          </Paper>

          {/* Timeline */}
          <Paper elevation={0} sx={{ p: 3, mt: 3, border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              Timeline
            </Typography>
            
            <Stack spacing={2}>
              <Box>
                <Typography variant="caption" color="text.secondary">Created</Typography>
                <Typography variant="body2">
                  {format(new Date(defect.created_at), 'MMM dd, yyyy HH:mm')}
                </Typography>
              </Box>

              {defect.assigned_at && (
                <Box>
                  <Typography variant="caption" color="text.secondary">Assigned</Typography>
                  <Typography variant="body2">
                    {format(new Date(defect.assigned_at), 'MMM dd, yyyy HH:mm')}
                  </Typography>
                </Box>
              )}

              {defect.resolved_at && (
                <Box>
                  <Typography variant="caption" color="text.secondary">Resolved</Typography>
                  <Typography variant="body2">
                    {format(new Date(defect.resolved_at), 'MMM dd, yyyy HH:mm')}
                  </Typography>
                </Box>
              )}

              {defect.verified_at && (
                <Box>
                  <Typography variant="caption" color="text.secondary">Verified</Typography>
                  <Typography variant="body2">
                    {format(new Date(defect.verified_at), 'MMM dd, yyyy HH:mm')}
                  </Typography>
                </Box>
              )}
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};
