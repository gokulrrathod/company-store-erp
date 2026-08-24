import { useMemo, useState } from 'react';
import { View, Modal, FlatList, TouchableOpacity } from 'react-native';
import { TextInput, Text, Divider } from 'react-native-paper';

// Tap to open a full-screen searchable list — the mobile equivalent of the
// web app's RHFAutocomplete, for fields backed by potentially large lists
// (items, suppliers, purchase orders, ...).
export default function PickerField({ label, value, options, getLabel, getValue, onSelect, required }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selected = options.find((o) => String(getValue(o)) === String(value));
  const filtered = useMemo(() => {
    if (!query.trim()) return options;
    const q = query.toLowerCase();
    return options.filter((o) => getLabel(o).toLowerCase().includes(q));
  }, [options, query, getLabel]);

  return (
    <>
      <TouchableOpacity onPress={() => setOpen(true)}>
        <TextInput
          label={required ? `${label} *` : label}
          mode="outlined"
          value={selected ? getLabel(selected) : ''}
          editable={false}
          pointerEvents="none"
          right={<TextInput.Icon icon="chevron-down" />}
          style={{ marginBottom: 12 }}
        />
      </TouchableOpacity>
      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={{ flex: 1, backgroundColor: '#fff', paddingTop: 56 }}>
          <View style={{ paddingHorizontal: 16 }}>
            <Text variant="titleMedium" style={{ fontWeight: '700', marginBottom: 12 }}>{label}</Text>
            <TextInput
              mode="outlined" placeholder="Search..." value={query} onChangeText={setQuery}
              autoFocus left={<TextInput.Icon icon="magnify" />} style={{ marginBottom: 8 }}
            />
          </View>
          <FlatList
            data={filtered}
            keyExtractor={(item, idx) => String(getValue(item) ?? idx)}
            ItemSeparatorComponent={Divider}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={{ paddingVertical: 14, paddingHorizontal: 16 }}
                onPress={() => { onSelect(getValue(item), item); setQuery(''); setOpen(false); }}
              >
                <Text variant="bodyLarge">{getLabel(item)}</Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={{ padding: 32, alignItems: 'center' }}>
                <Text style={{ color: '#64748B' }}>No matches</Text>
              </View>
            }
          />
          <TouchableOpacity
            style={{ padding: 16, alignItems: 'center', borderTopWidth: 1, borderTopColor: '#E2E8F0' }}
            onPress={() => { setQuery(''); setOpen(false); }}
          >
            <Text style={{ color: '#4F46E5', fontWeight: '700' }}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </>
  );
}
