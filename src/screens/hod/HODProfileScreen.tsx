import React from 'react';
import SharedProfileScreen from '../shared/SharedProfileScreen';

const HODProfileScreen = ({ navigation }: any) => {
  return (
    <SharedProfileScreen
      navigation={navigation}
      role="HOD"
      colorTheme={{
        main: '#0F172A',
        light: '#F1F5F9',
      }}
    />
  );
};

export default HODProfileScreen;
