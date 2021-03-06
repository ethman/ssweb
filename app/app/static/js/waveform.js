class Waveform {
  // TODO: make id a dictionary argument?
  constructor(surferContainer, playId, stopId, downloadId, spinnerId, surferOptions) {
    this.waveformId = makeSelector(surferContainer);
    let options = surferOptions !== undefined ? surferOptions : {
      waveColor: 'grey',
      progressColor: 'black',
      cursorColor: 'pink',
      scrollParent: false,
      height: 60,
      normalize: true,
      audioRate: 1.0,
      minPxPerSec: 0,
      responsive: true
    };
    options.container = this.waveformId;

    this.surfer = WaveSurfer.create(options);
    this.playId = makeSelector(playId);
    this.stopId = makeSelector(stopId);
    this.downloadId = makeSelector(downloadId);
    this.spinnerId = spinnerId === undefined
      ? undefined
      : makeSelector(spinnerId);

    $(this.playId).click(() => {
      if (!this.surfer.backend.buffer || $(this.playId).hasClass('disabled')) {
        return;
      }

      this.playPause();
    });

    this.surfer.on('ready', this._hasSpinner()
      ? () => this.setLoading(false)
      : () => this.setControls(true))

    $(this.stopId).click(() => { this.resetWaveform(); });
    $(this.downloadId).click(() => {
      let blob = bufferToWave(
        this.surfer.backend.buffer,
        0.0,
        this.surfer.backend.buffer.length,
      );
      // TODO: use less hacky method for filename
      const noId = this.waveformId.slice(1);
      const filename = `${noId.substr(0, noId.indexOf('-'))}.wav`;
      saveAs(blob, filename, false);
    });
    this.surfer.on('finish', () => { this.resetWaveform() });
  }

  _hasSpinner() { return this.spinnerId !== undefined }

  load(url) { this.surfer.load(url); }

  playPause() {
    this._togglePlayPauseButton();
    this.surfer.playPause();
  }

  resetWaveform() {
    if(!this.surfer.backend.buffer) { return; }

    if(this.surfer.isPlaying()) { this.surfer.stop() }

    $(this.playId).attr('title', 'Play audio');
    $(`${this.playId} > svg`).attr('class', 'fas fa-play');
    this.surfer.seekTo(0);
  }

  _togglePlayPauseButton() {
    $(this.playId).find('svg').toggleClass('fa-pause fa-play');
    $(this.playId).attr(
      'title',
      `${$(this.playId).attr('title') === 'Play audio' ? 'Pause' : 'Play'} audio`
    )
  }

  clearSurfer() {
    // clear buffer so that on resize
    // doesn't redraw cleared waveform
    // wavesurfer doesn't offer a nice way
    // of clearing all data
    this.resetWaveform();
    this.surfer.backend.buffer = undefined;
    this.surfer.empty()
  }

  resizeWaveform() {
    if(this.surfer && this.surfer.backend.buffer) {
      this.surfer.empty();
      this.surfer.drawBuffer();
    }
  }

  setControls(enable) {
    if(enable) {
      $(this.playId).removeClass('disabled');
      $(this.stopId).removeClass('disabled');
      $(this.downloadId).removeClass('disabled');
    } else {
      if(!$(this.playId).hasClass('disabled')) {
        $(this.playId).addClass('disabled')
      }

      if(!$(this.stopId).hasClass('disabled')) {
          $(this.stopId).addClass('disabled')
      }

      if(!$(this.downloadId).hasClass('disabled')) {
        $(this.downloadId).addClass('disabled')
      }
    }
  }

  setLoading(aboutToLoad) {
    if(!this._hasSpinner()) {
      console.log(
        `Incorrectly called setLoading on waveform ${this.waveformId} that has no spinner`
      );
      return;
    }

    if(aboutToLoad) {
      this.setControls(false);

      $(this.spinnerId).show();
      $(this.spinnerId).css('display', 'flex');
      $(this.waveformId).hide();
      this.clearSurfer()
    } else {
      this.setControls(true);

      $(this.spinnerId).hide();
      $(this.waveformId).show();

      // redrawing waveform for display responsiveness
      this.surfer.empty();
      this.surfer.drawBuffer();
    }
  }
}
