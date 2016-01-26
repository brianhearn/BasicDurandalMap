// Array extensions

interface Array<T> {
    insert(index: number, item: T): number;
    insertAny(index: number, items: T[]): void;
    remove(item: T): number;
    removeAny(items: T[]): void;
    removeAll(): void;
    first(filter?: (item: T) => boolean): T;
    last(filter?: (item: T) => boolean): T;
    pushAll(items: T[]): void;
    contains(item: T): boolean; // how do i generate documentation for this stuff?
}

var arrayPrototype: any = Array.prototype;

// Array.insert
arrayPrototype.insert = function (index: number, item) {
    this.splice(index, 0, item);
};

// Array.insertAny 
// observable friendly
arrayPrototype.insertAny = function (idx: number, items: Array<any>) {
    var newArr = this.slice(0, idx).
        concat(items).
        concat(this.slice(idx));

    this.splice(0, self.length);

    var l = newArr.length;
    for (var i = 0; i < l; i++) {
        this.push(newArr[i]);
    }
};

// Array.remove
arrayPrototype.remove = function(item) {
    var self: any[] = this;
    var index = self.indexOf(item);
    if (index >= 0) {
        self.splice(index, 1);
    }
    return index;
};

// Array.removeAll
arrayPrototype.removeAll = function() {
    var self: any[] = this;
    self.splice(0, self.length);
};

// Array.removeAny
arrayPrototype.removeAny = function(items: Array<any>) {
    var i;
    var self: Array<any> = this;
    for (i = self.length - 1; i >= 0 && items.length > 0; i--) {
        var itemsIndex = items.indexOf(self[i]);
        if (itemsIndex >= 0) {
            self.splice(i, 1);
            items.splice(itemsIndex);
        }
    }
};

// Array.first
arrayPrototype.first = function(filter) {
    var arr = this,
        first;
    filter = filter || (item => true);
    arr.some((item) => {
        if (filter(item)) {
            first = item;
            return true;
        }
    });
    return first;
};

// Array.last
arrayPrototype.last = function(filter) {
    var arr = this.slice().reverse();
    return arr.first(filter);
};

// Array.somethingish
arrayPrototype.contains = function (item) {
    return !!(this.first((p) => {
        return p == item;
    }));
};

// Array.pushAll
arrayPrototype.pushAll = function(items: Array<any>) {
    this.push.apply(this, items);
};

interface String {
    truncate(len: number, useWordBoundary: boolean): string;
    hash():string;
}

var stringPrototype: any = String.prototype;

// extend string to truncate on word boundaries
stringPrototype.truncate = function (n, useWordBoundary) {

    var tooLong = this.length > n;
    if (tooLong) {

        var s = this.substr(0, n);

        if (useWordBoundary) {
            var i = s.lastIndexOf(' ');
            if (i > 0) {
                s = s.substr(0, i);
            }
        }
        return s + '...';
    }
    return this;
};

// generate a 32bit integer hash from the string
stringPrototype.hash = function () {
    var hash = 0, i, chr, len;
    if (this.length === 0) return hash;
    for (i = 0, len = this.length; i < len; i++) {
        chr = this.charCodeAt(i);
        hash = ((hash << 5) - hash) + chr;
        hash |= 0; 
    }
    return hash;
};

interface Number {
    toDateString(): string;
}

var numberPrototype: any = Number.prototype;

numberPrototype.toDateString = function () {
    var date = new Date(this);
    return date.toDateString();
}
