import { useState } from 'react';
import { View, KeyboardAvoidingView, Platform } from 'react-native';
import { TextInput, Button, Text, HelperText } from 'react-native-paper';
import { useAuth } from '../auth/AuthContext.js';

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('admin@test.com');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed — check your connection and credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#F8FAFC' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 28 }}>
        <View style={{ alignItems: 'center', marginBottom: 32 }}>
          <View style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: '#4F46E5', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
            <Text style={{ color: '#fff', fontSize: 24, fontWeight: '700' }}>S</Text>
          </View>
          <Text variant="titleLarge" style={{ fontWeight: '700' }}>Store Management</Text>
          <Text variant="bodySmall" style={{ color: '#64748B' }}>Store ERP — Mobile</Text>
        </View>

        <TextInput
          label="Email" mode="outlined" value={email} onChangeText={setEmail}
          autoCapitalize="none" keyboardType="email-address" style={{ marginBottom: 12 }}
        />
        <TextInput
          label="Password" mode="outlined" value={password} onChangeText={setPassword}
          secureTextEntry style={{ marginBottom: 4 }}
        />
        {!!error && <HelperText type="error" visible>{error}</HelperText>}

        <Button mode="contained" onPress={onSubmit} loading={submitting} disabled={submitting} style={{ marginTop: 16 }}>
          Sign In
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
}
