import React, { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Typography,
  Button,
  Paper,
} from '@mui/material';
import { Link } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import FamilyMemberDialog, { FamilyMember } from './FamilyMemberDialog';
import FamilyMemberList from '../../components/FamilyMemberList';
import { supabase } from '../../Supabase/supabaseRealtimeClient';
import { marcarFamiliarComoDeletado } from './api';

const Family: React.FC = () => {
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const emptyMember: FamilyMember = {
    id: `temp-${Date.now().toString()}`,
    name: '',
    relationship: '',
    phone: '',
    email: '',
    isEmergencyContact: false
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
        const serviceKey = process.env.REACT_APP_SUPABASE_SERVICE_KEY;
        const accessToken = localStorage.getItem('accessToken');
        const clienteId = localStorage.getItem('clienteId');
        if (!supabaseUrl || !serviceKey || !accessToken || !clienteId) {
          throw new Error('Configuração do Supabase ou autenticação ausente');
        }
        const response = await fetch(`${supabaseUrl}/rest/v1/familiares?cliente_id=eq.${clienteId}&order=data_cadastro.desc`, {
          method: 'GET',
          headers: {
            'apikey': serviceKey,
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          }
        });
        const familiares = await response.json();
        if (!response.ok) {
          throw new Error(familiares.error_description || familiares.message || `Erro ${response.status}`);
        }
        console.log('[Family] Familiares encontrados:', familiares);
        const members = familiares
          .filter((f: any) => !f.deletado)
          .map((f: any) => ({
            id: f.id,
            name: f.nome,
            relationship: f.parentesco,
            phone: f.telefone,
            email: f.email,
            isEmergencyContact: f.contato_emergencia
          }));
        setFamilyMembers(members);
      } catch (error) {
        console.error('Erro ao buscar familiares:', error);
      }
    };
    fetchData();
    // Realtime subscription para familiares
    const channel = supabase
      .channel('public:familiares')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'familiares' },
        (payload) => {
          fetchData();
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleOpenDialog = (member?: FamilyMember) => {
    if (member) {
      setSelectedMember(member);
      setIsEditing(true);
    } else {
      setSelectedMember({
        ...emptyMember,
        id: `temp-${Date.now().toString()}`,
      });
      setIsEditing(false);
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedMember(null);
    setIsEditing(false);
  };

  const handleSave = (member: FamilyMember) => {
    setFamilyMembers(prev => {
      const exists = prev.some(item => item.id === member.id);
      if (exists) {
        // Atualiza o membro existente
        return prev.map(item => item.id === member.id ? member : item);
      }
      // Adiciona novo membro
      return [...prev, member];
    });
    handleCloseDialog();
  };

  const handleDelete = async (id: string) => {
    try {
      await marcarFamiliarComoDeletado(id);
      setFamilyMembers(prev => prev.filter(member => member.id !== id));
    } catch (error: any) {
      alert('Erro ao marcar familiar como deletado: ' + error.message);
    }
  };

  return (
    <Box sx={{ bgcolor: 'grey.100', minHeight: '100vh', py: 4 }}>
      <Container maxWidth="lg">
        <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 4, color: 'primary.main' }}>
          Familiares e Contatos de Emergência
        </Typography>

        <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6">
              Lista de Familiares
            </Typography>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
              disabled={familyMembers.length >= 2}
            >
              Adicionar Familiar
            </Button>
          </Box>

          <FamilyMemberList
            familyMembers={familyMembers}
            onEdit={handleOpenDialog}
            onDelete={handleDelete}
          />
        </Paper>

        <Box sx={{ mt: 4 }}>
          <Link to="/home" style={{ textDecoration: 'none' }}>
            <Button
              startIcon={<ArrowBackIcon />}
              color="primary"
            >
              Voltar para Home
            </Button>
          </Link>
        </Box>

        {selectedMember && (
          <FamilyMemberDialog
            open={openDialog}
            onClose={handleCloseDialog}
            onSave={handleSave}
            initialData={selectedMember}
            isEditing={isEditing}
          />
        )}
      </Container>
    </Box>
  );
};

export default Family; 