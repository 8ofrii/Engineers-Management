import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';

const { width, height } = Dimensions.get('window');

/**
 * Apple macOS & iOS Liquid Glass Ambient Backdrop
 * Renders subtle floating atmospheric light meshes and specular gradients
 * that refract through translucent frosted cards.
 */
export default function GlassBackground({ children, style }) {
    const { theme } = useTheme();

    if (!theme.isLiquidGlass) {
        return (
            <View style={[{ flex: 1, backgroundColor: theme.bg }, style]}>
                {children}
            </View>
        );
    }

    return (
        <View style={[{ flex: 1, backgroundColor: '#f0f3f8' }, style]}>
            {/* Ambient Liquid Light Orb Top-Right (Apple Cyan-Azure Refraction) */}
            <View style={styles.ambientTopRight} pointerEvents="none">
                <LinearGradient
                    colors={['rgba(56, 189, 248, 0.18)', 'rgba(99, 102, 241, 0.10)', 'rgba(240, 243, 248, 0)']}
                    style={styles.orbGradient}
                    start={{ x: 0.8, y: 0.1 }}
                    end={{ x: 0.1, y: 0.9 }}
                />
            </View>

            {/* Ambient Liquid Light Orb Bottom-Left (Apple Pearl-Violet Refraction) */}
            <View style={styles.ambientBottomLeft} pointerEvents="none">
                <LinearGradient
                    colors={['rgba(168, 85, 247, 0.12)', 'rgba(14, 165, 233, 0.08)', 'rgba(240, 243, 248, 0)']}
                    style={styles.orbGradient}
                    start={{ x: 0.2, y: 0.8 }}
                    end={{ x: 0.9, y: 0.1 }}
                />
            </View>

            {/* Ambient Center Subtle Specular Sheen */}
            <View style={styles.ambientCenter} pointerEvents="none">
                <LinearGradient
                    colors={['rgba(255, 255, 255, 0.65)', 'rgba(240, 243, 248, 0.2)']}
                    style={styles.sheenGradient}
                    start={{ x: 0.5, y: 0 }}
                    end={{ x: 0.5, y: 1 }}
                />
            </View>

            {children}
        </View>
    );
}

const styles = StyleSheet.create({
    ambientTopRight: {
        position: 'absolute',
        top: -60,
        right: -60,
        width: width * 0.85,
        height: width * 0.85,
        borderRadius: width * 0.45,
        overflow: 'hidden'
    },
    ambientBottomLeft: {
        position: 'absolute',
        bottom: 80,
        left: -80,
        width: width * 0.9,
        height: width * 0.9,
        borderRadius: width * 0.45,
        overflow: 'hidden'
    },
    ambientCenter: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 200
    },
    orbGradient: {
        flex: 1
    },
    sheenGradient: {
        flex: 1
    }
});
