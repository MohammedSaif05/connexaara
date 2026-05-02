import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Platform } from 'react-native';

// Import Screens
import StudentHomeScreen from '../screens/student/StudentHomeScreen';
import StudentOdsScreen from '../screens/student/StudentOdsScreen';
import StudentHackathonsScreen from '../screens/student/StudentHackathonsScreen';
import StudentEventsScreen from '../screens/student/StudentEventsScreen';
import StudentProfileScreen from '../screens/student/StudentProfileScreen';

// Import SVG Icons
import HomeIcon from '../assets/svg/student-home.svg';
import OdsIcon from '../assets/svg/student-ods.svg';
import HackathonsIcon from '../assets/svg/student-hackathons.svg';
import EventsIcon from '../assets/svg/student-events.svg';
import ProfileIcon from '../assets/svg/student-profile.svg';

const Tab = createBottomTabNavigator();

const COLORS = {
  primary: '#3B82F6', // Blue theme for Students
  inactive: '#A0AABF',
  background: '#FFFFFF',
};

const StudentDashboardNavigator = () => {
  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.inactive,
        tabBarStyle: {
          backgroundColor: COLORS.background,
          borderTopWidth: 1,
          borderTopColor: '#F0F0F0',
          height: Platform.OS === 'ios' ? 95 : 75,
          paddingBottom: Platform.OS === 'ios' ? 30 : 15,
          paddingTop: 10,
        },
        tabBarLabelStyle: {
          fontSize: 14,
          fontWeight: '600',
          marginTop: 4,
        },
      }}
    >
      <Tab.Screen 
        name="Home" 
        component={StudentHomeScreen} 
        options={{
          tabBarIcon: ({ color }) => <HomeIcon width={30} height={30} fill={color} />,
        }}
      />
      <Tab.Screen 
        name="ODs" 
        component={StudentOdsScreen} 
        options={{
          tabBarIcon: ({ color }) => <OdsIcon width={30} height={30} fill={color} />,
        }}
      />
      <Tab.Screen 
        name="Hackathons" 
        component={StudentHackathonsScreen} 
        options={{
          tabBarIcon: ({ color }) => <HackathonsIcon width={30} height={30} fill={color} />,
        }}
      />
      <Tab.Screen 
        name="Events" 
        component={StudentEventsScreen} 
        options={{
          tabBarIcon: ({ color }) => <EventsIcon width={30} height={30} fill={color} />,
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={StudentProfileScreen} 
        options={{
          tabBarIcon: ({ color }) => <ProfileIcon width={30} height={30} fill={color} />,
        }}
      />
    </Tab.Navigator>
  );
};

export default StudentDashboardNavigator;
