import { useEffect, useState } from 'react';
import { View, ScrollView } from 'react-native';
import { TextInput, Button, Text, Appbar, HelperText } from 'react-native-paper';
import PickerField from '../components/PickerField.js';
import { api } from '../api/client.js';

const DEPARTMENTS = ['Production', 'Purchase', 'Quality', 'Maintenance', 'Admin'].map((d) => ({ label: d, value: d }));

export default function MaterialRequestFormScreen({ navigation }) {
  const [items, setItems] = useState([]);
  const [projects, setProjects] = useState([]);

  const [department, setDepartment] = useState('');
  const [itemId, setItemId] = useState('');
  const [requestedBy, setRequestedBy] = useState('');
  const [quantity, setQuantity] = useState('');
  const [projectId, setProjectId] = useState('');

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get('/items').then((r) => setItems(r.data)).catch(() => setItems([]));
    api.get('/projects').then((r) => setProjects(r.data)).catch(() => setProjects([]));
  }, []);

  const onSubmit = async () => {
    setError('');
    if (!department || !itemId || !requestedBy || !quantity || !projectId) {
      setError('Department, Item, Requested By, Quantity, and Project are all required.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/material-requests', {
        department, item_id: itemId, requested_by: requestedBy,
        quantity_requested: quantity, project_id: projectId,
      });
      navigation.goBack();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <Appbar.Header elevated>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="New Material Request" />
      </Appbar.Header>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <PickerField
          label="Department" required value={department} options={DEPARTMENTS}
          getLabel={(d) => d.label} getValue={(d) => d.value} onSelect={setDepartment}
        />
        <PickerField
          label="Item" required value={itemId} options={items}
          getLabel={(i) => `${i.code} — ${i.name}`} getValue={(i) => i.id} onSelect={setItemId}
        />
        <TextInput label="Requested By *" mode="outlined" value={requestedBy} onChangeText={setRequestedBy} style={{ marginBottom: 12 }} />
        <TextInput
          label="Quantity Requested *" mode="outlined" value={quantity} onChangeText={setQuantity}
          keyboardType="numeric" style={{ marginBottom: 12 }}
        />
        <PickerField
          label="Project" required value={projectId} options={projects}
          getLabel={(p) => p.project_name} getValue={(p) => p.id} onSelect={setProjectId}
        />

        {!!error && <HelperText type="error" visible>{error}</HelperText>}

        <Button mode="contained" onPress={onSubmit} loading={submitting} disabled={submitting} style={{ marginTop: 16 }}>
          Submit
        </Button>
      </ScrollView>
    </View>
  );
}
