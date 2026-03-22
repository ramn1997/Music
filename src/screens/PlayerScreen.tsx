import React from 'react';
import { useTheme } from '../hooks/ThemeContext';
import { ClassicPlayerScreen } from './ClassicPlayerScreen';
import { MaterialPlayerScreen } from './MaterialPlayerScreen';

export const PlayerScreen = () => {
    const { playerLayout } = useTheme();

    if (playerLayout === 'material') {
        return <MaterialPlayerScreen />;
    }
    
    return <ClassicPlayerScreen />;
};
