import TrackPlayer, { Event } from 'react-native-track-player';

module.exports = async function () {
    TrackPlayer.addEventListener(Event.RemotePlay, () => TrackPlayer.play());
    TrackPlayer.addEventListener(Event.RemotePause, () => TrackPlayer.pause());

    TrackPlayer.addEventListener(Event.RemoteNext, async () => {
        try {
            await TrackPlayer.skipToNext();
        } catch (e) {
            console.log('RemoteNext failed', e);
        }
    });

    TrackPlayer.addEventListener(Event.RemotePrevious, async () => {
        try {
            const position = await TrackPlayer.getPosition();
            if (position > 5) {
                await TrackPlayer.seekTo(0);
            } else {
                await TrackPlayer.skipToPrevious();
            }
        } catch (e) {
            console.log('RemotePrevious failed', e);
        }
    });

    TrackPlayer.addEventListener(Event.RemoteSeek, (event) => {
        TrackPlayer.seekTo(event.position);
    });
};
