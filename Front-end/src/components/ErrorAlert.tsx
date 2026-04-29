import { Alert, AlertTitle, Box, Typography } from '@mui/material';
import { ErrorOutline as ErrorIcon } from '@mui/icons-material';

interface ErrorAlertProps {
  error: unknown;
  title?: string;
  onRetry?: () => void;
}

export const ErrorAlert: React.FC<ErrorAlertProps> = ({ 
  error, 
  title = 'เกิดข้อผิดพลาด',
}) => {
  // Extract user-friendly message from error object
  const getUserMessage = (err: unknown): string => {
    if (err && typeof err === 'object') {
      // Check for userMessage from axios interceptor
      if ('userMessage' in err && typeof err.userMessage === 'string') {
        return err.userMessage;
      }
      // Fallback to standard error message
      if ('message' in err && typeof err.message === 'string') {
        return err.message;
      }
    }
    return 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ';
  };

  // Get error code for debugging (only in development)
  const getErrorCode = (err: unknown): string | null => {
    if (process.env.NODE_ENV === 'development' && err && typeof err === 'object') {
      if ('response' in err && err.response && typeof err.response === 'object') {
        if ('data' in err.response && err.response.data && typeof err.response.data === 'object') {
          if ('error' in err.response.data && err.response.data.error && typeof err.response.data.error === 'object') {
            const errorData = err.response.data.error as Record<string, unknown>;
            if ('code' in errorData && typeof errorData.code === 'string') {
              return errorData.code;
            }
          }
        }
      }
    }
    return null;
  };

  const message = getUserMessage(error);
  const errorCode = getErrorCode(error);

  return (
    <Alert 
      severity="error" 
      icon={<ErrorIcon />}
      sx={{ mb: 2 }}
    >
      <AlertTitle>{title}</AlertTitle>
      <Box>
        <Typography variant="body2">{message}</Typography>
        {errorCode && (
          <Typography 
            variant="caption" 
            color="text.secondary"
            sx={{ mt: 1, display: 'block', fontFamily: 'monospace' }}
          >
            Error Code: {errorCode}
          </Typography>
        )}
      </Box>
    </Alert>
  );
};
