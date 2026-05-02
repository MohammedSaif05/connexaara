import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import SplashScreen from '../screens/SplashScreen';
import GetStartedScreen from '../screens/GetStartedScreen';
import LoginScreen from '../screens/LoginScreen';
import HODDashboardNavigator from './HODDashboardNavigator';
import TutorDashboardNavigator from './TutorDashboardNavigator';
import StudentDashboardNavigator from './StudentDashboardNavigator';

export type RootStackParamList = {
  Splash: undefined;
  GetStarted: undefined;
  Login: undefined;
  HODDashboard: undefined;
  TutorDashboard: undefined;
  StudentDashboard: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{
          headerShown: false,
          animation: 'fade',
        }}>
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="GetStarted" component={GetStartedScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="HODDashboard" component={HODDashboardNavigator} />
        <Stack.Screen name="TutorDashboard" component={TutorDashboardNavigator} />
        <Stack.Screen name="StudentDashboard" component={StudentDashboardNavigator} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
