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
  Chip,
  CircularProgress
} from '@mui/material';
import {
  People as FamilyIcon,
  LocationOn as LocationOnIcon,
  Phone as PhoneIcon
} from '@mui/icons-material';
import Map from './Map';
import { useNavigate } from 'react-router-dom';
import Cronometro from './Cronometro';
import { getAddressFromCoords } from './getAddressFromCoords';

interface FamilyContact {
  id: string;
  name: string;
  phone: string;
  notified: boolean;
}

interface Chamado {
  id: number;
  cliente_id: number;
  status: string;
  localizacao: string;
  data_abertura: string;
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

  const [chamado, setChamado] = useState<Chamado | null>(null);
  const [loadingChamado, setLoadingChamado] = useState(true);

  // Novo estado para o endereço legível
  const [address, setAddress] = useState<string | null>(null);

  const navigate = useNavigate();

  // useEffect para notificação inicial
  useEffect(() => {
    const fetchUltimoChamado = async () => {
      setLoadingChamado(true);
      try {
        const clienteId = localStorage.getItem('clienteId');
        if (!clienteId) throw new Error('Cliente não identificado');
        const url = process.env.REACT_APP_SUPABASE_URL;
        const serviceKey = process.env.REACT_APP_SUPABASE_SERVICE_KEY;
        if (!url || !serviceKey) throw new Error('Supabase URL ou Service Key não definidos');
        const response = await fetch(`${url}/rest/v1/chamado?cliente_id=eq.${clienteId}&order=data_abertura.desc&limit=1`, {
          method: 'GET',
          headers: {
            'apikey': serviceKey,
            'Authorization': `Bearer ${serviceKey}`,
            'Content-Type': 'application/json'
          }
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error_description || data.message || `Erro ${response.status}`);
        setChamado(data[0] || null);
      } catch (err) {
        setChamado(null);
      } finally {
        setLoadingChamado(false);
      }
    };
    fetchUltimoChamado();
  }, []);

  // Buscar endereço legível quando o chamado mudar
  useEffect(() => {
    if (chamado?.localizacao) {
      const [lat, lon] = chamado.localizacao.split(',').map(Number);
      getAddressFromCoords(lat, lon).then(setAddress);
    } else {
      setAddress(null);
    }
  }, [chamado?.localizacao]);

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

  const finishEmergency = async () => {
    if (!chamado) return;
    try {
      const url = process.env.REACT_APP_SUPABASE_URL;
      const serviceKey = process.env.REACT_APP_SUPABASE_SERVICE_KEY;
      if (!url || !serviceKey) throw new Error('Supabase URL ou Service Key não definidos');
      const response = await fetch(`${url}/rest/v1/chamado?id=eq.${chamado.id}`, {
        method: 'PATCH',
        headers: {
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ status: 'finalizado' })
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error_description || data.message || `Erro ${response.status}`);
      }
      setNotification({
        open: true,
        message: 'Emergência finalizada com sucesso!',
        severity: 'info'
      });
      setTimeout(() => {
        navigate('/home');
      }, 1500);
    } catch (error) {
      setNotification({
        open: true,
        message: 'Erro ao finalizar emergência.',
        severity: 'error'
      });
    }
  };

 const handleCloseNotification = (event?: React.SyntheticEvent | Event, reason?: string) => {
   if (reason === 'clickaway') {
     return;
   }
   setNotification(prev => ({ ...prev, open: false }));
 };

