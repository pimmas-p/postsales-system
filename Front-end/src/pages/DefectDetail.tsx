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
  ImageListItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField
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
} from '@mui/icons-material';
import { StatusChip } from '../components/StatusChip';
import { format } from 'date-fns';
import { API_BASE_URL } from '../lib/api';
import { useState } from 'react';

export const DefectDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [scheduleData, setScheduleData] = useState({
    assignedTo: '',
    scheduledDate: '',
    repairNotes: ''
  });
  const [closeData, setCloseData] = useState({
    closedBy: '',
    closingNotes: '',
    photoAfterUrl: ''
  });

  const scheduleMutation = useMutation({
    mutationFn: (data: any) => defectApi.scheduleRepair(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['defects', id] });
      setScheduleDialogOpen(false);
      setScheduleData({ assignedTo: '', scheduledDate: '', repairNotes: '' });
    }
  });

  const closeMutation = useMutation({
    mutationFn: (data: any) => defectApi.closeDefect(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['defects', id] });
      setCloseDialogOpen(false);
      setCloseData({ closedBy: '', closingNotes: '', photoAfterUrl: '' });
    }
  });

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
    <div style={{ padding: '0 20px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <Button 
          startIcon={<ArrowBack />} 
          onClick={() => navigate('/defects')}
          sx={{ mb: 2 }}
        >
          Back to Defects
        </Button>
        
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
              {defect.title}
            </Typography>
            <div className="d-flex align-items-center" style={{ gap: '16px' }}>
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
            </div>
          </div>
        </div>
      </div>

      <div className="row g-3">
        {/* Left Column */}
        <div className="col-8">
          {/* Defect Information */}
          <Paper elevation={0} sx={{ p: 3, mb: 3, border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              Defect Information
            </Typography>
            
            <div className="row g-3" style={{ marginBottom: '24px' }}>
              <div className="col-6">
                <div className="d-flex align-items-center" style={{ gap: '8px' }}>
                  <Person color="action" />
                  <div>
                    <Typography variant="caption" color="text.secondary">Reported By</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{defect.reported_by}</Typography>
                  </div>
                </div>
              </div>
              
              <div className="col-6">
                <div className="d-flex align-items-center" style={{ gap: '8px' }}>
                  <CalendarToday color="action" />
                  <div>
                    <Typography variant="caption" color="text.secondary">Reported Date</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {format(new Date(defect.reported_at), 'MMM dd, yyyy')}
                    </Typography>
                  </div>
                </div>
              </div>
              
              <div className="col-6">
                <div className="d-flex align-items-center" style={{ gap: '8px' }}>
                  <Home color="action" />
                  <div>
                    <Typography variant="caption" color="text.secondary">Unit ID</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{defect.unit_id}</Typography>
                  </div>
                </div>
              </div>

              {defect.assigned_to && (
                <div className="col-6">
                  <div className="d-flex align-items-center" style={{ gap: '8px' }}>
                    <Build color="action" />
                    <div>
                      <Typography variant="caption" color="text.secondary">Assigned To</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{defect.assigned_to}</Typography>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
              Description
            </Typography>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
              {defect.description || 'No description provided'}
            </Typography>

            {defect.repair_notes && (
              <>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                  Repair Notes
                </Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                  {defect.repair_notes}
                </Typography>
              </>
            )}

            {defect.closing_notes && (
              <>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                  Closing Notes
                </Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                  {defect.closing_notes}
                </Typography>
              </>
            )}
          </Paper>

          {/* Photo Gallery */}
          {(defect.photo_before_url || defect.photo_after_url) && (
            <Paper elevation={0} sx={{ p: 3, mb: 3, border: '1px solid', borderColor: 'divider' }}>
              <div className="d-flex align-items-center" style={{ gap: '8px', marginBottom: '16px' }}>
                <PhotoCamera color="action" />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Photos
                </Typography>
              </div>
              
              <div className="row g-2">
                {defect.photo_before_url && (
                  <div className="col-6">
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
                  </div>
                )}
                
                {defect.photo_after_url && (
                  <div className="col-6">
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
                  </div>
                )}
              </div>
            </Paper>
          )}

          {/* Unit History Timeline */}
          {unitHistory && (
            <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider' }}>
              <div className="d-flex align-items-center" style={{ gap: '8px', marginBottom: '16px' }}>
                <History color="action" />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Unit History
                </Typography>
              </div>
              
              {unitHistory.events && unitHistory.events.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {unitHistory.events.slice(0, 5).map((event: any, index: number) => (
                    <div key={index}>
                      <div className="d-flex" style={{ gap: '16px' }}>
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
                        <div style={{ flex: 1 }}>
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
                        </div>
                      </div>
                      {index < unitHistory.events.length - 1 && <Divider sx={{ mt: 2 }} />}
                    </div>
                  ))}
                </div>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No history available for this unit
                </Typography>
              )}
            </Paper>
          )}
        </div>

        {/* Right Column */}
        <div className="col-4">
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
            <div className="d-flex align-items-center" style={{ gap: '8px', marginBottom: '16px' }}>
              <ShieldOutlined color={warranty?.is_covered ? 'success' : 'action'} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Warranty Coverage
              </Typography>
            </div>

            {warranty ? (
              <>
                <Alert 
                  severity={warranty.is_covered ? 'success' : 'warning'}
                  sx={{ mb: 2 }}
                >
                  {warranty.is_covered ? 'This defect is covered by warranty' : 'Not covered by warranty'}
                </Alert>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
                      <div className="d-flex flex-wrap" style={{ gap: '8px' }}>
                        {warranty.covered_categories.map((cat: string, idx: number) => (
                          <Chip key={idx} label={cat} size="small" variant="outlined" />
                        ))}
                      </div>
                    </Box>
                  )}
                </div>
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
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {defect.status === 'reported' && (
                <Button 
                  fullWidth 
                  variant="contained" 
                  startIcon={<Schedule />}
                  onClick={() => setScheduleDialogOpen(true)}
                >
                  Schedule Repair
                </Button>
              )}

              {defect.status === 'scheduled' && (
                <Button 
                  fullWidth 
                  variant="contained"
                  color="success"
                  startIcon={<CheckCircle />}
                  onClick={() => setCloseDialogOpen(true)}
                >
                  Close Case
                </Button>
              )}
            </div>
          </Paper>

          {/* Timeline */}
          <Paper elevation={0} sx={{ p: 3, mt: 3, border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              Timeline
            </Typography>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <Box>
                <Typography variant="caption" color="text.secondary">Reported</Typography>
                <Typography variant="body2">
                  {format(new Date(defect.reported_at), 'MMM dd, yyyy HH:mm')}
                </Typography>
              </Box>

              {defect.repair_scheduled_date && (
                <Box>
                  <Typography variant="caption" color="text.secondary">Repair Scheduled</Typography>
                  <Typography variant="body2">
                    {format(new Date(defect.repair_scheduled_date), 'MMM dd, yyyy HH:mm')}
                  </Typography>
                </Box>
              )}

              {defect.closed_at && (
                <Box>
                  <Typography variant="caption" color="text.secondary">Closed</Typography>
                  <Typography variant="body2">
                    {format(new Date(defect.closed_at), 'MMM dd, yyyy HH:mm')}
                  </Typography>
                </Box>
              )}
            </div>
          </Paper>
        </div>
      </div>

      {/* Schedule Repair Dialog */}
      <Dialog 
        open={scheduleDialogOpen} 
        onClose={() => setScheduleDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Schedule Repair</DialogTitle>
        <DialogContent>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '8px' }}>
            <TextField
              label="Contractor Name"
              required
              fullWidth
              value={scheduleData.assignedTo}
              onChange={(e) => setScheduleData({ ...scheduleData, assignedTo: e.target.value })}
            />
            <TextField
              label="Scheduled Date"
              type="datetime-local"
              required
              fullWidth
              value={scheduleData.scheduledDate}
              onChange={(e) => setScheduleData({ ...scheduleData, scheduledDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Repair Notes"
              multiline
              rows={3}
              fullWidth
              value={scheduleData.repairNotes}
              onChange={(e) => setScheduleData({ ...scheduleData, repairNotes: e.target.value })}
            />
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setScheduleDialogOpen(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={() => scheduleMutation.mutate(scheduleData)}
            disabled={!scheduleData.assignedTo || !scheduleData.scheduledDate || scheduleMutation.isPending}
          >
            {scheduleMutation.isPending ? 'Scheduling...' : 'Schedule'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Close Case Dialog */}
      <Dialog 
        open={closeDialogOpen} 
        onClose={() => setCloseDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Close Defect Case</DialogTitle>
        <DialogContent>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '8px' }}>
            <TextField
              label="Closed By"
              required
              fullWidth
              value={closeData.closedBy}
              onChange={(e) => setCloseData({ ...closeData, closedBy: e.target.value })}
            />
            <TextField
              label="Closing Notes"
              multiline
              rows={3}
              fullWidth
              value={closeData.closingNotes}
              onChange={(e) => setCloseData({ ...closeData, closingNotes: e.target.value })}
            />
            <TextField
              label="Photo URL (After Repair)"
              fullWidth
              value={closeData.photoAfterUrl}
              onChange={(e) => setCloseData({ ...closeData, photoAfterUrl: e.target.value })}
              placeholder="https://..."
            />
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCloseDialogOpen(false)}>Cancel</Button>
          <Button 
            variant="contained"
            color="success"
            onClick={() => closeMutation.mutate(closeData)}
            disabled={!closeData.closedBy || closeMutation.isPending}
          >
            {closeMutation.isPending ? 'Closing...' : 'Close Case'}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};
