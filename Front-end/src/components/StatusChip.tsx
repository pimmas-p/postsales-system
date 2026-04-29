import { Chip } from '@mui/material';
import type { OverallStatus, EventStatus } from '../types/handover.types';

interface StatusChipProps {
  status: OverallStatus | EventStatus | string | null;
  size?: 'small' | 'medium';
}

export const StatusChip: React.FC<StatusChipProps> = ({ status, size = 'small' }) => {
  const getStatusColor = (status: string | null) => {
    switch (status) {
      // Positive statuses
      case 'completed':
      case 'verified':
        return 'success';
      
      // Ready/Info statuses
      case 'ready':
      case 'approved':
      case 'drafted':
      case 'uploaded':
      case 'assigned':
      case 'in_progress':
        return 'info';
      
      // Warning statuses
      case 'pending':
      case 'reported':
        return 'warning';
      
      // Error statuses
      case 'blocked':
      case 'rejected':
      case 'failed':
        return 'error';
      
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: string | null) => {
    if (!status) return 'N/A';
    // Convert snake_case to Title Case
    return status
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <Chip
      label={getStatusLabel(status)}
      color={getStatusColor(status)}
      size={size}
      sx={{ fontWeight: 500 }}
    />
  );
};
