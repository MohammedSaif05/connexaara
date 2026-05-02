import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Platform } from 'react-native';

// Import Screens
import TutorHomeScreen from '../screens/tutor/TutorHomeScreen';
import TutorStudentsScreen from '../screens/tutor/TutorStudentsScreen';
import TutorOdsScreen from '../screens/tutor/TutorOdsScreen';
import TutorSubjectsScreen from '../screens/tutor/TutorSubjectsScreen';
import TutorProfileScreen from '../screens/tutor/TutorProfileScreen';

// Import SVG Icons
import HomeIcon from '../assets/svg/tutor-home.svg';
import StudentsIcon from '../assets/svg/tutor-students.svg';
import OdsIcon from '../assets/svg/tutor-ods.svg';
import SubjectsIcon from '../assets/svg/tutor-subjects.svg';
import ProfileIcon from '../assets/svg/tutor-profile.svg';

const Tab = createBottomTabNavigator();

const COLORS = {
  primary: '#2EC4B6',
  inactive: '#A0AABF',
  background: '#FFFFFF',
};

const TutorDashboardNavigator = () => {
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
        component={TutorHomeScreen} 
        options={{
          tabBarIcon: ({ color }) => <HomeIcon width={30} height={30} fill={color} />,
        }}
      />
      <Tab.Screen 
        name="Students" 
        component={TutorStudentsScreen} 
        options={{
          tabBarIcon: ({ color }) => <StudentsIcon width={30} height={30} fill={color} />,
        }}
      />
      <Tab.Screen 
        name="ODs" 
        component={TutorOdsScreen} 
        options={{
          tabBarIcon: ({ color }) => <OdsIcon width={30} height={30} fill={color} />,
        }}
      />
      <Tab.Screen 
        name="Subjects" 
        component={TutorSubjectsScreen} 
        options={{
          tabBarIcon: ({ color }) => <SubjectsIcon width={30} height={30} fill={color} />,
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={TutorProfileScreen} 
        options={{
          tabBarIcon: ({ color }) => <ProfileIcon width={30} height={30} fill={color} />,
        }}
      />
    </Tab.Navigator>
  );
};

export default TutorDashboardNavigator;
