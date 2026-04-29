import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Alert,
  CircularProgress,
} from '@mui/material';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { handoverApi } from '../services/handoverApi';

interface CompleteHandoverDialogProps {
  open: boolean;
  onClose: () => void;
  caseId: string;
  onSuccess?: () => void;
}

export const CompleteHandoverDialog: React.FC<CompleteHandoverDialogProps> = ({
  open,
  onClose,
  caseId,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    handoverDate: new Date().toISOString().split('T')[0],
    handoverBy: '',
    notes: '',
  });
  const [error, setError] = useState<string | null>(null);

  const completeMutation = useMutation({
    mutationFn: () => handoverApi.completeHandover(caseId, formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['handover'] });
      onSuccess?.();
      handleClose();
    },
    onError: (err: any) => {
      setError(err.response?.data?.error || err.message || 'Failed to complete handover');
    },
  });

  const handleClose = () => {
    setFormData({
      handoverDate: new Date().toISOString().split('T')[0],
      handoverBy: '',
      notes: '',
    });
    setError(null);
    onClose();
  };

  const handleSubmit = () => {
    if (!formData.handoverBy.trim()) {
      setError('Handover by is required');
      return;
    }
    setError(null);
    completeMutation.mutate();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Complete Handover</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <TextField
            fullWidth
            label="Handover Date"
            type="date"
            value={formData.handoverDate}
            onChange={(e) => setFormData({ ...formData, handoverDate: e.target.value })}
            InputLabelProps={{ shrink: true }}
            sx={{ mb: 2 }}
            required
          />

          <TextField
            fullWidth
            label="Handover By (Staff ID or Name)"
            value={formData.handoverBy}
            onChange={(e) => setFormData({ ...formData, handoverBy: e.target.value })}
            sx={{ mb: 2 }}
            required
            placeholder="e.g., staff-123 or John Doe"
          />

          <TextField
            fullWidth
            label="Notes (Optional)"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            multiline
            rows={3}
            placeholder="Additional notes about the handover..."
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={completeMutation.isPending}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={completeMutation.isPending}
          startIcon={completeMutation.isPending ? <CircularProgress size={16} /> : null}
        >
          {completeMutation.isPending ? 'Completing...' : 'Complete Handover'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
