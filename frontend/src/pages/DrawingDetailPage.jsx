import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Box, Typography, Chip, Button, Stack, Alert, IconButton, Paper, Grid, Divider,
  Dialog, DialogTitle, DialogContent, DialogActions, FormControlLabel, Checkbox, TextField,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import DataTable from '../components/DataTable.jsx';
import RHFTextField from '../components/form/RHFTextField.jsx';
import { bomLineSchema, ecnSchema } from '../validation/schemas.js';
import { CHECKLIST_ITEMS } from '../config/designChecklist.js';
import { applyServerErrors } from '../utils/applyServerErrors.js';
import { api } from '../api/client.js';
import { useAuth } from '../auth/AuthContext.jsx';

const statusColor = {
  DRAFT: 'default', UNDER_CHECKING: 'warning', REWORK: 'error', CHECKER_APPROVED: 'warning',
  DESIGN_HEAD_APPROVED: 'warning', AWAITING_CUSTOMER_APPROVAL: 'warning', CUSTOMER_APPROVED: 'warning',
  RELEASED: 'success',
};

function Section({ title, children }) {
  return (
    <Paper variant="outlined" sx={{ p: 2.5, mt: 2 }}>
      <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>{title}</Typography>
      {children}
    </Paper>
  );
}

export default function DrawingDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [drawing, setDrawing] = useState(null);
  const [actionError, setActionError] = useState('');
  const [bomOpen, setBomOpen] = useState(false);
  const [ecnOpen, setEcnOpen] = useState(false);
  const [checklist, setChecklist] = useState({});
  const [checkerRemarks, setCheckerRemarks] = useState('');

  const load = async () => {
    const { data } = await api.get(`/drawings/${id}`);
    setDrawing(data);
    setChecklist(data.checklist || {});
    setCheckerRemarks(data.checker_remarks || '');
  };

  useEffect(() => { load(); }, [id]);

  const bomForm = useForm({
    resolver: zodResolver(bomLineSchema),
    defaultValues: { item_no: '', part_number: '', description: '', material: '', quantity: '', unit: 'pcs', weight: '' },
  });
  const ecnForm = useForm({
    resolver: zodResolver(ecnSchema),
    defaultValues: { reason_for_change: '', requested_by: user?.name || '', new_revision: '', remarks: '' },
  });

  const isEngineer = ['DESIGN_ENGINEER', 'ADMIN'].includes(user?.role);
  const isChecker = ['CHECKER', 'ADMIN'].includes(user?.role);
  const isDesignHead = ['DESIGN_HEAD', 'ADMIN'].includes(user?.role);

  const submitForChecking = async () => {
    setActionError('');
    try {
      await api.patch(`/drawings/${id}/submit-for-checking`);
      load();
    } catch (err) {
      setActionError(err.response?.data?.error || 'Failed to submit');
    }
  };

  const submitChecklist = async (decision) => {
    setActionError('');
    try {
      await api.patch(`/drawings/${id}/checklist`, { checklist, checker_remarks: checkerRemarks, decision });
      load();
    } catch (err) {
      setActionError(err.response?.data?.error || 'Failed to record decision');
    }
  };

  const designHeadApprove = async () => {
    setActionError('');
    try {
      await api.patch(`/drawings/${id}/design-head-approve`);
      load();
    } catch (err) {
      setActionError(err.response?.data?.error || 'Failed to approve');
    }
  };

  const customerApprove = async () => {
    setActionError('');
    try {
      await api.patch(`/drawings/${id}/customer-approve`);
      load();
    } catch (err) {
      setActionError(err.response?.data?.error || 'Failed to record customer approval');
    }
  };

  const release = async () => {
    setActionError('');
    try {
      await api.patch(`/drawings/${id}/release`);
      load();
    } catch (err) {
      setActionError(err.response?.data?.error || 'Failed to release');
    }
  };

  const addBomLine = async (values) => {
    setActionError('');
    try {
      await api.post(`/drawings/${id}/bom-lines`, values);
      setBomOpen(false);
      bomForm.reset({ item_no: '', part_number: '', description: '', material: '', quantity: '', unit: 'pcs', weight: '' });
      load();
    } catch (err) {
      applyServerErrors(err, bomForm.setError, setActionError);
    }
  };

  const raiseEcn = async (values) => {
    setActionError('');
    try {
      await api.post(`/drawings/${id}/ecns`, values);
      setEcnOpen(false);
      ecnForm.reset({ reason_for_change: '', requested_by: user?.name || '', new_revision: '', remarks: '' });
      load();
    } catch (err) {
      applyServerErrors(err, ecnForm.setError, setActionError);
    }
  };

  const approveEcn = async (ecnId, status) => {
    setActionError('');
    try {
      await api.patch(`/drawings/${id}/ecns/${ecnId}/approve`, { status });
      load();
    } catch (err) {
      setActionError(err.response?.data?.error || 'Failed to record decision');
    }
  };

  if (!drawing) return <Typography>Loading...</Typography>;

  const bomColumnDefs = [
    { field: 'item_no', headerName: 'Item No.', minWidth: 100 },
    { field: 'part_number', headerName: 'Part No.', minWidth: 120, valueFormatter: (p) => p.value || '—' },
    { field: 'description', headerName: 'Description', minWidth: 200 },
    { field: 'material', headerName: 'Material', minWidth: 120, valueFormatter: (p) => p.value || '—' },
    { field: 'quantity', headerName: 'Qty', type: 'numericColumn', minWidth: 80 },
    { field: 'unit', headerName: 'Unit', minWidth: 80 },
  ];

  const ecnColumnDefs = [
    { field: 'ecn_number', headerName: 'ECN No.', minWidth: 130 },
    { field: 'reason_for_change', headerName: 'Reason', minWidth: 220 },
    { field: 'previous_revision', headerName: 'From Rev', minWidth: 100 },
    { field: 'new_revision', headerName: 'To Rev', minWidth: 100 },
    { field: 'status', headerName: 'Status', minWidth: 110 },
    ...(isDesignHead
      ? [{
          headerName: 'Actions',
          minWidth: 160,
          sortable: false,
          filter: false,
          cellRenderer: (p) =>
            p.data.status === 'PENDING' ? (
              <Stack direction="row" spacing={0.5}>
                <Button size="small" color="success" onClick={() => approveEcn(p.data.id, 'APPROVED')}>Approve</Button>
                <Button size="small" color="error" onClick={() => approveEcn(p.data.id, 'REJECTED')}>Reject</Button>
              </Stack>
            ) : null,
        }]
      : []),
  ];

  return (
    <Box sx={{ maxWidth: 900 }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
        <IconButton size="small" onClick={() => navigate('/drawings')}>
          <ArrowBackIcon fontSize="small" />
        </IconButton>
        <Typography variant="h5" fontWeight={700}>{drawing.drawing_number} — {drawing.drawing_title}</Typography>
        <Chip size="small" label={drawing.status.replace(/_/g, ' ')} color={statusColor[drawing.status]} />
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ ml: 5 }}>
        Equipment: {drawing.equipment_name} · Rev {drawing.revision} · Prepared by {drawing.prepared_by}
        {drawing.requires_customer_approval && ' · Requires Customer Approval'}
      </Typography>

      {actionError && <Alert severity="error" sx={{ mt: 2 }}>{actionError}</Alert>}

      <Section title="Bill of Materials (BOM)">
        <DataTable rowData={drawing.bom_lines} columnDefs={bomColumnDefs} pagination={false} height={Math.max(160, drawing.bom_lines.length * 56 + 60)} getRowId={(p) => String(p.data.id)} emptyMessage="No BOM lines yet." />
        {isEngineer && drawing.status !== 'RELEASED' && (
          <Button startIcon={<AddIcon />} sx={{ mt: 1.5 }} onClick={() => setBomOpen(true)}>Add BOM Line</Button>
        )}
      </Section>

      {['DRAFT', 'REWORK'].includes(drawing.status) && isEngineer && (
        <Section title="Submit for Checking">
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            {drawing.status === 'REWORK' ? `Checker remarks: ${drawing.checker_remarks || '—'}` : 'Submit this drawing to the Checker.'}
          </Typography>
          <Button variant="contained" onClick={submitForChecking}>Submit for Checking</Button>
        </Section>
      )}

      {drawing.status === 'UNDER_CHECKING' && isChecker && (
        <Section title="Verification Checklist">
          <Grid container spacing={1}>
            {CHECKLIST_ITEMS.map((item) => (
              <Grid item xs={12} sm={6} key={item.key}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={!!checklist[item.key]}
                      onChange={(e) => setChecklist({ ...checklist, [item.key]: e.target.checked })}
                    />
                  }
                  label={item.label}
                />
              </Grid>
            ))}
          </Grid>
          <TextField
            label="Checker Remarks"
            value={checkerRemarks}
            onChange={(e) => setCheckerRemarks(e.target.value)}
            multiline
            rows={2}
            fullWidth
            sx={{ mt: 2 }}
          />
          <Stack direction="row" spacing={1.5} sx={{ mt: 2 }}>
            <Button
              variant="contained" color="success"
              onClick={() => submitChecklist('APPROVE')}
              disabled={!CHECKLIST_ITEMS.every((item) => checklist[item.key])}
            >
              Approve
            </Button>
            <Button variant="outlined" color="warning" onClick={() => submitChecklist('REWORK')}>
              Reject / Rework
            </Button>
          </Stack>
        </Section>
      )}

      {drawing.status === 'CHECKER_APPROVED' && isDesignHead && (
        <Section title="Design Head Approval">
          <Typography variant="body2" sx={{ mb: 1.5 }}>Checked by {drawing.checker}. Approve to proceed.</Typography>
          <Button variant="contained" onClick={designHeadApprove}>Approve</Button>
        </Section>
      )}

      {drawing.status === 'AWAITING_CUSTOMER_APPROVAL' && isDesignHead && (
        <Section title="Customer Approval">
          <Alert severity="info" sx={{ mb: 2 }}>No customer portal in this POC — record the customer's sign-off here.</Alert>
          <Button variant="contained" onClick={customerApprove}>Record Customer Approval</Button>
        </Section>
      )}

      {['DESIGN_HEAD_APPROVED', 'CUSTOMER_APPROVED'].includes(drawing.status) && isDesignHead && (
        <Section title="Final Drawing Release">
          <Button variant="contained" onClick={release}>Release Drawing</Button>
        </Section>
      )}

      {drawing.status === 'RELEASED' && (
        <Section title="Engineering Change Notices (ECN)">
          <DataTable rowData={drawing.ecns} columnDefs={ecnColumnDefs} pagination={false} height={Math.max(160, drawing.ecns.length * 56 + 60)} getRowId={(p) => String(p.data.id)} emptyMessage="No ECNs raised." />
          {isDesignHead && (
            <Button startIcon={<AddIcon />} sx={{ mt: 1.5 }} onClick={() => setEcnOpen(true)}>Raise ECN</Button>
          )}
        </Section>
      )}

      <Divider sx={{ my: 3 }} />
      <Typography variant="caption" color="text.secondary">
        Created {new Date(drawing.created_at).toLocaleString()}
      </Typography>

      <Dialog open={bomOpen} onClose={() => setBomOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Add BOM Line</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <RHFTextField name="item_no" control={bomForm.control} label="Item No." required />
            <RHFTextField name="part_number" control={bomForm.control} label="Part Number" />
            <RHFTextField name="description" control={bomForm.control} label="Description" required />
            <RHFTextField name="material" control={bomForm.control} label="Material" />
            <RHFTextField name="quantity" control={bomForm.control} label="Quantity" type="number" required />
            <RHFTextField name="unit" control={bomForm.control} label="Unit" />
            <RHFTextField name="weight" control={bomForm.control} label="Weight (kg)" type="number" />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBomOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={bomForm.handleSubmit(addBomLine)}>Add</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={ecnOpen} onClose={() => setEcnOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Raise Engineering Change Notice</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <RHFTextField name="reason_for_change" control={ecnForm.control} label="Reason for Change" required multiline rows={2} />
            <RHFTextField name="requested_by" control={ecnForm.control} label="Requested By" required />
            <RHFTextField name="new_revision" control={ecnForm.control} label="New Revision" required />
            <RHFTextField name="remarks" control={ecnForm.control} label="Remarks" multiline rows={2} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEcnOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={ecnForm.handleSubmit(raiseEcn)}>Raise ECN</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
