import app = require('durandal/app');
import composition = require('durandal/composition');
import mapsjs = require('mapsjs');
import config = require('common/config');
import interfaces = require('common/interfaces');
import observable = require('plugins/observable');
import utility = require('common/utility');


class map {

    _map: mapsjs.mapsjsWidget;
    _moveNodeTimer: number;
    _bingKey: string = config.appsettings.bingKey;
    _hasBingKey: boolean = config.appsettings.areBingServicesAvailable;

    // observables
    requestorDescriptor: string;
    showBingAttrib: boolean = false;
    version = config.appdata.version;
    baseLayerOptions: interfaces.baseLayerOption[] = this._hasBingKey ? [
        {
            label: 'road',
            baseLayerDescriptor: 'r',
            requestorDescriptor: 'r',
            mapBkgColor: '#ACC7F2',
            trafficOn: false
        },
        {
            label: 'aerial',
            baseLayerDescriptor: 'a',
            requestorDescriptor: 'a',
            mapBkgColor: '#010715',
            trafficOn: false
        },
        {
            label: 'hybrid',
            baseLayerDescriptor: 'h',
            requestorDescriptor: 'h',
            mapBkgColor: '#010715',
            trafficOn: false
        }
    ] :
    [
        {
            label: 'open road',
            baseLayerDescriptor: '',
            requestorDescriptor: '',
            mapBkgColor: '#C7E5FE',
            trafficOn: false
        }
    ];

    selectedBaseLayerOption: interfaces.baseLayerOption = this.baseLayerOptions[0];
    showBasemapSelection: boolean = this.baseLayerOptions.length > 1;

    // the map options configuration ---------------------------------------------------------
    mapOptions: mapsjs.WidgetOptions = {
        stopPointerEventPropagation: false,
        drawnContentZorderToTop: true,
        contentExtentsMarginInPixels: 256,

        layers: [
            // base-map tile layer
            new mapsjs.tile.layerOptions('base',
                {
                    useBackdrop: true,
                    requestor: this.getBaseMapRequestor(),
                    descriptor: observable(this, 'requestorDescriptor')
                })
        ],

        // this is called before layers are loaded and allows async setup of the map's center and zoom level ----------------
        mapInitializeLocationAction: (m, callback) => this.initLocation(m, callback),

        // this is called after the map has fully initialized ---------------------------------------------------------------
        mapInitializedAction: (m) => this.mapInit(m),

        // publish map pointer click events
        pointerClickAction: (pt, ctrlKey, shiftKey) => app.trigger('map:pointer-click', pt, ctrlKey, shiftKey),

        // publish map hover events
        pointerHoverAction: (pt) => app.trigger('map:pointer-hover', pt),

        // publish extent change events
        extentChangeCompleteAction: (e) => {
            app.trigger('map:extents-change', e);
        },

        // publish message when map content is repositioned in the DOM
        // this is used for clustering since we want to re-cluster before the map content is drawn
        contentRepositionAction: (e) => app.trigger('map:content-reposition', e)

    }; // end of map options

