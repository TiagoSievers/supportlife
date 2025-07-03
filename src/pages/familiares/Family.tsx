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
    fetchFamilyMembers();
  }, []);

  const fetchFamilyMembers = async () => {
    try {
      const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
      const serviceKey = process.env.REACT_APP_SUPABASE_SERVICE_KEY;
      const accessToken = localStorage.getItem('accessToken');
      const clienteId = localStorage.getItem('clienteId');
      
      if (!supabaseUrl || !serviceKey || !accessToken || !clienteId) {
        throw new Error('Configuração do Supabase ou autenticação ausente');
      }

      const response = await fetch(`${supabaseUrl}/rest/v1/familiares?cliente_id=eq.${clienteId}&order=data_cadastro.desc`, {
        headers: {
          'apikey': serviceKey,
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Erro ao buscar familiares');
      }

      const data = await response.json();
      const familiaresAtivos = data
        .filter((f: any) => !f.deletado)
        .map((f: any) => ({
          id: f.id,
          name: f.nome,
          relationship: f.parentesco,
          phone: f.telefone,
          email: f.email,
          isEmergencyContact: f.contato_emergencia || false
        }));

      setFamilyMembers(familiaresAtivos);
    } catch (error) {
      console.error('Erro ao buscar familiares:', error);
      alert('Erro ao carregar familiares. Por favor, tente novamente.');
    }
  };

  const handleOpenDialog = (member?: FamilyMember) => {
    if (member) {
      console.log('[Family] Editando familiar:', member);
      setSelectedMember(member);
      setIsEditing(true);
    } else {
      console.log('[Family] Criando novo familiar');
      setSelectedMember(emptyMember);
      setIsEditing(false);
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    console.log('[Family] Fechando diálogo');
    setOpenDialog(false);
    setSelectedMember(null);
    setIsEditing(false);
  };

  // Função para validar e-mail
  const isValidEmail = (email: string) => {
    // Regex simples para validação de e-mail
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSave = async (member: FamilyMember) => {
    console.log('[Family] Salvando familiar:', {
      member,
      isEditing: isEditing
    });
    if (member.email && !isValidEmail(member.email)) {
      alert('Por favor, insira um e-mail válido.');
      return;
    }
    try {
      await fetchFamilyMembers();
      handleCloseDialog();
    } catch (error) {
      console.error('Erro ao salvar familiar:', error);
      alert('Erro ao salvar familiar. Por favor, tente novamente.');
    }
  };

  const handleDelete = async (member: FamilyMember) => {
    try {
      await marcarFamiliarComoDeletado(member.id);
      await fetchFamilyMembers();
    } catch (error) {
      console.error('Erro ao deletar familiar:', error);
      alert('Erro ao deletar familiar. Por favor, tente novamente.');
    }
  };

  return (
    <Box sx={{ bgcolor: 'grey.100', minHeight: '100vh', py: 4 }}>
      <Container maxWidth="lg">
        <Box component="h1" sx={{ typography: 'h4', mb: 4, color: 'primary.main' }}>
          Familiares e Contatos de Emergência
        </Box>

        <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Box component="h2" sx={{ typography: 'h6' }}>
              Lista de Familiares
            </Box>
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

        <FamilyMemberDialog
          open={openDialog}
          onClose={handleCloseDialog}
          onSave={handleSave}
          initialData={selectedMember || undefined}
          isEditing={isEditing}
        />
      </Container>
    </Box>
  );
};

export default Family; 
