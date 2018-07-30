"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const path = require("path");
const buffer_1 = require("buffer");
const common_1 = require("./common");
function dumpToArray() {
    return (source) => source.pipe(operators_1.reduce((n, e) => { n.push(e); return n; }, []));
}
exports.dumpToArray = dumpToArray;
class Stats {
    constructor(meta) {
        this.meta = meta;
    }
    isFile() { return Stats.isFileMetadata(this.meta); }
    ;
    isDirectory() { return Stats.isFolderMetadata(this.meta); }
    ;
    isBlockDevice() { return false; }
    isCharacterDevice() { return false; }
    isSymbolicLink() { return false; }
    isFIFO() { return false; }
    isSocket() { return false; }
    get dev() { throw "not implemented"; }
    ;
    get ino() { throw "not implemented"; }
    ;
    get mode() { throw "not implemented"; }
    ;
    get nlink() { throw "not implemented"; }
    ;
    get uid() { throw "not implemented"; }
    ;
    get gid() { throw "not implemented"; }
    ;
    get rdev() { throw "not implemented"; }
    ;
    get size() { return Stats.isFileMetadata(this.meta) ? this.meta.size : 0; }
    ;
    get blksize() { throw "not implemented"; }
    ;
    get blocks() { throw "not implemented"; }
    ;
    get atime() { return Stats.isFileMetadata(this.meta) ? new Date(this.meta.server_modified) : new Date(0); }
    get mtime() { return Stats.isFileMetadata(this.meta) ? new Date(this.meta.server_modified) : new Date(0); }
    get ctime() { return Stats.isFileMetadata(this.meta) ? new Date(this.meta.server_modified) : new Date(0); }
    get birthtime() { return Stats.isFileMetadata(this.meta) ? new Date(this.meta.server_modified) : new Date(0); }
    static isFileMetadata(a) {
        return a[".tag"] === "file";
    }
    static isFolderMetadata(a) {
        return a[".tag"] === "folder";
    }
    static map(a) {
        return new Stats(a);
    }
}
exports.Stats = Stats;
// export type obs_stat_result<T> = [Error<files.GetMetadataError>, undefined, T, string] | [undefined, Stats, T, string]
exports.obs_stat = (cont, skipCache) => (tag = undefined) => (filepath) => rxjs_1.from(cont.cloud.filesGetMetadata({ path: filepath }, skipCache || false)).pipe(operators_1.map(Stats.map), operators_1.map((stat) => [undefined, stat, tag, filepath]), operators_1.catchError((err, obs) => rxjs_1.of([err, undefined, tag, filepath])));
exports.obs_exists = (cont, skipCache) => (tag = undefined) => (filepath) => exports.obs_stat(cont, skipCache)(tag)(filepath)
    .pipe(operators_1.map((ret) => [!ret[0] && !!ret[1], ret[2], ret[3]]));
