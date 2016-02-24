import com = require('common/com');
import interfaces = require('common/interfaces');
import utility = require('common/utility');
import mdnl = require('common/mdnLayer');

// these are obtained from the web.config through a service call
export module appsettings {

    // dev
    var _endpointDev: string = 'http://localhost/MapDotNetUX9.5';
    var _mapIdDev: string = 'ChapterMaps';
    var _endpoint: string = '@@APPENDPOINT@@';
    var _mapId: string = '@@APPMAPID@@';

    export var docUrl = document.URL;
    export var serverPath = utility.getServerPlusPath();

    // these will use the overwritten version by the gulp build or dev
    export var endpoint: string = _endpoint.indexOf('@@') > -1 ? _endpointDev : _endpoint;
    export var mapId: string = _mapId.indexOf('@@') > -1 ? _mapIdDev : _mapId;

    // the layer to display and query
    export var layerId: string = utility.getParameterByName('layerid') || 'NAVUG';

    // if this is not set, the base map will default to open mapquest
    export var bingKey: string = 'AkHKxaiCl3u9G4PM3I44ztF7cexwtJ-_IdK-vMnyRS4G2b2Ahr7Nl32o0sYTGSwz';

    // set to true if a valid bing key provided
    export var areBingServicesAvailable: boolean = true;

    // number of secs to allow ajax calls in com and mdn
    export var serviceTimeoutSecs: number = 30;

    // number of query results to return (overwritten during settings read)
    export var maxQueryResults: number = 10000;

    export var defaultSymbology: interfaces.symbologyProperties = {
        size: 20,
        symbol: 'circle',
        fillColor: 'white',
        fillOpacity: 0.33,
        lineColor: 'black',
        lineWidth: 1,
        lineOpacity: 1
    };

    export var highlightSymbology: interfaces.symbologyProperties = {
        fillColor: 'transparent',
        lineColor: 'orange',
        lineOpacity: 0.66,
        lineWidth: 2
    };
}


// these are application-level data
export module appdata {

    // application version number
    export var version = '@@APPVERSION@@';

    // supported datetime formats
    export var supportedDatetimeFormats = [
        "MM/DD/YYYY", "M/DD/YYYY", "MM/D/YYYY", "M/D/YYYY", "MM-DD-YYYY", "M-DD-YYYY", "MM-D-YYYY", "M-D-YYYY",
        "MM/DD/YYYY HH:mm", "M/DD/YYYY HH:mm", "MM/D/YYYY HH:mm", "M/D/YYYY HH:mm", "MM-DD-YYYY HH:mm", "M-DD-YYYY HH:mm", "MM-D-YYYY HH:mm", "M-D-YYYY HH:mm",
        "MM/DD/YYYY H:m", "M/DD/YYYY H:m", "MM/D/YYYY H:m", "M/D/YYYY H:m", "MM-DD-YYYY H:m", "M-DD-YYYY H:m", "MM-D-YYYY H:m", "M-D-YYYY H:m",
        "MM/DD/YYYY H:mm", "M/DD/YYYY H:mm", "MM/D/YYYY H:mm", "M/D/YYYY H:mm", "MM-DD-YYYY H:mm", "M-DD-YYYY H:mm", "MM-D-YYYY H:mm", "M-D-YYYY H:mm",
        "MM/DD/YYYY HH:m", "M/DD/YYYY HH:m", "MM/D/YYYY HH:m", "M/D/YYYY HH:m", "MM-DD-YYYY HH:m", "M-DD-YYYY HH:m", "MM-D-YYYY HH:m", "M-D-YYYY HH:m"
    ];

    // is this app running under SSL
    export var useSSL = (window != null && window.location != null && window.location.protocol === 'https:');

    // holds a list of mapdotnet layers, these are added both as an indexed and associative array
    export var mdnLayers: mdnl.mdnLayer[] = null;

    // this is loaded by the dashboard map and contain map and layer information from the MDN map file
    export var mdnMetadata = null;

    // loads the mdn metadata
    export function readMetadata(): JQueryDeferred<any> {

        var task = $.Deferred();
        if (appsettings.endpoint && appsettings.mapId) {
            
            // load map metadata
            var uri = appsettings.endpoint +
                '/REST/9.0/Map/' +
                appsettings.mapId +
                '/DefinitionMapJSON';

            // parse out initial map extents
            var call = com.json.fetch(uri);

            call.done((theData) => {

                appdata.mdnMetadata = theData;
                appdata.mdnLayers = [];

                // sort the layers
                theData.Layers.sort((a, b)=> utility.strcmp(a.ID, b.ID));

                // build the mdnLayers collection
                $.each(theData.Layers, (idx: number, item: any) => {

                    var mdnLayer: mdnl.mdnLayer = new mdnl.mdnLayer(item.ID);
                    mdnLayer.geomType = utility.convertShapeTypeStringToFeatureClass(item.WKT_Type);
                    mdnLayer.isPointFeature = (mdnLayer.geomType == interfaces.featureClass.point);
                    mdnLayer.minScale = item.MinScale;
                    mdnLayer.maxScale = item.MaxScale;
                    mdnLayer.classes = item.Classes;

                    appdata.mdnLayers.push(mdnLayer);

                    // this is an array, there is no reason to believe this functionality exists,
                    // i've found other places in code where this is used, which isn't a good 
                    // practice. perhaps the best would be to make an object private here
                    // that the find mdn layer by id function uses (because it is fast) and then
                    // use that function throughout the code instead of this array hash thing
                    appdata.mdnLayers[mdnLayer.id] = mdnLayer;
                });

                task.resolve();
            });

            call.fail((request, status) => {
                task.reject(request, status, 'read metadata error!');
            });
        }
        return task;
    }
}