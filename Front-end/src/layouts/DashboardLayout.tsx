import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Divider,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  AssignmentTurnedIn as HandoverIcon,
  PersonAdd as OnboardingIcon,
  Build as DefectIcon,
  Home as HomeIcon,
} from '@mui/icons-material';
import { useQueryClient } from '@tanstack/react-query';

const DRAWER_WIDTH = 240;

const menuItems = [
  { title: 'Home', path: '/', icon: <HomeIcon />, enabled: true },
  { title: 'Handover Readiness', path: '/handover', icon: <HandoverIcon />, enabled: true },
  { title: 'Owner Onboarding', path: '/onboarding', icon: <OnboardingIcon />, enabled: true },
  { title: 'Snagging & Defect', path: '/defects', icon: <DefectIcon />, enabled: true },
];

export const DashboardLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['handover'] });
    console.log('🔄 Refreshing data...');
  };

  const drawer = (
    <div>
      <Toolbar>
        <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 700 }}>
          Post-Sales
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {menuItems.map((item) => (
          <ListItem key={item.path} disablePadding>
            <ListItemButton
              selected={location.pathname === item.path}
              onClick={() => item.enabled && navigate(item.path)}
              disabled={!item.enabled}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText 
                primary={item.title}
                secondary={!item.enabled ? '(Coming soon)' : undefined}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </div>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{
          width: `calc(100% - ${DRAWER_WIDTH}px)`,
          ml: `${DRAWER_WIDTH}px`,
        }}
      >
        <Toolbar>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            Post-Sales Management System
          </Typography>
          <IconButton color="inherit" onClick={handleRefresh} title="Refresh Data">
            <RefreshIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        sx={{ width: DRAWER_WIDTH, flexShrink: 0 }}
      >
        <Drawer
          variant="permanent"
          sx={{
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 1.5,
          width: `calc(100% - ${DRAWER_WIDTH}px)`,
          minHeight: '100vh',
          backgroundColor: (theme) => theme.palette.grey[100],
        }}
      >
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
};
