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
    name: string;
    shortLink: string;
    nextMeetingDate: string;
    meetingLinkUrl: string;

    constructor() {

        observable(this, 'title');
        observable(this, 'name');
        observable(this, 'shortLink');
        observable(this, 'nextMeetingDate');
        observable(this, 'meetingLinkUrl');

        app.on('callout:close').then(() => {
            this.close();
        }, this);
    }

    // -----------------------------------------------------------------------------------------------------------------------
    public open(data: interfaces.mdnFeatureResults) {

        this._location = mapsjs.wkt.parse(data.ShapeWkt[0]);
        app.trigger('map:fly-to', this._location);

        // parse rows
        this.name = data.Values[0][0];
        this.shortLink = data.Values[0][1];

        var nmd = Date.parse(data.Values[0][2]);
        if (nmd && nmd > new Date().getTime()) {
            this.nextMeetingDate = nmd.toDateString();
        }
        else {
            this.nextMeetingDate = '';
        }


        this.meetingLinkUrl = data.Values[0][3];

        // clean up
        if (this.shortLink.toLowerCase().indexOf('http') === -1) {
            this.shortLink = 'http://' + this.shortLink;
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
            this._calloutView = null;

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