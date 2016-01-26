import app = require('durandal/app');
import mapsjs = require('mapsjs');
import dashMap = require('viewmodels/map');
import query = require('common/query');
import interfaces = require('common/interfaces');
import callMod = require('viewmodels/callout');

class Shell {

    map: dashMap;
    callout: callMod;

    constructor() {

        this.map = new dashMap();
        this.callout = new callMod();

        // if we click on the map, then do an identify
        app.on('map:pointer-click').then((pt: mapsjs.point, ctrlKey: boolean, shiftKey: boolean) => {
            query.identify.execute(pt, true);
        });

        // result-set
        app.on('query:results:new').then((data: interfaces.mdnFeatureResults) => {
            if (data.Values.length > 0) {
                this.callout.open(data);
            }
        });
    }
}

// export as a singleton
var shell = new Shell();
export = shell;