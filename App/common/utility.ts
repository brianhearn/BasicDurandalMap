// utility functions
import interfaces = require('common/interfaces');
import config = require('common/config');
import mapsjs = require('mapsjs');


export var maxInt = 9007199254740992;
export var maxMs = 10000000000000;


export function newId(): string {
    // http://stackoverflow.com/questions/105034/how-to-create-a-guid-uuid-in-javascript
    var d = new Date().getTime();
    var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        var r = (d + Math.random() * 16) % 16 | 0;
        return (c === 'x' ? r : (r & 0x7 | 0x8)).toString(16);
    });
    return uuid;
}

// utility function to clone symbology properties
export function cloneSymbology(symbology: interfaces.symbologyProperties): interfaces.symbologyProperties {
    return {
        symbol: symbology.symbol,
        fillColor: symbology.fillColor,
        fillOpacity: symbology.fillOpacity,
        lineColor: symbology.lineColor,
        lineWidth: symbology.lineWidth,
        lineOpacity: symbology.lineOpacity,
        size: symbology.size
    };
}

// utility function to copy symbology properties
export function copySymbology(src: interfaces.symbologyProperties, dst: interfaces.symbologyProperties): void {
    dst.symbol = src.symbol;
    dst.fillColor = src.fillColor;
    dst.fillOpacity = src.fillOpacity;
    dst.lineColor = src.lineColor;
    dst.lineWidth = src.lineWidth;
    dst.lineOpacity = src.lineOpacity;
    dst.size = src.size;
}

export function getParameterByName(name) {
    var match = RegExp('[?&]' + name + '=([^&]*)').exec(window.location.search);
    return match && decodeURIComponent(match[1]);
}

// return a symbol name from this instance's feature class
export function getSymbolNameFromFeatureClass(fc: interfaces.featureClass): string {

    var sn: string = '';

    switch (fc) {
        case interfaces.featureClass.polyline:
            sn = 'polyline';
            break;
        case interfaces.featureClass.polygon:
            sn = 'polygon';
            break;
        case interfaces.featureClass.point:
        case interfaces.featureClass.unknown:
            sn = config.appsettings.defaultSymbology.symbol;
            break;
    }
    return sn;
}

// returns feature class from mdn geom type string
export function convertShapeTypeStringToFeatureClass(shapeTypeStr: string): interfaces.featureClass {

    var ret;
    var fc: string = shapeTypeStr.toLowerCase();
    switch (fc) {
        case 'point':
        case 'multipoint':
            ret = interfaces.featureClass.point;
            break;
        case 'linestring':
        case 'multilinestring':
            ret = interfaces.featureClass.polyline;
            break;
        case 'polygon':
        case 'multipolygon':
            ret = interfaces.featureClass.polygon;
            break;
        default:
            ret = interfaces.featureClass.unknown;
            break;
    }
    return ret;
}


export function convertSymbologyPropertiesToGeometryStyle(symbology: interfaces.symbologyProperties): mapsjs.geometryStyle {

    // copy properties over mapsjs expect
    symbology['outlineColor'] = symbology.lineColor;
    symbology['outlineOpacity'] = symbology.lineOpacity;
    symbology['outlineThicknessPix'] = symbology.lineWidth;

    var style: mapsjs.geometryStyle = new mapsjs.geometryStyle(symbology);
    return style;
}


export function formatString(...args: any[]) {
    var s = arguments[0];
    for (var i = 0; i < arguments.length - 1; i++) {
        var reg = new RegExp("\\{" + i + "\\}", "gm");
        s = s.replace(reg, arguments[i + 1]);
    }
    return s;
}


export function createTag(tag: string, widthPix: number, addDragHandle?: boolean): { tag: HTMLElement, handle: HTMLElement} {

    // text span
    var s = document.createElement('span');
    s.className = 'tagText';
    s.textContent = tag;
    s.style.width = widthPix + 'px';
    s.style.minHeight = '16px';

    // optional drag handle
    var d = null, h = null;
    if (addDragHandle) {
        d = document.createElement('div');
        d.style.position = 'absolute';
        d.style.top = '0';

        h = document.createElement('i');
        h.className = 'fa fa-ellipsis-v';
        h.style.color = 'grey';
        h.style.padding = '4px';
        h.style.fontSize = '18px';
        h.style.height = '16px';
        h.style.width = '8px';
        h.style.display = 'inline-block';
        h.style.position = 'relative';
        h.style.zIndex = 1;

        // make handle float over text
        s.style.marginLeft = '-16px';
        s.style.paddingLeft = '16px';

        d.appendChild(h);
        d.appendChild(s);
    }

    var container = addDragHandle ? d : s;
    container.style.zIndex = 1;

    return {
        tag: container,
        handle: h
    }
}


