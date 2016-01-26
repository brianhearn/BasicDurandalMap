// Array extensions
var arrayPrototype = Array.prototype;
// Array.insert
arrayPrototype.insert = function (index, item) {
    this.splice(index, 0, item);
};
// Array.insertAny 
// observable friendly
arrayPrototype.insertAny = function (idx, items) {
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
arrayPrototype.remove = function (item) {
    var self = this;
    var index = self.indexOf(item);
    if (index >= 0) {
        self.splice(index, 1);
    }
    return index;
};
// Array.removeAll
arrayPrototype.removeAll = function () {
    var self = this;
    self.splice(0, self.length);
};
// Array.removeAny
arrayPrototype.removeAny = function (items) {
    var i;
    var self = this;
    for (i = self.length - 1; i >= 0 && items.length > 0; i--) {
        var itemsIndex = items.indexOf(self[i]);
        if (itemsIndex >= 0) {
            self.splice(i, 1);
            items.splice(itemsIndex);
        }
    }
};
// Array.first
arrayPrototype.first = function (filter) {
    var arr = this, first;
    filter = filter || (function (item) { return true; });
    arr.some(function (item) {
        if (filter(item)) {
            first = item;
            return true;
        }
    });
    return first;
};
// Array.last
arrayPrototype.last = function (filter) {
    var arr = this.slice().reverse();
    return arr.first(filter);
};
// Array.somethingish
arrayPrototype.contains = function (item) {
    return !!(this.first(function (p) {
        return p == item;
    }));
};
// Array.pushAll
arrayPrototype.pushAll = function (items) {
    this.push.apply(this, items);
};
var stringPrototype = String.prototype;
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
    if (this.length === 0)
        return hash;
    for (i = 0, len = this.length; i < len; i++) {
        chr = this.charCodeAt(i);
        hash = ((hash << 5) - hash) + chr;
        hash |= 0;
    }
    return hash;
};
var numberPrototype = Number.prototype;
numberPrototype.toDateString = function () {
    var date = new Date(this);
    return date.toDateString();
};
//# sourceMappingURL=extensions.js.map