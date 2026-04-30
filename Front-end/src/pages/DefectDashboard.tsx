import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Button,
  Chip,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
} from '@mui/material';
import { Visibility as ViewIcon, Add as AddIcon } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { defectApi } from '../services/defectApi';
import { StatusChip } from '../components/StatusChip';
import { ErrorAlert } from '../components/ErrorAlert';
import { useDefectStore } from '../store/defectStore';
import { format } from 'date-fns';
import { useState } from 'react';
import { DEFECT_CATEGORIES, DEFECT_PRIORITIES, type DefectCategory, type DefectPriority } from '../types/defect.types';

export const DefectDashboard: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { filters, setStatusFilter, setPriorityFilter, setCategoryFilter, setSearchQuery } = useDefectStore();
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [newDefect, setNewDefect] = useState({
    unitId: '',
    title: '',
    description: '',
    category: 'other' as DefectCategory,
    priority: 'medium' as DefectPriority,
    photoBeforeUrl: '',
    reportedBy: ''
  });

  const reportMutation = useMutation({
    mutationFn: defectApi.reportDefect,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['defects'] });
      setReportDialogOpen(false);
      setNewDefect({
        unitId: '',
        title: '',
        description: '',
        category: 'other',
        priority: 'medium',
        photoBeforeUrl: '',
        reportedBy: ''
      });
    }
  });

  const { data: defects, isLoading, error } = useQuery({
    queryKey: ['defects', 'cases', filters],
    queryFn: () =>
      defectApi.getAllDefects({
        status: filters.status !== 'all' ? filters.status : undefined,
        priority: filters.priority !== 'all' ? filters.priority : undefined,
        category: filters.category !== 'all' ? filters.category : undefined,
      }),
    refetchInterval: 30000,
    retry: 1,
    staleTime: 20000,
  });

  const filteredDefects = defects?.filter((d) => {
    const searchLower = filters.searchQuery.toLowerCase();
    return (
      d.defect_number.toLowerCase().includes(searchLower) ||
      d.unit_id.toLowerCase().includes(searchLower) ||
      d.title.toLowerCase().includes(searchLower)
    );
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <ErrorAlert 
        error={error} 
        title="ไม่สามารถโหลดข้อมูล Defects" 
      />
    );
  }

  return (
    <div style={{ padding: '0 20px' }}>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          Snagging & Defects
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setReportDialogOpen(true)}
        >
          Report Defect
        </Button>
      </div>

      {/* Filters */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <div className="row g-3">
          <div className="col-2">
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={filters.status}
                label="Status"
                onChange={(e) => setStatusFilter(e.target.value as any)}
              >
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="reported">Reported</MenuItem>
                <MenuItem value="scheduled">Scheduled</MenuItem>
                <MenuItem value="closed">Closed</MenuItem>
              </Select>
            </FormControl>
          </div>

          <div className="col-2">
            <FormControl fullWidth>
              <InputLabel>Priority</InputLabel>
              <Select
                value={filters.priority}
                label="Priority"
                onChange={(e) => setPriorityFilter(e.target.value as any)}
              >
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="critical">Critical</MenuItem>
                <MenuItem value="high">High</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="low">Low</MenuItem>
              </Select>
            </FormControl>
          </div>

          <div className="col-2">
            <FormControl fullWidth>
              <InputLabel>Category</InputLabel>
              <Select
                value={filters.category}
                label="Category"
                onChange={(e) => setCategoryFilter(e.target.value as any)}
              >
                <MenuItem value="all">All</MenuItem>
                {Object.entries(DEFECT_CATEGORIES).map(([key, label]) => (
                  <MenuItem key={key} value={key}>{label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </div>

          <div className="col-6">
            <TextField
              fullWidth
              label="Search by Defect # / Unit ID / Title"
              variant="outlined"
              value={filters.searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </Paper>

      {/* Results Count */}
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Found {filteredDefects?.length || 0} defect(s)
      </Typography>

      {/* Table */}
      <TableContainer component={Paper} sx={{ '& .MuiTableRow-root:hover': { backgroundColor: '#f8f9fa' } }}>
        <Table>
          <TableHead sx={{ backgroundColor: '#f8f9fa' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>Defect #</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Unit ID</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Title</TableCell>
              <TableCell align="center" sx={{ fontWeight: 600 }}>Category</TableCell>
              <TableCell align="center" sx={{ fontWeight: 600 }}>Priority</TableCell>
              <TableCell align="center" sx={{ fontWeight: 600 }}>Assigned To</TableCell>
              <TableCell align="center" sx={{ fontWeight: 600 }}>Status</TableCell>
              <TableCell align="center" sx={{ fontWeight: 600 }}>Reported</TableCell>
              <TableCell align="center" sx={{ fontWeight: 600 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredDefects && filteredDefects.length > 0 ? (
              filteredDefects.map((defect) => {
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
                  <TableRow 
                    key={defect.id} 
                    sx={{
                      bgcolor: defect.priority === 'critical' 
                        ? '#ffebee' 
                        : defect.priority === 'high'
                        ? '#fff3e0'
                        : 'inherit'
                    }}
                  >
                    <TableCell sx={{ fontWeight: 600 }}>{defect.defect_number}</TableCell>
                    <TableCell>{defect.unit_id}</TableCell>
                    <TableCell>{defect.title}</TableCell>
                    <TableCell align="center">
                      <Chip 
                        label={`${getCategoryIcon(defect.category)} ${DEFECT_CATEGORIES[defect.category]}`}
                        size="small" 
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Chip 
                        label={defect.priority.toUpperCase()} 
                        color={getPriorityColor(defect.priority) as any}
                        size="small"
                        sx={{ fontWeight: 600 }}
                      />
                    </TableCell>
                    <TableCell align="center">
                      {defect.assigned_to ? (
                        <Chip 
                          label={defect.assigned_to} 
                          size="small" 
                          color="primary"
                          variant="outlined"
                        />
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          Unassigned
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <StatusChip status={defect.status} size="medium" />
                    </TableCell>
                    <TableCell align="center">
                      {format(new Date(defect.reported_at), 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell align="center">
                      <IconButton
                        size="small"
                        onClick={() => navigate(`/defects/${defect.id}`)}
                        title="View Details"
                      >
                        <ViewIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  <Typography color="text.secondary" sx={{ py: 4 }}>
                    No defects found
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Report Defect Dialog */}
      <Dialog 
        open={reportDialogOpen} 
        onClose={() => setReportDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Report New Defect</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Unit ID"
              required
              fullWidth
              value={newDefect.unitId}
              onChange={(e) => setNewDefect({ ...newDefect, unitId: e.target.value })}
            />
            <TextField
              label="Title"
              required
              fullWidth
              value={newDefect.title}
              onChange={(e) => setNewDefect({ ...newDefect, title: e.target.value })}
            />
            <TextField
              label="Description"
              multiline
              rows={3}
              fullWidth
              value={newDefect.description}
              onChange={(e) => setNewDefect({ ...newDefect, description: e.target.value })}
            />
            <FormControl fullWidth required>
              <InputLabel>Category</InputLabel>
              <Select
                value={newDefect.category}
                label="Category"
                onChange={(e) => setNewDefect({ ...newDefect, category: e.target.value as DefectCategory })}
              >
                {Object.entries(DEFECT_CATEGORIES).map(([key, label]) => (
                  <MenuItem key={key} value={key}>{label}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth required>
              <InputLabel>Priority</InputLabel>
              <Select
                value={newDefect.priority}
                label="Priority"
                onChange={(e) => setNewDefect({ ...newDefect, priority: e.target.value as DefectPriority })}
              >
                {Object.entries(DEFECT_PRIORITIES).map(([key, label]) => (
                  <MenuItem key={key} value={key}>{label}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Photo URL (Before)"
              fullWidth
              value={newDefect.photoBeforeUrl}
              onChange={(e) => setNewDefect({ ...newDefect, photoBeforeUrl: e.target.value })}
              placeholder="https://..."
            />
            <TextField
              label="Reported By"
              required
              fullWidth
              value={newDefect.reportedBy}
              onChange={(e) => setNewDefect({ ...newDefect, reportedBy: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReportDialogOpen(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={() => reportMutation.mutate(newDefect)}
            disabled={!newDefect.unitId || !newDefect.title || !newDefect.reportedBy || reportMutation.isPending}
          >
            {reportMutation.isPending ? 'Reporting...' : 'Report Defect'}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};
