/// <reference path="./typings/dynamiclabeling.d.ts" />
/// <reference path="./typings/mapsjs/mapsjs.d.ts" />
// Dynamic Labeling - 12/22/2014 B. Hearn

// local vars
var maxNudgeCount = 6;              // max number of nudge iterations per label
var labelPool = [];                 // label pool reduces garbage collection
var labelDictionary = {};           // dictionary (label hash is the key) of current label collection displayed
var boundsCache = {};               // dictionary used to cache label bounds computations
var activeMupp: number;             // current map units per pixel
var activeLayerId: string;          // current map layer id being displayed
var activeSymbolRadiusInMapUnits;   // the radius of the active layer's symbol in map units
var nudgeInProgress: boolean = false;

// nudge kernel
var nudgeKernel = [
    [0.7, 1],
    [0.5, 0.66],
    [0.3, 0.45],
    [0.2, 0.3],
    [0.1, 0.125],
    [0.05, 0.066]
];

// the neighbor scan rage is based on how far the label can be nudged by the kernel + 50% (see factor of 3) for remote neighbors nudging towards each other
var neighborSearchMultipleX = 0;    // multiple of label size from anchor to search for neighbors
nudgeKernel.forEach((r) => { neighborSearchMultipleX += (r[0] * 3); });
var neighborSearchMultipleY = 0;    // multiple of label size from anchor to search for neighbors
nudgeKernel.forEach((r) => { neighborSearchMultipleY += (r[1] * 3); });

// event handler for rx message from client
addEventListener('message', (e) => {
        onMessageReceived(e);
}, false);

var onMessageReceived = (e) => {

    var msg: dynamicLabelMessage = e.data;

    // parse message types
    switch (msg.type) {
        case 'addWork':
            var work = <dynamicLabelingAddWork>(msg.data);
            addWork(work);
            break;
        case 'updateMetrics':
            var metrics = <dynamicLabelingUpdateMetrics>(msg.data);
            updateMetrics(metrics);
            break;
        case 'deleteAll':
            deleteAllLabels();
            break;
    }
}


// send a message to the client to remove a label
var addLabel = (dl: dynamicLabel) => {

    var addMsg: dynamicLabelingAddLabel = {
        txt: dl.text,
        ptTxt: dl.mapTextLocation,
        ptAnchor: dl.mapAnchorLocation,
        hash: dl.hash
    };
    var msg: dynamicLabelMessage = { type: 'addLabel', data: addMsg };
    this.postMessage(msg);

    labelDictionary[dl.hash] = dl;
};


// send a message to the client to move a label and connect anchor appropriately
var moveLabel = (dl: dynamicLabel) => {

    var hash: string = dl.hash;
    var ptTxt: { _x: number; _y: number } = dl.mapTextLocation;
    var offX = (dl.width * activeMupp) / 2;
    var offY = (dl.height * activeMupp) / 2;

    // we connect to the center of the label
    var ptTxtConnect = {
        _x: ptTxt._x + offX,
        _y: ptTxt._y - offY
    };

    var moveMsg: dynamicLabelingMoveLabel = {
        ptTxt: ptTxt,
        ptTxtConnect: ptTxtConnect,
        hash: hash
    };
    var msg: dynamicLabelMessage = { type: 'moveLabel', data: moveMsg };
    this.postMessage(msg);
};


// send a message to the client to remove a label
var removeLabel = (hash: string) => {

    var dl: dynamicLabel = labelDictionary[hash];

    var remMsg: dynamicLabelingRemoveLabel = {
        hash: hash
    };
    var msg: dynamicLabelMessage = { type: 'removeLabel', data: remMsg };
    this.postMessage(msg);

    // save in pool for improved garbage collection
    dl.neighborHashes = null;
    labelPool.push(dl);

    delete labelDictionary[hash];
    delete boundsCache[hash];
    delete boundsCache[hash + 'a'];
};


