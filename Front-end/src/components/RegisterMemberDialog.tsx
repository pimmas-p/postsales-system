import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Alert,
  CircularProgress,
  Typography,
} from '@mui/material';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { onboardingApi } from '../services/onboardingApi';

interface RegisterMemberDialogProps {
  open: boolean;
  onClose: () => void;
  caseId: string;
  unitId: string;
  onSuccess?: () => void;
}

export const RegisterMemberDialog: React.FC<RegisterMemberDialogProps> = ({
  open,
  onClose,
  caseId,
  unitId,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    areaSize: '',
    billingCycle: 'MONTHLY' as 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY',
    effectiveDate: new Date().toISOString().split('T')[0],
  });

  const [error, setError] = useState<string | null>(null);

  const registerMutation = useMutation({
    mutationFn: async () => {
      // Validate passwords match
      if (formData.password !== formData.confirmPassword) {
        throw new Error('รหัสผ่านไม่ตรงกัน');
      }

      // Simple password hash (in production, use proper hashing)
      const passwordHash = btoa(formData.password); // Base64 encoding (NOT secure for production!)

      return await onboardingApi.registerMember(caseId, {
        email: formData.email,
        phone: formData.phone,
        passwordHash,
        areaSize: formData.areaSize ? parseFloat(formData.areaSize) : undefined,
        billingCycle: formData.billingCycle,
        effectiveDate: formData.effectiveDate,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding'] });
      onSuccess?.();
      onClose();
      setError(null);
    },
    onError: (err: any) => {
      setError(err.userMessage || err.message || 'เกิดข้อผิดพลาดในการลงทะเบียน');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    registerMutation.mutate();
  };

  const handleClose = () => {
    if (!registerMutation.isPending) {
      onClose();
      setError(null);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>ลงทะเบียนสมาชิก</DialogTitle>
        
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            {error && (
              <Alert severity="error" onClose={() => setError(null)}>
                {error}
              </Alert>
            )}

            <Typography variant="body2" color="text.secondary">
              Unit ID: <strong>{unitId}</strong>
            </Typography>

            <TextField
              required
              fullWidth
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              disabled={registerMutation.isPending}
            />

            <TextField
              required
              fullWidth
              label="Phone"
              type="tel"
              placeholder="0812345678"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              disabled={registerMutation.isPending}
            />

            <TextField
              required
              fullWidth
              label="Password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              disabled={registerMutation.isPending}
            />

            <TextField
              required
              fullWidth
              label="Confirm Password"
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              disabled={registerMutation.isPending}
            />

            <TextField
              fullWidth
              label="Area Size (sqm)"
              type="number"
              value={formData.areaSize}
              onChange={(e) => setFormData({ ...formData, areaSize: e.target.value })}
              disabled={registerMutation.isPending}
              helperText="Optional - Will fetch from Inventory API if not provided"
              inputProps={{ min: 0, step: 0.1 }}
            />

            <FormControl fullWidth disabled={registerMutation.isPending}>
              <InputLabel>Billing Cycle</InputLabel>
              <Select
                value={formData.billingCycle}
                label="Billing Cycle"
                onChange={(e) => setFormData({ 
                  ...formData, 
                  billingCycle: e.target.value as any 
                })}
              >
                <MenuItem value="MONTHLY">Monthly (รายเดือน)</MenuItem>
                <MenuItem value="QUARTERLY">Quarterly (รายไตรมาส)</MenuItem>
                <MenuItem value="ANNUALLY">Annually (รายปี)</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Effective Date"
              type="date"
              value={formData.effectiveDate}
              onChange={(e) => setFormData({ ...formData, effectiveDate: e.target.value })}
              disabled={registerMutation.isPending}
              helperText="วันที่เริ่มเก็บค่าส่วนกลาง"
              InputLabelProps={{ shrink: true }}
            />

            {registerMutation.isPending && (
              <Box display="flex" alignItems="center" gap={1} mt={1}>
                <CircularProgress size={20} />
                <Typography variant="body2" color="text.secondary">
                  กำลังลงทะเบียนและแจ้งทีม Payment...
                </Typography>
              </Box>
            )}
          </Box>
        </DialogContent>

        <DialogActions>
          <Button onClick={handleClose} disabled={registerMutation.isPending}>
            ยกเลิก
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={registerMutation.isPending}
          >
            {registerMutation.isPending ? 'กำลังบันทึก...' : 'ลงทะเบียน'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};
