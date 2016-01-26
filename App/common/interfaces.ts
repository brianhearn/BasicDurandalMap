
export interface symbologyProperties {
    symbol?: string;
    fillColor?: string;
    fillOpacity?: number;
    lineColor?: string;
    lineWidth?: number;
    lineOpacity?: number;
    size?: number;
}


export enum featureClass {
    point,
    polyline,
    polygon,
    unknown
}


export interface mdnFeatureResults {
    Fields: string[];
    Types?: string[];
    ShapeWkt?: string[];
    ShapeType?: string;
    FeatureClass?: featureClass;
    SetBounds?: {MinX: number; MinY: number; MaxX: number; MaxY: number;}
    Values: string[][];
}


export interface baseLayerOption {
    label: string;
    baseLayerDescriptor: string;
    requestorDescriptor: string;
    mapBkgColor: string;
    trafficOn: boolean;
}