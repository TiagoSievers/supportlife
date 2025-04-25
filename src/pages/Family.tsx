import React, { useState } from 'react';
import {
  Container,
  Box,
  Typography,
  Avatar,
  Button,
  TextField,
  Paper,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { Link } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import PersonIcon from '@mui/icons-material/Person';

interface FamilyMember {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  email: string;
  isEmergencyContact: boolean;
}

const Family: React.FC = () => {
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([
    {
      id: '1',
      name: 'Maria Silva',
      relationship: 'Mãe',
      phone: '(11) 98765-4321',
      email: 'maria@example.com',
      isEmergencyContact: true,
    },
    {
      id: '2',
      name: 'João Silva',
      relationship: 'Pai',
      phone: '(11) 91234-5678',
      email: 'joao@example.com',
      isEmergencyContact: true,
    },
  ]);

  const [openDialog, setOpenDialog] = useState(false);
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);
  const [editingMember, setEditingMember] = useState<FamilyMember>({
    id: '',
    name: '',
    relationship: '',
    phone: '',
    email: '',
    isEmergencyContact: false,
  });

  const handleOpenDialog = (member?: FamilyMember) => {
    if (member) {
      setEditingMember(member);
      setSelectedMember(member);
    } else {
      setEditingMember({
        id: Date.now().toString(),
        name: '',
        relationship: '',
        phone: '',
        email: '',
        isEmergencyContact: false,
      });
      setSelectedMember(null);
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedMember(null);
    setEditingMember({
      id: '',
      name: '',
      relationship: '',
      phone: '',
      email: '',
      isEmergencyContact: false,
    });
  };

  const handleSave = () => {
    if (selectedMember) {
      setFamilyMembers(prev =>
        prev.map(member =>
          member.id === selectedMember.id ? editingMember : member
        )
      );
    } else {
      setFamilyMembers(prev => [...prev, editingMember]);
    }
    handleCloseDialog();
  };

  const handleDelete = (id: string) => {
    setFamilyMembers(prev => prev.filter(member => member.id !== id));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, checked } = e.target;
    setEditingMember(prev => ({
      ...prev,
      [name]: name === 'isEmergencyContact' ? checked : value,
    }));
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

          <List>
            {familyMembers.map((member) => (
              <ListItem
                key={member.id}
                sx={{
                  bgcolor: 'background.paper',
                  mb: 1,
                  borderRadius: 1,
                  '&:hover': { bgcolor: 'grey.50' },
                }}
              >
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: member.isEmergencyContact ? 'error.main' : 'primary.main' }}>
                    <PersonIcon />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={member.name}
                  secondary={
                    <React.Fragment>
                      <Typography component="span" variant="body2" color="text.primary">
                        {member.relationship}
                      </Typography>
                      {" — "}{member.phone}
                      {member.isEmergencyContact && (
                        <Typography
                          component="span"
                          variant="body2"
                          color="error"
                          sx={{ display: 'block' }}
                        >
                          Contato de Emergência
                        </Typography>
                      )}
                    </React.Fragment>
                  }
                />
                <ListItemSecondaryAction>
                  <IconButton edge="end" onClick={() => handleOpenDialog(member)} sx={{ mr: 1 }}>
                    <EditIcon />
                  </IconButton>
                  <IconButton edge="end" onClick={() => handleDelete(member.id)}>
                    <DeleteIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
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

        <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
          <DialogTitle>
            {selectedMember ? 'Editar Familiar' : 'Adicionar Familiar'}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
              <TextField
                fullWidth
                label="Nome Completo"
                name="name"
                value={editingMember.name}
                onChange={handleChange}
                variant="outlined"
              />
              <TextField
                fullWidth
                label="Parentesco"
                name="relationship"
                value={editingMember.relationship}
                onChange={handleChange}
                variant="outlined"
              />
              <TextField
                fullWidth
                label="Telefone"
                name="phone"
                value={editingMember.phone}
                onChange={handleChange}
                variant="outlined"
              />
              <TextField
                fullWidth
                label="Email"
                name="email"
                type="email"
                value={editingMember.email}
                onChange={handleChange}
                variant="outlined"
              />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <input
                  type="checkbox"
                  id="isEmergencyContact"
                  name="isEmergencyContact"
                  checked={editingMember.isEmergencyContact}
                  onChange={handleChange}
                />
                <label htmlFor="isEmergencyContact">Definir como Contato de Emergência</label>
              </Box>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancelar</Button>
            <Button onClick={handleSave} variant="contained" color="primary">
              Salvar
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
};

export default Family; 