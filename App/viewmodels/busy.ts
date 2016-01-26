import app = require('durandal/app');
import spin = require('spin');

class busy {
    public isVisible: boolean = false;
    private _Spinner: spin = null;
    private _spinTarget: any = null;
    private _i: number = 0;

    constructor() {
       
        // subscribe to busy event
        app.on('busy').then(function (state) {

            if (state && state.isVisible) {
                this._i++;
            }
            else {
                this._i--;
                if (this._i < 0) {
                    this._i = 0;
                }
            }

            if (this._i > 0) {

                // lazy-load spinner
                if (!this._Spinner) {

                    var opts: SpinnerOptions = {
                        lines: 16, // The number of lines to draw
                        length: 0, // The length of each line
                        width: 20, // The line thickness
                        radius: 50, // The radius of the inner circle
                        corners: 10, // Corner roundness (0..1)
                        rotate: 0, // The rotation offset
                        direction: 1, // 1: clockwise, -1: counterclockwise
                        color: '#f80', // #rgb or #rrggbb or array of colors
                        speed: 0.5, // Rounds per second
                        trail: 0, // Afterglow percentage
                        shadow: false, // Whether to render a shadow
                        hwaccel: true // Whether to use hardware acceleration
                    };
                    this._Spinner = new spin(opts);
                }

                if (!this.isVisible) {
                    this._Spinner.spin(this._spinTarget);
                }
                this.isVisible = true;
            }
            else {
                if (this.isVisible) {
                    this._Spinner.stop();
                }
                this.isVisible = false;
            }
        }, this); 
    }

    // save spin target
    compositionComplete(view) {
        this._spinTarget = $(view).find('#busySpinner').get(0);
    }
}

export = busy;