import React, { useState } from 'react';
import {
  Container,
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Button,
  TextField,
  InputAdornment,
  Alert,
} from '@mui/material';
import {
  Search as SearchIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  AccessTime as PendingIcon,
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import { Link } from 'react-router-dom';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ py: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

interface EmergencyCall {
  id: string;
  userId: string;
  userName: string;
  status: 'pending' | 'inProgress' | 'completed' | 'cancelled';
  location: string;
  timestamp: string;
  description?: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: 'active' | 'inactive';
  lastLogin: string;
}

const Admin: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');

  // Mock data - replace with API calls
  const [emergencyCalls] = useState<EmergencyCall[]>([
    {
      id: '1',
      userId: 'user1',
      userName: 'João Silva',
      status: 'pending',
      location: 'Rua Augusta, 1500 - São Paulo',
      timestamp: '2024-03-15 14:30:00',
      description: 'Paciente com dores no peito',
    },
    {
      id: '2',
      userId: 'user2',
      userName: 'Maria Santos',
      status: 'inProgress',
      location: 'Av. Paulista, 1000 - São Paulo',
      timestamp: '2024-03-15 14:15:00',
      description: 'Acidente de carro',
    },
    {
      id: '3',
      userId: 'user3',
      userName: 'Pedro Oliveira',
      status: 'completed',
      location: 'Rua Oscar Freire, 500 - São Paulo',
      timestamp: '2024-03-15 13:45:00',
      description: 'Queda com fratura',
    },
  ]);

  const [users] = useState<User[]>([
    {
      id: '1',
      name: 'João Silva',
      email: 'joao.silva@example.com',
      phone: '(11) 99999-9999',
      status: 'active',
      lastLogin: '2024-03-15 14:00:00',
    },
    {
      id: '2',
      name: 'Maria Santos',
      email: 'maria.santos@example.com',
      phone: '(11) 98888-8888',
      status: 'active',
      lastLogin: '2024-03-15 13:30:00',
    },
    {
      id: '3',
      name: 'Pedro Oliveira',
      email: 'pedro.oliveira@example.com',
      phone: '(11) 97777-7777',
      status: 'inactive',
      lastLogin: '2024-03-14 18:45:00',
    },
  ]);

  const getStatusChip = (status: EmergencyCall['status']) => {
    const statusConfig = {
      pending: { color: 'warning' as const, icon: <PendingIcon />, label: 'Pendente' },
      inProgress: { color: 'info' as const, icon: <WarningIcon />, label: 'Em Atendimento' },
      completed: { color: 'success' as const, icon: <CheckCircleIcon />, label: 'Concluído' },
      cancelled: { color: 'error' as const, icon: <ErrorIcon />, label: 'Cancelado' },
    };

    const config = statusConfig[status];
    return (
      <Chip
        icon={config.icon}
        label={config.label}
        color={config.color}
        size="small"
      />
    );
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleRefresh = () => {
    // TODO: Implement refresh logic with API call
    console.log('Refreshing data...');
  };

  return (
    <Box sx={{ bgcolor: 'grey.100', minHeight: '100vh', py: 4 }}>
      <Container maxWidth="xl">
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Typography variant="h4" component="h1" sx={{ color: 'primary.main' }}>
            Painel Administrativo
          </Typography>
          <Button
            variant="contained"
            color="primary"
            startIcon={<RefreshIcon />}
            onClick={handleRefresh}
          >
            Atualizar
          </Button>
        </Box>

        <Paper sx={{ width: '100%', mb: 4 }}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            indicatorColor="primary"
            textColor="primary"
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab label="Chamados de Emergência" />
            <Tab label="Usuários" />
          </Tabs>

          <TabPanel value={tabValue} index={0}>
            <Box sx={{ mb: 3 }}>
              <TextField
                fullWidth
                placeholder="Buscar chamados..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Box>

            <Alert severity="warning" sx={{ mb: 3 }}>
              Existem 1 chamados pendentes que precisam de atenção!
            </Alert>

            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>ID</TableCell>
                    <TableCell>Usuário</TableCell>
                    <TableCell>Localização</TableCell>
                    <TableCell>Data/Hora</TableCell>
                    <TableCell>Descrição</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {emergencyCalls.map((call) => (
                    <TableRow key={call.id} hover>
                      <TableCell>{call.id}</TableCell>
                      <TableCell>{call.userName}</TableCell>
                      <TableCell>{call.location}</TableCell>
                      <TableCell>{call.timestamp}</TableCell>
                      <TableCell>{call.description}</TableCell>
                      <TableCell>{getStatusChip(call.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            <Box sx={{ mb: 3 }}>
              <TextField
                fullWidth
                placeholder="Buscar usuários..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Box>

            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Nome</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Telefone</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Último Acesso</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id} hover>
                      <TableCell>{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.phone}</TableCell>
                      <TableCell>
                        <Chip
                          label={user.status === 'active' ? 'Ativo' : 'Inativo'}
                          color={user.status === 'active' ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{user.lastLogin}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </TabPanel>
        </Paper>

        <Box sx={{ mt: 4 }}>
          <Link to="/" style={{ textDecoration: 'none' }}>
            <Button
              startIcon={<ArrowBackIcon />}
              color="primary"
            >
              Voltar para Home
            </Button>
          </Link>
        </Box>
      </Container>
    </Box>
  );
};

export default Admin; 
