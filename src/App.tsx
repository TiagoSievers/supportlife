import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, CssBaseline, Box } from '@mui/material';
import theme from './theme';
import Navbar from './components/Navbar';
import Home from './pages/home/Home';
import Profile from './pages/Profile';
import Family from './pages/Family';
import Admin from './pages/Admin';
import Emergency from './pages/emergencia/Emergency';
import AdminPanel from './pages/admin_panel/AdminPanel';
import ResetPassword from './pages/ResetPassword';
import PartnerEmergencies from './pages/emer_socorrista/PartnerEmergencies';
import Login from './pages/login/Login';
import EmergencySocorrista from './pages/emer_socorrista/EmergencySocorrista';


const App: React.FC = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          <Navbar />
          <Box
            component="main"
            sx={{
              flexGrow: 1,
              pt: { xs: 7, sm: 8 }, // Adjusted padding for different screen sizes
              px: { xs: 2, sm: 3 }, // Added horizontal padding
              bgcolor: 'background.default'
            }}
          >
            <Routes>
  <Route path="/" element={<Login />} />
  <Route path="/profile" element={<Profile />} />
  <Route path="/family" element={<Family />} />
  <Route path="/admin" element={<Admin />} />
  <Route path="/emergency" element={<Emergency />} />
  <Route path="/emergencia-socorrista" element={<EmergencySocorrista />} />
  <Route path="/admin-panel" element={<AdminPanel />} />
  <Route path="/reset-password" element={<ResetPassword />} />
  <Route path="/home" element={<Home />} />
  <Route path="/partner-emergencies" element={<PartnerEmergencies />} />
            </Routes>
          </Box>
        </Box>
      </Router>
    </ThemeProvider>
  );
};

export default App; 