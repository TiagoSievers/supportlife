import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, CssBaseline, Box } from '@mui/material';
import theme from './theme';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Profile from './pages/Profile';
import Family from './pages/Family';
import Admin from './pages/Admin';
import Emergency from './pages/Emergency';


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
              <Route path="/" element={<Home />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/family" element={<Family />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/emergency" element={<Emergency />} />

            </Routes>
          </Box>
        </Box>
      </Router>
    </ThemeProvider>
  );
};

export default App; 