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
  CloudDownload,
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
  const [isFetching, setIsFetching] = useState(false);

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

  const isDataFetched = !!onboardingCase.contract_document_url; // Step 1 complete indicator
  const isRegistered = onboardingCase.registration_status === 'completed';
  const isDocumentsUploaded = onboardingCase.document_status === 'uploaded' || onboardingCase.document_status === 'verified';
  const isPaymentVerified = onboardingCase.payment_status === 'paid';
  const isCompleted = onboardingCase.overall_status === 'completed';

  const handleFetchData = async () => {
    try {
      setIsFetching(true);
      await onboardingApi.fetchContractFromLegal(id!);
      await refetch();
    } catch (err) {
      console.error('Failed to fetch external data:', err);
    } finally {
      setIsFetching(false);
    }
  };

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
          {/* Step 1: Data Fetching */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
              <Stack direction="row" alignItems="center" spacing={2}>
                <CloudDownload color={isDataFetched ? 'success' : 'action'} />
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Step 1: Data Fetching
                  </Typography>
                  <Chip 
                    label={isDataFetched ? 'Fetched' : 'Pending'} 
                    color={isDataFetched ? 'success' : 'default'}
                    size="small"
                  />
                </Box>
              </Stack>
              {!isDataFetched && !isCompleted && (
                <Button 
                  variant="contained"
                  size="medium"
                  onClick={handleFetchData}
                  disabled={isFetching}
                  startIcon={isFetching ? <CircularProgress size={16} /> : <CloudDownload />}
                >
                  {isFetching ? 'Fetching...' : 'Fetch External Data'}
                </Button>
              )}
            </Stack>

            {isDataFetched && (
              <Alert severity="success" sx={{ mt: 2 }}>
                ✅ External data (Contract, Warranty, Payment History) successfully fetched from Legal and Payment teams
              </Alert>
            )}

            {!isDataFetched && (
              <Alert severity="info" sx={{ mt: 2 }}>
                📥 Click "Fetch External Data" to retrieve contract, warranty, and payment history from external teams
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
              {!isDocumentsUploaded && !isCompleted && (
                <Button 
                  variant="outlined"
                  size="medium"
                  onClick={() => setUploadDialogOpen(true)}
                  disabled={!isDataFetched}
                >
                  Upload Documents
                </Button>
              )}
            </Stack>

            {isDocumentsUploaded && (
              <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary">Uploaded At</Typography>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {onboardingCase.documents_uploaded_at 
                    ? format(new Date(onboardingCase.documents_uploaded_at), 'dd/MM/yyyy HH:mm')
                    : '-'}
                </Typography>
              </Box>
            )}

            {!isDataFetched && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                🔒 Please fetch external data first
              </Alert>
            )}

            {isDataFetched && !isDocumentsUploaded && (
              <Alert severity="info" sx={{ mt: 2 }}>
                📄 Please upload required documents to proceed
              </Alert>
            )}
          </Paper>

          {/* Step 3: Member Registration */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Person color={isRegistered ? 'success' : 'action'} />
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Step 3: Member Registration
                  </Typography>
                  <StatusChip status={onboardingCase.registration_status} />
                </Box>
              </Stack>
              {!isRegistered && !isCompleted && (
                <Button 
                  variant="outlined"
                  size="medium"
                  onClick={() => setRegisterDialogOpen(true)}
                  disabled={!isDocumentsUploaded}
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

            {!isDocumentsUploaded && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                🔒 Please upload documents first
              </Alert>
            )}

            {isDocumentsUploaded && !isRegistered && (
              <Alert severity="info" sx={{ mt: 2 }}>
                Please register member information to proceed. This will send an event to Payment Team to generate invoice.
              </Alert>
            )}
          </Paper>
