import Sound from 'react-native-sound';

Sound.setCategory('Playback');

let selectSound = null;
let moveSound = null;
let killSound = null;
let errorSound = null;

export const initSounds = () => {
  selectSound = new Sound('glass_knock.mp3', Sound.MAIN_BUNDLE, (error) => {
    if (error) {
      console.log('Failed to load select sound:', error);
    }
  });

  moveSound = new Sound('wood_knock.mp3', Sound.MAIN_BUNDLE, (error) => {
    if (error) {
      console.log('Failed to load move sound:', error);
    }
  });

  killSound = new Sound('kill_sound.mp3', Sound.MAIN_BUNDLE, (error) => {
    if (error) {
      console.log('Failed to load kill sound:', error);
    }
  });

  errorSound = new Sound('error_sound.mp3', Sound.MAIN_BUNDLE, (error) => {
    if (error) {
      console.log('Failed to load error sound:', error);
    }
  });
};

export const playSelectSound = () => {
  if (selectSound) {
    selectSound.stop();
    selectSound.setCurrentTime(0);
    selectSound.play((success) => {
      if (!success) {
        console.log('Select sound playback failed');
      }
    });
  }
};

export const playMoveSound = () => {
  if (moveSound) {
    moveSound.stop();
    moveSound.setCurrentTime(0);
    moveSound.play((success) => {
      if (!success) {
        console.log('Move sound playback failed');
      }
    });
  }
};

export const playKillSound = () => {
  if (killSound) {
    killSound.stop();
    killSound.setCurrentTime(0);
    killSound.play((success) => {
      if (!success) {
        console.log('Kill sound playback failed');
      }
    });
  }
};

export const playErrorSound = () => {
  if (errorSound) {
    errorSound.stop();
    errorSound.setCurrentTime(0);
    errorSound.play((success) => {
      if (!success) {
        console.log('Error sound playback failed');
      }
    });
  }
};

export const releaseSounds = () => {
  if (selectSound) {
    selectSound.release();
    selectSound = null;
  }
  if (moveSound) {
    moveSound.release();
    moveSound = null;
  }
  if (killSound) {
    killSound.release();
    killSound = null;
  }
  if (errorSound) {
    errorSound.release();
    errorSound = null;
  }
};
