import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Platform } from 'react-native';

// Import Screens
import HODHomeScreen from '../screens/hod/HODHomeScreen';
import HODStaffScreen from '../screens/hod/HODStaffScreen';
import HODOdsScreen from '../screens/hod/HODOdsScreen';
import HODBatchesScreen from '../screens/hod/HODBatchesScreen';
import HODProfileScreen from '../screens/hod/HODProfileScreen';

// Import SVG Icons
import HomeIcon from '../assets/svg/hod-home.svg';
import StaffIcon from '../assets/svg/hod-staff.svg';
import OdsIcon from '../assets/svg/hod-ods.svg';
import BatchesIcon from '../assets/svg/hod-batches.svg';
import ProfileIcon from '../assets/svg/hod-profile.svg';

const Tab = createBottomTabNavigator();

const COLORS = {
  primary: '#2EC4B6',
  inactive: '#A0AABF',
  background: '#FFFFFF',
};

const HODDashboardNavigator = () => {
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
        component={HODHomeScreen} 
        options={{
          tabBarIcon: ({ color }) => <HomeIcon width={30} height={30} fill={color} />,
        }}
      />
      <Tab.Screen 
        name="Staffs" 
        component={HODStaffScreen} 
        options={{
          tabBarIcon: ({ color }) => <StaffIcon width={30} height={30} fill={color} />,
        }}
      />
      <Tab.Screen 
        name="ODs" 
        component={HODOdsScreen} 
        options={{
          tabBarIcon: ({ color }) => <OdsIcon width={30} height={30} fill={color} />,
        }}
      />
      <Tab.Screen 
        name="Batches" 
        component={HODBatchesScreen} 
        options={{
          tabBarIcon: ({ color }) => <BatchesIcon width={30} height={30} fill={color} />,
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={HODProfileScreen} 
        options={{
          tabBarIcon: ({ color }) => <ProfileIcon width={30} height={30} fill={color} />,
        }}
      />
    </Tab.Navigator>
  );
};

export default HODDashboardNavigator;
