/**
 * Redraw plot of given spectrogram with background image & appropriate axes
 *
 * @param {Object} spectrogram - the spectrogram to redraw with the new
 *     background
 * @param {number} xAxisRange - number of samples along x axis
 * @param {number} duration - duration of signal in seconds
 * @param {number} freqMax - max frequency of signal
 *
 * TODO: rename/refactor - this doesn't really get as it doesn't return anything
 */
function getSpectrogramAsImage(
    spectrogram,
    xAxisRange,
    duration,
    freqMax,
) {
    let url = `./mel_spec_image?val=${Math.random().toString(36).substring(7)}`;
    spectrogram.drawImage(url, xAxisRange, duration, freqMax);
}

class ScatterSpectrogram extends PlotlyHeatmap {
    constructor(divID, isNotSelectable) {
        super(divID, isNotSelectable);
        let newLayout = {
            xaxis: { title: "Time (s)" },
            yaxis: { title: "Logarithmic Frequency (hz)" },
            showlegend: false,
        };

        // merges super and child layouts
        // overlapping fields clobbered by child
        _.merge(this.plotLayout, newLayout);

        // maybe somehow deal with duplicate markers?
        // for now just add them on top
        this.markers = [];

        this.DOMObject.on('plotly_selected', (eventData, data) => {
            // Override this so the user doesn't accidentally lose their work
            // if(!data || !data.range) { this.clearMarkers(); }
        });

        this.emptyHeatmap();
    }

    clearMarkers() {
        this.markers = [];
        this.plot = Plotly.react(
            this.divID,
            [],
            this.plotLayout,
            this.plotOptions,
        );
    }

    addMarkers(xMarks, yMarks, color) {
        this.markers = this.markers.concat(_.zip(xMarks, yMarks));

        let data = {
            x: xMarks,
            y: yMarks,
            type: 'scattergl',
            mode:'markers',
            marker: {
                size: 2,
                color: color !== undefined ? color : '#ffffff',
                opacity: 1,
            },
        };

        Plotly.addTraces(this.divID, data);
    }

    // returns TxF matrix with 1s in all TF bins
    // currently selected
    exportSelectionMask() {
        let matrix = [...new Array(this.dims[1])].map(() =>
            [...new Array(this.dims[0])].map(() => 0)
        );
        this.markers.forEach(([x, y]) => { matrix[x][y] = 1 });
        return matrix;
    }

    setLoading(aboutToLoad) {
        if(aboutToLoad) {
            // do nothing for now
        } else {
            $('#apply-dc-selections').removeClass('disabled');

            $('.shared-plots-spinner').show();
            $('#plots-spinner').hide();
            relayoutPlots();
        }
    }

    // TODO: allow for different max frequency than number of samples?
    drawImage(url, xAxisRange, duration, maxFreq) {
        let [locs, text] = generateTicks(
            xAxisRange,
            duration,
            // width of div w/o borders
            // ref - https://stackoverflow.com/questions/4787527/how-to-find-the-width-of-a-div-using-raw-javascript
            // ref - https://stackoverflow.com/questions/21064101/understanding-offsetwidth-clientwidth-scrollwidth-and-height-respectively
            document.getElementById(this.divID).clientWidth,
        );

        let newLayout = {
            xaxis: {
                range: [0.0, xAxisRange],
                tickmode: 'array',
                tickvals: locs,
                ticktext: text,
            },
            yaxis: {
                range: [0.0, maxFreq],
                autorange: false,
            },
            images: [{
                source: url,
                xref: "x",
                yref: "y",
                x: 0,
                y: 0,
                sizex: xAxisRange,
                sizey: maxFreq,
                xanchor: "left",
                yanchor: "bottom",
                sizing: "stretch",
                layer: "below",
            }],
        };

        _.merge(this.plotLayout, newLayout);

        this.plot = Plotly.newPlot(
            this.divID,
            [],
            this.plotLayout,
            this.plotOptions,
        ).then(() => {
            this.setLoading(false);
            // hacky time dependent interaction between spectrogram and hist
            // TODO: remove this
            dcBar.updateSpec();
        });
    }
}
