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
import FamilyMemberForm, { FamilyMember } from '../components/FamilyMemberForm';
import FamilyMemberList from '../components/FamilyMemberList';
import { fetchFamiliares } from '../Supabase/supabaseClient';

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
        const familiares = await fetchFamiliares();
        const members = familiares.map((f: any) => ({
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
      const filtered = prev.filter(item => 
        item.id !== member.id && 
        (!item.id.startsWith('temp-') || item.id !== selectedMember?.id)
      );
      return [...filtered, member];
    });
    handleCloseDialog();
  };

  const handleDelete = (id: string) => {
    setFamilyMembers(prev => prev.filter(member => member.id !== id));
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
          <FamilyMemberForm
            open={openDialog}
            onClose={handleCloseDialog}
            onSave={handleSave}
            member={selectedMember}
            isEditing={isEditing}
          />
        )}
      </Container>
    </Box>
  );
};

export default Family; 