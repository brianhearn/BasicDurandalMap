define(['durandal/app', 'knockout'], function (app, ko) {

    var _this = this;
    var isVisible = ko.observable(false);

    return {
        isVisible: isVisible,
        compositionComplete: function () {

            // subscribe to busy event
            app.on('busy').then(function (state) {
                isVisible(state && state.isVisible && state.isBlocking);
            }, _this);
        }
    };
});