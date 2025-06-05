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
import { buscarFamiliares } from '../familiares/api';
import type { FamilyMember } from '../familiares/FamilyMemberDialog';
import { supabase } from '../../Supabase/supabaseRealtimeClient';
import { MapMarker } from './Map';

interface Chamado {
  id: number;
  cliente_id: number;
  status: string;
  localizacao: string;
  data_abertura: string;
  notificacao_familiares?: any[];
  socorrista_id?: string;
  posicao_inicial_socorrista?: string;
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

  const [familyContacts, setFamilyContacts] = useState<FamilyMember[]>([]);

  const [notification, setNotification] = useState({
    open: false,
    message: '',
    // Ajustado tipo para incluir 'info' que usamos em finishEmergency
    severity: 'success' as 'success' | 'error' | 'info' | 'warning' 
  });

  const [chamado, setChamado] = useState<Chamado | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Novo estado para o endereço legível
  const [address, setAddress] = useState<string | null>(null);

  const [notificados, setNotificados] = useState<string[]>([]);

  const [socorristaMarker, setSocorristaMarker] = useState<{ lat: number, lng: number } | null>(null);

  const navigate = useNavigate();

  const fetchChamados = async () => {
    setLoading(true);
    setError(null);
    try {
      setLoading(true);
      setError(null);
      const url = process.env.REACT_APP_SUPABASE_URL;
      const serviceKey = process.env.REACT_APP_SUPABASE_SERVICE_KEY;
      if (!url || !serviceKey) throw new Error('REACT_APP_SUPABASE_URL ou REACT_APP_SUPABASE_SERVICE_KEY não definida no .env');
      const accessToken = localStorage.getItem('accessToken');
      const clienteId = localStorage.getItem('clienteId');
      if (!clienteId) throw new Error('Cliente não identificado');
      const response = await fetch(`${url}/rest/v1/chamado?cliente_id=eq.${clienteId}&order=data_abertura.desc&limit=1`, {
        method: 'GET',
        headers: {
          'apikey': serviceKey,
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error_description || data.message || `Erro ${response.status}`);
      setChamado(data[0] || null);
    } catch (err: any) {
      setError(err.message || 'Erro ao buscar chamado');
      setChamado(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChamados();
  }, []);

  // Polling a cada 5 segundos para atualizar o chamado e marcador do socorrista
  /*
  useEffect(() => {
    const interval = setInterval(async () => {
      await fetchChamados();
    }, 5000);
    return () => clearInterval(interval);
  }, []);
  */

  // Atualiza marcador do socorrista quando chamado muda
  useEffect(() => {
    if (chamado?.socorrista_id && chamado?.posicao_inicial_socorrista) {
      const [lat, lng] = chamado.posicao_inicial_socorrista.split(',').map(Number);
      setSocorristaMarker({ lat, lng });
    } else {
      setSocorristaMarker(null);
    }
  }, [chamado?.socorrista_id, chamado?.posicao_inicial_socorrista]);

  // Montar marcadores para o mapa
  const markers: MapMarker[] = [];
  if (chamado?.localizacao) {
    const [lat, lng] = chamado.localizacao.split(',').map(Number);
    markers.push({
      position: { lat, lng },
      title: 'Paciente',
      description: 'Localização do paciente',
      type: 'paciente'
    });
  }
  if (socorristaMarker) {
    markers.push({
      position: socorristaMarker,
      title: 'Socorrista',
      description: 'Posição inicial do socorrista',
      type: 'socorrista' as const
    });
  }

  // Buscar endereço legível quando o chamado mudar
  useEffect(() => {
    if (chamado?.localizacao) {
      const [lat, lon] = chamado.localizacao.split(',').map(Number);
      getAddressFromCoords(lat, lon).then(setAddress);
    } else {
      setAddress(null);
    }
  }, [chamado?.localizacao]);

  // Buscar familiares reais ao montar
  useEffect(() => {
    buscarFamiliares()
      .then((familiares) => {
        const members = familiares
          .filter((f: any) => !f.deletado)
          .map((f: any) => ({
            id: f.id?.toString() || '',
            name: f.nome,
            relationship: f.parentesco,
            phone: f.telefone,
            email: f.email,
            isEmergencyContact: f.contato_emergencia || false,
          }));
        setFamilyContacts(members);
      })
      .catch(() => setFamilyContacts([]));
  }, []);

  const handleNotificar = (member: FamilyMember) => {
    setNotificados((prev) => [...prev, member.id]);
    setNotification({
      open: true,
      message: `Familiar ${member.name} notificado com sucesso!`,
      severity: 'success'
    });
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
    try {
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
        Emergência Ativa{chamado && chamado.id ? ` #${chamado.id}` : ''}
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
           {loading ? (
             <CircularProgress size={24} />
           ) : chamado ? (
             <Chip
               label={chamado.status}
               color={
                 chamado.status === 'finalizado'
                   ? 'default'
                   : chamado.status === 'aceito' || chamado.status === 'em andamento'
                   ? 'success'
                   : 'warning'
               }
               sx={{ fontWeight: 500, maxWidth: 180, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
             />
           ) : null}
         </Box>

         <Box sx={{ mb: 2 }}>
           {loading ? (
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
          center={FALLBACK_CENTER}
          zoom={15}
          showUserLocation={true}
          markers={markers}
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
           {familyContacts.length === 0 ? (
             <Typography color="text.secondary" sx={{ px: 2, py: 1 }}>Nenhum familiar cadastrado.</Typography>
           ) : (
             familyContacts.map((member) => {
               // Verifica se o familiar está na lista de notificados do chamado
               const jaNotificado = chamado && Array.isArray(chamado.notificacao_familiares) && chamado.notificacao_familiares.some((f: any) => f.id === member.id);
               return (
                 <ListItem
                   key={member.id}
                   sx={{ borderBottom: '1px solid #eee', '&:last-child': { borderBottom: 'none' } }}
                   secondaryAction={
                     jaNotificado ? (
                       <Box sx={{
                         backgroundColor: 'primary.main',
                         color: 'white',
                         px: 2,
                         py: 0.5,
                         borderRadius: 2,
                         fontWeight: 500,
                         fontSize: '0.95rem',
                         display: 'inline-block',
                         minWidth: 90,
                         textAlign: 'center',
                       }}>
                         Notificado
                       </Box>
                     ) : (
                       <Box sx={{
                         backgroundColor: '#e0e0e0',
                         color: '#222',
                         px: 2,
                         py: 0.5,
                         borderRadius: 2,
                         fontWeight: 500,
                         fontSize: '0.95rem',
                         display: 'inline-block',
                         minWidth: 90,
                         textAlign: 'center',
                       }}>
                         Notificar
                       </Box>
                     )
                   }
                 >
                   <ListItemText
                     primary={member.name}
                     secondary={member.phone}
                   />
                 </ListItem>
               );
             })
           )}
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