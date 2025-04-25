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
} from '@mui/material';
import { Link } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

interface UserProfile {
  name: string;
  email: string;
  phone: string;
  bloodType: string;
  allergies: string;
  emergencyContact: string;
}

const Profile: React.FC = () => {
  const [profile, setProfile] = useState<UserProfile>({
    name: 'John Doe',
    email: 'john.doe@example.com',
    phone: '(11) 99999-9999',
    bloodType: 'O+',
    allergies: 'None',
    emergencyContact: '(11) 88888-8888'
  });

  const [isEditing, setIsEditing] = useState(false);

  const handleSave = () => {
    // TODO: Implement API call to save profile
    setIsEditing(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProfile(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <Box sx={{ bgcolor: 'grey.100', minHeight: '100vh', py: 4 }}>
      <Container maxWidth="lg">
        <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 4, color: 'primary.main' }}>
          Meu Perfil
        </Typography>
        
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
          <Box sx={{ flex: { xs: '1', md: '0 0 300px' } }}>
            <Paper elevation={2} sx={{ p: 3, textAlign: 'center' }}>
              <Avatar
                sx={{
                  width: 120,
                  height: 120,
                  mx: 'auto',
                  mb: 2,
                  bgcolor: 'primary.main',
                  fontSize: '3rem'
                }}
              >
                {profile.name.charAt(0)}
              </Avatar>
              <Typography variant="h6" gutterBottom>
                {profile.name}
              </Typography>
              <Button
                variant={isEditing ? "outlined" : "contained"}
                color={isEditing ? "secondary" : "primary"}
                onClick={() => setIsEditing(!isEditing)}
                fullWidth
                sx={{ mt: 2 }}
              >
                {isEditing ? 'Cancelar' : 'Editar Perfil'}
              </Button>
            </Paper>
          </Box>

          <Box sx={{ flex: '1' }}>
            <Paper elevation={2} sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Informações Pessoais
              </Typography>
              <Box 
                component="form" 
                onSubmit={(e) => { e.preventDefault(); handleSave(); }}
                sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
              >
                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
                  <TextField
                    fullWidth
                    label="Nome Completo"
                    name="name"
                    value={profile.name}
                    onChange={handleChange}
                    disabled={!isEditing}
                    variant="outlined"
                  />
                  <TextField
                    fullWidth
                    label="Email"
                    name="email"
                    type="email"
                    value={profile.email}
                    onChange={handleChange}
                    disabled={!isEditing}
                    variant="outlined"
                  />
                </Box>

                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
                  <TextField
                    fullWidth
                    label="Telefone"
                    name="phone"
                    value={profile.phone}
                    onChange={handleChange}
                    disabled={!isEditing}
                    variant="outlined"
                  />
                  <TextField
                    fullWidth
                    label="Tipo Sanguíneo"
                    name="bloodType"
                    value={profile.bloodType}
                    onChange={handleChange}
                    disabled={!isEditing}
                    variant="outlined"
                  />
                </Box>

                <TextField
                  fullWidth
                  label="Alergias"
                  name="allergies"
                  value={profile.allergies}
                  onChange={handleChange}
                  disabled={!isEditing}
                  multiline
                  rows={4}
                  variant="outlined"
                />

                <TextField
                  fullWidth
                  label="Contato de Emergência"
                  name="emergencyContact"
                  value={profile.emergencyContact}
                  onChange={handleChange}
                  disabled={!isEditing}
                  variant="outlined"
                />

                {isEditing && (
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                    <Button
                      type="submit"
                      variant="contained"
                      color="primary"
                      size="large"
                    >
                      Salvar Alterações
                    </Button>
                  </Box>
                )}
              </Box>
            </Paper>
          </Box>
        </Box>

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

export default Profile; 