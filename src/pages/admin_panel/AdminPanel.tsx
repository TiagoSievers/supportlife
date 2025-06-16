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
import NotificationsIcon from '@mui/icons-material/Notifications';
import IconButton from '@mui/material/IconButton';
import Badge from '@mui/material/Badge';
import { useNavigate } from 'react-router-dom';
import { logoutSupabase } from '../../Supabase/supabaseClient';
import AddUserAdminDialog from './AddUserAdminDialog';
import AddPartnerDialog from './AddPartnerDialog';
import ClientList from './ClientList';
import PartnerList from './PartnerList';
import AdminUserList from './AdminUserList';
import ChamadoList from '../chamado/ChamadoList';
import ClientDialog, { Cliente } from './ClientDialog';
import MenuIcon from '@mui/icons-material/Menu';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';

const drawerWidth = 240;

const AdminPanel: React.FC = () => {
  const [selectedSection, setSelectedSection] = useState('Chamados');
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogType, setDialogType] = useState('');
  const [hasNewChamado, setHasNewChamado] = useState(false);
  const [editClient, setEditClient] = useState<Cliente | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

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
    setEditClient(null);
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

  // ===== handleEditClient =====
  const handleEditClient = (cliente: Cliente) => {
    setEditClient(cliente);
    setDialogType('cliente');
    setOpenDialog(true);
  };

  // ===== handleSaveClient =====
  const handleSaveClient = (data: Cliente) => {
    handleCloseDialog();
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

  // ===== handleDrawerToggle =====
  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
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
            <ChamadoList onNewChamado={() => setHasNewChamado(true)} />
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
                onClick={() => { 
                  setEditClient(null); // Limpa o cliente em edição
                  setDialogType('cliente');
                  setOpenDialog(true);
                }}
              >
                Adicionar Cliente
              </Button>
            </Box>
            <ClientList onEditClient={handleEditClient} />
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
        <Toolbar sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {isMobile && (
              <IconButton
                color="inherit"
                aria-label="open drawer"
                edge="start"
                onClick={handleDrawerToggle}
                sx={{ mr: 2 }}
              >
                <MenuIcon />
              </IconButton>
            )}
            <Typography variant="h6" noWrap component="div">
              Painel Administrativo
            </Typography>
          </Box>
          <IconButton color="inherit" sx={{ ml: 2 }}>
            <Badge color="error" variant="dot" invisible={!hasNewChamado}>
              <NotificationsIcon />
            </Badge>
          </IconButton>
        </Toolbar>
      </AppBar>
      
      {/* Sidebar Drawer */}
      {/* Mobile Drawer */}
      {isMobile ? (
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {/* Drawer content */}
          <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <Box>
              <Toolbar />
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  width: '100%',
                  mt: 4,
                  mb: 1,
                }}
              >
                <Box
                  component="img"
                  src={require('../../assets/cropped_image.png')}
                  alt="Marca d'água Support Life"
                  sx={{ width: '80%', pointerEvents: 'none', userSelect: 'none', display: 'block' }}
                />
              </Box>
              <Box sx={{ overflow: 'auto' }}>
                <List>
                  <ListItemButton selected={selectedSection === 'Chamados'} onClick={() => { handleSectionChange('Chamados'); handleDrawerToggle(); }}>
                    <ListItemIcon><AdminPanelSettingsIcon /></ListItemIcon>
                    <ListItemText primary="Chamados" />
                  </ListItemButton>
                  <ListItemButton selected={selectedSection === 'Clientes'} onClick={() => { handleSectionChange('Clientes'); handleDrawerToggle(); }}>
                    <ListItemIcon><PeopleIcon /></ListItemIcon>
                    <ListItemText primary="Clientes" />
                  </ListItemButton>
                  <ListItemButton selected={selectedSection === 'Socorristas'} onClick={() => { handleSectionChange('Socorristas'); handleDrawerToggle(); }}>
                    <ListItemIcon><LocalHospitalIcon /></ListItemIcon>
                    <ListItemText primary="Socorristas" />
                  </ListItemButton>
                  <ListItemButton selected={selectedSection === 'Usuários Administrativos'} onClick={() => { handleSectionChange('Usuários Administrativos'); handleDrawerToggle(); }}>
                    <ListItemIcon><AdminPanelSettingsIcon /></ListItemIcon>
                    <ListItemText primary="Usuários Administrativos" />
                  </ListItemButton>
                </List>
              </Box>
            </Box>
            <Box sx={{ p: 2 }}>
              <List>
                <ListItemButton onClick={() => { handleLogout(); handleDrawerToggle(); }}>
                  <ListItemIcon><LogoutIcon /></ListItemIcon>
                  <ListItemText primary="Sair" />
                </ListItemButton>
              </List>
            </Box>
          </Box>
        </Drawer>
      ) : (
        <Drawer
          variant="permanent"
          sx={{
            width: drawerWidth,
            flexShrink: 0,
            display: { xs: 'none', md: 'flex' },
            [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' },
          }}
          open
        >
          <Box>
            <Toolbar />
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                width: '100%',
                mt: 4,
                mb: 1,
              }}
            >
              <Box
                component="img"
                src={require('../../assets/cropped_image.png')}
                alt="Marca d'água Support Life"
                sx={{ width: '80%', pointerEvents: 'none', userSelect: 'none', display: 'block' }}
              />
            </Box>
            <Box sx={{ overflow: 'auto' }}>
              <List>
                <ListItemButton selected={selectedSection === 'Chamados'} onClick={() => handleSectionChange('Chamados')}>
                  <ListItemIcon><AdminPanelSettingsIcon /></ListItemIcon>
                  <ListItemText primary="Chamados" />
                </ListItemButton>
                <ListItemButton selected={selectedSection === 'Clientes'} onClick={() => handleSectionChange('Clientes')}>
                  <ListItemIcon><PeopleIcon /></ListItemIcon>
                  <ListItemText primary="Clientes" />
                </ListItemButton>
                <ListItemButton selected={selectedSection === 'Socorristas'} onClick={() => handleSectionChange('Socorristas')}>
                  <ListItemIcon><LocalHospitalIcon /></ListItemIcon>
                  <ListItemText primary="Socorristas" />
                </ListItemButton>
                <ListItemButton selected={selectedSection === 'Usuários Administrativos'} onClick={() => handleSectionChange('Usuários Administrativos')}>
                  <ListItemIcon><AdminPanelSettingsIcon /></ListItemIcon>
                  <ListItemText primary="Usuários Administrativos" />
                </ListItemButton>
              </List>
            </Box>
          </Box>
          <Box sx={{ p: 2 }}>
            <List>
              <ListItemButton onClick={handleLogout}>
                <ListItemIcon><LogoutIcon /></ListItemIcon>
                <ListItemText primary="Sair" />
              </ListItemButton>
            </List>
          </Box>
        </Drawer>
      )}
      
      {/* Main Content */}
      <Box
        component="main"
        sx={{ flexGrow: 1, p: { xs: 1, sm: 3 }, width: { xs: '100%', md: `calc(100% - ${drawerWidth}px)` }, minHeight: '100vh', boxSizing: 'border-box' }}
      >
        <Toolbar /> {/* Espaço para compensar o AppBar */}
        {renderMainContent()}
      </Box>

      {/* Modal de Cliente */}
      {dialogType === 'cliente' && (
        <ClientDialog
          open={openDialog}
          onClose={handleCloseDialog}
          onSave={handleSaveClient}
          initialData={editClient || undefined}
          isEditing={!!editClient}
        />
      )}

      {/* Diálogo de Formulário */}
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
