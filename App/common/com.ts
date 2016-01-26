export class json {
    
    static _timeout = 30000;

    static fetch(uri: string, error?: string, jsonpKey?: string, omit401handler?: boolean): JQueryPromise<any> {
        return this.ajax(uri, null, "get", error, false, jsonpKey, omit401handler);
    }

    static post(uri: string, args: any, error?: string, asForm?: boolean, omit401handler?: boolean): JQueryPromise<any> {
        return this.ajax(uri, args, "post", error, asForm || false, null, omit401handler);
    }

    _timeout = 30000;

    static setTimeoutInSeconds(timeout: number): void {
        if (timeout > 0) {
            this._timeout = timeout * 1000;
        }
    }

    static getTimeoutInSeconds(): number {
        return this._timeout / 1000;
    }

    static ajax(uri: string, args: any, method: string, error?: string, asForm?: boolean, jsonpKey?: string, omit401handler?: boolean): JQueryPromise<any> {

        var options: JQueryAjaxSettings = {
            cache: false,
            url: uri,
            type: method,
            timeout: this._timeout,
            data: args ? (asForm ? args : JSON.stringify(args)) : null,
        };

        if (!asForm) {
            options.contentType = 'application/json; charset=utf-8';
        }

        if (jsonpKey) {
            options.jsonp = jsonpKey;
            options.dataType = 'jsonp';
        }

        var call = $.ajax(options);

        return call;
    }
}

export class file {

    static post(url: string, data: FormData): JQueryPromise<any> {
        return $.ajax({
            url: url,
            type: 'POST', 
            data: data,
            processData: false,
            contentType: false
        });
    } 
}