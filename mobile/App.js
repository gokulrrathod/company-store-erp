import { StatusBar } from 'expo-status-bar';
import { PaperProvider } from 'react-native-paper';
import { theme } from './src/theme/theme.js';
import { AuthProvider } from './src/auth/AuthContext.js';
import RootNavigation from './src/navigation/index.js';

export default function App() {
  return (
    <PaperProvider theme={theme}>
      <AuthProvider>
        <RootNavigation />
        <StatusBar style="dark" />
      </AuthProvider>
    </PaperProvider>
  );
}
