import app = require('durandal/app');
import ko = require('knockout');
import interfaces = require('common/interfaces');
import viewEngine = require('durandal/viewEngine');
import observable = require('plugins/observable');
import mapsjs = require('mapsjs');


class callout {

    _calloutView: any = null;
    _blip: any = null;
    _location: mapsjs.point = null;

    title: string = 'Query Results';
    rows: interfaces.calloutRow[] = [];

    constructor() {

        observable(this, 'title');
        observable(this, 'rows');

        app.on('callout:close').then(() => {
            this.close();
        }, this);

        
    }

    // -----------------------------------------------------------------------------------------------------------------------
    public open(data: interfaces.mdnFeatureResults) {

        this._location = mapsjs.wkt.parse(data.ShapeWkt[0]);
        app.trigger('map:fly-to', this._location);

        // parse rows
        this.rows.removeAll();
        var lenFields = data.Fields.length;
        for (var i = 0; i < lenFields; i++) {

            var v = data.Values[0][i];
            var row: interfaces.calloutRow = {
                header: data.Fields[i],
                value: v,
                linkValue: '',
                isHyperlink: false,
                isText: true
            };
            this.rows.push(row);
        }
    
        // if we have never loaded the callout view resource
        // use durandal to instantiate the view and bind it to this model
        if (!this._calloutView) {
            viewEngine.createView('views/callout').then((cv) => {

                this._calloutView = cv;
                var cv$ = $(cv);

                ko.applyBindings(this, cv);

                // wire-up scroller
                cv$.find('.scroll-area').mCustomScrollbar(
                    {
                        theme: 'dark',
                        scrollButtons: {
                            enable: true
                        },
                        advanced: {
                            updateOnContentResize: true
                        }
                    }
                );
                app.trigger('map:add-fixed-element', cv, this._location);
            });
        }
        else {
            app.trigger('map:add-fixed-element', this._calloutView, this._location);
        }
    }


    public close() {

        if (this._calloutView) {
            app.trigger('map:remove-fixed-element', this._calloutView);

            // remove blip
            if (this._blip) {
                app.trigger('map:remove-fixed-element', this._blip);
            }
        }
    }


    public closeClick() {
        this.close();
    }
}

export = callout;