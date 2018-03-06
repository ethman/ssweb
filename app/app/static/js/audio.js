var audio = { waveforms: all_waveforms };
var mixture_audio_file = {file:null, url:null};
var AUDIOFILES;
var BUFFERS;
var context;

var bufferLoader;
var spec_data;

var DO_STFT_ON_CLIENT = false;


audio.import_audio = function() {
    for(let waveform of audio.waveforms) {
        if(waveform && waveform.backend.buffer && waveform.isPlaying()) {
            waveform.pause();
        }
        // mixture_waveform.pause();
        // result_waveform.pause();
    }

    $('input[type=file]').click();
};

audio.playPause = function () {
    togglePlayPauseIcon();
    mixture_waveform.playPause();
};

$('#input_audio_file').change(function () {
    time_to_graph = new Date().getTime();
    mixture_audio_file.file = this.files[0];
    mixture_audio_file.url = URL.createObjectURL(mixture_audio_file.file);

    $("#filename").text(mixture_audio_file.file.name);
    $('#extraction-goal').multiselect('enable');
    mixture_waveform.load(mixture_audio_file.url);
    mixture_audio_file.upload_to_server(this);
});

mixture_audio_file.upload_to_server = function (obj) {
    if($(obj).prop('files').length > 0)
    {
        file = $(obj).prop('files')[0];
        file_with_metadata = {
            'file_name': file.name,
            'file_size': file.size,
            'file_type': file.type,
            'file_data': file };
        socket.compress(true).emit('audio_upload', {'audio_file': file_with_metadata});
        $('.plots').hide();
        $('.plots-spinner').show();
        // $('#pca').hide();
        // $('#spectrogram').hide();
    }
    else {
        socket.emit('audio_upload', {'audio_file': null});
    }
};

$('#results-play').click(function() {
    if (!result_waveform.backend.buffer ||
        $('#results-play').hasClass('disabled')) {
        return;
    }

    togglePlayPauseIcon(this);
    result_waveform.playPause();
});

$('#mixture-play').click(function() {
    if (!mixture_waveform.backend.buffer ||
        $('#mixture-play').hasClass('disabled')) {
        return;
    }

    togglePlayPauseIcon(this);
    mixture_waveform.playPause();
});

function togglePlayPauseIcon(obj) {
    $(obj).find('svg').toggleClass('fa-pause fa-play');
    $(obj).attr('title', `${$(obj).attr('title') === 'Play audio' ? 'Pause' : 'Play'} audio`)
}

function resetWaveform(waveform, waveformPlayId) {
    if(!waveform.backend.buffer) { return; }

    if(waveform.isPlaying()) {
        waveform.stop()
    }

    $(`${waveformPlayId}`).attr('title', 'Play audio')
    $(`${waveformPlayId} > svg`).attr('class', 'fas fa-play');
    waveform.seekTo(0);
}

$('#mixture-stop').click(function() {
    resetWaveform(mixture_waveform, '#mixture-play')
});

$('#results-stop').click(function() {
    resetWaveform(result_waveform, '#results-play')
});

mixture_waveform.on('finish', function () {
    resetWaveform(mixture_waveform, '#mixture-play')
});

result_waveform.on('finish', function () {
    resetWaveform(result_waveform, '#results-play')
});

function get_audio_data () {
    if (bufferLoader === null || bufferLoader.bufferList === null
        || bufferLoader.bufferList[0] === null) {
        return -1;
    }

    var n_channels = bufferLoader.bufferList[0].numberOfChannels;
    var len = bufferLoader.bufferList[0].length;

    n_channels = 1;
    var audio_data = bufferLoader.bufferList[0].getChannelData(0);

    return [audio_data, bufferLoader.bufferList[0].sampleRate];
}

// FROM: https://stackoverflow.com/a/30045041
// Convert a audio-buffer segment to a Blob using WAVE representation
function bufferToWave(abuffer, offset, len) {

  var numOfChan = abuffer.numberOfChannels,
      length = len * numOfChan * 2 + 44,
      buffer = new ArrayBuffer(length),
      view = new DataView(buffer),
      channels = [], i, sample,
      pos = 0;

  // write WAVE header
  setUint32(0x46464952);                         // "RIFF"
  setUint32(length - 8);                         // file length - 8
  setUint32(0x45564157);                         // "WAVE"

  setUint32(0x20746d66);                         // "fmt " chunk
  setUint32(16);                                 // length = 16
  setUint16(1);                                  // PCM (uncompressed)
  setUint16(numOfChan);
  setUint32(abuffer.sampleRate);
  setUint32(abuffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
  setUint16(numOfChan * 2);                      // block-align
  setUint16(16);                                 // 16-bit (hardcoded in this demo)

  setUint32(0x61746164);                         // "data" - chunk
  setUint32(length - pos - 4);                   // chunk length

  // write interleaved data
  for(i = 0; i < abuffer.numberOfChannels; i++)
    channels.push(abuffer.getChannelData(i));

  while(pos < length) {
    for(i = 0; i < numOfChan; i++) {             // interleave channels
      sample = Math.max(-1, Math.min(1, channels[i][offset])); // clamp
      sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767)|0; // scale to 16-bit signed int
      view.setInt16(pos, sample, true);          // update data chunk
      pos += 2;
    }
    offset++                                     // next source sample
  }

  // create Blob
  return new Blob([buffer], {type: "audio/wav"});

  function setUint16(data) {
    view.setUint16(pos, data, true);
    pos += 2;
  }

  function setUint32(data) {
    view.setUint32(pos, data, true);
    pos += 4;
  }
}