// add new labels to work on here...
var addWork = (work: dynamicLabelingAddWork) => {

    var hash: string;
    var dl: dynamicLabel;
    var data = work.data;
    var rowCount = data.Shapes.length;
    var activeColumnNames = work.activeColumnNames;
    var displayExtents = work.screenEnvelope;
    var scaleChanged = (work.mapUnitsPerPix != activeMupp);

    // update currents
    activeMupp = work.mapUnitsPerPix;
    activeSymbolRadiusInMapUnits = work.symbolRadius * activeMupp * 1.25;

    // if the active layer changes or the scale changes, remove all labels
    if (work.layerId != activeLayerId || scaleChanged) {
        deleteAllLabels();
    }
    // else remove labels that are no longer in current display extents
    // if removed, make sure to remove it from all neighbor collections
    else {
        for (hash in labelDictionary) {

            dl = labelDictionary[hash];

            if (dl.metricsSet) {

                var bounds = getMapBoundsOfLabel(dl);

                // if out of bounds, remove label
                if (bounds.getArea() > 0 && !rim.envelope.intersects(bounds, displayExtents)) {

                    removeLabel(hash);

                    // remove from all neighbors
                    for (var hash2 in labelDictionary) {
                        var dl2: dynamicLabel = labelDictionary[hash2];
                        delete dl2.neighborHashes[hash];
                    }
                }
            }
        }
    }

    // update currents
    activeLayerId = work.layerId;

    // iterate rows in supplied data
    for (var idx = 0; idx < rowCount; idx++) {

        // get vals for the row
        var valObj = data.Data[idx];
        var labelText = createLabelText(activeColumnNames, valObj);

        // if the label is blank, skip it
        if (labelText.length == 0) {
            continue;
        }

        // initial insertion point
        // note that the properties are copied over from client to worker but not prototype (so we recreate here)
        // html5 workers on receive serialized versions of object properties - not methods
        var p = data.Shapes[idx];

        // get the hash-key
        hash = (labelText + p._x + ',' + p._y).hash();

        // if we are already in the collection, update neighbors, but skip create
        if (!(hash in labelDictionary)) {

            // create a new dynamic label since this one is not in the dictionary
            // use any objects in the pool, otherwise create a new one (garbage collection optimization)
            dl = labelPool.pop();
            if (dl) {
                dl.layerId = work.layerId;
                dl.hash = hash;
                dl.text = labelText;
                dl.mapTextLocation = { _x: p._x, _y: p._y };
                dl.mapAnchorLocation = { _x: p._x, _y: p._y };
                dl.width = 0;
                dl.height = 0;
                dl.cost = 0;
                dl.nudgesRemaining = 0;
                dl.metricsSet = false;
                dl.nudgeCompleted = false;
                dl.neighborHashes = {};
                dl.neighborCentroid = null;
            }
            else {
                dl = {
                    layerId: work.layerId,
                    hash: hash,
                    text: labelText,
                    mapTextLocation: { _x: p._x, _y: p._y },
                    mapAnchorLocation: { _x: p._x, _y: p._y },
                    width: 0,
                    height: 0,
                    cost: 0,
                    nudgesRemaining: 0,
                    metricsSet: false,
                    nudgeCompleted: false,
                    neighborHashes: {},
                    neighborCentroid: null
                };
            }

            // add at the initial anchor location
            // the client will place in the DOM and report back with metrics
            addLabel(dl);
        }
    } // end loop
};


// handle client message to update the metrics on labels as they are added to the DOM
// also update neighbor collection since we now have metrics on the label
var updateMetrics = (metrics: dynamicLabelingUpdateMetrics) => {

    var dl: dynamicLabel;
    var hash = metrics.hash;
    if (hash in labelDictionary) {

        dl = labelDictionary[hash];
        dl.height = metrics.heightPix;
        dl.width = metrics.widthPix;
        dl.metricsSet = true;

        // if we have no neighbors, then there is no work to do
        // do a move to draw the anchor and label
        if (!updateNeighbors(dl)) {

            dl.nudgeCompleted = true;

            // move label to optimal position
            var p = dl.mapAnchorLocation;
            dl.mapTextLocation = { _x: p._x + activeSymbolRadiusInMapUnits, _y: p._y - activeSymbolRadiusInMapUnits };

            // go ahead an move label to best spot (lower right)
            moveLabel(dl);
        }
        // we do have neighbors
        else {

            // get ready to nudge
            makeNudgeReady(dl);
        }
    } // end of check in dictionary
};


