import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ActivityIndicator, View } from 'react-native';

import { useAuth } from '../auth/AuthContext.js';
import LoginScreen from '../screens/LoginScreen.js';
import DashboardScreen from '../screens/DashboardScreen.js';
import GoodsReceiptListScreen from '../screens/GoodsReceiptListScreen.js';
import GoodsReceiptFormScreen from '../screens/GoodsReceiptFormScreen.js';
import GoodsReceiptDetailScreen from '../screens/GoodsReceiptDetailScreen.js';
import MaterialRequestsListScreen from '../screens/MaterialRequestsListScreen.js';
import MaterialRequestFormScreen from '../screens/MaterialRequestFormScreen.js';
import RejectedMaterialListScreen from '../screens/RejectedMaterialListScreen.js';
import RejectedMaterialFormScreen from '../screens/RejectedMaterialFormScreen.js';

const Tab = createBottomTabNavigator();
const GoodsReceiptStack = createNativeStackNavigator();
const MaterialRequestStack = createNativeStackNavigator();
const RejectedMaterialStack = createNativeStackNavigator();

function GoodsReceiptStackScreen() {
  return (
    <GoodsReceiptStack.Navigator screenOptions={{ headerShown: false }}>
      <GoodsReceiptStack.Screen name="GoodsReceiptList" component={GoodsReceiptListScreen} />
      <GoodsReceiptStack.Screen name="GoodsReceiptForm" component={GoodsReceiptFormScreen} />
      <GoodsReceiptStack.Screen name="GoodsReceiptDetail" component={GoodsReceiptDetailScreen} />
    </GoodsReceiptStack.Navigator>
  );
}

function MaterialRequestStackScreen() {
  return (
    <MaterialRequestStack.Navigator screenOptions={{ headerShown: false }}>
      <MaterialRequestStack.Screen name="MaterialRequestsList" component={MaterialRequestsListScreen} />
      <MaterialRequestStack.Screen name="MaterialRequestForm" component={MaterialRequestFormScreen} />
    </MaterialRequestStack.Navigator>
  );
}

function RejectedMaterialStackScreen() {
  return (
    <RejectedMaterialStack.Navigator screenOptions={{ headerShown: false }}>
      <RejectedMaterialStack.Screen name="RejectedMaterialList" component={RejectedMaterialListScreen} />
      <RejectedMaterialStack.Screen name="RejectedMaterialForm" component={RejectedMaterialFormScreen} />
    </RejectedMaterialStack.Navigator>
  );
}

const TAB_ICONS = {
  Dashboard: 'view-dashboard',
  'Goods Receipt': 'truck-delivery',
  'Material Requests': 'clipboard-list',
  Rejected: 'alert-circle',
};

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#4F46E5',
        tabBarInactiveTintColor: '#94A3B8',
        tabBarIcon: ({ color, size }) => (
          <MaterialCommunityIcons name={TAB_ICONS[route.name]} color={color} size={size} />
        ),
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Goods Receipt" component={GoodsReceiptStackScreen} />
      <Tab.Screen name="Material Requests" component={MaterialRequestStackScreen} />
      <Tab.Screen name="Rejected" component={RejectedMaterialStackScreen} />
    </Tab.Navigator>
  );
}

export default function RootNavigation() {
  const { user, ready } = useAuth();

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC' }}>
        <ActivityIndicator color="#4F46E5" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {user ? <MainTabs /> : <LoginScreen />}
    </NavigationContainer>
  );
}
