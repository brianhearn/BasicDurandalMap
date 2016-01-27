import app = require('durandal/app');
import observable = require('plugins/observable');

class searchbox {

    timer: number;

    // a text input should bind to this
    userText: string = '';

    // this is updated on a pause in changes to userText
    // if this has no subscribers, 'search:new-text' is also raised
    searchText: string = '';

    // watermark is shown before any text is typed
    watermark: string = '';

    // whether or not the searchbox is enabled
    enabled: boolean = true;

    // whether or not we can execute a search
    canSearch: boolean;

    // the minimum number of chars required to do a search
    minCharsRequired: number;

    // controls the opacity os search button
    searchIconOpacity: number;

    constructor(mcr: number, initialSearchText?: string) {

        observable(this, 'watermark');
        observable(this, 'minCharsRequired');
        observable(this, 'userText');
        observable(this, 'searchText');

        this.minCharsRequired = mcr;
        if (initialSearchText) {
            this.userText = this.searchText = initialSearchText;
        }

        // proprty controls whether the search can be initiated
        observable.defineProperty(this, 'canSearch', () => {
            return this.enabled && this.userText !== null && this.userText.length >= this.minCharsRequired;
        });

        // controls the opacity os search button
        observable.defineProperty(this, 'searchIconOpacity',() => {
            return this.canSearch ? 1.0 : 0.33;
        });

        // if the last search submission requested a retry (it was blocked)
        // this can happen as an asyc query is executing when a new search string becomes available
        app.on('search:blocked').then(() => {

            clearTimeout(this.timer);
            this.timer = setTimeout(
                () => {
                    if (this.canSearch) {
                        app.trigger('search:new-text', this.searchText);
                    }
                }, 750);
        });
    }

    // click handler to execute search
    public executeSearch() {

        if (this.canSearch) {
            this.searchText = this.userText;
            if (observable(this, 'searchText').getSubscriptionsCount() == 0 && this.searchText.length >= this.minCharsRequired) {
                app.trigger('search:new-text', this.searchText);
            }
        }
    }


    public subscribe(s: (val: any) => void): KnockoutSubscription {
        return observable(this, 'searchText').subscribe(s);
    }


    public enable(state: boolean) {
        this.enabled = state;
    }
}

export = searchbox;