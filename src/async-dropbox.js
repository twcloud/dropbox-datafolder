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
function dbx_filesListFolder(client, arg) {
    return new rxjs_1.Observable((subs) => {
        function errHandler(err) {
            subs.error(err);
        }
        function resHandler(res) {
            res.entries.forEach(e => {
                subs.next(e);
            });
            if (res.has_more) {
                return client.filesListFolderContinue({
                    cursor: res.cursor
                }).then(resHandler, errHandler);
            }
            else {
                subs.complete();
            }
        }
        client.filesListFolder(arg).then(resHandler, errHandler);
    });
}
exports.dbx_filesListFolder = dbx_filesListFolder;
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
    constructor(client, folderPath) {
        this.client = client;
        this.folderPath = folderPath;
        this.startup = true;
        this.requestStartCount = 0;
        this.requestFinishCount = 0;
        this.cache = {};
        this.listedFolders = {};
    }
    resetCount() {
        this.requestStartCount = 0;
        this.requestFinishCount = 0;
    }
    filesGetMetadata(arg, skipCache) {
        if (!arg.path)
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
        if (!arg.path)
            throw new Error("empty path");
        this.requestStartCount++;
        //cache uses arg.path since it is assumed that a cased path using getMetadata will also do a readdir
        return new Promise((resolve, reject) => {
            Promise.resolve(this.cache[arg.path] || this.client.filesGetMetadata({ path: arg.path })).then(meta => {
                this.cache[arg.path] = meta;
                this.cache[meta.path_lower] = meta;
                let cached = this.listedFolders[meta.path_lower];
                if (this.startup && cached) {
                    this.requestStartCount--;
                    return resolve(cached);
                }
                else {
                    dbx_filesListFolder(this.client, arg).pipe(dumpToArray()).forEach(files => {
                        this.requestFinishCount++;
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
        if (!arg.path)
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
    constructor([client, path_lower]) {
        this.wikidud = undefined;
        this.requests = new rxjs_1.Subject();
        this.cloud = new CloudObject(client, path_lower);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXN5bmMtZHJvcGJveC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImFzeW5jLWRyb3Bib3gudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFDQSwrQkFBOEc7QUFDOUcsOENBQW1GO0FBQ25GLDZCQUE2QjtBQUM3QixtQ0FBZ0M7QUFDaEMscUNBQW9DO0FBRXBDO0lBQ0MsTUFBTSxDQUFDLENBQUMsTUFBcUIsS0FBSyxNQUFNLENBQUMsSUFBSSxDQUFDLGtCQUFNLENBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQVMsQ0FBQyxDQUFDLENBQUM7QUFDOUcsQ0FBQztBQUZELGtDQUVDO0FBRUQsNkJBQW9DLE1BQWUsRUFBRSxHQUF3QjtJQUM1RSxNQUFNLENBQUMsSUFBSSxpQkFBVSxDQUFvQixDQUFDLElBQUk7UUFDN0Msb0JBQW9CLEdBQWlDO1lBQ3BELElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDakIsQ0FBQztRQUNELG9CQUFvQixHQUEyQjtZQUM5QyxHQUFHLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDO2dCQUNwQixJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ2QsQ0FBQyxDQUFDLENBQUE7WUFDRixFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztnQkFDbEIsTUFBTSxDQUFDLE1BQU0sQ0FBQyx1QkFBdUIsQ0FBQztvQkFDckMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxNQUFNO2lCQUNsQixDQUFDLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxVQUFVLENBQUMsQ0FBQztZQUNqQyxDQUFDO1lBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ1AsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ2pCLENBQUM7UUFDRixD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