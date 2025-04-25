import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Paper, 
  List, 
  ListItem,
  ListItemText,
  IconButton,
  Snackbar,
  Alert,
  Chip
} from '@mui/material';
import {
  NotificationsActive as NotificationsActiveIcon,
  LocationOn as LocationOnIcon,
  Phone as PhoneIcon
} from '@mui/icons-material';
import Map from '../components/Map';

interface FamilyContact {
  id: string;
  name: string;
  phone: string;
  notified: boolean;
}

interface Location {
  lat: number;
  lng: number;
  address: string;
}

const Emergency: React.FC = () => {
  const [startTime] = useState(new Date().toLocaleTimeString());
  const [estimatedTime] = useState('15 minutos');
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);

  const [familyContacts] = useState<FamilyContact[]>([
    { id: '1', name: 'Maria Silva', phone: '(11) 99999-1111', notified: false },
    { id: '2', name: 'João Oliveira', phone: '(11) 99999-2222', notified: false }
  ]);

  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error'
  });

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error('Error getting location:', error);
          setLocation({ lat: -23.5505, lng: -46.6333 }); // São Paulo default
        },
        {
          enableHighAccuracy: true, // Solicita alta precisão
          timeout: 10000,          // Aumenta o tempo limite para 10 segundos
          maximumAge: 0            // Não usa cache de localização
        }
      );
    }
  }, []);

  useEffect(() => {
    setNotification({
      open: true,
      message: 'SOS Ativado! Equipe médica foi notificada. A central entrará em contato por telefone para avaliar a situação.',
      severity: 'success'
    });
  }, []);

  const notifyContact = (contactId: string) => {
    setNotification({
      open: true,
      message: 'Familiar notificado com sucesso!',
      severity: 'success'
    });
  };

  const notifyAllContacts = () => {
    setNotification({
      open: true,
      message: 'Todos os familiares foram notificados!',
      severity: 'success'
    });
  };

  const finishEmergency = () => {
    setNotification({
      open: true,
      message: 'Emergência finalizada com sucesso!',
      severity: 'success'
    });
    setTimeout(() => {
      window.location.href = '/';
    }, 1500);
  };

  return (
    <Box sx={{
      p: 3,
      display: 'flex',
      flexDirection: 'column',
      gap: 3,
      maxWidth: 800,
      mx: 'auto',
      minHeight: 'calc(100vh - 64px)'
    }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Emergência Ativa
      </Typography>

      <Paper sx={{ p: 3, borderRadius: 2 }}>
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          mb: 3
        }}>
          <LocationOnIcon color="error" sx={{ fontSize: 28 }} />
          <Typography variant="h6" sx={{ flex: 1 }}>
            Status da Emergência
          </Typography>
          <Chip
            label="Ambulância no Local"
            color="success"
            sx={{ fontWeight: 500 }}
          />
        </Box>

        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Box>
              <Typography color="text.secondary" variant="body2" gutterBottom>
                Horário de Despacho
              </Typography>
              <Typography variant="h6">
                {startTime}
              </Typography>
            </Box>
            <Box>
              <Typography color="text.secondary" variant="body2" gutterBottom>
                Tempo Estimado
              </Typography>
              <Typography variant="h6">
                {estimatedTime}
              </Typography>
            </Box>
          </Box>
          
          <Box sx={{ mt: 2 }}>
            <Typography color="text.secondary" variant="body2" gutterBottom>
              Localização
            </Typography>
            <Box display="flex" alignItems="center" gap={1}>
              <LocationOnIcon color="action" fontSize="small" />
              <Typography>
                {location ? 'Localização obtida' : 'Obtendo localização...'}
              </Typography>
            </Box>
          </Box>
        </Box>
      </Paper>

      {location && (
        <Paper sx={{ p: 2, borderRadius: 2 }}>
          <Map
            center={location}
            zoom={15}
            markers={[
              {
                position: location,
                title: 'Sua localização',
                description: 'Você está aqui'
              }
            ]}
          />
        </Paper>
      )}

      <Paper sx={{ p: 3, borderRadius: 2 }}>
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          mb: 3
        }}>
          <NotificationsActiveIcon color="primary" sx={{ fontSize: 28 }} />
          <Typography variant="h6">
            Notificar Familiares
          </Typography>
        </Box>
        
        <List sx={{ mb: 2 }}>
          {familyContacts.map((contact) => (
            <ListItem
              key={contact.id}
              secondaryAction={
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => notifyContact(contact.id)}
                  startIcon={<PhoneIcon />}
                >
                  Notificar
                </Button>
              }
            >
              <ListItemText
                primary={contact.name}
                secondary={contact.phone}
              />
            </ListItem>
          ))}
        </List>

        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            color="primary"
            fullWidth
            onClick={notifyAllContacts}
            startIcon={<NotificationsActiveIcon />}
          >
            Notificar Todos
          </Button>
          <Button
            variant="outlined"
            color="error"
            fullWidth
            onClick={finishEmergency}
          >
            Finalizar Emergência
          </Button>
        </Box>
      </Paper>

      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={() => setNotification(prev => ({ ...prev, open: false }))}
      >
        <Alert
          onClose={() => setNotification(prev => ({ ...prev, open: false }))}
          severity={notification.severity}
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Emergency; 