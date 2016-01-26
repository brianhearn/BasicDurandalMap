
import app = require('durandal/app');
import config = require('common/config');
import mapsjs = require('mapsjs');
import com = require('common/com');
import interfaces = require('common/interfaces');
import utility = require('common/utility');
import mdnl = require('common/mdnLayer');

var mapCenter: mapsjs.point = null;
var mapUnitsPerPixel: number = 1;
var pixelMargin = 12;
var pixelMarginCluster = 18;

export module identify {

    export function execute(
        pt: mapsjs.point,
        returnTypes?: boolean,
        fields?: string[],
        simplify?: boolean,
        where?: string,
        clusteringOn?: boolean,
        ctrlKey?: boolean,
        shiftKey?: boolean): JQueryDeferred<interfaces.mdnFeatureResults> {

        var mdnLayerId: string = config.appsettings.layerId;
        var mdnLayer: mdnl.mdnLayer = config.appdata.mdnLayers[mdnLayerId];

        // create a spatial filter from the identification point
        var wkt: string;
        if (mdnLayer && (mdnLayer.geomType == interfaces.featureClass.point || mdnLayer.geomType == interfaces.featureClass.polyline)) {

            // we need a buffer 
            var env = createSearchBox(pt, clusteringOn);
            wkt = env.toGeometry().toWkt();
        }
        else {
            wkt = pt.toString();
        }

        // build endpoint
        var uri = buildEndpoint(mdnLayerId, true, returnTypes, fields, simplify, null, config.appsettings.maxQueryResults);

        // call
        return comcall(uri, wkt, where, ctrlKey, shiftKey);
    }
}


export module spatial {

    export function execute(
        shape: mapsjs.geometry,
        returnShapes?: boolean,
        returnTypes?: boolean,
        fields?: string[],
        simplify?: boolean,
        where?: string,
        maxRows?: number): JQueryDeferred<interfaces.mdnFeatureResults> {

        // build endpoint
        var mdnLayerId: string = config.appsettings.layerId;
        var uri = buildEndpoint(mdnLayerId, returnShapes, returnTypes, fields, simplify, null, maxRows);

        // call
        return comcall(uri, shape.toWkt(), where);
    }
}


export function computeResultsetBounds(shapes: string[]): mapsjs.envelope {
    var bounds = null;
    $.each(shapes,(idx: number, s: string) => {

        // skip nulls
        if (!s) {
            return true;
        }

        var b: mapsjs.envelope = mapsjs.wkt.parse(s).getBounds();
        if (bounds) {
            bounds = mapsjs.envelope.union(bounds, b);
        }
        else {
            bounds = b;
        }
    });
    return bounds;
}


// generic com call
function comcall(uri: string, wkt?: string, where?: string, ctrlKey?: boolean, shiftKey?: boolean): JQueryDeferred<interfaces.mdnFeatureResults> {

    var call: JQueryPromise<any>;
    var task = $.Deferred<interfaces.mdnFeatureResults>();

    if (wkt || where) {

        var postParms = {};
        if (wkt) {
            postParms['wkt'] = wkt;
        }
        if (where) {
            postParms['Where'] = where;
        }

        call = com.json.post(uri, postParms, 'query error:', true);
    }
    else {
        call = com.json.fetch(uri, 'query error:');
    }

    call.fail((err) => {
        app.trigger('error', err);
        task.resolve(null);
    });

    call.done((data: interfaces.mdnFeatureResults) => {

        // set the feature class
        if (data.ShapeType) {
            data.FeatureClass = utility.convertShapeTypeStringToFeatureClass(data.ShapeType);
        }

        // broadcast results
        app.trigger('query:results:new', data, ctrlKey, shiftKey);
         
        task.resolve(data);
    });

    return task;
}


// general purpose endpoint builder
export function buildEndpoint(
    mdnLayerId: string,
    returnShapes?: boolean,
    returnTypes?: boolean,
    fields?: string[],
    simplify?: boolean,
    where?: string,
    maxRows?: number): string {

    var uri = config.appsettings.endpoint +
        '/REST/9.0/Map/' +
        config.appsettings.mapId +
        '/Features/' +
        mdnLayerId +
        '/WKT/?Format=json&ReturnShapes=' +
        (returnShapes ? '1' : '0') +
        '&ReturnTypes=' +
        (returnTypes ? '1' : '0') +
        '&Fields=' +
        (fields ? encodeURIComponent(fields.join(',')) : '');


    if (simplify) {
        uri += ('&UnitsPerPixel=' + mapUnitsPerPixel / 2);
    }

    if (where && where.length > 0) {
        uri += '&Where=' + encodeURIComponent(where);
    }

    if (maxRows !== -1) {
        var mr = Math.min(maxRows > 0 ? maxRows : config.appsettings.maxQueryResults, config.appsettings.maxQueryResults);
        uri += '&MaxRows=' + mr;
    }

    return uri;
}


function createSearchBox(pt: mapsjs.point, clusteringOn?: boolean): mapsjs.envelope {

    var margin = mapUnitsPerPixel * (clusteringOn ? pixelMarginCluster : pixelMargin);
    var env = mapsjs.envelope.createFromCenterAndMargins(pt.getX(), pt.getY(), margin, margin);
    return env;
}


export function install() {

    // we need to units per pixel
    app.on('map:extents-change').then((e: mapsjs.extentChangeStatsObj) => {
        mapUnitsPerPixel = e.mapUnitsPerPixel;
        mapCenter = new mapsjs.point(e.centerX, e.centerY);
    }, this);
}