// check to see which neighbors are in your sphere of concern and update relationships
// return true if we have any neighbors
var updateNeighbors = (dl: dynamicLabel) => {

    var dlCompare: dynamicLabel;
    var hash = dl.hash;
    var center: any = dl.mapAnchorLocation;
    var searchEnv = rim.envelope.createFromCenterAndMargins(center._x, center._y, dl.width * activeMupp * neighborSearchMultipleX, dl.height * activeMupp * neighborSearchMultipleY);
    var nAnch, nCount = 0, nX = 0, nY = 0;

    // inner-loop to consider all others
    for (var hash2 in labelDictionary) {

        // skip identity
        if (hash2 == hash) {
            continue;
        }

        dlCompare = labelDictionary[hash2];
        nAnch = dlCompare.mapAnchorLocation;

        // if the neighbor is in my vicinity, add each other to respective neighbor dictionaries
        if (searchEnv.contains(nAnch)) {

            dl.neighborHashes[hash2] = true;
            dlCompare.neighborHashes[hash] = true;

            // add to centroid
            nCount++;
            nX += nAnch._x;
            nY += nAnch._y;

            // since we've been added near a neighbor, it will need to get re-nudged if it was already nudged
            if (dlCompare.nudgeCompleted) {
                makeNudgeReady(dlCompare);
            }
        }
    } // end neighbor search

    if (nCount > 0) {
        dl.neighborCentroid = {
            _x: nX / nCount,
            _y: nY / nCount
        };
        return true;
    }

    return false;
};


// polled nudge processing
// we periodically look to see if any new labels need to be nudged
setInterval(() => {

    var dl: dynamicLabel;

    // if we are already processing a nudge
    if (nudgeInProgress) {
        return;
    }

    // iterate dictionary and see if all are either ready to nudge or (exclusive) nudged (completed)
    var ready = false;
    for (var hash in labelDictionary) {
        dl = labelDictionary[hash];

        // skip completed
        if (dl.nudgeCompleted) {
            continue;
        }

        // we have at least one ready if readyToNudge = true;
        ready = dl.metricsSet;

        // but if they are not all ready, abort
        // we need to wait until all metric in from the client before proceeding
        if (!ready) {
            break;
        }
    }
    if (ready) {
        nudge();
    }
}, 333);


// main nudging function -----------------------------
var nudge = () => {

    var pTxtLoc, pX, pY, pBestX, pBestY, nRow, w, h, activity;
    var dl: dynamicLabel;
    var cost, costlr, costur, costul, costll;
    nudgeInProgress = true;

    // iterate passes until all done
    while (nudgeInProgress) {

        // nudge pass - iterate all labels
        activity = false;
        for (var hash in labelDictionary) {

            dl = labelDictionary[hash];

            // skip if the completed
            if (dl.nudgeCompleted) {
                continue;
            }

            activity = true;

            // nudge variables for this pass
            cost = dl.cost;

            // compute nudge x/y
            nRow = nudgeKernel[maxNudgeCount - dl.nudgesRemaining];
            w = (dl.width * activeMupp) * nRow[0];
            h = (dl.height * activeMupp) * nRow[1];

            // text location prop on dynamic label
            pTxtLoc = dl.mapTextLocation;
            pBestX = pX = pTxtLoc._x;
            pBestY = pY = pTxtLoc._y;

            // try lower right
            pTxtLoc._x = pX + w;
            pTxtLoc._y = pY - h;
            costlr = computeCost(dl);

            if (costlr < cost) {
                cost = costlr;
                pBestX = pTxtLoc._x;
                pBestY = pTxtLoc._y;
            }

            // try upper right
            pTxtLoc._x = pX + w;
            pTxtLoc._y = pY + h;
            costur = computeCost(dl);

            if (costur < cost) {
                cost = costur;
                pBestX = pTxtLoc._x;
                pBestY = pTxtLoc._y;
            }

            // try lower left
            pTxtLoc._x = pX - w;
            pTxtLoc._y = pY - h;
            costll = computeCost(dl);

            if (costll < cost) {
                cost = costll;
                pBestX = pTxtLoc._x;
                pBestY = pTxtLoc._y;
            }

            // try upper left
            pTxtLoc._x = pX - w;
            pTxtLoc._y = pY + h;
            costul = computeCost(dl);

            if (costul < cost) {
                cost = costul;
                pBestX = pTxtLoc._x;
                pBestY = pTxtLoc._y;
            }

            // update from pass
            // clear bounds cache because we moved the label
            dl.cost = cost;
            pTxtLoc._x = pBestX;
            pTxtLoc._y = pBestY;
            boundsCache[hash] = null;

            // check for finish
            var nr = --dl.nudgesRemaining;
            if (nr <= 0) {

                dl.nudgeCompleted = true;

                // move label to final best-cost location
                moveLabel(dl);
            }

        }  // end of nudge passes

        // if we have no activity, then we are done
        if (!activity) {
            nudgeInProgress = false;
        }
    } // end of while
};


