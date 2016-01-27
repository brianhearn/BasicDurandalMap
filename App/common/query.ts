
import app = require('durandal/app');
import config = require('common/config');
import mapsjs = require('mapsjs');
import com = require('common/com');
import interfaces = require('common/interfaces');
import utility = require('common/utility');

export module findNearest {

    export function execute(
        pt: mapsjs.point,
        radius: number,
        t?: JQueryDeferred<interfaces.mdnFeatureResults>): JQueryDeferred<interfaces.mdnFeatureResults> {

        var task = t || $.Deferred<interfaces.mdnFeatureResults>();
        var mdnLayerId: string = config.appsettings.layerId;

        // create a starting search-poly
        var searchBox = pt.convertToPoly(8, radius);

        // build endpoint
        var uri = buildEndpoint(mdnLayerId);

        // call
        var call = comcall(uri, searchBox.toWkt());

        call.done((data: interfaces.mdnFeatureResults) => {

            if (data.Values && data.Values.length > 0) {

                // set the feature class
                if (data.ShapeType) {
                    data.FeatureClass = utility.convertShapeTypeStringToFeatureClass(data.ShapeType);
                }

                // find nearest
                var row: interfaces.mdnFeatureResults = {
                    ShapeType: data.ShapeType,
                    FeatureClass: data.FeatureClass,
                    Fields: data.Fields,
                    Values: [],
                    ShapeWkt: []
                };

                var idx = 0, nearestIdx = 0;
                var nearestD = Number.MAX_VALUE;
                data.ShapeWkt.forEach((wkt) => {

                    var shape: mapsjs.point | mapsjs.geometry = mapsjs.wkt.parse(wkt);
                    if (shape instanceof mapsjs.geometry) {
                        shape = shape.getBounds().getCenter();
                    }
                    var d = (<mapsjs.point>shape).distanceTo(pt);
                    if (d < nearestD) {
                        nearestIdx = idx;
                        nearestD = d;
                    }
                    idx++;
                });

                row.ShapeWkt.push(data.ShapeWkt[nearestIdx]);
                row.Values.push(data.Values[nearestIdx]);

                task.resolve(row);
            }
            else {
                // no data - therefore re-enter with larger search radius
                var newRad = radius * 2;

                // gone out too far
                if (newRad > 4000000) {
                    task.resolve(null);
                }
                execute(pt, newRad, task);
            }
        });

        call.fail((err) => {
            app.trigger('error', err);
            task.resolve(null);
        });
        
        return task;
    }
}


// generic com call
function comcall(uri: string, wkt?: string): JQueryPromise<interfaces.mdnFeatureResults> {

    var call: JQueryPromise<any>;

    if (wkt) {

        var postParms = {};
        postParms['wkt'] = wkt;

        call = com.json.post(uri, postParms, 'query error:', true);
    }
    else {
        call = com.json.fetch(uri, 'query error:');
    }
    return call;
}


// general purpose endpoint builder
function buildEndpoint(
    mdnLayerId: string): string {

    var uri = config.appsettings.endpoint +
        '/REST/9.0/Map/' +
        config.appsettings.mapId +
        '/Features/' +
        mdnLayerId +
        '/WKT/?Format=json&ReturnShapes=1&ReturnTypes=1';

    return uri;
}