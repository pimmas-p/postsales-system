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
} from '@mui/material';
import { Visibility as ViewIcon, Add as AddIcon } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { defectApi } from '../services/defectApi';
import { StatusChip } from '../components/StatusChip';
import { ErrorAlert } from '../components/ErrorAlert';
import { useDefectStore } from '../store/defectStore';
import { format } from 'date-fns';
import { useState } from 'react';
import { DEFECT_CATEGORIES, DEFECT_PRIORITIES } from '../types/defect.types';

export const DefectDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { filters, setStatusFilter, setPriorityFilter, setCategoryFilter, setSearchQuery } = useDefectStore();
  const [reportDialogOpen, setReportDialogOpen] = useState(false);

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
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
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
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Snagging & Defects
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setReportDialogOpen(true)}
        >
          Report Defect
        </Button>
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box display="flex" gap={2} flexWrap="wrap">
          <FormControl sx={{ minWidth: 150 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={filters.status}
              label="Status"
              onChange={(e) => setStatusFilter(e.target.value as any)}
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="reported">Reported</MenuItem>
              <MenuItem value="assigned">Assigned</MenuItem>
              <MenuItem value="in_progress">In Progress</MenuItem>
              <MenuItem value="resolved">Resolved</MenuItem>
              <MenuItem value="verified">Verified</MenuItem>
            </Select>
          </FormControl>

          <FormControl sx={{ minWidth: 150 }}>
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

          <FormControl sx={{ minWidth: 180 }}>
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

          <TextField
            label="Search by Defect # / Unit ID / Title"
            variant="outlined"
            value={filters.searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ flexGrow: 1, minWidth: 300 }}
          />
        </Box>
      </Paper>

      {/* Results Count */}
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Found {filteredDefects?.length || 0} defect(s)
      </Typography>

      {/* Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Defect #</TableCell>
              <TableCell>Unit ID</TableCell>
              <TableCell>Title</TableCell>
              <TableCell align="center">Category</TableCell>
              <TableCell align="center">Priority</TableCell>
              <TableCell align="center">Status</TableCell>
              <TableCell align="center">Reported</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredDefects && filteredDefects.length > 0 ? (
              filteredDefects.map((defect) => (
                <TableRow key={defect.id} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{defect.defect_number}</TableCell>
                  <TableCell>{defect.unit_id}</TableCell>
                  <TableCell>{defect.title}</TableCell>
                  <TableCell align="center">
                    <Chip 
                      label={DEFECT_CATEGORIES[defect.category].split(' ')[0]} 
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
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <Typography color="text.secondary" py={4}>
                    No defects found
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Note: ReportDefectDialog component should be added here */}
    </Box>
  );
};
