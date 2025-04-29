import { LogBox, AppRegistry } from 'react-native';
import App from './App';

// Belirli uyarıları gizleyelim
LogBox.ignoreLogs([
  'Unsupported top level event type "topInsetsChange" dispatched',
  'ViewPropTypes will be removed',
  'Possible Unhandled Promise Rejection',
  'Remote debugger',
  'Can\'t perform a React state update on an unmounted component',
  'Error: Unsupported top level event type'
]);

AppRegistry.registerComponent('main', () => App);
