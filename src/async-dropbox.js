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
            cont.cloud.filesDownload({ path: filepath }).then((data) => {
                return fetch(URL.createObjectURL(data.fileBlob));
            }).then(res => res.arrayBuffer()).then(buff => {
                var newbuff = buffer_1.Buffer.from(buff);
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
        this.requestStartCount++;
        // first we check for a previous stat of this file
        if (this.cache[arg.path])
            return Promise.resolve(this.cache[arg.path]);
        // next we check if the parent folder was already listed 
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
        //if neither then we retrieve the file
        return this.client.filesGetMetadata(arg).then(res => {
            this.cache[arg.path] = res;
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
                let cached = this.listedFolders[meta.path_lower];
                if (cached)
                    return resolve(cached);
                else
                    dbx_filesListFolder(this.client, arg).pipe(dumpToArray()).forEach(files => {
                        this.requestFinishCount++;
                        this.listedFolders[meta.path_lower] = files;
                        resolve(files);
                    }).catch((err) => {
                        this.requestFinishCount++;
                        reject(err);
                    });
            });
        });
    }
    filesDownload(arg) {
        if (!arg.path)
            throw new Error("empty path");
        this.requestStartCount++;
        // we could download the data folder as a zip and cache it that way
        return this.client.filesDownload(arg).then(res => {
            this.requestFinishCount++;
            // this.cache[res.path_lower as string] = res as any;
            return res;
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
    constructor([client]) {
        this.wikidud = undefined;
        this.cloud = new CloudObject(client);
    }
    getNamedPlugin(name, type) {
        //if the tiddlyweb adapter is specified, return our own version of it
        if (type === "plugin" && name === "tiddlywiki/tiddlyweb")
            return Promise.resolve(CloudObject.tiddlyWebPlugin);
        //otherwise fetch it from where it is stored
        return fetch("twits-5-1-17/" + type + "s/" + name + "/plugin.txt")
            .then(res => {
            if (res.status > 399)
                return false;
            else
                return res.text().then(data => {
                    const split = data.indexOf('\n');
                    const meta = JSON.parse(data.slice(0, split)), text = data.slice(split + 2);
                    meta.text = text;
                    return meta;
                });
        });
    }
}
exports.Container = Container;
exports.ENV = window.env || {};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXN5bmMtZHJvcGJveC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImFzeW5jLWRyb3Bib3gudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFDQSwrQkFBcUc7QUFDckcsOENBQXdFO0FBQ3hFLDZCQUE2QjtBQUM3QixtQ0FBZ0M7QUFDaEMscUNBQW9DO0FBRXBDO0lBQ0MsTUFBTSxDQUFDLENBQUMsTUFBcUIsS0FBSyxNQUFNLENBQUMsSUFBSSxDQUFDLGtCQUFNLENBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQVMsQ0FBQyxDQUFDLENBQUM7QUFDOUcsQ0FBQztBQUZELGtDQUVDO0FBRUQsNkJBQW9DLE1BQWUsRUFBRSxHQUF3QjtJQUM1RSxNQUFNLENBQUMsSUFBSSxpQkFBVSxDQUFvQixDQUFDLElBQUk7UUFDN0Msb0JBQW9CLEdBQWlDO1lBQ3BELElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDakIsQ0FBQztRQUNELG9CQUFvQixHQUEyQjtZQUM5QyxHQUFHLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDO2dCQUNwQixJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ2QsQ0FBQyxDQUFDLENBQUE7WUFDRixFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztnQkFDbEIsTUFBTSxDQUFDLE1BQU0sQ0FBQyx1QkFBdUIsQ0FBQztvQkFDckMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxNQUFNO2lCQUNsQixDQUFDLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxVQUFVLENBQUMsQ0FBQztZQUNqQyxDQUFDO1lBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ1AsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ2pCLENBQUM7UUFDRixD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