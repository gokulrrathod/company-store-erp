import { useEffect, useState } from 'react';
import { Box, Typography, TextField, InputAdornment, Chip } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import DataTable from '../components/DataTable.jsx';
import { api } from '../api/client.js';

export default function InventoryPage() {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get('/items').then((res) => setItems(res.data)).catch(() => setItems([]));
  }, []);

  const columnDefs = [
    { field: 'code', headerName: 'Code', minWidth: 100 },
    { field: 'name', headerName: 'Name', minWidth: 180 },
    { field: 'category_name', headerName: 'Category', minWidth: 130 },
    { field: 'quantity', headerName: 'Quantity', type: 'numericColumn', minWidth: 110 },
    {
      headerName: 'Stock Breakdown',
      minWidth: 190,
      valueGetter: (p) => {
        const parts = [`${p.data.available_stock} avail`];
        if (Number(p.data.damaged_stock) > 0) parts.push(`${p.data.damaged_stock} dmg`);
        if (Number(p.data.rejected_stock) > 0) parts.push(`${p.data.rejected_stock} rej`);
        return parts.join(' · ');
      },
    },
    { field: 'unit', headerName: 'Unit', minWidth: 80 },
    { field: 'reorder_level', headerName: 'Reorder Level', type: 'numericColumn', minWidth: 130 },
    { field: 'storage_location', headerName: 'Storage Location', minWidth: 180, valueFormatter: (p) => p.value || '—' },
    {
      headerName: 'Value',
      minWidth: 200,
      valueGetter: (p) => `₹ ${Number(p.data.valuation).toLocaleString('en-IN')} (₹ ${Number(p.data.unit_rate).toLocaleString('en-IN')}/unit)`,
    },
    {
      headerName: 'Status',
      minWidth: 120,
      valueGetter: (p) => (Number(p.data.quantity) <= Number(p.data.reorder_level) ? 'Low Stock' : 'OK'),
      cellRenderer: (p) => (
        <Chip size="small" label={p.value} color={p.value === 'Low Stock' ? 'error' : 'success'} variant={p.value === 'Low Stock' ? 'filled' : 'outlined'} />
      ),
    },
  ];

  return (
    <Box sx={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, mb: 2, flexShrink: 0 }}>
        <Typography variant="h5">Inventory</Typography>
        <TextField
          placeholder="Search by name or code"
          size="small"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ width: 280 }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
        />
      </Box>
      <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <DataTable
          rowData={items}
          columnDefs={columnDefs}
          quickFilterText={search}
          getRowId={(p) => String(p.data.id)}
          emptyMessage="No items found. Start the backend and load seed data."
          fillHeight
        />
      </Box>
    </Box>
  );
}