export function createBlip(stroke?: string, fill?: string, size?: number, noAnimate?: boolean) {

    var s = size || 36;
    stroke = stroke || 'orange';
    fill = fill || 'white';

    var namespaceUri = 'http://www.w3.org/2000/svg';
    var svgRoot:any = document.createElementNS(namespaceUri, 'svg');

    svgRoot.setAttribute("height", s * 2);
    svgRoot.setAttribute("width", s * 2);
    svgRoot.setAttribute('style', 'position: absolute; left: -' + s + 'px; top: -' + s + 'px; pointer-events: none;');

    var rad = 1;
    var c:any = document.createElementNS(namespaceUri, 'circle');
    c.setAttribute('stroke', stroke);
    c.setAttribute('fill', fill);
    c.setAttribute('cx', s);
    c.setAttribute('cy', s);
    c.setAttribute('r', 1);

    svgRoot.appendChild(c);

    if (!noAnimate) {
        setInterval(() => {

            if (rad <= s) {
                c.setAttribute('r', rad);
                c.setAttribute('stroke-width', 2 + (rad / (s / 8)));
                c.setAttribute('stroke-opacity', 1 - (rad / s));
                c.setAttribute('fill-opacity', 1 - (rad / s));
            } else {
                c.setAttribute('r', 1);
            }
            rad += 3;
            if (rad >= (s * 2)) {
                rad = 1;
            }
        }, 50);
    }
    else {
        c.setAttribute('r', s);
    }

    return svgRoot;
}


export function addPathHighlighter(svg: SVGElement) {

    var svg$ = $(svg);
    var path$ = svg$.find('path');

    if (path$ && path$.length > 0) {

        var path: any = path$[0];
        svg$.attr('data-counter', 0);
        var namespaceUri = 'http://www.w3.org/2000/svg';

        // create a copy of the path and insert it behind the original
        var p: any = document.createElementNS(namespaceUri, 'path');
        p.setAttribute('id', 'highlightPath');
        p.setAttribute('d', path.getAttribute('d'));
        p.setAttribute('fill', 'none');
        p.setAttribute('stroke', 'black');
        p.setAttribute('stroke-width', parseInt(path.getAttribute('stroke-width')) + 4);
        p.setAttribute('stroke-opacity', '0.0');
        p.setAttribute('stroke-linejoin', 'round');
        svg.insertBefore(p, path);

        var id = setInterval(() => {
            
            var counter = parseFloat(svg$.attr('data-counter'));
            counter += (Math.PI / 32);

            if (counter > Math.PI) {

                counter = 0;

                // switch colors so animation is effective on light and dark bkgs
                if (p.getAttribute('stroke') === 'black') {
                    p.setAttribute('stroke', 'white');
                }
                else {
                    p.setAttribute('stroke', 'black');
                }
            }

            p.setAttribute('stroke-opacity', Math.sin(counter));
            svg$.attr('data-counter', counter);
        }, 80);

        svg$.attr('data-timerid', id);
    }
}


export function removePathHighlighter(svg: SVGElement) {

    var svg$ = $(svg);
    var p = svg$.find('#highlightPath');

    if (p) {
        p.remove();
    }

    var id = parseInt(svg$.attr('data-timerid'));
    if (id) {
        clearInterval(id);
    }
}


export function getCookie(key: string) {
    var regX = new RegExp(key + '=([^\\s;]*)');
    var cookie = document.cookie.match(regX);
    if (cookie && cookie.length) {
        return cookie[1];
    }
    return null;
}


export function setCookie(key: string, val: string, expireInDays: number) {
    var now = new Date();
    now.setDate(now.getDate() + expireInDays);
    var token = '; expires=' + now.toUTCString() + '; path=/';
    document.cookie = key + '=' + val + token;
}


export function deleteCookie(cookieName: string) {
    var cookieDate = new Date(); 
    cookieDate.setTime(cookieDate.getTime() - 1);
    document.cookie = cookieName + "=; expires=" + cookieDate.toUTCString() + '; path=/';
}


