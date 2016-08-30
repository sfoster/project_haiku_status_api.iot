// based on https://gist.githubusercontent.com/remy/753003/raw/a118bdcbbfe0f4c59e1f164dc740e66fc73f078a/audiosprite.js
// copyright Remy Sharp 2016

function Track(audio) {
  var track = this;
  var audioLead = 0;
  audio.autobuffer = true;
  audio.load();
  audio.muted = true; // makes no difference on iOS :(

  /* This is the magic. Since we can't preload, and loading requires a user's
     input. So we bind a touch event to the body, and fingers crossed, the
     user taps. This means we can call play() and immediate pause - which will
     start the download process - so it's effectively preloaded.

     This logic is pretty insane, but forces iOS devices to successfully
     skip an unload audio to a specific point in time.
     first we play, when the play event fires we pause, allowing the asset
     to be downloaded, once the progress event fires, we should have enough
     to skip the currentTime head to a specific point. */

  var force = function () {
    audio.pause();
    audio.removeEventListener('play', force, false);
  };

  var progress = function () {
    audio.removeEventListener('progress', progress, false);
    if (track.updateCallback !== null) track.updateCallback();
  };

  audio.addEventListener('play', force, false);
  audio.addEventListener('progress', progress, false);

  var click = document.ontouchstart === undefined ? 'click' : 'touchstart';
  var kickoff = function () {
    audio.play();
    document.documentElement.removeEventListener(click, kickoff, true);
  };

  document.documentElement.addEventListener(click, kickoff, true);

  this.updateCallback = null;
  this.audio = audio;
  this.playing = false;
  this.lastUsed = 0;
}

Track.prototype.play = function (ms) {
  var track = this,
      audio = this.audio,
      time = 0,
      nextTime = ms;

  clearInterval(track.timer);
  track.playing = true;
  track.lastUsed = +new Date;

  audio.muted = false;
  audio.pause();
  try {
    if (time == 0) time = 0.01; // yay hacks. Sometimes setting time to 0 doesn't play back
    audio.currentTime = time;
    audio.play();
  } catch (e) {
    this.updateCallback = function () {
      track.updateCallback = null;
      audio.currentTime = time;
      audio.play();
    };
    audio.play();
  }

  track.timer = setInterval(function () {
    if (audio.currentTime >= nextTime) {
      audio.pause();
      audio.muted = true;
      clearInterval(track.timer);
    }
  }, 10);
};
