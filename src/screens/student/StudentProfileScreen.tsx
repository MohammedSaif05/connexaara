import React from 'react';
import SharedProfileScreen from '../shared/SharedProfileScreen';

const StudentProfileScreen = ({ navigation }: any) => {
  return (
    <SharedProfileScreen
      navigation={navigation}
      role="STUDENT"
      colorTheme={{
        main: '#10B981', // Teal/Green theme for students
        light: '#ECFDF5',
      }}
    />
  );
};

export default StudentProfileScreen;
