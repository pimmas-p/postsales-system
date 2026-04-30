import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Button,
  CircularProgress,
  Alert,
  Stack,
  Divider,
  Chip,
} from '@mui/material';
import { 
  ArrowBack, 
  CheckCircle,
  Person,
  Description,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { onboardingApi } from '../services/onboardingApi';
import { StatusChip } from '../components/StatusChip';
import { RegisterMemberDialog } from '../components/RegisterMemberDialog';
import { UploadDocumentsDialog } from '../components/UploadDocumentsDialog';
import { CompleteOnboardingDialog } from '../components/CompleteOnboardingDialog';
import { format } from 'date-fns';

export const OnboardingDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [registerDialogOpen, setRegisterDialogOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);

  const { data: onboardingCase, isLoading, error, refetch } = useQuery({
    queryKey: ['onboarding', 'case', id],
    queryFn: () => onboardingApi.getCaseById(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !onboardingCase) {
    return (
      <Alert severity="error">
        Error loading onboarding case: {(error as Error)?.message || 'Case not found'}
      </Alert>
    );
  }

  const isRegistered = onboardingCase.registration_status === 'completed';
  const isDocumentsUploaded = onboardingCase.document_status === 'uploaded' || onboardingCase.document_status === 'verified';
  const isCompleted = onboardingCase.overall_status === 'completed';

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Button 
          startIcon={<ArrowBack />} 
          onClick={() => navigate('/onboarding')}
          sx={{ mb: 2 }}
        >
          Back to Onboarding
        </Button>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            Onboarding Case Details
          </Typography>
          <StatusChip status={onboardingCase.overall_status} size="medium" />
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Left Column - Case Information */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                Case Information
              </Typography>
              
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary">Unit ID</Typography>
                <Typography variant="body1" sx={{ fontWeight: 600, mb: 2 }}>
                  {onboardingCase.unit_id}
                </Typography>

                <Typography variant="body2" color="text.secondary">Customer ID</Typography>
                <Typography variant="body1" sx={{ fontWeight: 600, mb: 2 }}>
                  {onboardingCase.customer_id}
                </Typography>

                {onboardingCase.handover_case_id && (
                  <>
                    <Typography variant="body2" color="text.secondary">Handover Case</Typography>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                      {onboardingCase.handover_case_id.substring(0, 8)}...
                    </Typography>
                  </>
                )}

                <Typography variant="body2" color="text.secondary">Created</Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {format(new Date(onboardingCase.created_at), 'dd/MM/yyyy HH:mm')}
                </Typography>

                <Typography variant="body2" color="text.secondary">Last Updated</Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {format(new Date(onboardingCase.updated_at), 'dd/MM/yyyy HH:mm')}
                </Typography>

                {isCompleted && onboardingCase.completed_at && (
                  <>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="body2" color="text.secondary">Completed At</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600, mb: 2 }}>
                      {format(new Date(onboardingCase.completed_at), 'dd/MM/yyyy HH:mm')}
                    </Typography>

                    <Typography variant="body2" color="text.secondary">Completed By</Typography>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                      {onboardingCase.completed_by}
                    </Typography>

                    {onboardingCase.notes && (
                      <>
                        <Typography variant="body2" color="text.secondary">Notes</Typography>
                        <Typography variant="body1">
                          {onboardingCase.notes}
                        </Typography>
                      </>
                    )}
                  </>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Right Column - Process Steps */}
        <Grid item xs={12} md={8}>
          {/* Step 1: Member Registration */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Person color={isRegistered ? 'success' : 'action'} />
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Step 1: Member Registration
                  </Typography>
                  <StatusChip status={onboardingCase.registration_status} />
                </Box>
              </Stack>
              {!isRegistered && !isCompleted && (
                <Button 
                  variant="outlined"
                  size="medium"
                  onClick={() => setRegisterDialogOpen(true)}
                >
                  Register Member
                </Button>
              )}
            </Stack>

            {isRegistered && (
              <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">Email</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {onboardingCase.email || '-'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">Phone</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {onboardingCase.phone || '-'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">Area Size</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {onboardingCase.area_size ? `${onboardingCase.area_size.toFixed(1)} sqm` : '-'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">Registered At</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {onboardingCase.registered_at 
                        ? format(new Date(onboardingCase.registered_at), 'dd/MM/yyyy HH:mm')
                        : '-'}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
            )}

            {!isRegistered && (
              <Alert severity="info" sx={{ mt: 2 }}>
                Please register member information to proceed
              </Alert>
            )}
          </Paper>

          {/* Step 2: Document Upload */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Description color={isDocumentsUploaded ? 'success' : 'action'} />
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Step 2: Document Upload
                  </Typography>
                  <StatusChip status={onboardingCase.document_status} />
                </Box>
              </Stack>
              <Stack direction="row" spacing={1}>
                {isRegistered && !isDocumentsUploaded && !isCompleted && !onboardingCase.contract_document_url && (
                  <Button 
                    variant="outlined"
                    color="info"
                    onClick={() => {
                      // Call manual fetch contract API
                      fetch(`http://localhost:3001/api/onboarding/cases/${onboardingCase.id}/fetch-contract`, {
                        method: 'POST'
                      })
                      .then(res => res.json())
                      .then(data => {
                        if (data.success) {
                          alert('✅ Contract fetched from Legal API!');
                          refetch();
                        } else {
                          alert('❌ ' + data.error);
                        }
                      })
                      .catch(err => alert('❌ Error: ' + err.message));
                    }}
                  >
                    🔍 Fetch from Legal
                  </Button>
                )}
                {isRegistered && !isDocumentsUploaded && !isCompleted && (
                  <Button 
                    variant="outlined"
                    size="medium"
                    onClick={() => setUploadDialogOpen(true)}
                  >
                    Upload Contract
                  </Button>
                )}
              </Stack>
            </Stack>

            {(isDocumentsUploaded || onboardingCase.contract_document_url) && (
              <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">Contract Document</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {onboardingCase.contract_document_url ? '✅ Uploaded' : '⏳ Pending'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">Uploaded At</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {onboardingCase.documents_uploaded_at 
                        ? format(new Date(onboardingCase.documents_uploaded_at), 'dd/MM/yyyy HH:mm')
                        : '-'}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
            )}

            {!isDocumentsUploaded && !isRegistered && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                Complete member registration first
              </Alert>
            )}

            {!isDocumentsUploaded && isRegistered && (
              <Alert severity="info" sx={{ mt: 2 }}>
                📄 Please upload the contract document to proceed.
              </Alert>
            )}
          </Paper>

          {/* Step 3: Completion */}
          <Paper sx={{ p: 3 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
              <Stack direction="row" alignItems="center" spacing={2}>
                <CheckCircle color={isCompleted ? 'success' : 'action'} />
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Step 3: Completion
                  </Typography>
                  <Chip 
                    label={isCompleted ? 'Completed' : 'Pending'} 
                    color={isCompleted ? 'success' : 'default'}
                    size="small"
                  />
                </Box>
              </Stack>
              {isRegistered && isDocumentsUploaded && !isCompleted && (
                <Button 
                  variant="outlined"
                  color="success"
                  size="medium"
                  onClick={() => setCompleteDialogOpen(true)}
                >
                  Complete Onboarding
                </Button>
              )}
            </Stack>

            {isCompleted && (
              <Alert severity="success" sx={{ mt: 2 }}>
                ✅ Onboarding completed successfully on{' '}
                {format(new Date(onboardingCase.completed_at!), 'dd/MM/yyyy HH:mm')}
              </Alert>
            )}

            {!isCompleted && (!isRegistered || !isDocumentsUploaded) && (
              <Alert severity="info" sx={{ mt: 2 }}>
                Complete all previous steps to finish onboarding
              </Alert>
            )}

            {!isCompleted && isRegistered && isDocumentsUploaded && (
              <Alert severity="info" sx={{ mt: 2 }}>
                Ready to complete onboarding process
              </Alert>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Register Member Dialog */}
      <RegisterMemberDialog
        open={registerDialogOpen}
        onClose={() => setRegisterDialogOpen(false)}
        caseId={onboardingCase.id}
        unitId={onboardingCase.unit_id}
        onSuccess={() => {
          setRegisterDialogOpen(false);
          refetch();
        }}
      />

      {/* Upload Documents Dialog */}
      <UploadDocumentsDialog
        open={uploadDialogOpen}
        onClose={() => setUploadDialogOpen(false)}
        caseId={onboardingCase.id}
        onSuccess={() => {
          setUploadDialogOpen(false);
          refetch();
        }}
      />

      {/* Complete Onboarding Dialog */}
      <CompleteOnboardingDialog
        open={completeDialogOpen}
        onClose={() => setCompleteDialogOpen(false)}
        caseId={onboardingCase.id}
        onSuccess={() => {
          setCompleteDialogOpen(false);
          refetch();
        }}
      />
    </Box>
  );
};
