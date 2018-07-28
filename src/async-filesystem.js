"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const rxjs_1 = require("rxjs");
const operators_1 = require("../node_modules/rxjs/operators");
exports.obs_stat = (cont) => (tag = undefined) => (filepath) => {
    const stack = new Error(filepath).stack;
    return new rxjs_1.Observable(subs => {
        fs.stat(filepath, (err, data) => {
            subs.next([err, data, tag, filepath]);
            subs.complete();
        });
    });
};
exports.obs_exists = (cont) => (tag = undefined) => (filepath) => new rxjs_1.Observable(subs => {
    fs.stat(filepath, (err, data) => {
        subs.next([!err, tag, filepath]);
        subs.complete();
    });
});
exports.obs_readdir = (cont) => (tag = undefined) => (filepath) => new rxjs_1.Observable(subs => {
    fs.readdir(filepath, (err, data) => {
        subs.next([err, data, tag, filepath]);
        subs.complete();
    });
});
exports.obs_readFile_input = new rxjs_1.Subject();
exports.obs_readFile_input.asObservable().pipe(operators_1.mergeAll(5000), operators_1.count()).subscribe(console.log);
// export type obs_readFile_result<T> = typeof obs_readFile_inner
exports.obs_readFile = (cont) => (tag = undefined) => {
    function obs_readFile_inner(filepath, encoding) {
        return new rxjs_1.Observable(subs => {
            exports.obs_readFile_input.next(new rxjs_1.Observable((subs2) => {
                const cb = (err, data) => {
                    subs.next([err, data, tag, filepath]);
                    subs.complete();
                    subs2.next("a");
                    subs2.complete();
                };
                if (encoding)
                    fs.readFile(filepath, encoding, cb);
                else
                    fs.readFile(filepath, cb);
            }));
        });
    }
    return obs_readFile_inner;
};
class Container {
    constructor(args) {
        this.wikidud = undefined;
    }
    closeSubjects() {
        exports.obs_readFile_input.complete();
    }
}
exports.Container = Container;
exports.ENV = process.env;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXN5bmMtZmlsZXN5c3RlbS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImFzeW5jLWZpbGVzeXN0ZW0udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFDQSx5QkFBeUI7QUFFekIsK0JBQXFFO0FBQ3JFLDhEQUF1RjtBQUcxRSxRQUFBLFFBQVEsR0FBRyxDQUFDLElBQWUsS0FBSyxDQUFnQixNQUFTLFNBQWdCLEtBQ3JGLENBQUMsUUFBZ0I7SUFDaEIsTUFBTSxLQUFLLEdBQUcsSUFBSSxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsS0FBSyxDQUFBO0lBQ3ZDLE1BQU0sQ0FBQyxJQUFJLGlCQUFVLENBQXFCLElBQUk7UUFDN0MsRUFBRSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxHQUFHLEVBQUUsSUFBSTtZQUUzQixJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxFQUFFLElBQUksRUFBRSxHQUFHLEVBQUUsUUFBUSxDQUFDLENBQUMsQ0FBQztZQUN0QyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7UUFFakIsQ0FBQyxDQUFDLENBQUE7SUFFSCxDQUFDLENBQUMsQ0FBQTtBQUNILENBQUMsQ0FBQTtBQUdXLFFBQUEsVUFBVSxHQUFHLENBQUMsSUFBZSxLQUFLLENBQWdCLE1BQVMsU0FBZ0IsS0FDdkYsQ0FBQyxRQUFnQixLQUFLLElBQUksaUJBQVUsQ0FBdUIsSUFBSTtJQUM5RCxFQUFFLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDLEdBQUcsRUFBRSxJQUFJO1FBQzNCLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsUUFBUSxDQUFDLENBQUMsQ0FBQztRQUNqQyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7SUFDakIsQ0FBQyxDQUFDLENBQUE7QUFDSCxDQUFDLENBQUMsQ0FBQTtBQUdVLFFBQUEsV0FBVyxHQUFHLENBQUMsSUFBZSxLQUFLLENBQUksTUFBUyxTQUFnQixLQUM1RSxDQUFDLFFBQWdCLEtBQUssSUFBSSxpQkFBVSxDQUF3QixJQUFJO0lBQy9ELEVBQUUsQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLENBQUMsR0FBRyxFQUFFLElBQUk7UUFDOUIsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUM7UUFDdEMsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO0lBQ2pCLENBQUMsQ0FBQyxDQUFBO0FBQ0gsQ0FBQyxDQUFDLENBQUE7QUFDVSxRQUFBLGtCQUFrQixHQUFHLElBQUksY0FBTyxFQUFFLENBQUM7QUFDaEQsMEJBQWtCLENBQUMsWUFBWSxFQUFFLENBQUMsSUFBSSxDQUFDLG9CQUFRLENBQUMsSUFBSSxDQUFDLEVBQUUsaUJBQUssRUFBRSxDQUFDLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUV2RixpRUFBaUU7QUFDcEQsUUFBQSxZQUFZLEdBQUcsQ0FBQyxJQUFlLEtBQUssQ0FBSSxNQUFTLFNBQWdCO0lBRzdFLDRCQUE0QixRQUFnQixFQUFFLFFBQWlCO1FBQzlELE1BQU0sQ0FBQyxJQUFJLGlCQUFVLENBQUMsSUFBSTtZQUN6QiwwQkFBa0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxpQkFBVSxDQUFDLENBQUMsS0FBSztnQkFDNUMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxHQUEwQixFQUFFLElBQXFCO29CQUM1RCxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxFQUFFLElBQUksRUFBRSxHQUFHLEVBQUUsUUFBUSxDQUFDLENBQUMsQ0FBQztvQkFDdEMsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO29CQUNoQixLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO29CQUNoQixLQUFLLENBQUMsUUFBUSxFQUFFLENBQUM7Z0JBQ2xCLENBQUMsQ0FBQTtnQkFDRCxFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUM7b0JBQ1osRUFBRSxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsUUFBUSxFQUFFLEVBQUUsQ0FBQyxDQUFDO2dCQUNyQyxJQUFJO29CQUNILEVBQUUsQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxDQUFBO1lBQzNCLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDSixDQUFDLENBQUMsQ0FBQztJQUNKLENBQUM7SUFDRCxNQUFNLENBQUMsa0JBQWtCLENBQUM7QUFDM0IsQ0FBQyxDQUFBO0FBRUQ7SUFFQyxZQUFZLElBQVc7UUFEdkIsWUFBTyxHQUFNLFNBQWdCLENBQUM7SUFHOUIsQ0FBQztJQUNELGFBQWE7UUFDWiwwQkFBa0IsQ0FBQyxRQUFRLEVBQUUsQ0FBQztJQUMvQixDQUFDO0NBRUQ7QUFURCw4QkFTQztBQUVZLFFBQUEsR0FBRyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMifQ==