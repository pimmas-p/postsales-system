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
  CircularProgress,
  Alert,
} from '@mui/material';
import { Visibility as ViewIcon } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { onboardingApi } from '../services/onboardingApi';
import { StatusChip } from '../components/StatusChip';
import { ErrorAlert } from '../components/ErrorAlert';
import { useOnboardingStore } from '../store/onboardingStore';
import { format } from 'date-fns';
import { useState } from 'react';

export const OnboardingDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { filters, setStatusFilter, setSearchQuery } = useOnboardingStore();

  const { data: cases, isLoading, error } = useQuery({
    queryKey: ['onboarding', 'cases', filters],
    queryFn: () =>
      onboardingApi.getAllCases({
        status: filters.status !== 'all' ? filters.status : undefined,
      }),
    refetchInterval: 30000,
    retry: 1,
    staleTime: 20000,
  });

  const filteredCases = cases?.filter((c) => {
    const searchLower = filters.searchQuery.toLowerCase();
    return (
      c.unit_id.toLowerCase().includes(searchLower) ||
      c.customer_id.toLowerCase().includes(searchLower)
    );
  });

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
        title="ไม่สามารถโหลดข้อมูล Owner Onboarding" 
      />
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Owner Onboarding
        </Typography>
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box display="flex" gap={2} flexWrap="wrap">
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={filters.status}
              label="Status"
              onChange={(e) => setStatusFilter(e.target.value as any)}
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="in_progress">In Progress</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
            </Select>
          </FormControl>

          <TextField
            label="Search by Unit ID or Customer ID"
            variant="outlined"
            value={filters.searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ flexGrow: 1, minWidth: 300 }}
          />
        </Box>
      </Paper>

      {/* Results Count */}
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Found {filteredCases?.length || 0} case(s)
      </Typography>

      {/* Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Unit ID</TableCell>
              <TableCell>Customer ID</TableCell>
              <TableCell>Email</TableCell>
              <TableCell align="center">Area (sqm)</TableCell>
              <TableCell align="center">Registration</TableCell>
              <TableCell align="center">Documents</TableCell>
              <TableCell align="center">Overall Status</TableCell>
              <TableCell align="center">Created</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredCases && filteredCases.length > 0 ? (
              filteredCases.map((onboardingCase) => (
                <TableRow key={onboardingCase.id} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{onboardingCase.unit_id}</TableCell>
                  <TableCell>{onboardingCase.customer_id}</TableCell>
                  <TableCell>{onboardingCase.email || '-'}</TableCell>
                  <TableCell align="center">
                    {onboardingCase.area_size ? 
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {onboardingCase.area_size.toFixed(1)}
                      </Typography> 
                      : '-'}
                  </TableCell>
                  <TableCell align="center">
                    <StatusChip status={onboardingCase.registration_status} />
                  </TableCell>
                  <TableCell align="center">
                    <StatusChip status={onboardingCase.document_status} />
                  </TableCell>
                  <TableCell align="center">
                    <StatusChip status={onboardingCase.overall_status} size="medium" />
                  </TableCell>
                  <TableCell align="center">
                    {format(new Date(onboardingCase.created_at), 'dd/MM/yyyy')}
                  </TableCell>
                  <TableCell align="center">
                    <IconButton
                      size="small"
                      onClick={() => navigate(`/onboarding/${onboardingCase.id}`)}
                      title="View Details"
                    >
                      <ViewIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  <Typography color="text.secondary" py={4}>
                    No onboarding cases found
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Note: CreateOnboardingDialog component should be added here */}
    </Box>
  );
};
