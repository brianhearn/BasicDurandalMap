import app = require('durandal/app');
import mapsjs = require('mapsjs');
import dashMap = require('viewmodels/map');

class Shell {

    map: dashMap;

    constructor() {

        this.map = new dashMap();

        // when the map is initialized...
        app.on('map:initialized').then(() => {
            
        }, this);

        // on extents change
        app.on('map:extents-change').then((s: { extents: mapsjs.envelope }) => {
           
        }, this);
    }


    

}

// export as a singleton
var shell = new Shell();
export = shell;