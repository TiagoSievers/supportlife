import React, { useState } from 'react';
import { 
  Box, 
  AppBar, 
  Toolbar, 
  Typography, 
  Drawer, 
  List, 
  ListItemButton,
  ListItemIcon, 
  ListItemText, 
  CssBaseline,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  TextField,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle
} from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import LogoutIcon from '@mui/icons-material/Logout';
import { useNavigate } from 'react-router-dom';
import { logoutSupabase } from '../../Supabase/supabaseClient';
import AddClientDialog from '../../cliente/AddClientDialog';
import AddUserAdminDialog from '../../user_admin/AddUserAdminDialog';
import AddPartnerDialog from '../../socorristas/AddPartnerDialog';
import ClientList from '../../cliente/ClientList';
import PartnerList from '../../socorristas/PartnerList';
import AdminUserList from '../../user_admin/AdminUserList';
import ChamadoList from '../chamado/ChamadoList';

const drawerWidth = 240;

const AdminPanel: React.FC = () => {
  const [selectedSection, setSelectedSection] = useState('Chamados');
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogType, setDialogType] = useState('');
  const navigate = useNavigate();

  // ===== handleSectionChange =====
  const handleSectionChange = (section: string) => {
    setSelectedSection(section);
  };

  // ===== handleOpenDialog =====
  const handleOpenDialog = (type: string) => {
    setDialogType(type);
    setOpenDialog(true);
  };

  // ===== handleCloseDialog =====
  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  // ===== handleLogout =====
  const handleLogout = async () => {
    await logoutSupabase();
    localStorage.removeItem('userToken');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userData');
    console.log('Logout realizado, localStorage limpo:', localStorage);
    navigate('/');
  };

  // ===== renderDialogTitle =====
  const renderDialogTitle = () => {
    switch (dialogType) {
      case 'cliente':
        return 'Adicionar Novo Cliente';
      case 'parceiro':
        return 'Adicionar Novo Parceiro';
      case 'usuario':
        return 'Adicionar Novo Usuário Administrativo';
      default:
        return '';
    }
  };

  // ===== renderMainContent =====
  const renderMainContent = () => {
    switch (selectedSection) {
      case 'Chamados':
        return (
          <>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h4">Lista de Chamados</Typography>
            </Box>
            <ChamadoList />
          </>
        );
      case 'Clientes':
        return (
          <>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h4">Gestão de Clientes</Typography>
              <Button 
                variant="contained" 
                color="primary"
                onClick={() => handleOpenDialog('cliente')}
              >
                Adicionar Cliente
              </Button>
            </Box>
            <ClientList />
          </>
        );
      case 'Socorristas':
        return (
          <>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h4">Gestão de Socorristas</Typography>
              <Button 
                variant="contained" 
                color="primary"
                onClick={() => handleOpenDialog('parceiro')}
              >
                Adicionar Socorrista
              </Button>
            </Box>
            <PartnerList />
          </>
        );
      case 'Usuários Administrativos':
        return (
          <>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h4">Gestão de Usuários Administrativos</Typography>
              <Button
                variant="contained"
                color="primary"
                onClick={() => handleOpenDialog('usuario')}
              >
                Adicionar Usuário
              </Button>
            </Box>
            <AdminUserList />
          </>
        );
      default:
        return null;
    }
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      
      {/* Header */}
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar>
          <Typography variant="h6" noWrap component="div">
            Painel Administrativo
          </Typography>
        </Toolbar>
      </AppBar>
      
      {/* Sidebar */}
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' },
        }}
      >
        <Box>
          <Toolbar /> {/* Espaço para compensar o AppBar */}
          {/* Marca d'água mais para baixo no menu lateral */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              width: '100%',
              mt: 4, // aumenta o espaçamento para descer a imagem
              mb: 1,
            }}
          >
            <Box
              component="img"
              src={require('../../assets/cropped_image.png')}
              alt="Marca d'água Support Life"
              sx={{
                width: '80%',
                pointerEvents: 'none',
                userSelect: 'none',
                display: 'block',
              }}
            />
          </Box>
          <Box sx={{ overflow: 'auto' }}>
            <List>
              <ListItemButton
                selected={selectedSection === 'Chamados'}
                onClick={() => handleSectionChange('Chamados')}
              >
                <ListItemIcon>
                  <AdminPanelSettingsIcon />
                </ListItemIcon>
                <ListItemText primary="Chamados" />
              </ListItemButton>
              <ListItemButton
                selected={selectedSection === 'Clientes'} 
                onClick={() => handleSectionChange('Clientes')}
              >
                <ListItemIcon>
                  <PeopleIcon />
                </ListItemIcon>
                <ListItemText primary="Clientes" />
              </ListItemButton>
              <ListItemButton 
                selected={selectedSection === 'Socorristas'} 
                onClick={() => handleSectionChange('Socorristas')}
              >
                <ListItemIcon>
                  <LocalHospitalIcon />
                </ListItemIcon>
                <ListItemText primary="Socorristas" />
              </ListItemButton>
              <ListItemButton
                selected={selectedSection === 'Usuários Administrativos'} 
                onClick={() => handleSectionChange('Usuários Administrativos')}
              >
                <ListItemIcon>
                  <AdminPanelSettingsIcon />
                </ListItemIcon>
                <ListItemText primary="Usuários Administrativos" />
              </ListItemButton>
            </List>
          </Box>
        </Box>
        {/* Botão de logout na parte inferior */}
        <Box sx={{ p: 2 }}>
          <List>
            <ListItemButton onClick={handleLogout}>
              <ListItemIcon>
                <LogoutIcon />
              </ListItemIcon>
              <ListItemText primary="Sair" />
            </ListItemButton>
          </List>
        </Box>
      </Drawer>
      
      {/* Main Content */}
      <Box
        component="main"
        sx={{ flexGrow: 1, p: 3, width: { sm: `calc(100% - ${drawerWidth}px)` } }}
      >
        <Toolbar /> {/* Espaço para compensar o AppBar */}
        {renderMainContent()}
      </Box>

      {/* Diálogo de Formulário */}
      {dialogType === 'cliente' && (
        <AddClientDialog open={openDialog} onClose={handleCloseDialog} />
      )}
      {dialogType === 'parceiro' && (
        <AddPartnerDialog open={openDialog} onClose={handleCloseDialog} />
      )}
      {dialogType === 'usuario' && (
        <AddUserAdminDialog open={openDialog} onClose={handleCloseDialog} />
      )}
    </Box>
  );
};

export default AdminPanel; 