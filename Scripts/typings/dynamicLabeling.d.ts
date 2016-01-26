/// <reference path="../../scripts/typings/mapsjs/mapsjs.d.ts" />

interface dynamicLabel {
    layerId: string;
    hash: string;
    text: string;
    mapTextLocation: { _x: number; _y: number };
    mapAnchorLocation: { _x: number; _y: number };
    width: number;
    height: number;
    nudgesRemaining: number;
    cost: number;
    metricsSet: boolean;
    nudgeCompleted: boolean;
    neighborHashes: {};
    neighborCentroid: { _x: number; _y: number };
}

// messages to worker
interface dynamicLabelingAddWork {
    layerId: string;
    data: {Data: any[]; Shapes: any[]};
    activeColumnNames: string[];
    screenEnvelope: mapsjs.envelope;
    mapUnitsPerPix: number;
    symbolRadius: number;
}

interface dynamicLabelingUpdateMetrics {
    hash: string;
    widthPix: number;
    heightPix: number;
}


// messages to client
interface dynamicLabelingAddLabel {
    txt: string;
    ptAnchor: {_x: number; _y: number};
    ptTxt: {_x: number; _y: number}
    hash: string;
}

interface dynamicLabelingMoveLabel {
    ptTxt: { _x: number; _y: number };
    ptTxtConnect: { _x: number; _y: number };
    hash: string;
}

interface dynamicLabelingRemoveLabel {
    hash: string;
}

// -------------------------------
interface dynamicLabelMessage {
    type: string;
    data: any;
}