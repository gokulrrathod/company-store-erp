import { useEffect, useState } from 'react';
import { View, ScrollView } from 'react-native';
import { TextInput, Button, Appbar, HelperText } from 'react-native-paper';
import PickerField from '../components/PickerField.js';
import { api } from '../api/client.js';

const ACTIONS = [
  { label: 'Return to Supplier', value: 'RETURN_TO_SUPPLIER' },
  { label: 'Scrap', value: 'SCRAP' },
  { label: 'Rework', value: 'REWORK' },
  { label: 'Replacement', value: 'REPLACEMENT' },
];

export default function RejectedMaterialFormScreen({ navigation }) {
  const [items, setItems] = useState([]);
  const [suppliers, setSuppliers] = useState([]);

  const [supplierId, setSupplierId] = useState('');
  const [itemId, setItemId] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [quantity, setQuantity] = useState('');
  const [actionTaken, setActionTaken] = useState('');
  const [reason, setReason] = useState('');

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get('/items').then((r) => setItems(r.data)).catch(() => setItems([]));
    api.get('/suppliers').then((r) => setSuppliers(r.data)).catch(() => setSuppliers([]));
  }, []);

  const onSubmit = async () => {
    setError('');
    if (!supplierId || !itemId || !quantity || !actionTaken || !reason.trim()) {
      setError('Supplier, Item, Quantity, Action Taken, and Reason are all required.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/rejected-materials', {
        supplier_id: supplierId, item_id: itemId, batch_number: batchNumber,
        quantity, action_taken: actionTaken, reason,
      });
      navigation.goBack();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save rejection entry.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <Appbar.Header elevated>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Log Rejection Entry" />
      </Appbar.Header>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <PickerField
          label="Supplier" required value={supplierId} options={suppliers}
          getLabel={(s) => s.name} getValue={(s) => s.id} onSelect={setSupplierId}
        />
        <PickerField
          label="Item" required value={itemId} options={items}
          getLabel={(i) => `${i.code} — ${i.name}`} getValue={(i) => i.id} onSelect={setItemId}
        />
        <TextInput label="Batch Number" mode="outlined" value={batchNumber} onChangeText={setBatchNumber} style={{ marginBottom: 12 }} />
        <TextInput
          label="Rejected Quantity *" mode="outlined" value={quantity} onChangeText={setQuantity}
          keyboardType="numeric" style={{ marginBottom: 12 }}
        />
        <PickerField
          label="Action Taken" required value={actionTaken} options={ACTIONS}
          getLabel={(a) => a.label} getValue={(a) => a.value} onSelect={setActionTaken}
        />
        <TextInput
          label="Reason for Rejection *" mode="outlined" value={reason} onChangeText={setReason}
          multiline numberOfLines={3} style={{ marginBottom: 4 }}
        />

        {!!error && <HelperText type="error" visible>{error}</HelperText>}

        <Button mode="contained" onPress={onSubmit} loading={submitting} disabled={submitting} style={{ marginTop: 16 }}>
          Save
        </Button>
      </ScrollView>
    </View>
  );
}
