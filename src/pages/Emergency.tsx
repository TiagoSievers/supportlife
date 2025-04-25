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

// Interface Location não é mais necessária aqui
/*
interface Location {
  lat: number;
  lng: number;
  address: string;
}
*/

// Coordenadas de fallback (opcional, pode ser gerenciado no Map.tsx)
const FALLBACK_CENTER = { lat: -23.5505, lng: -46.6333 };

const Emergency: React.FC = () => {
  const [startTime] = useState(new Date().toLocaleTimeString());
  const [estimatedTime] = useState('15 minutos');
  // Estado location removido
  // const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);

  const [familyContacts] = useState<FamilyContact[]>([
    { id: '1', name: 'Maria Silva', phone: '(11) 99999-1111', notified: false },
    { id: '2', name: 'João Oliveira', phone: '(11) 99999-2222', notified: false }
  ]);

  const [notification, setNotification] = useState({
    open: false,
    message: '',
    // Ajustado tipo para incluir 'info' que usamos em finishEmergency
    severity: 'success' as 'success' | 'error' | 'info' | 'warning' 
  });

  // useEffect para notificação inicial
  useEffect(() => {
    setNotification({
      open: true,
      message: 'SOS Ativado! Equipe médica foi notificada. A central entrará em contato por telefone para avaliar a situação.',
      severity: 'success'
    });
  }, []);

  const notifyContact = (contactId: string) => {
     const contact = familyContacts.find(c => c.id === contactId);
     setNotification({
       open: true,
       // Mensagem mais específica
       message: contact ? `Familiar ${contact.name} notificado com sucesso!` : 'Erro ao notificar familiar.',
       severity: contact ? 'success' : 'error'
     });
     // Adicionar lógica real de notificação aqui
  };

  const notifyAllContacts = () => {
    setNotification({
      open: true,
      message: 'Todos os familiares foram notificados!',
      severity: 'success'
    });
     // Adicionar lógica real de notificação aqui
  };

  const finishEmergency = () => {
    setNotification({
      open: true,
      message: 'Emergência finalizada com sucesso!',
      severity: 'info' // Mantido como info
    });
    setTimeout(() => {
      window.location.href = '/';
    }, 1500);
  };

 const handleCloseNotification = (event?: React.SyntheticEvent | Event, reason?: string) => {
   if (reason === 'clickaway') {
     return;
   }
   setNotification(prev => ({ ...prev, open: false }));
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
      <Typography variant="h4" component="h1" gutterBottom sx={{ textAlign: 'center' }}>
        Emergência Ativa
      </Typography>

      {/* Card de Status */}
      <Paper elevation={3} sx={{ p: 3, borderRadius: 2 }}>
         {/* ... (Conteúdo do Status da Emergência) ... */}
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
           <Box sx={{ display: 'flex', justifyContent: 'space-around', mb: 2, textAlign: 'center' }}>
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
           
           {/* Texto de Localização não precisa mais depender do estado 'location' */}
           <Box sx={{ mt: 2 }}>
             <Typography color="text.secondary" variant="body2" gutterBottom>
               Localização no Mapa
             </Typography>
              <Typography variant="body2">
                 O mapa abaixo mostra a localização detectada.
              </Typography>
           </Box>
         </Box>
      </Paper>

      {/* Renderização do Mapa simplificada */}
      <Paper elevation={3} sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <Map
          center={FALLBACK_CENTER} // Passa um centro inicial/fallback
          zoom={15} 
          showUserLocation={true} // Pede ao Map para buscar e mostrar a localização
          // markers={[]} // Pode passar outros marcadores se necessário, ex: ambulância
        />
      </Paper>
      
      {/* Card de Notificar Familiares */}
      <Paper elevation={3} sx={{ p: 3, borderRadius: 2 }}>
         {/* ... (Conteúdo Notificar Familiares) ... */}
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
               sx={{ borderBottom: '1px solid #eee', '&:last-child': { borderBottom: 'none' } }}
             >
               <ListItemText
                 primary={contact.name}
                 secondary={contact.phone}
               />
             </ListItem>
           ))}
         </List>

         <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
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

      {/* Snackbar para Notificações */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleCloseNotification}
          severity={notification.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Emergency; 