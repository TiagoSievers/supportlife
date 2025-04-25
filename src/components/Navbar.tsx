import React from 'react';
import { Link } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Box,
} from '@mui/material';
import { AccountCircle } from '@mui/icons-material';

const Navbar: React.FC = () => {
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
        <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
          <Typography 
            variant="h6" 
            sx={{ 
              fontWeight: 'bold',
              '& .pronto': {
                color: '#f44336'
              },
              '& .socorro': {
                color: '#2196f3'
              }
            }}
          >
            <span className="pronto">Pronto</span>
            <span className="socorro">Socorro</span>
          </Typography>
        </Link>

        <Box>
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
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar; 