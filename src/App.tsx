import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Outlet } from 'react-router-dom';
import { ThemeProvider, CssBaseline, Box } from '@mui/material';
import theme from './theme';
import Navbar from './components/Navbar';
import Home from './pages/home/Home';
import Family from './pages/familiares/Family';
import Admin from './pages/Admin';
import Emergency from './pages/emergencia/Emergency';
import AdminPanel from './pages/admin_panel/AdminPanel';
import ResetPassword from './pages/ResetPassword';
import PartnerEmergencies from './pages/emer_socorrista/PartnerEmergencies';
import Login from './pages/login/Login';
import EmergencySocorrista from './pages/emer_socorrista/EmergencySocorrista';
import FamilyEmergencies from './pages/familiares/FamilyEmergencies';
import FamilyEmergencyLocation from './pages/familiares/FamilyEmergencyLocation';
import EmergencyFamily from './pages/familiares/EmergencyFamily';
import ProtectedRoute from './components/ProtectedRoute';
import { useNavigate } from 'react-router-dom';
import ChamadosClient from './cliente/chamadosClient';
import CustomMapWithAmbulanceIcon from './pages/emer_socorrista/CustomMapWithAmbulanceIcon';

interface ProtectedLayoutProps {
  hasNewChamado: boolean;
  onNotificationClick: () => void;
}

const ProtectedLayout: React.FC<ProtectedLayoutProps> = ({ hasNewChamado, onNotificationClick }) => (
  <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
    <Navbar hasNewChamado={hasNewChamado} onNotificationClick={onNotificationClick} />
    <Box
      component="main"
      sx={{
        flexGrow: 1,
        pt: { xs: 7, sm: 8 },
        px: { xs: 2, sm: 3 },
        bgcolor: 'background.default'
      }}
    >
      <Outlet />
    </Box>
  </Box>
);

const App: React.FC = () => {
  const [hasNewChamado, setHasNewChamado] = useState(false);
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Routes>
          {/* Rota pública */}
          <Route path="/" element={<Login />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Rotas protegidas */}
          <Route element={<ProtectedRoute />}> 
            <Route element={
              <ProtectedLayout 
                hasNewChamado={hasNewChamado} 
                onNotificationClick={() => setHasNewChamado(false)} 
              />
            }> 
              <Route path="/family" element={<Family />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/emergency" element={<Emergency />} />
              <Route path="/emergencia-socorrista" element={<EmergencySocorrista />} />
              <Route path="/admin-panel" element={<AdminPanel />} />
              <Route path="/home" element={<Home />} />
              <Route path="/partner-emergencies" element={<PartnerEmergencies hasNewChamado={hasNewChamado} onNewChamado={setHasNewChamado} />} />
              <Route path="/family-emergencies" element={<FamilyEmergencies onNewChamado={setHasNewChamado} />} />
              <Route path="/emergency-family" element={<EmergencyFamily />} />
              <Route path="/family-emergency-location" element={<FamilyEmergencyLocation />} />
              <Route path="/chamado-cliente" element={<ChamadosClient />} />
              <Route path="/custom-map-ambulance" element={<CustomMapWithAmbulanceIcon />} />
            </Route>
          </Route>
        </Routes>
      </Router>
    </ThemeProvider>
  );
};

export default App; 
