import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Box, Typography, Chip, Button, Stack, Alert, IconButton, Paper,
  Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DataTable from '../components/DataTable.jsx';
import RHFTextField from '../components/form/RHFTextField.jsx';
import { scheduleSchema } from '../validation/schemas.js';
import { applyServerErrors } from '../utils/applyServerErrors.js';
import { api } from '../api/client.js';
import { useAuth } from '../auth/AuthContext.jsx';

const scheduleStatusColor = { NOT_STARTED: 'default', IN_PROGRESS: 'warning', COMPLETED: 'success', DELAYED: 'error' };

function Section({ title, children }) {
  return (
    <Paper variant="outlined" sx={{ p: 2.5, mt: 2 }}>
      <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>{title}</Typography>
      {children}
    </Paper>
  );
}

export default function ProductionPlanDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [plan, setPlan] = useState(null);
  const [actionError, setActionError] = useState('');
  const [open, setOpen] = useState(false);

  const load = () => {
    api.get(`/production/plans/${id}`).then((res) => setPlan(res.data)).catch(() => setPlan(null));
  };

  useEffect(load, [id]);

  const scheduleForm = useForm({
    resolver: zodResolver(scheduleSchema),
    defaultValues: { equipment_name: '', activity: '', planned_start_date: '', planned_end_date: '', responsible_engineer: user?.name || '' },
  });

  const isProductionHead = ['PRODUCTION_HEAD', 'ADMIN'].includes(user?.role);
  const canScheduleActivity = ['PRODUCTION', 'SHOP_FLOOR_ENGINEER', 'ADMIN'].includes(user?.role);

  const approve = async () => {
    setActionError('');
    try {
      await api.patch(`/production/plans/${id}/approve`);
      load();
    } catch (err) {
      setActionError(err.response?.data?.error || 'Failed to approve');
    }
  };

  const addSchedule = async (values) => {
    setActionError('');
    try {
      await api.post(`/production/plans/${id}/schedules`, values);
      setOpen(false);
      scheduleForm.reset({ equipment_name: '', activity: '', planned_start_date: '', planned_end_date: '', responsible_engineer: user?.name || '' });
      load();
    } catch (err) {
      applyServerErrors(err, scheduleForm.setError, setActionError);
    }
  };

  if (!plan) return <Typography>Loading...</Typography>;

  const columnDefs = [
    { field: 'equipment_name', headerName: 'Equipment', minWidth: 160 },
    { field: 'activity', headerName: 'Activity', minWidth: 150 },
    { field: 'responsible_engineer', headerName: 'Engineer', minWidth: 150 },
    {
      field: 'status',
      headerName: 'Status',
      minWidth: 130,
      cellRenderer: (p) => <Chip size="small" label={p.value.replace(/_/g, ' ')} color={scheduleStatusColor[p.value]} />,
    },
    {
      headerName: 'View',
      minWidth: 70,
      flex: 0,
      sortable: false,
      filter: false,
      cellRenderer: (p) => (
        <IconButton size="small" onClick={() => navigate(`/production-schedules/${p.data.id}`)}>
          <VisibilityIcon fontSize="small" />
        </IconButton>
      ),
    },
  ];

  return (
    <Box sx={{ maxWidth: 900 }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
        <IconButton size="small" onClick={() => navigate('/production-plans')}>
          <ArrowBackIcon fontSize="small" />
        </IconButton>
        <Typography variant="h5" fontWeight={700}>{plan.project_reference} — Week {plan.week_number}</Typography>
        <Chip size="small" label={plan.status} color={plan.status === 'APPROVED' ? 'success' : 'warning'} />
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ ml: 5 }}>
        Planned Qty: {plan.planned_quantity} · Engineer: {plan.production_engineer}
      </Typography>

      {actionError && <Alert severity="error" sx={{ mt: 2 }}>{actionError}</Alert>}

      {plan.status === 'DRAFT' && isProductionHead && (
        <Section title="Production Head Approval">
          <Typography variant="body2" sx={{ mb: 1.5 }}>This plan is not active until approved. No activities can be scheduled against a Draft plan.</Typography>
          <Button variant="contained" onClick={approve}>Approve Plan</Button>
        </Section>
      )}

      <Section title="Shop-Floor Activity Schedule">
        {plan.status !== 'APPROVED' ? (
          <Alert severity="info">Approve the plan before scheduling activities.</Alert>
        ) : (
          <>
            <DataTable rowData={plan.schedules} columnDefs={columnDefs} pagination={false} height={Math.max(160, plan.schedules.length * 56 + 60)} getRowId={(p) => String(p.data.id)} emptyMessage="No activities scheduled yet." />
            {canScheduleActivity && (
              <Button startIcon={<AddIcon />} sx={{ mt: 1.5 }} onClick={() => setOpen(true)}>Add Activity</Button>
            )}
          </>
        )}
      </Section>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Add Shop-Floor Activity</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <RHFTextField name="equipment_name" control={scheduleForm.control} label="Equipment Name" required />
            <RHFTextField name="activity" control={scheduleForm.control} label="Activity" required />
            <RHFTextField name="planned_start_date" control={scheduleForm.control} label="Planned Start Date" type="date" InputLabelProps={{ shrink: true }} />
            <RHFTextField name="planned_end_date" control={scheduleForm.control} label="Planned End Date" type="date" InputLabelProps={{ shrink: true }} />
            <RHFTextField name="responsible_engineer" control={scheduleForm.control} label="Responsible Engineer" required />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={scheduleForm.handleSubmit(addSchedule)}>Add</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
