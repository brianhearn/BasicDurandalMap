import app = require('durandal/app');
import mapsjs = require('mapsjs');
import dashMap = require('viewmodels/map');
import query = require('common/query');
import callMod = require('viewmodels/callout');
import searchbox = require('viewmodels/searchbox');

class Shell {

    map: dashMap;
    callout: callMod;
    search: searchbox;
    queryInProgress: boolean = false;

    constructor() {

        this.map = new dashMap();
        this.callout = new callMod();
        this.search = new searchbox(5);

        // set watermark
        this.search.watermark = 'Enter your address or postal code to find the closest chapter';

        // if we click on the map, then do an identify by finding the closest
        app.on('map:pointer-click geocode:new-loc').then((pt: mapsjs.point) => {

            if (!this.queryInProgress) {

                this.queryInProgress = true;

                app.trigger('busy', { isVisible: true });
                var call = query.findNearest.execute(pt, 1000);

                call.done((data) => {
                    if (data) {
                        this.callout.open(data);
                    }
                });

                call.always(() => {
                    app.trigger('busy', { isVisible: false });
                    this.queryInProgress = false;
                });
            }
        });
    }
}

// export as a singleton
var shell = new Shell();
export = shell;