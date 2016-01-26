define(["require", "exports", 'durandal/app'], function (require, exports, app) {
    var labels;
    var activeRequestor;
    var worker;
    function install() {
        labels = [];
        // on project layer changes track requestors and go active on type localRequestor
        app.on('activeProjectLayer:change').then(function (pl) {
            activeRequestor = null;
            if (pl != null) {
                var dataLayer = (pl.layer);
                if (dataLayer.isClientRendered && dataLayer.cacheLocal) {
                    var decor = pl['data'];
                    var tileLayer = decor._tileLayer;
                    if (tileLayer) {
                        activeRequestor = tileLayer.getRequestor();
                    }
                }
            }
        }, this);
        // on extents changes, recompute labels
        app.on('map:extents-change').then(function (e) {
            recomputeLabels(e.extents);
        }, this);
        // create a worker
        worker = new Worker('Scripts/dynamicLabels.js');
    }
    exports.install = install;
    function recomputeLabels(env) {
        // remove any existing labels from DOM
        $.each(labels, function (idx, l) {
            app.trigger('map:remove-fixed-element', l);
        });
        // query against new view
        if (activeRequestor) {
            var data = activeRequestor.queryByEnvelope(env);
        }
    }
});
//# sourceMappingURL=dynamicLabels.js.map