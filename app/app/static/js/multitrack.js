var trackList = {};
var counter = 0;

function AddTrack(id, name, color, url) {
    counter++;
    color = color !== undefined ? color : 'SkyBlue';
    let context = new (window.AudioContext || window.webkitAudioContext)();
    let sr = context.sampleRate;
    let maybeDur = mixture_waveform.surfer.backend.getDuration()
    let defaultDur = 10;
    let dur = maybeDur ? maybeDur : defaultDur;

    let buffer = context.createBuffer(2, sr * dur, sr);
    newTrackHTML('track-container', id, name, color);
    let trackID = $('#' + id)[0];
    let initialEnvelope = [{x: 0, y: 0.8}, {x: buffer.duration, y: 0.8}];
    trackList[id] = new Track(buffer, context, trackID,
        initialEnvelope, $('#transport-slider'), audioEnded, counter);

    for(track of trackList) {
        track._gainMax = 1 / counter;
    }

    initTrack();
}

function initTrack(id, url) {
    loader.load(url).then(function (buffer) {
        trackList[id].changeWaveformBuffer(buffer, 0);
        socket.emit('get_recommendations', {'algorithm': id});
    });
}

function emptyMultiTrack() {
    let demoParams = ['repet_sim', 'projet', 'melodia'];
    let names = ['RepetSim', 'Projet', 'Melodia'];
    let colors = ['SkyBlue', 'PaleVioletRed', 'MediumSeaGreen'];
    let context = new (window.AudioContext || window.webkitAudioContext)();
    counter = demoParams.length;

    let sr = context.sampleRate;
    let maybeDur = mixture_waveform.surfer.backend.getDuration()
    let defaultDur = 10;
    let dur = maybeDur ? maybeDur : defaultDur;

    $.each(demoParams, function(i, algName) {
        let buffer = context.createBuffer(2, sr * dur, sr);
        newTrackHTML('track-container', algName, names[i], colors[i]);
        let trackID = $('#' + algName)[0];
        let initialEnvelope = [{x: 0, y: 0.8}, {x: buffer.duration, y: 0.8}];
        trackList[algName] = new Track(buffer, context, trackID,
            initialEnvelope, $('#transport-slider'), audioEnded, counter);
    });
    makeSlider();
}

function initMultiTrack() {
    let demoParams = ['repet_sim', 'projet', 'melodia'];
    let demoUrl = '/separated_source_demo?method=';

    $.each(demoParams, function(_, algName) {
        let url = demoUrl + algName;
        loader.load(url).then(function (buffer) {
            trackList[algName].changeWaveformBuffer(buffer, 0);
            socket.emit('get_recommendations', {'algorithm': algName});
        });
    });

    $('#reqs-tab-bootstrap').removeClass('disabled');
}

function newTrackHTML(containerID, id, title, color) {
    let titleHeader = $('<h5 />', { text: title, class: 'algorithm' });

    let soloButton = $('<button />', {
        text: 'S',
        id: id + '-solo',
        class: 'btn solo-track',
        title: 'Solo'
    });
    soloButton.click(soloTrack);

    let muteButton = $('<button />', {
        text: 'M',
        id: id + '-mute',
        class: 'btn mute-track',
        title: 'Mute'
    });
    muteButton.click(muteTrack);

    let recommendationsButton = $('<button />', {
        text: 'Recs',
        id: id + '-req',
        class: 'btn disabled toggle-reqs',
        title: 'Toggle Recommendations'
    });
    recommendationsButton.click(toggleReqs);

    let buttonsDiv = $('<div />', {class: 'solo-mute-recs btn-group btn-group-sm'});
    buttonsDiv.append(soloButton);
    buttonsDiv.append(muteButton);
    buttonsDiv.append(recommendationsButton);

    let maxDb = $('<div />', { class: 'db-label max-db-label', text: '0dB' });
    let minDb = $('<div />', { class: 'db-label min-db-label', text: '-80dB' });
    let dbLabels = $('<div />', { class: 'db-label-cont' });
    dbLabels.append(maxDb);
    dbLabels.append(minDb);

    let buttonsAndTitle = $('<div />', { class: 'algorithm-and-solo-mute-recs' });
    buttonsAndTitle.append(titleHeader);
    buttonsAndTitle.append(buttonsDiv);

    let trackControls = $('<div />', {class: 'track-controls'});
    trackControls.append(buttonsAndTitle);
    trackControls.append(dbLabels);

    let wavesUItrack = $('<div />', { class: 'waves-ui-track', id: id });
    wavesUItrack.attr('data-color', color);
    let wavesUIcontainer = $('<div />', {class: 'waves-ui-container'});
    wavesUIcontainer.append(wavesUItrack);

    let trackAndControls = $('<div />', {class: 'track-and-controls'});
    trackAndControls.append(trackControls);
    trackAndControls.append(wavesUIcontainer);

    let containerObj = $('#' + containerID);
    containerObj.append(trackAndControls);
}

