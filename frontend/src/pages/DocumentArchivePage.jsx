import { useEffect, useState } from 'react';
import { Typography, Stack, TextField, InputAdornment, Chip, IconButton } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import DownloadIcon from '@mui/icons-material/Download';
import DataTable from '../components/DataTable.jsx';
import ListPageLayout from '../components/ListPageLayout.jsx';
import { api } from '../api/client.js';

const typeColor = { 'Purchase Invoice': 'warning', 'Sales Invoice': 'success', 'Delivery Challan': 'primary' };

export default function DocumentArchivePage() {
  const [docs, setDocs] = useState([]);
  const [search, setSearch] = useState('');
  const [month, setMonth] = useState('');

  const load = () => {
    const params = {};
    if (search) params.search = search;
    if (month) params.month = month;
    api.get('/document-archive', { params }).then((res) => setDocs(res.data)).catch(() => setDocs([]));
  };

  useEffect(load, [search, month]);

  const download = async (doc) => {
    if (doc.attachment_id) {
      const res = await api.get(`/attachments/${doc.attachment_id}/download`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.file_name;
      a.click();
      URL.revokeObjectURL(url);
    } else if (doc.sales_order_id) {
      const res = await api.get(`/sales-orders/${doc.sales_order_id}/delivery-challan-pdf`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.file_name;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const columnDefs = [
    { field: 'document_type', headerName: 'Type', minWidth: 150, cellRenderer: (p) => <Chip size="small" label={p.value} color={typeColor[p.value]} /> },
    { field: 'document_number', headerName: 'Document No.', minWidth: 150 },
    { field: 'party_name', headerName: 'Party', minWidth: 180, valueFormatter: (p) => p.value || '—' },
    { field: 'file_name', headerName: 'File', minWidth: 200 },
    { field: 'document_date', headerName: 'Date', minWidth: 120, valueFormatter: (p) => (p.value ? new Date(p.value).toLocaleDateString() : '—') },
    {
      headerName: 'Download', minWidth: 90, sortable: false, filter: false,
      cellRenderer: (p) => (
        <IconButton size="small" onClick={() => download(p.data)}>
          <DownloadIcon fontSize="small" />
        </IconButton>
      ),
    },
  ];

  return (
    <ListPageLayout
      header={
        <>
          <Typography variant="h5" gutterBottom>Document Archive</Typography>
          <Stack direction="row" spacing={2}>
            <TextField
              size="small" placeholder="Search by document number or party" value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ width: 320 }}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
            />
            <TextField
              size="small" type="month" label="Month" value={month}
              onChange={(e) => setMonth(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ width: 180 }}
            />
          </Stack>
        </>
      }
    >
      <DataTable rowData={docs} columnDefs={columnDefs} getRowId={(p) => `${p.data.document_type}-${p.data.attachment_id || p.data.sales_order_id}`} emptyMessage="No archived documents found." fillHeight />
    </ListPageLayout>
  );
}