// cost computation function
var computeCost = (dl: dynamicLabel) => {

    var n: dynamicLabel;
    var b, overlap, cost = 0;
    var boundsSrc = getMapBoundsOfLabel(dl, true);
    var centerSrc = boundsSrc.getCenter();

    // iterate neighbors and total overlapping area of labels in sqM
    // add cost of overlapping neighbor feature
    var neighbors = dl.neighborHashes;
    for (var hash in neighbors) {

        n = labelDictionary[hash];
        b = getMapBoundsOfLabel(n);

        overlap = rim.envelope.intersection(boundsSrc, b);

        // add cost of overlapping neighbor label
        if (overlap) {
            cost += Math.pow(overlap.getArea(), 2);
        }

        // add cost of overlapping neighbor's anchor
        overlap = rim.envelope.intersection(boundsSrc, getMapBoundsOfLabelAnchor(n));
        if (overlap) {
            cost += Math.pow(overlap.getArea(), 1.5);
        }
    }

    // add cost of overlapping its own anchor
    overlap = rim.envelope.intersection(boundsSrc, getMapBoundsOfLabelAnchor(dl));
    if (overlap) {
        cost += overlap.getArea();
    }
    
    // add cost of anchor length
    // note: we need to compare to label center otherwise left-side labels will be costed unfairly
    var p1 = dl.mapAnchorLocation;
    var p2 = dl.mapTextLocation;
    cost += rim.point.distance(p1._x, p1._y, centerSrc._x, centerSrc._y);

    // add cost of quadrant, lower right is best, then upper right
    if (p2._x < p1._x) {
        cost += 2;
    }
    if (p2._y < p1._y) {
        cost++;
    }

    // add cost of proximity to neighbor centroid
    // the idea here is that labels are best placed away from their neighbors to increase spreading
    p2 = dl.neighborCentroid;
    if (p2) {
        cost -= Math.pow(rim.point.distance(p1._x, p1._y, p2._x, p2._y), 0.75);
    }

    return cost;
};


// make a label ready to get picked up in the nudge processing function and start it with the label centered over the anchor point
var makeNudgeReady = (dl: dynamicLabel) => {

    var p: any = dl.mapAnchorLocation;
    var b = getMapBoundsOfLabel(dl);
    dl.mapTextLocation = { _x: p._x - (b.getWidth() / 2), _y: p._y + (b.getHeight() / 2)};
    dl.nudgesRemaining = maxNudgeCount;
    dl.nudgeCompleted = false;
    dl.cost = Number.MAX_VALUE;
};


var deleteAllLabels = () => {
    for (var key in labelDictionary) {
        removeLabel(key);
    }
};


