import { useEffect, useState } from 'react';
import { View, ScrollView } from 'react-native';
import { TextInput, Button, Text, Appbar, HelperText } from 'react-native-paper';
import PickerField from '../components/PickerField.js';
import { api } from '../api/client.js';

export default function GoodsReceiptFormScreen({ navigation }) {
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [items, setItems] = useState([]);

  const [poId, setPoId] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [itemId, setItemId] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [quantityReceived, setQuantityReceived] = useState('');

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get('/purchase-orders').then((r) => setPurchaseOrders(r.data)).catch(() => setPurchaseOrders([]));
    api.get('/suppliers').then((r) => setSuppliers(r.data)).catch(() => setSuppliers([]));
    api.get('/items').then((r) => setItems(r.data)).catch(() => setItems([]));
  }, []);

  const onSubmit = async () => {
    setError('');
    if (!poId || !supplierId || !itemId || !quantityReceived) {
      setError('Purchase Order, Supplier, Item, and Quantity Received are required.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/material-receipts', {
        po_id: poId, supplier_id: supplierId, invoice_number: invoiceNumber,
        lines: [{ item_id: itemId, batch_number: batchNumber, quantity_received: quantityReceived }],
      });
      navigation.goBack();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save receipt.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <Appbar.Header elevated>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="New Material Receipt" />
      </Appbar.Header>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <PickerField
          label="Purchase Order" required value={poId} options={purchaseOrders}
          getLabel={(po) => `${po.po_number} — ${po.supplier_name}`} getValue={(po) => po.id}
          onSelect={setPoId}
        />
        <PickerField
          label="Supplier" required value={supplierId} options={suppliers}
          getLabel={(s) => s.name} getValue={(s) => s.id}
          onSelect={setSupplierId}
        />
        <TextInput label="Invoice Number" mode="outlined" value={invoiceNumber} onChangeText={setInvoiceNumber} style={{ marginBottom: 12 }} />

        <Text variant="titleSmall" style={{ fontWeight: '700', marginTop: 8, marginBottom: 8 }}>Received Item</Text>
        <PickerField
          label="Item" required value={itemId} options={items}
          getLabel={(i) => `${i.code} — ${i.name}`} getValue={(i) => i.id}
          onSelect={setItemId}
        />
        <TextInput label="Batch Number" mode="outlined" value={batchNumber} onChangeText={setBatchNumber} style={{ marginBottom: 12 }} />
        <TextInput
          label="Quantity Received *" mode="outlined" value={quantityReceived} onChangeText={setQuantityReceived}
          keyboardType="numeric" style={{ marginBottom: 4 }}
        />

        {!!error && <HelperText type="error" visible>{error}</HelperText>}

        <Button mode="contained" onPress={onSubmit} loading={submitting} disabled={submitting} style={{ marginTop: 16 }}>
          Save Receipt
        </Button>
      </ScrollView>
    </View>
  );
}
