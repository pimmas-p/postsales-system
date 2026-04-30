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
import { onboardingApi } from '../services/onboardingApi';

interface CompleteOnboardingDialogProps {
  open: boolean;
  onClose: () => void;
  caseId: string;
  onSuccess?: () => void;
}

export const CompleteOnboardingDialog: React.FC<CompleteOnboardingDialogProps> = ({
  open,
  onClose,
  caseId,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    completedBy: '',
    notes: '',
  });
  const [error, setError] = useState<string | null>(null);

  const completeMutation = useMutation({
    mutationFn: () => onboardingApi.completeOnboarding(caseId, formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding'] });
      onSuccess?.();
      handleClose();
    },
    onError: (err: any) => {
      setError(err.response?.data?.error || err.message || 'เกิดข้อผิดพลาดในการปิด onboarding');
    },
  });

  const handleClose = () => {
    setFormData({
      completedBy: '',
      notes: '',
    });
    setError(null);
    onClose();
  };

  const handleSubmit = () => {
    if (!formData.completedBy.trim()) {
      setError('กรุณากรอกชื่อผู้ดำเนินการ');
      return;
    }
    setError(null);
    completeMutation.mutate();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>ปิดการ Onboarding</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <TextField
            fullWidth
            label="ผู้ดำเนินการ *"
            value={formData.completedBy}
            onChange={(e) => setFormData({ ...formData, completedBy: e.target.value })}
            sx={{ mb: 2 }}
            required
            placeholder="เช่น staff-123 หรือ นายสมชาย ใจดี"
          />

          <TextField
            fullWidth
            label="หมายเหตุ (ถ้ามี)"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            multiline
            rows={3}
            placeholder="หมายเหตุเพิ่มเติมเกี่ยวกับการปิด onboarding..."
          />

          <Alert severity="info" sx={{ mt: 2, fontSize: '0.875rem' }}>
            การปิด onboarding จะทำให้:
            <ul style={{ marginTop: 8, marginBottom: 0, paddingLeft: 20 }}>
              <li>ส่งอีเวนต์ postsales.profile.activated ไปยังระบบอื่น</li>
              <li>เปลี่ยนสถานะเป็น "completed"</li>
              <li>ไม่สามารถแก้ไขข้อมูลได้อีก</li>
            </ul>
          </Alert>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={completeMutation.isPending}>
          ยกเลิก
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          color="success"
          disabled={completeMutation.isPending}
          startIcon={completeMutation.isPending ? <CircularProgress size={16} /> : null}
        >
          {completeMutation.isPending ? 'กำลังปิด...' : 'ยืนยันปิด Onboarding'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
