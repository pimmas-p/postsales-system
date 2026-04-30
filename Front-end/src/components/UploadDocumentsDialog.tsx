import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Alert,
  CircularProgress,
  Typography,
  TextField,
  Stack,
  Paper,
} from '@mui/material';
import { CloudUpload, Description } from '@mui/icons-material';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { onboardingApi } from '../services/onboardingApi';

interface UploadDocumentsDialogProps {
  open: boolean;
  onClose: () => void;
  caseId: string;
  onSuccess?: () => void;
}

export const UploadDocumentsDialog: React.FC<UploadDocumentsDialogProps> = ({
  open,
  onClose,
  caseId,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  
  const [contractDocFile, setContractDocFile] = useState<File | null>(null);
  const [contractDocUrl, setContractDocUrl] = useState('');
  const [uploadMode, setUploadMode] = useState<'file' | 'url'>('file');
  const [error, setError] = useState<string | null>(null);

  const uploadMutation = useMutation({
    mutationFn: async () => {
      let finalContractDocUrl = '';

      if (uploadMode === 'file') {
        // Convert file to base64
        if (!contractDocFile) {
          throw new Error('กรุณาเลือกไฟล์สัญญา');
        }

        finalContractDocUrl = await fileToBase64(contractDocFile);
      } else {
        // Use URL
        if (!contractDocUrl.trim()) {
          throw new Error('กรุณากรอก URL สัญญา');
        }
        finalContractDocUrl = contractDocUrl.trim();
      }

      return await onboardingApi.uploadDocuments(caseId, {
        contractDocumentUrl: finalContractDocUrl,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding'] });
      onSuccess?.();
      handleClose();
    },
    onError: (err: any) => {
      setError(err.message || 'เกิดข้อผิดพลาดในการอัปโหลดเอกสาร');
    },
  });

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    uploadMutation.mutate();
  };

  const handleClose = () => {
    if (!uploadMutation.isPending) {
      setContractDocFile(null);
      setContractDocUrl('');
      setError(null);
      onClose();
    }
  };

  const handleFileChange = (file: File | null) => {
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('ไฟล์มีขนาดใหญ่เกิน 5MB');
        return;
      }

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        setError('รองรับเฉพาะไฟล์ JPG, PNG, หรือ PDF เท่านั้น');
        return;
      }
    }

    setContractDocFile(file);
    setError(null);
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>อัปโหลดเอกสาร</DialogTitle>
        
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            {error && (
              <Alert severity="error" onClose={() => setError(null)}>
                {error}
              </Alert>
            )}

            {/* Upload Mode Selector */}
            <Box display="flex" gap={1}>
              <Button
                size="small"
                variant={uploadMode === 'file' ? 'contained' : 'outlined'}
                onClick={() => setUploadMode('file')}
              >
                อัปโหลดไฟล์
              </Button>
              <Button
                size="small"
                variant={uploadMode === 'url' ? 'contained' : 'outlined'}
                onClick={() => setUploadMode('url')}
              >
                ใช้ URL
              </Button>
            </Box>

            {uploadMode === 'file' ? (
              <>
                {/* Contract Document Upload */}
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Stack spacing={1}>
                    <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Description fontSize="small" />
                      สำเนาสัญญา *
                    </Typography>
                    <Button
                      component="label"
                      variant="outlined"
                      startIcon={<CloudUpload />}
                      fullWidth
                    >
                      {contractDocFile ? contractDocFile.name : 'เลือกไฟล์'}
                      <input
                        type="file"
                        hidden
                        accept="image/jpeg,image/jpg,image/png,application/pdf"
                        onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                      />
                    </Button>
                    {contractDocFile && (
                      <Typography variant="caption" color="text.secondary">
                        ขนาด: {(contractDocFile.size / 1024).toFixed(2)} KB
                      </Typography>
                    )}
                  </Stack>
                </Paper>

                <Alert severity="info" sx={{ fontSize: '0.875rem' }}>
                  รองรับไฟล์: JPG, PNG, PDF (ขนาดไม่เกิน 5MB)
                </Alert>
              </>
            ) : (
              <>
                {/* Contract Document URL */}
                <TextField
                  fullWidth
                  label="URL สำเนาสัญญา *"
                  value={contractDocUrl}
                  onChange={(e) => setContractDocUrl(e.target.value)}
                  placeholder="https://example.com/contract.pdf"
                  required
                />

                <Alert severity="info" sx={{ fontSize: '0.875rem' }}>
                  กรุณาใส่ URL ที่สามารถเข้าถึงได้สาธารณะ
                </Alert>
              </>
            )}
          </Box>
        </DialogContent>
        
        <DialogActions>
          <Button 
            onClick={handleClose} 
            disabled={uploadMutation.isPending}
          >
            ยกเลิก
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={uploadMutation.isPending}
            startIcon={uploadMutation.isPending ? <CircularProgress size={16} /> : <CloudUpload />}
          >
            {uploadMutation.isPending ? 'กำลังอัปโหลด...' : 'อัปโหลด'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};