function addEnvelopeData(envelopeData, trackID) {
    trackList[trackID].setEnvelopeData(envelopeData);

    // Highlight the recommendations button
    $('#' + trackID).parent().parent().children().find('.toggle-reqs').addClass('btn-primary').removeClass('disabled');
}

function makeSlider() {
    let duration = mixture_waveform.surfer.backend.getDuration();

    // Set the transport slider to the same width as the tracks
    let width = $('.waves-ui-track').actual( 'width' );
    $('#transport-slider-wrapper').width(width);
    $('#ticks-wrapper').width(width);

    let slider = $('#transport-slider');
    let ticks = $('.time');
    let numTicks = ticks.length;
    ticks.each(function(i, v) {
        $(v).text(formatTick((i / (numTicks - 1)) * duration));
    });

    slider.bootstrapSlider({ max: duration });
    slider.on("change", setTransport);
}

function formatTick(value) {
    let min = addZero(Math.floor(value / 60));
    let sec = addZero(Math.floor(value % 60));
    return min + ":" + sec;
}

function addZero(value) {
    return value < 10 ? "0" + String(value) : String(value);
}

function setTransport(event) {
    stopAll();
    $.each(trackList, function(_, track) {
        track.cursorPosition = event.value.newValue;
    });
}

$('#req-play').click(function () {
    togglePlayPauseIcon(this);

    $.each(trackList, function(_, track) {
        track.togglePlayPause();
    });

});

function audioEnded() {
    togglePlayPauseIcon($('#req-play'));
}

function stopAll() {
    $.each(trackList, function (_, track) {
        if (!track.isStopped()) track.stop();
    });

    // Remove the play icon
    $('#req-play').find('svg').toggleClass('fa-pause fa-play');
    $('#req-play').attr('title', `${$(this.playId).attr('title') === 'Play audio' ? 'Pause' : 'Play'} audio`)
}

function toggleReqs (eventObj) {
    let button = eventObj.target;
    if (!$(button).hasClass('disabled')) {
        let selectedId = $(button).parent().parent().parent().siblings().children()[0].id
        trackList[selectedID].toggleEnvelopeData();
        togglePrimaryBtn(button);
    }
}

$('#req-stop').click(function () {
    // Make this look like an 'event'...
    setTransport({value: {newValue: 0.0}});
});

function muteTrack (eventObj) {
    // THIS IS A BIG OLE HACK!
    let button = eventObj.target;
    let selectedId = $(button).parent().parent().parent().siblings().children()[0].id
    togglePrimaryBtn(button);
    trackList[selectedID].muteSelected = $(button).hasClass('btn-primary');

    let anySoloed = false, noneSoloed = true;
    for (let t in trackList) {
        t = trackList[t];
        anySoloed |= t.isSoloed;
        noneSoloed &= !t.soloSelected;
    }

    if (trackList[selectedID].muteSelected) {
        trackList[selectedID].mute();
        trackList[selectedID].muteEnvelopeData();
    }  else if((anySoloed && !trackList[selectedID].isSoloed) || noneSoloed) {
        // mute unselected
        // Only time we unmute is if any track is soloed and it is not this track, or if no one is soloed
        trackList[selectedID].unmute();
        trackList[selectedID].unmuteEnvelopeData();
    }
}

function soloTrack (eventObj) {
    let button = eventObj.target;
    let selectedId = $(button).parent().parent().parent().siblings().children()[0].id
    // TODO: implement something here
    // let unselectedIDs = $(button).parent().parent().siblings().children();

    trackList[selectedID].isSoloed = !trackList[selectedID].isSoloed;
    trackList[selectedID].soloSelected = trackList[selectedID].isSoloed;

    let allSoloed = true, noneSoloed = true, anySoloed = false;
    for (let t in trackList) {
        t = trackList[t];
        allSoloed &= t.isSoloed;
        noneSoloed &= !t.soloSelected;
        anySoloed |= t.isSoloed;
    }

    for (let t in trackList) {
        t = trackList[t];

        if (allSoloed || noneSoloed) {
            t.unmute();
            t.unmuteEnvelopeData();
        } else {
            if (t.isSoloed) {
                t.unmute();
                t.unmuteEnvelopeData();
            } else {
                t.mute();
                t.muteEnvelopeData();
            }
        }

        if (t.muteSelected) {
            t.mute();
            t.muteEnvelopeData();
        }
    }

    togglePrimaryBtn(button);
}

function togglePrimaryBtn(obj) {
    !$(obj).hasClass('btn-primary')
        ? $(obj).addClass('btn-primary')
        : $(obj).removeClass('btn-primary');
}

$('#req-save').click(function () {
    let offline = new OfflineAudioContext(2,44100*40,44100);

    $.each(trackList, (_, t) => t.prepareAudioGraph(offline));

    offline.startRendering().then((renderedBuffer) => {
        let blob = bufferToWave(renderedBuffer, 0.0, renderedBuffer.length);
        saveAs(blob, 'wut_result.wav', false);

        $.each(trackList, (_, t) => t.clearAudioGraph());
    });
});