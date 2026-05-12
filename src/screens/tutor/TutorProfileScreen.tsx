import React from 'react';
import SharedProfileScreen from '../shared/SharedProfileScreen';

const TutorProfileScreen = ({ navigation }: any) => {
  return (
    <SharedProfileScreen
      navigation={navigation}
      role="TUTOR"
      colorTheme={{
        main: '#7B61FF',
        light: '#F3F0FF',
      }}
    />
  );
};

export default TutorProfileScreen;