exports.obs_readdir = (cont) => (tag = undefined) => (filepath) => rxjs_1.from(cont.cloud.filesListFolder({ path: filepath }).then((files) => [
    undefined, files.map(e => path.basename(e.path_lower)), tag, filepath
], (err) => [
    err, undefined, tag, filepath
]));
// declare function obs_readFile_inner<T>(filepath: string): Observable<obs_readFile_result_inner<T, Buffer>>;
// declare function obs_readFile_inner<T>(filepath: string, encoding: string): Observable<obs_readFile_result_inner<T, string>>;
exports.obs_readFile = (cont) => (tag = undefined) => {
    function obs_readFile_inner(filepath, encoding) {
        return new rxjs_1.Observable(subs => {
            const cb = (err, data) => {
                subs.next([err, data, tag, filepath]);
                subs.complete();
            };
            cont.cloud.filesDownload({ path: filepath }).then(res => {
                var newbuff = buffer_1.Buffer.from(res.fileBuffer);
                cb(undefined, encoding ? newbuff.toString(encoding) : newbuff);
            }).catch(err => {
                console.error('readFile error %s', filepath, err);
                cb(err);
            });
        });
    }
    return obs_readFile_inner;
};
class CloudObject {
    constructor(client) {
        this.client = client;
        this.startup = true;
        this.requestStartCount = 0;
        this.requestFinishCount = 0;
        this.cache = {
            "/": { path_lower: "/", name: "" }
        };
        this.listedFolders = {};
    }
    resetCount() {
        this.requestStartCount = 0;
        this.requestFinishCount = 0;
    }
    filesGetMetadata(arg, skipCache) {
        if (typeof arg.path !== "string")
            throw new Error("empty path");
        if (this.cache[arg.path])
            return Promise.resolve(this.cache[arg.path]);
        let dirname = path.dirname(arg.path);
        let dircache = this.cache[dirname];
        let dirlist = dircache && this.listedFolders[dircache.path_lower];
        if (dircache && dirlist) {
            let item = dirlist.find(e => !!e.path_lower
                && common_1.contains(path.basename(arg.path), [path.basename(e.path_lower), e.name]));
            if (item)
                return Promise.resolve(item);
            else
                return Promise.reject("path_not_found");
        }
        this.requestStartCount++;
        //if neither then we retrieve the file
        return this.client.filesGetMetadata(arg).then(res => {
            this.cache[arg.path] = res;
            this.cache[res.path_lower] = res;
            this.requestFinishCount++;
            return res;
        }, (err) => {
            this.requestFinishCount++;
            throw err;
        });
    }
    filesListFolder(arg) {
        if (typeof arg.path !== "string")
            throw new Error("empty path");
        this.requestStartCount++;
        //cache uses arg.path since it is assumed that a cased path using getMetadata will also do a readdir
        //we can't meta the root folder so we need some token gymnastics to skip the cache
        return new Promise((resolve, reject) => {
            Promise.resolve(arg.path ? this.cache[arg.path] || this.client.filesGetMetadata({ path: arg.path }) : false).then(meta => {
                if (meta) {
                    this.cache[arg.path] = meta;
                    this.cache[meta.path_lower] = meta;
                }
                let cached = meta && this.listedFolders[meta.path_lower];
                if (this.startup && cached) {
                    this.requestStartCount--;
                    return resolve(cached);
                }
                else {
                    common_1.dbx_filesListFolder(this.client, arg).pipe(dumpToArray()).forEach(files => {
                        this.requestFinishCount++;
                        if (meta)
                            this.listedFolders[meta.path_lower] = files;
                        resolve(files);
                    }).catch((err) => {
                        this.requestFinishCount++;
                        reject(err);
                    });
                }
            });
        });
    }
    filesDownload(arg) {
        if (typeof arg.path !== "string")
            throw new Error("empty path");
        this.requestStartCount++;
        if (this.startup && this.cache[arg.path] && this.cache[arg.path].fileBuffer) {
            this.requestStartCount--;
            return Promise.resolve(this.cache[arg.path]);
        }
        return this.client.filesDownload(arg).then((res /* files.FileMetadata */) => {
            return fetch(URL.createObjectURL(res.fileBlob))
                .then((response) => response.arrayBuffer())
                .then((buff) => {
                this.requestFinishCount++;
                res.fileBuffer = buffer_1.Buffer.from(buff);
                if (this.startup) {
                    this.cache[arg.path] = res;
                    this.cache[res.path_lower] = res;
                }
                return res;
            });
        }, (err) => {
            this.requestFinishCount++;
            throw err;
        });
    }
    filesCreateFolder(arg) {
        if (typeof arg.path !== "string")
            throw new Error("empty path");
        return this.client.filesCreateFolder(arg).then((meta) => {
            meta[".tag"] = "folder";
            return meta;
        }).then((meta) => {
            this.cache[meta.path_lower] = meta;
            this.cache[arg.path] = meta;
        });
    }
}
CloudObject.tiddlyWebPlugin = {
    "title": "$:/plugins/tiddlywiki/tiddlyweb",
    "description": "TiddlyWeb and TiddlySpace components",
    "author": "JeremyRuston",
    "core-version": ">=5.0.0",
    "list": "readme",
    "version": "5.1.18-prerelease",
    "plugin-type": "plugin",
    "dependents": "",
    "type": "application/json",
    "text": '{ "tiddlers": {} }'
};
exports.CloudObject = CloudObject;
class Container {
    constructor(cloud) {
        this.cloud = cloud;
        // cloud: CloudObject
        this.wikidud = undefined;
        this.requests = new rxjs_1.Subject();
        // this.cloud = new CloudObject(client);
        this.requests.asObservable().pipe(operators_1.concatMap(([name, type, resolve]) => new rxjs_1.Observable(subs => {
            fetch("twits-5-1-17/" + type + "s/" + name + "/plugin.txt").then((res) => {
                if (res.status < 400)
                    return res.text().then(data => {
                        const split = data.indexOf('\n');
                        const meta = JSON.parse(data.slice(0, split)), text = data.slice(split + 2);
                        meta.text = text;
                        resolve(res);
                        subs.complete();
                    });
                else {
                    resolve(false);
                    subs.complete();
                }
            });
        }))).subscribe();
    }
    getNamedPlugin(name, type) {
        //if the tiddlyweb adapter is specified, return our own version of it
        if (type === "plugin" && name === "tiddlywiki/tiddlyweb")
            return Promise.resolve(CloudObject.tiddlyWebPlugin);
        else
            return new Promise(resolve => this.requests.next([name, type, resolve]));
    }
}
exports.Container = Container;
exports.ENV = window.env || {};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXN5bmMtZHJvcGJveC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImFzeW5jLWRyb3Bib3gudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFDQSwrQkFBOEc7QUFDOUcsOENBQW1GO0FBQ25GLDZCQUE2QjtBQUM3QixtQ0FBZ0M7QUFDaEMscUNBQXlEO0FBRXpEO0lBQ0MsTUFBTSxDQUFDLENBQUMsTUFBcUIsS0FBSyxNQUFNLENBQUMsSUFBSSxDQUFDLGtCQUFNLENBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQVMsQ0FBQyxDQUFDLENBQUM7QUFDOUcsQ0FBQztBQUZELGtDQUVDO0FBSUQ7SUFDQyxZQUFvQixJQUE2QjtRQUE3QixTQUFJLEdBQUosSUFBSSxDQUF5QjtJQUVqRCxDQUFDO0lBQ0QsTUFBTSxLQUFLLE1BQU0sQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFBQSxDQUFDO0lBQ3JELFdBQVcsS0FBSyxNQUFNLENBQUMsS0FBSyxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQSxDQUFDLENBQUM7SUFBQSxDQUFDO0lBQzNELGFBQWEsS0FBSyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztJQUNqQyxpQkFBaUIsS0FBSyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztJQUNyQyxjQUFjLEtBQUssTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7SUFDbEMsTUFBTSxLQUFLLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO0lBQzFCLFFBQVEsS0FBSyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztJQUM1QixJQUFJLEdBQUcsS0FBSyxNQUFNLGlCQUFpQixDQUFBLENB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