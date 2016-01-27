import app = require('durandal/app');
import mapsjs = require('mapsjs');
import com = require('common/com');
import config = require('common/config');


// support full US or canadian street address or a US zipcode or a canadian postal code
var addressValidator = /^\s*(\d+\s+([\w\.\'\-]+(\s|,)+){2,}(\w{2,}|\d+))$|(\d{5}$)|([a-zA-Z]{1}\d{1}[a-zA-Z]{1}\s*\d{1}[a-zA-Z]{1}\d{1})$/i;
var baseUri = '//dev.virtualearth.net/REST/v1/Locations?query=';
var geocodeInProgress = false;
var geocodingEnabled: boolean = true;


export function install() {

    app.on('geocoding:enable').then((state: boolean) => {
        geocodingEnabled = state;
    }, this);


    app.on('search:new-text').then((searchText: string) => {

        if (geocodingEnabled && searchText && searchText.length > 0) {

            // trim trailing whitespace
            searchText = searchText.trim();

            var valid = addressValidator.test(searchText);
            var bingKey = config.appsettings.bingKey;

            // if we have something close to an address
            if (valid && config.appsettings.areBingServicesAvailable) {

                if (!geocodeInProgress) {

                    geocodeInProgress = true;

                    var uri = (config.appdata.useSSL ? 'https:' : 'http:') +
                        baseUri +
                        encodeURI(searchText) +
                        '&output=json&key=' +
                        bingKey;

                    // we do not use the promise because of the jsonp call
                    var call = com.json.fetch(uri, 'Bing geocode error!', 'jsonp');

                    app.trigger('busy', { isVisible: true });

                    call.done((data) => {

                        if (data && data.resourceSets && data.resourceSets.length > 0) {
                            var rs = data.resourceSets[0];

                            if (rs.resources && rs.resources.length > 0) {
                                var resource = rs.resources[0];

                                if (resource.geocodePoints && resource.geocodePoints.length > 0) {
                                    var p = resource.geocodePoints[0];

                                    if (p.coordinates && p.coordinates.length == 2) {

                                        var pt = mapsjs.sphericalMercator.projectFromLatLon(
                                            new mapsjs.point(p.coordinates[1], p.coordinates[0]));

                                        app.trigger('geocode:new-loc', pt);
                                    }
                                }
                            }
                        }
                    }); // end of done

                    call.always(() => {
                        geocodeInProgress = false;
                        app.trigger('busy', { isVisible: false });
                    });

                } // end if geocode not in progress
                else {

                    // this will attempt to re-try the geocode after a short period since there is already one in progress but the address changed
                    app.trigger('search:blocked');
                }
            } // if valid and bing key
        } // if geocoding enabled
    }, this);
}
