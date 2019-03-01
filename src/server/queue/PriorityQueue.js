/**
 * This should be implemented with a heap.
 * Whatever, it works.
 */

    /**
       Constructs a PriorityQueue.
       @constructor
    */
    PriorityQueue = function() {
        this._queue = [];
        this.cmp = function(a, b) {
            return a["priority"] < b["priority"];
        };
    };

    PriorityQueue.prototype.add = function(element, priority_value) {
        this._queue.unshift({
            "val": element,
            "priority": priority_value
        });
        this._queue.sort(this.cmp);
    };

    PriorityQueue.prototype.remove = function() {

        if (this._queue.length < 1) {
            throw error("Can not remove an element from an empty queue.");
        }

        /*
        var tmp = { "priority": 99999999999999999 };
        var min_idx = -1;

        for (var i = 0; i < this._queue.length; i++) {
            if (this.cmp(this._queue[i], tmp)) {
                tmp = this._queue[i];
                min_idx = i;
            }
        }

        var a = this._queue.splice(min_idx, 1)[0];
        return a.val;*/
        return this._queue.pop().val;
    };

    PriorityQueue.prototype.getLength = function() {
        return this._queue.length;
    };

module.exports = PriorityQueue;
