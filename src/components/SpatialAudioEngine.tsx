import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Platform, Animated, Easing } from 'react-native';
import { WebView } from 'react-native-webview';
import { DeviceMotion } from 'expo-sensors';
import { usePlayerStore } from '../store/usePlayerStore';

const WEBAUDIO_HTML = `
<!DOCTYPE html>
<html>
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>body { margin: 0; background: transparent; }</style>
</head>
<body>
    <audio id="audio-player" crossorigin="anonymous"></audio>
    <script>
        let audioContext = null;
        let panner = null;
        let source = null;
        const audioElement = document.getElementById('audio-player');

        function initAudio() {
            if (audioContext) return;
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            audioContext = new AudioContext();
            
            source = audioContext.createMediaElementSource(audioElement);
            panner = audioContext.createPanner();
            
            // HRTF provides the most realistic spatial sound
            panner.panningModel = 'HRTF';
            panner.distanceModel = 'inverse';
            panner.refDistance = 1;
            panner.maxDistance = 10000;
            panner.rolloffFactor = 1;
            panner.coneInnerAngle = 360;
            panner.coneOuterAngle = 0;
            panner.coneOuterGain = 0;

            // Listener always at origin
            if (audioContext.listener.positionX) {
                audioContext.listener.positionX.value = 0;
                audioContext.listener.positionY.value = 0;
                audioContext.listener.positionZ.value = 0;
            } else {
                audioContext.listener.setPosition(0, 0, 0);
            }

            // Initial sound position (directly in front)
            panner.setPosition(0, 0, -1);

            source.connect(panner);
            panner.connect(audioContext.destination);
        }

        audioElement.addEventListener('ended', () => {
             window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ended' }));
        });

        audioElement.addEventListener('timeupdate', () => {
             window.ReactNativeWebView.postMessage(JSON.stringify({ 
                 type: 'progress', 
                 position: audioElement.currentTime,
                 duration: audioElement.duration
             }));
        });

        // Listen for React Native commands
        window.addEventListener('message', (event) => {
            try {
                const msg = JSON.parse(event.data);
                
                if (msg.type === 'load') {
                    initAudio();
                    audioElement.src = msg.uri;
                    audioElement.load();
                    if (msg.autoplay) {
                        audioContext.resume().then(() => audioElement.play());
                    }
                } 
                else if (msg.type === 'play') {
                    if (audioContext && audioContext.state === 'suspended') {
                        audioContext.resume();
                    }
                    audioElement.play();
                } 
                else if (msg.type === 'pause') {
                    audioElement.pause();
                }
                else if (msg.type === 'seek') {
                    audioElement.currentTime = msg.position;
                }
                else if (msg.type === 'orientation' && panner) {
                    // Update Listener Orientation based on Device Motion Gyroscope
                    // Msg provides alpha (yaw), beta (pitch), gamma (roll) in radians
                    
                    const yaw = msg.alpha;
                    const pitch = msg.beta;
                    const roll = msg.gamma;
                    
                    // Simple HRTF math: Sound source remains at (0, 0, -1). 
                    // As the user physically rotates their phone (head), we rotate the listener.
                    // Forward vector (where nose points)
                    const fX = Math.sin(yaw) * Math.cos(pitch);
                    const fY = Math.sin(pitch);
                    const fZ = -Math.cos(yaw) * Math.cos(pitch);
                    
                    // Up vector (where top of head points)
                    const uX = Math.sin(roll) * Math.cos(yaw) - Math.sin(pitch) * Math.sin(yaw) * Math.cos(roll);
                    const uY = Math.cos(pitch) * Math.cos(roll);
                    const uZ = Math.sin(roll) * Math.sin(yaw) + Math.sin(pitch) * Math.cos(yaw) * Math.cos(roll);

                    if (audioContext.listener.forwardX) {
                        audioContext.listener.forwardX.value = fX;
                        audioContext.listener.forwardY.value = fY;
                        audioContext.listener.forwardZ.value = fZ;
                        audioContext.listener.upX.value = uX;
                        audioContext.listener.upY.value = uY;
                        audioContext.listener.upZ.value = uZ;
                    } else {
                        audioContext.listener.setOrientation(fX, fY, fZ, uX, uY, uZ);
                    }
                }
            } catch (e) {
                console.error("WebAudio Error", e);
            }
        });
    </script>
</body>
</html>
`;

interface Props {
    songUrl: string | undefined;
    isPlaying: boolean;
    onEnded: () => void;
    onProgress: (pos: number, dur: number) => void;
    seekPosition: number | null;
}

export const SpatialAudioEngine: React.FC<Props> = ({ songUrl, isPlaying, onEnded, onProgress, seekPosition }) => {
    const webviewRef = useRef<WebView>(null);
    const [isReady, setIsReady] = useState(false);

    // Initialize DeviceMotion
    useEffect(() => {
        let subscription: any;
        
        DeviceMotion.setUpdateInterval(33); // ~30fps Head Tracking
        
        subscription = DeviceMotion.addListener((data) => {
            if (!isReady || !webviewRef.current || !isPlaying) return;
            
            // alpha = z (yaw), beta = x (pitch), gamma = y (roll)
            const alpha = data.rotation.alpha;
            const beta = data.rotation.beta;
            const gamma = data.rotation.gamma;

            webviewRef.current.injectJavaScript(`
                 try {
                     window.postMessage(JSON.stringify({
                         type: 'orientation',
                         alpha: ${alpha},
                         beta: ${beta},
                         gamma: ${gamma}
                     }), '*');
                 } catch(e) {}
                 true;
            `);
        });

        return () => {
            if (subscription) subscription.remove();
        };
    }, [isReady, isPlaying]);

    // Handle Playback State Sync
    useEffect(() => {
        if (!isReady || !webviewRef.current || !songUrl) return;

        webviewRef.current.injectJavaScript(`
            try {
                window.postMessage(JSON.stringify({
                    type: 'load',
                    uri: "${songUrl}",
                    autoplay: ${isPlaying}
                }), '*');
            } catch(e) {}
            true;
        `);
    }, [songUrl, isReady]);

    useEffect(() => {
        if (!isReady || !webviewRef.current || !songUrl) return;
        webviewRef.current.injectJavaScript(`
            try {
                window.postMessage(JSON.stringify({
                    type: "${isPlaying ? 'play' : 'pause'}"
                }), '*');
            } catch(e) {}
            true;
        `);
    }, [isPlaying]);

    useEffect(() => {
        if (!isReady || !webviewRef.current || seekPosition === null) return;
        webviewRef.current.injectJavaScript(`
            try {
                window.postMessage(JSON.stringify({
                    type: 'seek',
                    position: ${seekPosition}
                }), '*');
            } catch(e) {}
            true;
        `);
    }, [seekPosition]);

    const handleMessage = (event: any) => {
        try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === 'ended') {
                onEnded();
            } else if (data.type === 'progress') {
                onProgress(data.position, data.duration);
            }
        } catch (e) {}
    };

    return (
        <View style={{ width: 0, height: 0, opacity: 0, overflow: 'hidden' }}>
            <WebView
                ref={webviewRef}
                originWhitelist={['*']}
                source={{ html: WEBAUDIO_HTML }}
                mediaPlaybackRequiresUserAction={false}
                allowsInlineMediaPlayback={true}
                onMessage={handleMessage}
                onLoad={() => setIsReady(true)}
                allowFileAccess={true}
                allowFileAccessFromFileURLs={true}
                allowUniversalAccessFromFileURLs={true}
            />
        </View>
    );
};
