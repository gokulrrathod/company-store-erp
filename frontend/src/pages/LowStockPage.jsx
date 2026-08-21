import { useEffect, useState } from 'react';
import { Typography, Chip, Alert } from '@mui/material';
import DataTable from '../components/DataTable.jsx';
import ListPageLayout from '../components/ListPageLayout.jsx';
import { api } from '../api/client.js';

export default function LowStockPage() {
  const [items, setItems] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api.get('/items/low-stock').then((res) => { setItems(res.data); setLoaded(true); }).catch(() => { setItems([]); setLoaded(true); });
  }, []);

  const columnDefs = [
    { field: 'code', headerName: 'Code', minWidth: 100 },
    { field: 'name', headerName: 'Name', minWidth: 200 },
    { field: 'category_name', headerName: 'Category', minWidth: 140 },
    { field: 'quantity', headerName: 'Current Qty', type: 'numericColumn', minWidth: 130 },
    { field: 'reorder_level', headerName: 'Reorder Level', type: 'numericColumn', minWidth: 140 },
    { field: 'unit', headerName: 'Unit', minWidth: 80 },
    {
      headerName: 'Status',
      minWidth: 130,
      valueGetter: () => 'Below Reorder',
      cellRenderer: () => <Chip size="small" label="Below Reorder" color="error" />,
    },
  ];

  return (
    <ListPageLayout header={<Typography variant="h5">Low Stock Alerts</Typography>}>
      {loaded && items.length === 0 ? (
        <Alert severity="success">All items are above their reorder level.</Alert>
      ) : (
        <DataTable rowData={items} columnDefs={columnDefs} getRowId={(p) => String(p.data.id)} pagination={false} fillHeight />
      )}
    </ListPageLayout>
  );
}