// gets the bounds in map units for the dynamic label
var getMapBoundsOfLabel = (dl: dynamicLabel, ignoreCache?: boolean) => {

    var b = boundsCache[dl.hash];

    if (!b || ignoreCache) {
        var p: any = dl.mapTextLocation;
        var x = p._x;
        var y = p._y;
        boundsCache[dl.hash] = b = new rim.envelope(x, y - (dl.height * activeMupp), x + (dl.width * activeMupp), y);
    }

    return b;
};


// gets the bounds in map units for the dynamic label's anchor
var getMapBoundsOfLabelAnchor = (dl: dynamicLabel) => {

    var b = boundsCache[dl.hash + 'a'];

    if (!b) {
        var p: any = dl.mapAnchorLocation;
        var x = p._x;
        var y = p._y;
        boundsCache[dl.hash + 'a'] = b = new rim.envelope.createFromCenterAndMargins(x, y, activeSymbolRadiusInMapUnits, activeSymbolRadiusInMapUnits);
    }

    return b;
};


// builds label text from the data row
var createLabelText = (activeColumnNames: string[], valObj): string => {

    var txt = '';
    var activeColumnNameCount = activeColumnNames.length;
    for (var i = 0; i < activeColumnNameCount; i++) {
        txt += valObj[activeColumnNames[i]];
        if (i < (activeColumnNameCount - 1)) {
            txt += ',';
        }
    }
    return txt;
};

interface String {
    hash(): string;
}

var stringPrototype: any = String.prototype;
stringPrototype.hash = function () {
    var hash = 0, i, chr, len;
    if (this.length == 0) return hash;
    for (i = 0, len = this.length; i < len; i++) {
        chr = this.charCodeAt(i);
        hash = ((hash << 5) - hash) + chr;
        hash |= 0;
    }
    return hash;
};

// ********************************************************************************************************************
// this is needed as function protypes are not carried across from client to web-worker
// we only needed points and envelopes from the mapsjs codebase
var rim = { point: null, envelope: null };

rim.point = function (x, y) {
    this._x = x;
    this._y = y;
};

rim.point.prototype.getX = function () {
    return this._x;
};

rim.point.prototype.getY = function () {
    return this._y;
};

rim.point.prototype.toProps = function () {
    return { x: this._x, y: this._y };
};

rim.point.prototype.equals = function (pt) {
    return pt._x == this._x && pt._y == this._y;
};

rim.point.prototype.createOffsetBy = function (dx, dy) {
    return new rim.point(this._x + dx, this._y + dy);
};

rim.point.prototype.toString = function () {
    return [
        'POINT(',
        this._x,
        ' ',
        this._y,
        ')'
    ].join('');
};

rim.point.prototype.toWkt = rim.point.prototype.toString;

rim.point.prototype.clone = function () {
    return new rim.point(this._x, this._y);
};

rim.point.prototype.getBounds = function () {
    var x = this._x;
    var y = this._y;
    return new rim.envelope(x, y, x, y);
};

rim.point.createFromObject = obj => new rim.point(obj.x, obj.y);

rim.point.distance = (x1, y1, x2, y2) => {
    var dx = x1 - x2;
    var dy = y1 - y2;
    return Math.sqrt((dx * dx) + (dy * dy));
};

rim.point.prototype.distanceTo = function (pt) {
    return rim.point.distance(this._x, this._y, pt._x, pt._y);
};

rim.point.midpoint = (x1, y1, x2, y2) => new rim.point(x1 + ((x2 - x1) / 2), y1 + ((y2 - y1) / 2));

rim.envelope = function (minX, minY, maxX, maxY) {
    this._minX = minX;
    this._minY = minY;
    this._maxX = maxX;
    this._maxY = maxY;
};

rim.envelope.prototype.getMinX = function () {
    return this._minX;
};

rim.envelope.prototype.getMinY = function () {
    return this._minY;
};

rim.envelope.prototype.getMaxX = function () {
    return this._maxX;
};

rim.envelope.prototype.getMaxY = function () {
    return this._maxY;
};

rim.envelope.prototype.clone = function () {
    return new rim.envelope(this._minX, this._minY, this._maxX, this._maxY);
};