    // ------------------------------------------------------------------------------------------------------------------------
    constructor() {

        observable(this, 'baseLayerOptions');

        // subscriptions ------------------------------------------------------
        // subscribe to move-map-to message
        app.on('map:fly-to').then((pt: mapsjs.point, zl?: number, completeAction?: ()=>void, ms?:number) => {
            if (this._map) {
                if (zl) {
                    this._map.flyTo(pt, zl, ms || 250, completeAction);
                }
                else {
                    this._map.setMapCenterAnimate(pt, ms || 250, completeAction);
                }
            }
        }, this);

        // fixed-element (like the callout) placement/removal
        app.on('map:add-fixed-element').then((element: HTMLElement, pt: {_x: number; _y: number}, dragOptions: any) => {
            if (this._map) {
                this._map.addFixedContentElement(element, pt._x, pt._y, null, dragOptions);
            }
        }, this);

        app.on('map:move-fixed-element').then((element: HTMLElement, pt: { _x: number; _y: number }, duration?:number) => {
            if (this._map) {
                this._map.moveFixedContentElement(element, pt._x, pt._y, duration);
            }
        }, this);

        app.on('map:remove-fixed-element').then((element: HTMLElement) => {
            if (this._map) {
                this._map.removeFixedContentElement(element);
            }
        }, this);

        // add/remove geometry
        app.on('map:add-geometry').then((geom: mapsjs.styledGeometry, key: string, enableHighlighting?: boolean) => {
            if (this._map) {
                if (enableHighlighting) {
                    var addAction = (svg: SVGElement) => {
                        utility.addPathHighlighter(svg);
                    };
                    var removeAction = (svg: SVGElement) => {
                        utility.removePathHighlighter(svg);
                    };
                    this._map.addPathGeometry(geom, key, addAction, removeAction);
                }
                else {
                    this._map.addPathGeometry(geom, key);
                }
            }
        }, this);

        app.on('map:remove-geometry').then((key: string) => {
            if (this._map) {
                this._map.removePathGeometry(key);
            }
        }, this);

        app.on('map:update-geometry-style').then((style: mapsjs.geometryStyle, key: string) => {
            if (this._map) {
                this._map.updatePathGeometryStyle(style, key);
            }
        }, this);

        app.on('map:begin-digitize').then((options: mapsjs.beginDigitizeOptions) => {
            if (this._map) {

                // broadcast shape change messages
                options.shapeChangeAction = () => {
                    var poly = this._map.getDigitizeSnapshot();
                    app.trigger('map:digitize-shape-change', poly);
                };

                // broadcast node move action (delayed)
                options.nodeMoveAction = (x, y, action, activeSetIdx, activeNodeIdx) => {
                    app.trigger('map:digitize-node-change', x, y, action, activeSetIdx, activeNodeIdx);
                };

                // broadcast envelope/circle shape drag actions
                options.shapeDragAction = (pt1, pt2) => {
                    app.trigger('map:digitize-shape-drag', pt1, pt2, options.shapeType);
                };

                this._map.beginDigitize(options);
            }
        }, this);

        app.on('map:end-digitize').then((finalShapeCallback: (cb?: mapsjs.geometry)=> void) => {
            if (this._map) {
                if (finalShapeCallback) {
                    var shape = this._map.getDigitizeSnapshot();
                    this._map.endDigitize();
                    finalShapeCallback(shape);
                }
                else {
                    this._map.endDigitize();
                }
            }
        }, this);

        app.on('map:move-node-on-digitize-path').then((pt: mapsjs.point, setIdx: number, nodeIdx: number) => {
            if (this._map) {
                this._map.moveNodeOnDigitizePath(pt, setIdx, nodeIdx);
            }
        }, this);

        app.on('map:insert-node-on-digitize-path').then((pts: mapsjs.point[], setIdx: number, nodeIdx: number) => {
            if (this._map) {
                this._map.insertNodeOnDigitizePath(pts, setIdx, nodeIdx);
            }
        }, this);

        app.on('map:delete-node-on-digitize-path').then((setIdx: number, nodeIdx: number, count?: number) => {
            if (this._map) {
                this._map.deleteNodeOnDigitizePath(setIdx, nodeIdx, count);
            }
        }, this);

        app.on('key:undo').then((state: boolean) => {
            if (this._map && this._map.isDigitizingEnabled() && state) {

                this._map.undoLastDigitizePathChange();

                // since we undid, notify the shape change
                var poly = this._map.getDigitizeSnapshot();
                app.trigger('map:digitize-shape-change', poly);
            }
        }, this);

        app.on('map:set-content-z-order').then((toTop: boolean) => {
            if (this._map) {
                this._map.setDrawnContentZorderToTop(toTop);
            }
        }, this);

        // make sure the zoom-slider tracks with changes
        app.on('map:extents-change').then((e: mapsjs.extentChangeStatsObj) => {
            var $zoombar: any = $('.zoomSliders');
            $zoombar.slider("option", "value", e.zoomLevel);
        }, this);

        // inquiry message to get the best fit zoom level for the supplied envelope
        app.on('map:get-best-fit').then((env: mapsjs.envelope, callback: (zl: number) => void) => {
            if (this._map) {
                var zl = this._map.getBestFitZoomLevelByExtents(env);
                callback(zl);
            }
        }, this);


        // setup observable subscription
        // this is called when a user selects a different base map option
        // it is also called when a project is opened and selectedBaseLayerOption is programatically set in setBaseMapDescriptor
        observable(this, 'selectedBaseLayerOption').subscribe((blo: interfaces.baseLayerOption) => {
            if (this._map) {

                this.requestorDescriptor = blo.requestorDescriptor;
                this._map.setBackground(blo.mapBkgColor);
            }
        });

        // tells durandal not to do the mapsjs custom binding until the container composition is complete
        // this way the map can determine view extents on initialize
        composition.addBindingHandler('rimMap');

    } // end of constructor


