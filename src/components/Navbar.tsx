import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../Supabase/supabaseRealtimeClient';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Box,
  Badge,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Button
} from '@mui/material';
import { AccountCircle, Notifications as NotificationsIcon, Menu as MenuIcon, People as FamilyIcon, Dashboard as AdminIcon, Person as ProfileIcon, Home as HomeIcon } from '@mui/icons-material';
import ChamadoDialog, { Chamado } from '../cliente/ChamadoDialog';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

const Navbar: React.FC = () => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [chamadoDialogOpen, setChamadoDialogOpen] = useState(false);
  const [chamadoData, setChamadoData] = useState<Chamado | undefined>(undefined);
  const [hasNewChamado, setHasNewChamado] = useState(false);

  const isLoggedIn = Boolean(localStorage.getItem('userToken'));
  const location = useLocation();
  const isHome = location && location.pathname === '/';
  const navigate = useNavigate();
  const isCliente = localStorage.getItem('userType') === 'cliente';

  useEffect(() => {
    const handleNovaNotificacao = () => {
      setHasNewChamado(true);
      // Tocar o som de notificação
      const audio = new Audio('/assets/notification.mp3');
      audio.play().catch(() => {
        console.log('Erro ao tocar som de notificação');
      });
    };

    const handleDesativarNotificacao = () => {
      setHasNewChamado(false);
    };

    window.addEventListener('novaNotificacao', handleNovaNotificacao);
    window.addEventListener('desativarNotificacao', handleDesativarNotificacao);

    return () => {
      window.removeEventListener('novaNotificacao', handleNovaNotificacao);
      window.removeEventListener('desativarNotificacao', handleDesativarNotificacao);
    };
  }, []);

  const handleDrawerOpen = () => setDrawerOpen(true);
  const handleDrawerClose = () => setDrawerOpen(false);

  const handleNavigate = (path: string, state?: any) => {
    navigate(path, state ? { state } : undefined);
    setDrawerOpen(false);
  };

  const handleOpenChamadoDialog = () => {
    setChamadoData({
      id: 123,
      cliente_id: 1,
      localizacao: '-23.5505,-46.6333',
      endereco_textual: 'Av. Paulista, 1000, São Paulo - SP',
      status: 'Pendente',
      criado_em: new Date().toISOString(),
    });
    setChamadoDialogOpen(true);
  };

  const handleCloseChamadoDialog = () => setChamadoDialogOpen(false);

  // Função para limpar todos os storages (web e mobile)
  const clearAllStorage = async () => {
    localStorage.clear();
    if (Capacitor.isNativePlatform()) {
      try {
        await Preferences.clear();
      } catch (error) {
        console.error('Erro ao limpar Preferences:', error);
      }
    }
  };

  return (
    <>
      <AppBar 
        position="fixed" 
        color="default" 
        elevation={0}
        sx={{ 
          backgroundColor: 'white',
          borderBottom: '1px solid #e0e0e0',
          '@keyframes pulse': {
            '0%': { opacity: 1 },
            '50%': { opacity: 0.5 },
            '100%': { opacity: 1 }
          }
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

          <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center' }}>
            {hasNewChamado && (
              <IconButton
                size="large"
                edge="end"
                aria-label="notifications"
                onClick={() => {
                  setHasNewChamado(false);
                }}
                sx={{ 
                  color: '#f44336',
                  mr: 1,
                  animation: 'pulse 1.5s infinite'
                }}
              >
                <Badge color="error" variant="dot">
                  <NotificationsIcon />
                </Badge>
              </IconButton>
            )}
            <IconButton
              size="large"
              edge="end"
              aria-label="menu"
              sx={{ color: '#757575', ml: 1 }}
              onClick={handleDrawerOpen}
            >
              <MenuIcon />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>
      <Drawer anchor="left" open={drawerOpen} onClose={handleDrawerClose}>
        <Box sx={{ width: 250, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }} role="presentation" onClick={handleDrawerClose}>
          {isCliente && (
            <List>
              <ListItem disablePadding>
                <ListItemButton onClick={() => handleNavigate('/home') }>
                  <ListItemIcon><HomeIcon /></ListItemIcon>
                  <ListItemText primary="Home" />
                </ListItemButton>
              </ListItem>
              <ListItem disablePadding>
                <ListItemButton onClick={() => handleNavigate('/family')}>
                  <ListItemIcon><FamilyIcon /></ListItemIcon>
                  <ListItemText primary="Familiares" />
                </ListItemButton>
              </ListItem>
              <ListItem disablePadding>
                <ListItemButton onClick={() => handleNavigate('/chamado-cliente')}>
                  <ListItemIcon><AdminIcon /></ListItemIcon>
                  <ListItemText primary="Histórico de chamados" />
                </ListItemButton>
              </ListItem>
            </List>
          )}
          <Box sx={{ p: 2, borderTop: '1px solid #e0e0e0' }}>
            <ListItem disablePadding>
              <ListItemButton onClick={async () => {
                await clearAllStorage();
                navigate('/');
              }}>
                <ListItemIcon><AccountCircle /></ListItemIcon>
                <ListItemText primary="Sair" />
              </ListItemButton>
            </ListItem>
          </Box>
        </Box>
      </Drawer>
      <ChamadoDialog
        open={chamadoDialogOpen}
        onClose={handleCloseChamadoDialog}
        initialData={chamadoData}
        onSave={() => setChamadoDialogOpen(false)}
        isEditing={false}
      />
    </>
  );
};

export default Navbar; 