// returns the server plus path portion (no querystring) 
// supports querystrings that might have forward slashes
// does not include trailing slash
export function getServerPlusPath(): string {
    var match = /([^#?]+)\//.exec(document.URL);
    return match ? match[1] : '';
}

// does a deep type inferred comparison with respect to the observable plugin,
// checks if every attribute is equal on obj1 and obj2 (true if all are equal)
export function compareObjects(obj1, obj2): boolean {
    obj1 = obj1 || {}, obj2 = obj2 || {};
    var keys = $.unique(Object.keys(obj1).concat(Object.keys(obj2)));
    return keys.every((attr: string) => {
        if (/__.+__/.exec(attr)) // ignore ignorable properties...
            return true;
        var val1 = obj1[attr],
            val2 = obj2[attr];
        if (typeof val1 == 'function' || typeof val2 === 'function') // ignore functions...
            return true;
        if (val1 instanceof Object)
            return compareObjects(val1, val2);
        return val1 == val2;
    });
}


// used to toggle a checkbox collection
// if mostly off, turns all on
// if mostly on, turns all off
// attributeBool is the name of the boolean attribute to look for - supports a second level a.b
// optional onChange function is called if the item state changes - the function is passed the item
export function toggleCollection(collection: any[], attributeBool: string, onChange?: (item:any)=>void) {
    
    if (collection && collection.length > 0) {

        var total = collection.length;
        var totalOn = 0;
        var props = attributeBool.split('.');
        var pLen = props.length;

        if (pLen > 0) {

            collection.forEach((item) => {
                if (pLen == 2 && item[props[0]][props[1]]) {
                    totalOn++;
                }
                else if (pLen == 1 && item[props[0]]) {
                    totalOn++;
                }
            });

            var newState = !(totalOn / total > 0.5);
            collection.forEach((item) => {

                if (pLen == 2 && item[props[0]][props[1]] != newState) {
                    item[props[0]][props[1]] = newState;

                    if (onChange) {
                        onChange(item);
                    }
                }
                else if (pLen == 1 && item[props[0]] != newState) {
                    item[props[0]] = newState;

                    if (onChange) {
                        onChange(item);
                    }
                }
            });
        }
    }
}


// splits on a delimiter
// if the delimiter is whitespace, (TAB or space) quoted values are not expected
// otherwise data may be quoted with "
// " is not allowed as a delimiter
// delimiter should be a single character, if not the first character in it is used
// This returns null on global errors and simply skips fields/rows with other errors
export function splitLine(line: string, delimiter: string): string[] {

    // error cases return null
    if (!line || !line.length || !delimiter || !delimiter.length) {
        return null;
    }

    delimiter = delimiter.charAt(0);

    if (delimiter === '"') {
        return null;
    }

    // end check error cases

    var parts: string[] = [];

    if (/\s/.test(delimiter)) {
        // not expecting quoted values when the delimiter is whitespace
        parts = line.split(delimiter);
    }
    else {

        var dataQuoted = false;
        var finalPartWritten = false;

        var index = 0, limit = line.length;

        var partBuilder = '';

        if (line.charAt(0) == '"') {
            dataQuoted = true;
            index = 1;
        }

        var c: string;

        while (index < limit) {
            c = line.charAt(index);

            if (c == delimiter && !dataQuoted) // separator
            {
                parts.push(partBuilder);
                partBuilder = '';
                index++;
                if (index == limit) {
                    break;
                }
                dataQuoted = (line.charAt(index) == '"');
                if (dataQuoted) { index++; }
                continue;
            }
            else if (c == '"' && dataQuoted) {
                index++;
                if (index == limit) {
                    parts.push(partBuilder);
                    finalPartWritten = true;
                    break;
                }
                c = line.charAt(index);
                if (c == '"') // double quote is a quote literal in a quoted string
                {
                    partBuilder += '"';
                    index++;
                    continue;
                }
                else if (c == delimiter) // separator after terminator quote
                {
                    parts.push(partBuilder);
                    partBuilder = '';
                    index++;
                    if (index == limit) {
                        break;
                    }
                    dataQuoted = (line.charAt(index) == '"');
                    if (dataQuoted) { index++; }
                    continue;
                }
                else {
                    // Unexpected character sequence: terminating quote not followed by separator
                    break;
                }
            }
            else {
                partBuilder += c;
            }

            index++;
        }

        if (!finalPartWritten) {
            if (!dataQuoted) { // not an unterminated quote
                parts.push(partBuilder);
            }
        }
    }

    return parts;
}

// compares two strings, case-sensitive, returns a number suitable for array sort
export function strcmp(a: string, b: string): number {
    return a > b ? 1 : a < b ? -1 : 0;
}

// compares two strings, case-insensitive, returns a number suitable for array sort
export function strcasecmp(a: string, b: string): number {
    return strcmp(a.toLowerCase(), b.toLowerCase());
}