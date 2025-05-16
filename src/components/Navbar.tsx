import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Box,
} from '@mui/material';
import { AccountCircle } from '@mui/icons-material';

const Navbar: React.FC = () => {
  // Verifica se o usuário está logado
  const isLoggedIn = Boolean(localStorage.getItem('userToken'));
  // Verifica a rota atual
  const location = useLocation();
  const isHome = location && location.pathname === '/';

  return (
    <AppBar 
      position="fixed" 
      color="default" 
      elevation={0}
      sx={{ 
        backgroundColor: 'white',
        borderBottom: '1px solid #e0e0e0'
      }}
    >
      <Toolbar sx={{ justifyContent: 'space-between' }}>
        <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 0 }}>
          <img 
            src={require('../assets/output_image_3.png')} 
            alt="ALO SUPPORT" 
            style={{ height: 48 }} 
          />
          <Typography 
            variant="subtitle1" 
            sx={{ 
              fontWeight: 'bold',
              color: '#000000',
              whiteSpace: 'nowrap',
              ml: 0.5
            }}
          >
            Saúde 24horas
          </Typography>
        </Link>

        <Box sx={{ ml: 'auto' }}>
          {(isLoggedIn && !isHome) && (
            <IconButton
              size="large"
              edge="end"
              aria-label="account"
              aria-haspopup="true"
              component={Link}
              to="/profile"
              sx={{ color: '#757575' }}
            >
              <AccountCircle />
            </IconButton>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar; 