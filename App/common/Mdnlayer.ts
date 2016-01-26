import interfaces = require('common/interfaces');
import com = require('common/com');
import utility = require('common/utility');

export class mdnLayer {

    id: string = null;
    columns: mdnColumn[] = null;
    geomType: interfaces.featureClass = null;
    isPointFeature: boolean = false;
    minScale: number = 0;
    maxScale: number = 0;
    classes: any[] = [];

    // config will set this since this can't import config
    static featureQueryStub: string = null;

    constructor(id: string) {
        this.id = id;
    }

    public read() {

        var task = $.Deferred();

        if (this.columns != null) {
            task.resolve(this);
        }
        else {

            var call = com.json.fetch(mdnLayer.featureQueryStub + encodeURIComponent(this.id) + '/Query/?Format=json&ReturnShapes=0&ReturnTypes=1&Fields=' + encodeURIComponent('*') + '&Where=' + encodeURIComponent('1=0'),
                'Failed to retrieve columns for mdn layer ' + this.id);

            call.done((result: interfaces.mdnFeatureResults) => {
                var arr: mdnColumn[] = [];

                // iterate the newly loaded layers and build the observable concrete layers
                if (result && result.Fields && result.Types) {

                    for (var n = 0; n < result.Fields.length; n++) {
                        var col: mdnColumn = new mdnColumn();
                        col.name = result.Fields[n];
                        var type = result.Types[n];
                        var i = type.lastIndexOf('.');
                        if (i >= 0 && i + 1 < type.length) {
                            type = type.substr(i + 1);
                        }
                        col.type = type;
                        arr.push(col);
                    };

                    arr.sort((a: mdnColumn, b: mdnColumn) => utility.strcmp(a.name, b.name));
                }

                this.columns = arr;

                task.resolve(this);
            });

            call.fail((request, status, error) => task.reject(request, status, error));
        }

        return task;
    }
}

export class mdnColumn {
    name: string = null;
    type: string = null;
}