    // this function is called by the map when it needs to initialize its location
    // it is called before layers are rendered
    initLocation(m: JQuery, callback: (mc: mapsjs.point, zl: number) => void) {

        this._map = m.getMapsjs();

        var ie = config.appdata.mdnMetadata.InitialExtents;
        var mapExtents = new mapsjs.envelope(ie.MinX, ie.MinY, ie.MaxX, ie.MaxY);
        var zl: any = this._map.getBestFitZoomLevelByExtents(mapExtents);

        // callback takes map center and zoom level
        callback(mapExtents.getCenter(), zl);
    }


    // this funtion is called after the map is fully initialized and the layers are loaded
    mapInit(m: JQuery) {

        // activate slider
        var $zoombar: any = $('.zoomSliders');

        $zoombar.slider({
            orientation: "horizontal",
            value: this._map.getZoomLevel(),
            min: 1,
            max: 20,
            step: 1,
            animate: 'fast',
            slide: (event, ui) => this._map.setZoomLevelAnimate(ui.value)
        });

        // set tick marks
        var max = $zoombar.slider("option", "max");
        var spacing = 100 / (max - 1);
        $zoombar.find('.ui-slider-tick-mark').remove();
        for (var i = 1; i < (max - 1); i++) {
            $('<span class="ui-slider-tick-mark"></span>').css('left',(spacing * i) + '%').appendTo($zoombar);
        }

        // set map background color
        this._map.setBackground(this.selectedBaseLayerOption.mapBkgColor);

        // publish map is initialized message
        app.trigger('map:initialized', m, this);
    }


    // determine basemap requestor
    // note: this actually gets called prior to the class constructor since ko binding is firing before composition 
    getBaseMapRequestor() {

        var requestor;
        var scheme = config.appdata.useSSL ? 'https' : 'http';

        if (this._hasBingKey) {

            // Bing
            var bingKey = config.appsettings.bingKey;
            requestor = new mapsjs.tile.requestorBing();
            requestor.setMaxAvailableZoomLevel(20);
            requestor.setScheme(scheme);

            // always do this after setting the scheme as the metadata service is called here...
            requestor.setBingKey(bingKey);

            this.requestorDescriptor = this.selectedBaseLayerOption.requestorDescriptor;
            this.showBingAttrib = true;
        }
        else {
            // http://a.tile.openstreetmap.org/17/20961/50662.png
            // http://otile4.mqcdn.com/tiles/1.0.0/osm/17/20961/50662.png
            var uri = scheme + '://{0}.tile.openstreetmap.org/{1}/{2}/{3}.png';
            requestor = new mapsjs.tile.requestorOpen(uri, ['a', 'b', 'c']);
            requestor.setMaxAvailableZoomLevel(18);
        }

        return requestor;
    }


    // programatic means to set the base map descriptor from the project.baseLayerDescriptor
    // this descriptor is richer than the descriptor used by the mapsjs requestor
    // this is called when a project is parsed and the map is created in projecToMap
    setBaseMapDescriptor(d: string) {
        this.baseLayerOptions.forEach((o: interfaces.baseLayerOption) => {
            if (o.baseLayerDescriptor === d) {
                this.selectedBaseLayerOption = o;
            }
        });
    }


    zoomOut() {
        if (this._map) {
            this._map.zoomDeltaAnimate(-1, 1000);
        }
    }

    zoomIn() {
        if (this._map) {
            this._map.zoomDeltaAnimate(1, 1000);
        }
    }
}

export = map;