 return (
    <Box sx={{
      display: 'flex',
      flexDirection: 'column',
      gap: 3,
      maxWidth: 800,
      mx: 'auto',
      minHeight: 'calc(100vh - 64px)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Marca d'água */}
      <Box
        component="img"
        src={require('../../assets/Design sem nome (7).png')}
        alt="Marca d'água Support Life"
        sx={{
          position: 'absolute',
          top: '20%',
          left: '50%',
          width: '140%',
          height: '140%',
          objectFit: 'contain',
          opacity: 0.07,
          pointerEvents: 'none',
          zIndex: 0,
          transform: 'translate(-50%, -50%)',
        }}
      />
      {/* Conteúdo principal */}
      <Box sx={{ position: 'relative', zIndex: 1 }}>
      <Typography variant="h4" component="h1" gutterBottom sx={{ textAlign: 'center' }}>
        Emergência Ativa
      </Typography>

      {/* Card de Status */}
      <Paper elevation={0} sx={{ borderRadius: 2, backgroundColor: 'transparent', boxShadow: 'none', border: 'none' }}>
         <Box sx={{
           display: 'flex',
           alignItems: 'center',
           gap: 2,
           mb: 3,
           flexWrap: 'wrap',
         }}>
           <LocationOnIcon color="error" sx={{ fontSize: 28 }} />
           <Typography variant="h6" sx={{ flex: 1 }}>
             Status da Emergência
           </Typography>
           {loadingChamado ? (
             <CircularProgress size={24} />
           ) : chamado ? (
             <Chip
               label={chamado.status === 'finalizado' ? 'Finalizado' : chamado.status === 'aceito' ? 'Ambulância a caminho' : 'Aguardando atendimento'}
               color={chamado.status === 'finalizado' ? 'default' : chamado.status === 'aceito' ? 'success' : 'warning'}
               sx={{ fontWeight: 500, maxWidth: 180, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
             />
           ) : null}
         </Box>

         <Box sx={{ mb: 2 }}>
           {loadingChamado ? (
             <Typography>Carregando informações do chamado...</Typography>
           ) : chamado ? (
             <>
               <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, alignItems: 'center' }}>
                 <Box sx={{ textAlign: 'left' }}>
                   <Typography color="text.secondary" variant="body2" gutterBottom>
                     Horário de Abertura
                   </Typography>
                   <Typography variant="h6">
                     {new Date(chamado.data_abertura).toLocaleString()}
                   </Typography>
                 </Box>
                 <Box>
                   <Typography color="text.secondary" variant="body2" gutterBottom>
                     Cronômetro
                   </Typography>
                   <Typography variant="h6">
                     {chamado?.data_abertura && <Cronometro startDate={chamado.data_abertura} />}
                   </Typography>
                 </Box>
               </Box>
               <Box sx={{ mt: 2 }}>
                 <Typography color="text.secondary" variant="body2" gutterBottom>
                   Localização
                 </Typography>
                 <Typography variant="body2">
                   {address || chamado.localizacao || 'Não informada'}
                 </Typography>
               </Box>
             </>
           ) : (
             <Typography color="error">Nenhum chamado encontrado para este cliente.</Typography>
           )}
         </Box>
      </Paper>

      {/* Renderização do Mapa simplificada */}
      <Paper elevation={3} sx={{ borderRadius: 2, overflow: 'hidden', mb: 3 }}>
        <Map
          center={FALLBACK_CENTER} // Passa um centro inicial/fallback
          zoom={15} 
          showUserLocation={true} // Pede ao Map para buscar e mostrar a localização
          // markers={[]} // Pode passar outros marcadores se necessário, ex: ambulância
        />
      </Paper>
      
      {/* Card de Notificar Familiares */}
      <Paper elevation={0} sx={{ borderRadius: 2, backgroundColor: 'transparent', boxShadow: 'none', border: 'none' }}>
         <Box sx={{
           display: 'flex',
           alignItems: 'center',
           gap: 2,
           mb: 1
         }}>
           <FamilyIcon sx={{ fontSize: 28, color: 'text.primary' }} />
           <Typography variant="body1" sx={{ fontWeight: 400, color: 'text.primary' }}>
             Familiares
           </Typography>
         </Box>
         
         <List sx={{ mb: 2 }}>
           {familyContacts.map((contact) => (
             <ListItem
               key={contact.id}
               sx={{ borderBottom: '1px solid #eee', '&:last-child': { borderBottom: 'none' } }}
             >
               <ListItemText
                 primary={contact.name}
                 secondary={contact.phone}
               />
               <Box sx={{ ml: 2, color: 'success.main', fontWeight: 600 }}>Notificado</Box>
             </ListItem>
           ))}
         </List>

         <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
           <Button
             variant="outlined"
             color="error"
             fullWidth
             onClick={finishEmergency}
           >
             Finalizar Emergência
           </Button>
           <Box sx={{ pb: 2 }} />
         </Box>
      </Paper>
      </Box>
    </Box>
  );
};

export default Emergency; 