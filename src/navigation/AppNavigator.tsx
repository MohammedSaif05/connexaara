import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import SplashScreen from '../screens/SplashScreen';
import GetStartedScreen from '../screens/GetStartedScreen';
import LoginScreen from '../screens/LoginScreen';
import HODDashboardNavigator from './HODDashboardNavigator';
import TutorDashboardNavigator from './TutorDashboardNavigator';
import StudentDashboardNavigator from './StudentDashboardNavigator';
import TutorTimetableScreen from '../screens/tutor/TutorTimetableScreen';
import HODHackathonsScreen from '../screens/hod/HODHackathonsScreen';
import TutorHackathonsScreen from '../screens/tutor/TutorHackathonsScreen';
import HackathonDetailScreen from '../screens/shared/HackathonDetailScreen';
import TeamDetailScreen from '../screens/shared/TeamDetailScreen';
import { Hackathon } from '../services/api';

export type RootStackParamList = {
  Splash: undefined;
  GetStarted: undefined;
  Login: undefined;
  HODDashboard: undefined;
  TutorDashboard: undefined;
  TutorTimetable: undefined;
  TutorHackathons: undefined;
  StudentDashboard: undefined;
  HODHackathons: undefined;
  HackathonDetail: { hackathon: Hackathon; role: 'HOD' | 'TUTOR' | 'STUDENT'; colorTheme: { main: string; light: string } };
  TeamDetail: { teamId: string; role: 'HOD' | 'TUTOR' | 'STUDENT'; colorTheme: { main: string; light: string } };
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
        <Stack.Screen name="TutorTimetable" component={TutorTimetableScreen} />
        <Stack.Screen name="TutorHackathons" component={TutorHackathonsScreen} />
        <Stack.Screen name="StudentDashboard" component={StudentDashboardNavigator} />
        <Stack.Screen name="HODHackathons" component={HODHackathonsScreen} />
        <Stack.Screen name="HackathonDetail" component={HackathonDetailScreen} />
        <Stack.Screen name="TeamDetail" component={TeamDetailScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
