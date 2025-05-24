import React, { useEffect } from 'react';
import { View, Text, StyleSheet, LogBox, StatusBar } from 'react-native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { Provider as PaperProvider } from 'react-native-paper';

// Ekranları içe aktaralım
import HomeScreen from './screens/HomeScreen';
import ProductListScreen from './screens/ProductListScreen';
import ProfileScreen from './screens/ProfileScreen';
import MessagesScreen from './screens/MessagesScreen';
import ProductDetailScreen from './screens/ProductDetailScreen';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import AddProductScreen from './screens/AddProductScreen';
import TradeOfferScreen from './screens/TradeOfferScreen';
import ProfileEditScreen from './screens/ProfileEditScreen';
import UserProductsScreen from './screens/UserProductsScreen';
import UserTradesScreen from './screens/UserTradesScreen';
import EditProductScreen from './screens/EditProductScreen';
import TradeOfferDetailScreen from './screens/TradeOfferDetailScreen';
import ApiStatusScreen from './screens/ApiStatusScreen';

// Context Providers ve Components
import { AppProvider } from './context/AppContext';
import { AuthProvider } from './context/AuthContext.jsx';

// Components
let OfflineIndicator;
try {
  OfflineIndicator = require('./components/OfflineIndicator').default;
} catch (error) {
  // Eğer OfflineIndicator bileşeni yoksa, boş bir komponent kullan
  OfflineIndicator = () => null;
  console.warn('OfflineIndicator component could not be loaded:', error.message);
}

// Hataları bastır
LogBox.ignoreAllLogs(true);

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Tab navigasyon bileşeni
function HomeTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'AllProducts') {
            iconName = focused ? 'grid' : 'grid-outline';
          } else if (route.name === 'AddProduct') {
            return (
              <View style={{
                width: 48,
                height: 48,
                backgroundColor: '#FF6B6B',
                borderRadius: 24,
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 6,
              }}>
                <Ionicons name="add" size={26} color="#FFFFFF" />
              </View>
            );
          } else if (route.name === 'Messages') {
            iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#FF6B6B',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
        tabBarStyle: {
          height: 60,
          paddingBottom: 8,
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="AllProducts" component={ProductListScreen} options={{ title: 'Ürünler' }} />
      <Tab.Screen 
        name="AddProduct" 
        component={AddProductScreen} 
        options={{
          title: '',
          tabBarItemStyle: {
            height: 60,
          }
        }}
      />
      <Tab.Screen name="Messages" component={MessagesScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

// Ana navigasyon
function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="HomeTabs" component={HomeTabs} />
        <Stack.Screen name="ProductListScreen" component={ProductListScreen} />
        <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="AddProduct" component={AddProductScreen} />
        <Stack.Screen name="TradeOffer" component={TradeOfferScreen} />
        <Stack.Screen name="ProfileEdit" component={ProfileEditScreen} />
        <Stack.Screen name="UserProducts" component={UserProductsScreen} />
        <Stack.Screen name="UserTrades" component={UserTradesScreen} />
        <Stack.Screen name="EditProduct" component={EditProductScreen} />
        <Stack.Screen name="TradeOfferDetail" component={TradeOfferDetailScreen} />
        <Stack.Screen name="ApiStatus" component={ApiStatusScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// Ana uygulama bileşeni
export default function App() {
  useEffect(() => {
    // Hata yakalama işleyicisini hazırla
      const originalGlobalHandler = global.ErrorUtils.getGlobalHandler();
      
      global.ErrorUtils.setGlobalHandler((error, isFatal) => {
        // topInsetsChange hatalarını engelle
        if (error && error.message && 
           (error.message.includes('topInsetsChange') || 
            error.message.includes('Unsupported top level event'))) {
          console.log('Insets değişikliği hatası yakalandı ve yoksayıldı');
          return;
        }
        
        // Diğer hataları normal şekilde işle
        originalGlobalHandler(error, isFatal);
      });
  }, []);

  return (
    <PaperProvider>
      <AuthProvider>
        <AppProvider>
          <AppNavigator />
        </AppProvider>
      </AuthProvider>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 50,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FF6B6B',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 40,
  },
  button: {
    backgroundColor: '#FF6B6B',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 