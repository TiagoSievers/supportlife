import React from 'react';
import {
  List,
  ListItem,
  ListItemAvatar,
  Avatar,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Typography,
  Box,
  Paper
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonIcon from '@mui/icons-material/Person';
import { FamilyMember } from '../pages/familiares/FamilyMemberDialog';

interface FamilyMemberListProps {
  familyMembers: FamilyMember[];
  onEdit: (member: FamilyMember) => void;
  onDelete: (id: string) => void;
}

const FamilyMemberList: React.FC<FamilyMemberListProps> = ({
  familyMembers,
  onEdit,
  onDelete
}) => {
  if (familyMembers.length === 0) {
    return (
      <Paper elevation={0} sx={{ p: 3, textAlign: 'center', bgcolor: 'grey.50' }}>
        <Typography variant="body1" color="text.secondary">
          Nenhum familiar cadastrado ainda.
        </Typography>
      </Paper>
    );
  }

  return (
    <List>
      {familyMembers.map((member) => (
        <ListItem
          key={member.id.toString()}
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
              <Box component="span">
                <Typography component="span" variant="body2" color="text.primary">
                  {member.relationship}
                </Typography>
                {member.phone && (
                  <>
                    {" — "}
                    <Typography component="span" variant="body2">
                      {member.phone}
                    </Typography>
                  </>
                )}
                {member.email && (
                  <Typography component="div" variant="body2" sx={{ mt: 0.5 }}>
                    {member.email}
                  </Typography>
                )}
                {member.isEmergencyContact && (
                  <Typography
                    component="div"
                    variant="body2"
                    color="error"
                    sx={{ mt: 0.5 }}
                  >
                    Contato de Emergência
                  </Typography>
                )}
              </Box>
            }
          />
          <ListItemSecondaryAction>
            <IconButton 
              edge="end" 
              onClick={() => onEdit(member)} 
              sx={{ mr: 1 }}
              aria-label="Editar familiar"
            >
              <EditIcon />
            </IconButton>
            <IconButton 
              edge="end" 
              onClick={() => onDelete(member.id)}
              aria-label="Remover familiar"
            >
              <DeleteIcon />
            </IconButton>
          </ListItemSecondaryAction>
        </ListItem>
      ))}
    </List>
  );
};

export default FamilyMemberList; 