rim.envelope.prototype.createFromMargins = function (marginX, marginY) {
    return new rim.envelope(this._minX - marginX, this._minY - marginY, this._maxX + marginX, this._maxY + marginY);
};

rim.envelope.prototype.createFromBleed = function (bleed) {
    var minX = this._minX;
    var minY = this._minY;
    var maxX = this._maxX;
    var maxY = this._maxY;
    var marginX = (maxX - minX) * (bleed - 1.0);
    var marginY = (maxY - minY) * (bleed - 1.0);
    return new rim.envelope(minX - marginX, minY - marginY, maxX + marginX, maxY + marginY);
};

rim.envelope.prototype.getCenter = function () {
    var minX = this._minX;
    var minY = this._minY;
    return new rim.point(minX + ((this._maxX - minX) / 2.0), minY + ((this._maxY - minY) / 2.0));
};

rim.envelope.prototype.getWidth = function () {
    return this._maxX - this._minX;
};

rim.envelope.prototype.getHeight = function () {
    return this._maxY - this._minY;
};

rim.envelope.prototype.getArea = function () {
    return (this._maxX - this._minX) * (this._maxY - this._minY);
};

rim.envelope.prototype.toObject = function () {
    return { minX: this._minX, minY: this._minY, maxX: this._maxX, maxY: this._maxY };
};

rim.envelope.prototype.getUL = function () {
    return new rim.point(this._minX, this._maxY);
};

rim.envelope.prototype.getUR = function () {
    return new rim.point(this._maxX, this._maxY);
};

rim.envelope.prototype.getLL = function () {
    return new rim.point(this._minX, this._minY);
};

rim.envelope.prototype.getLR = function () {
    return new rim.point(this._maxX, this._minY);
};

rim.envelope.prototype.getAspect = function () {
    var h = this.getHeight();
    if (h > 0) {
        return this.getWidth() / h;
    }
    return 0;
};

rim.envelope.prototype.equals = function (env) {
    return env._minX == this._minX && env._minY == this._minY && env._maxX == this._maxX && env._maxY == this._maxY;
};

rim.envelope.prototype.toString = function () {
    return [this._minX, this._minY, this._maxX, this._maxY].join(',');
};

rim.envelope.prototype.contains = function (pt) {
    var x = pt._x;
    var y = pt._y;
    return (x >= this._minX && x <= this._maxX && y >= this._minY && y <= this._maxY);
};


rim.envelope.createFromObject = obj => new rim.envelope(obj.minX, obj.minY, obj.maxX, obj.maxY);

rim.envelope.createFromPoints = (pt1, pt2) => {
    var x1 = pt1._x;
    var y1 = pt1._y;
    var x2 = pt2._x;
    var y2 = pt2._y;
    return new rim.envelope(Math.min(x1, x2), Math.min(y1, y2), Math.max(x1, x2), Math.max(y1, y2));
};

rim.envelope.createFromCenterAndMargins = (centerPtX, centerPtY, marginX, marginY) => new rim.envelope(centerPtX - marginX, centerPtY - marginY, centerPtX + marginX, centerPtY + marginY);

rim.envelope.intersects = (env1, env2) => !(env1._minY > env2._maxY || env1._minX > env2._maxX || env1._maxY < env2._minY || env1._maxX < env2._minX);

rim.envelope.intersection = (env1, env2) => {

    var x1 = Math.max(env1._minX, env2._minX);
    var x2 = Math.min(env1._maxX, env2._maxX);
    var y1 = Math.max(env1._minY, env2._minY);
    var y2 = Math.min(env1._maxY, env2._maxY);

    if (x1 >= x2 || y1 >= y2) {
        return null;
    }
    else {
        return new rim.envelope(x1, y1, x2, y2);
    }
};

rim.envelope.union = (env1, env2) => new rim.envelope(Math.min(env1._minX, env2._minX), Math.min(env1._minY, env2._minY), Math.max(env1._maxX, env2._maxX), Math.max(env1._maxY, env2._maxY));