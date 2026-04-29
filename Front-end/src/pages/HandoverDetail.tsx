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
  Stepper,
  Step,
  StepLabel,
  StepContent,
  CircularProgress,
  Alert,
  Chip,
  IconButton,
} from '@mui/material';
import { ArrowBack, CheckCircle, AccessTime, Cancel } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { handoverApi } from '../services/handoverApi';
import { StatusChip } from '../components/StatusChip';
import { CompleteHandoverDialog } from '../components/CompleteHandoverDialog';
import { format } from 'date-fns';

export const HandoverDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: handoverCase, isLoading, error, refetch } = useQuery({
    queryKey: ['handover', 'case', id],
    queryFn: () => handoverApi.getCaseById(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error || !handoverCase) {
    return (
      <Alert severity="error">
        Error loading handover case: {(error as Error)?.message || 'Case not found'}
      </Alert>
    );
  }

  const steps = [
    {
      label: 'KYC Completed',
      status: handoverCase.kyc_status,
      receivedAt: handoverCase.kyc_received_at,
      source: 'KYC Team',
    },
    {
      label: 'Contract Drafted',
      status: handoverCase.contract_status,
      receivedAt: handoverCase.contract_received_at,
      source: 'Legal Team',
    },
    {
      label: 'Payment Completed',
      status: handoverCase.payment_status,
      receivedAt: handoverCase.payment_received_at,
      source: 'Payment Team',
      amount: handoverCase.payment_amount,
    },
  ];

  const isReadyForHandover = handoverCase.overall_status === 'ready';
  const isCompleted = handoverCase.overall_status === 'completed';

  return (
    <Box>
      {/* Header */}
      <Box display="flex" alignItems="center" gap={2} mb={3}>
        <IconButton onClick={() => navigate('/handover')}>
          <ArrowBack />
        </IconButton>
        <Typography variant="h4" sx={{ fontWeight: 700, flexGrow: 1 }}>
          Handover Case Details
        </Typography>
        <StatusChip status={handoverCase.overall_status} size="medium" />
      </Box>

      <Grid container spacing={3}>
        {/* Case Information */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                Case Information
              </Typography>
              
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary">Unit ID</Typography>
                <Typography variant="body1" sx={{ fontWeight: 600, mb: 2 }}>
                  {handoverCase.unit_id}
                </Typography>

                <Typography variant="body2" color="text.secondary">Customer ID</Typography>
                <Typography variant="body1" sx={{ fontWeight: 600, mb: 2 }}>
                  {handoverCase.customer_id}
                </Typography>

                <Typography variant="body2" color="text.secondary">Created</Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {format(new Date(handoverCase.created_at), 'dd/MM/yyyy HH:mm')}
                </Typography>

                <Typography variant="body2" color="text.secondary">Last Updated</Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {format(new Date(handoverCase.updated_at), 'dd/MM/yyyy HH:mm')}
                </Typography>

                {isCompleted && handoverCase.handover_date && (
                  <>
                    <Typography variant="body2" color="text.secondary">Handover Date</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600, mb: 2 }}>
                      {format(new Date(handoverCase.handover_date), 'dd/MM/yyyy')}
                    </Typography>

                    <Typography variant="body2" color="text.secondary">Handover By</Typography>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                      {handoverCase.handover_by}
                    </Typography>

                    {handoverCase.handover_notes && (
                      <>
                        <Typography variant="body2" color="text.secondary">Notes</Typography>
                        <Typography variant="body1">
                          {handoverCase.handover_notes}
                        </Typography>
                      </>
                    )}
                  </>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Event Timeline */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              Event Timeline
            </Typography>

            <Stepper orientation="vertical" sx={{ mt: 3 }}>
              {steps.map((step, index) => (
                <Step key={step.label} active={!!step.status} completed={step.status === 'approved' || step.status === 'drafted' || step.status === 'completed'}>
                  <StepLabel
                    error={step.status === 'rejected' || step.status === 'failed'}
                    StepIconComponent={() => (
                      step.status === 'approved' || step.status === 'drafted' || step.status === 'completed' ? (
                        <CheckCircle color="success" />
                      ) : step.status === 'rejected' || step.status === 'failed' ? (
                        <Cancel color="error" />
                      ) : (
                        <AccessTime color="warning" />
                      )
                    )}
                  >
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography variant="body1" sx={{ fontWeight: 600 }}>
                        {step.label}
                      </Typography>
                      <StatusChip status={step.status} />
                    </Box>
                  </StepLabel>
                  <StepContent>
                    <Typography variant="body2" color="text.secondary">
                      Source: {step.source}
                    </Typography>
                    {step.receivedAt && (
                      <Typography variant="body2" color="text.secondary">
                        Received: {format(new Date(step.receivedAt), 'dd/MM/yyyy HH:mm')}
                      </Typography>
                    )}
                    {step.amount && (
                      <Typography variant="body2" color="text.secondary">
                        Amount: ฿{step.amount.toLocaleString()}
                      </Typography>
                    )}
                  </StepContent>
                </Step>
              ))}
            </Stepper>

            {/* Actions */}
            <Box sx={{ mt: 4, display: 'flex', gap: 2 }}>
              {isReadyForHandover && (
                <Button
                  variant="contained"
                  color="primary"
                  size="large"
                  onClick={() => setDialogOpen(true)}
                >
                  Mark as Completed
                </Button>
              )}
              {!isReadyForHandover && !isCompleted && (
                <Alert severity="info" sx={{ width: '100%' }}>
                  Waiting for all events (KYC, Contract, Payment) to complete before handover can be marked as ready.
                </Alert>
              )}
              {isCompleted && (
                <Alert severity="success" sx={{ width: '100%' }}>
                  ✅ Handover completed on {format(new Date(handoverCase.handover_date!), 'dd/MM/yyyy')}
                </Alert>
              )}
            </Box>
          </Paper>

          {/* Events List */}
          {handoverCase.events && handoverCase.events.length > 0 && (
            <Paper sx={{ p: 3, mt: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                Event History ({handoverCase.events.length})
              </Typography>
              {handoverCase.events.map((event) => (
                <Box key={event.id} sx={{ mb: 2, pb: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {event.event_type}
                    </Typography>
                    <Chip label={event.event_source} size="small" />
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {format(new Date(event.received_at), 'dd/MM/yyyy HH:mm:ss')}
                  </Typography>
                </Box>
              ))}
            </Paper>
          )}
        </Grid>
      </Grid>

      {/* Complete Handover Dialog */}
      <CompleteHandoverDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        caseId={handoverCase.id}
        onSuccess={() => {
          setDialogOpen(false);
          refetch();
        }}
      />
    </Box>
  );
};
