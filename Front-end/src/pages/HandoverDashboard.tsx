import { useState } from 'react';
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
  Chip,
  CircularProgress,
  Alert,
} from '@mui/material';
import { Visibility as ViewIcon } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { handoverApi } from '../services/handoverApi';
import { StatusChip } from '../components/StatusChip';
import { useHandoverStore } from '../store/handoverStore';
import { format } from 'date-fns';

export const HandoverDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { filters, setStatusFilter, setSearchQuery } = useHandoverStore();

  const { data: cases, isLoading, error, refetch } = useQuery({
    queryKey: ['handover', 'cases', filters],
    queryFn: () =>
      handoverApi.getAllCases({
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
      <Alert severity="error" sx={{ mb: 2 }}>
        Error loading handover cases: {(error as Error).message}
      </Alert>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, mb: 3 }}>
        Handover Readiness
      </Typography>

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
              <MenuItem value="ready">Ready</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
              <MenuItem value="blocked">Blocked</MenuItem>
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
              <TableCell align="center">KYC</TableCell>
              <TableCell align="center">Contract</TableCell>
              <TableCell align="center">Payment</TableCell>
              <TableCell align="center">Overall Status</TableCell>
              <TableCell align="center">Created</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredCases && filteredCases.length > 0 ? (
              filteredCases.map((handoverCase) => (
                <TableRow key={handoverCase.id} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{handoverCase.unit_id}</TableCell>
                  <TableCell>{handoverCase.customer_id}</TableCell>
                  <TableCell align="center">
                    <StatusChip status={handoverCase.kyc_status} />
                  </TableCell>
                  <TableCell align="center">
                    <StatusChip status={handoverCase.contract_status} />
                  </TableCell>
                  <TableCell align="center">
                    <StatusChip status={handoverCase.payment_status} />
                  </TableCell>
                  <TableCell align="center">
                    <StatusChip status={handoverCase.overall_status} size="medium" />
                  </TableCell>
                  <TableCell align="center">
                    {format(new Date(handoverCase.created_at), 'dd/MM/yyyy')}
                  </TableCell>
                  <TableCell align="center">
                    <IconButton
                      size="small"
                      onClick={() => navigate(`/handover/${handoverCase.id}`)}
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
                    No handover cases found
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};
