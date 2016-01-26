requirejs.config({
    paths: {
        'text': '../Scripts/text',
        'durandal': '../Scripts/durandal',
        'plugins': '../Scripts/durandal/plugins',
        'transitions': '../Scripts/durandal/transitions',
        'knockout': '../Scripts/knockout-3.4.0',
        'jwerty': '../Scripts/jwerty-0.3',
        'mapsjs': '../Scripts/isc.rim',
        'spin': '../Scripts/spin'
    }
});

define('jquery', function() { return jQuery; });

define(['durandal/system', 'durandal/app', 'durandal/viewLocator', 'durandal/binder', 'common/config'],
    function (system, app, viewLocator, binder, config) {

    //>>excludeStart("build", true);
    system.debug(true);
    //>>excludeEnd("build");

    app.configurePlugins({
        router: false,
        dialog: true,
        observable: true
    });
    
    // once all of the following async events have completed, proceed
    // these include, starting durandal, reading appsettings from web.config, and loading the OI catalog singleton    
    var call = $.when(
        config.appdata.readMetadata(),
        app.start());
        
    call.done(function () {

        // setup event aggregator based error logging
        app.on('error').then(function (err, logToServer) {
            system.log(err);
        }, this);

        app.on('error:show-user').then(function (err, logToServer) {
            alert(err);
        }, this);


        // goto shell
        viewLocator.useConvention();
        app.setRoot('viewmodels/shell');
    });

    call.fail(function (request, status, error) {
        // we send this to an alert box because the application hasn't completed start-up
        // we should never get here unless there is a setup/config issue with the MDN connection
        alert(error);
    });
});