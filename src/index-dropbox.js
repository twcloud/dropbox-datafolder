"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dropbox_1 = require("dropbox");
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const path = require("path");
const buffer_1 = require("buffer");
const common_1 = require("./common");
const chooser_1 = require("./chooser");
const async_1 = require("./async");
function dumpToArray() {
    return (source) => source.pipe(operators_1.reduce((n, e) => { n.push(e); return n; }, []));
}
exports.dumpToArray = dumpToArray;
function getAppKey(type) {
    return (type === "full" ? "gy3j4gsa191p31x"
        : (type === "apps" ? "tu8jc7jsdeg55ta"
            : ""));
}
exports.getAppKey = getAppKey;
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
    static getItemType(a) {
        if (Stats.isFolderMetadata(a))
            return "folder";
        else if (common_1.contains(path.extname(a.path_lower), ["htm", "html"]))
            return "htmlfile";
        else if (a.name === "tiddlywiki.info")
            return "datafolder";
        else
            return "other";
    }
}
exports.Stats = Stats;
function DropboxError(err) {
    let error = new Error(err.error_summary);
    return error;
}
exports.obs_stat = (cont, skipCache) => (tag = undefined) => (filepath) => rxjs_1.from(cont.cloud.filesGetMetadata({ path: filepath }, skipCache || false)).pipe(operators_1.map(Stats.map), operators_1.map((stat) => [undefined, stat, tag, filepath]), operators_1.catchError((err, obs) => rxjs_1.of([err, undefined, tag, filepath])));
exports.obs_exists = (cont, skipCache) => (tag = undefined) => (filepath) => exports.obs_stat(cont, skipCache)(tag)(filepath)
    .pipe(operators_1.map((ret) => [!ret[0] && !!ret[1], ret[2], ret[3]]));
exports.obs_readdir = (cont) => (tag = undefined) => (filepath) => rxjs_1.from(cont.cloud.filesListFolder({ path: filepath }).then((files) => [
    undefined, files.map((e) => {
        return {
            fullpath: e.path_lower || '',
            basename: path.basename(e.path_lower || ''),
            name: e.name,
            type: Stats.getItemType(e)
        };
    }), tag, filepath
], (err) => [
    DropboxError(err), [], tag, filepath
]));
exports.obs_readFile = (cont) => (tag = undefined) => {
    function obs_readFile_inner(filepath, encoding) {
        return new rxjs_1.Observable(subs => {
            const cb = (err, data) => {
                subs.next([err && DropboxError(err), data, tag, filepath]);
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
        this.user = {};
        this.requestStartCount = 0;
        this.requestFinishCount = 0;
        this.cache = {
            "/": { path_lower: "/", name: "" }
        };
        this.listedFolders = {};
    }
    get photoUrl() { return this.user; }
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
                let cached = this.listedFolders[meta ? meta.path_lower : ""];
                if (this.startup && cached) {
                    this.requestStartCount--;
                    return resolve(cached);
                }
                else {
                    common_1.dbx_filesListFolder(this.client, arg).pipe(dumpToArray()).forEach(files => {
                        this.requestFinishCount++;
                        this.listedFolders[meta ? meta.path_lower : ""] = files;
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
        throw "Method not implemented";
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
    // cloud: CloudObject
    // wikidud: T = undefined as any;
    constructor(cloud) {
        this.cloud = cloud;
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
const ff = {
    obs_exists: exports.obs_exists, obs_readdir: exports.obs_readdir, obs_readFile: exports.obs_readFile, obs_stat: exports.obs_stat, ENV: exports.ENV
};
window.$tw = {
    boot: { suppressBoot: true, files: {} },
    preloadTiddlers: [
        { title: "$:/core/modules/savers/put.js", text: "" }
    ]
};
// Handle the search params and dropbox auth token
const url = new URL(location.href);
let options = {
    type: decodeURIComponent(url.searchParams.get('type') || ''),
    path: decodeURIComponent(url.searchParams.get('path') || ''),
    user: decodeURIComponent(url.searchParams.get('user') || '')
};
const OPTIONS_CACHE_KEY = "twits-options";
if (url.searchParams.get('source') === "oauth2") {
    //parse the oauth token
    options.token = {};
    let hashtoken = location.hash;
    if (hashtoken.startsWith("#"))
        hashtoken = hashtoken.slice(1);
    hashtoken.split('&').map((item) => {
        let part = item.split('=');
        options.token[part[0]] = decodeURIComponent(part[1]);
    });
    //parse the state, store everything, and redirect back to ?type=%type
    let { path, user, type, hash } = JSON.parse(decodeURIComponent(options.token.state) || '{}');
    if (type === options.type) {
        options.path = path;
        options.user = user;
    }
    if (!hash.startsWith("#"))
        hash = "#" + hash;
    sessionStorage.setItem(OPTIONS_CACHE_KEY, JSON.stringify(options));
    location.href = location.origin + location.pathname + "?type=" + options.type + hash;
}
else {
    let store = sessionStorage.getItem(OPTIONS_CACHE_KEY);
    sessionStorage.setItem(OPTIONS_CACHE_KEY, "");
    //if we have stored options, ignore anything else
    if (store)
        options = JSON.parse(store);
    options.hash = location.hash;
    if (options.type && !(options.token && options.token.access_token)) {
        if (options.type !== "full" && options.type !== "apps")
            throw "Invalid option type";
        var token = localStorage.getItem('twits-devtoken') || '';
        if (token)
            options.token = { access_token: token };
        else
            location.href = new dropbox_1.Dropbox({ clientId: getAppKey(options.type) }).getAuthenticationUrl(encodeURIComponent(location.origin + location.pathname + "?source=oauth2&type=" + options.type), encodeURIComponent(JSON.stringify({
                type: options.type,
                path: options.path,
                user: options.user,
                hash: options.hash
            })));
    }
}
//  = Promise.resolve([]);
if (options.type) {
    var cloud = new CloudObject(new dropbox_1.Dropbox({ clientId: getAppKey(options.type) }));
    cloud.client.setAccessToken(options.token.access_token);
    var preload = cloud.filesListFolder({ path: "" });
}
window.addEventListener('load', () => {
    if (!options.type) {
        var container = document.createElement('div');
        container.id = "twits-greeting";
        container.appendChild(chooser_1.Chooser.getHeaderElement());
        {
            var selector = document.createElement('div');
            selector.id = "twits-selector";
            selector.innerHTML = `
	<a class="access-full button" href="?type=full">Full Dropbox Access</a>
	<a class="access-apps button" href="?type=apps">Apps Folder Access</a>`;
            container.appendChild(selector);
        }
        container.appendChild(chooser_1.Chooser.getFooterElement());
        document.body.appendChild(container);
    }
    else {
        var container = document.createElement('div');
        container.id = 'twits-chooser';
        document.body.appendChild(container);
        var cont = new Container(cloud);
        var chooser = new chooser_1.Chooser(container, cont, ff, options);
        Promise.all([
            preload,
            cloud.client.usersGetCurrentAccount(undefined)
        ]).then(([files, _user]) => {
            cloud.user = _user;
            //update the chooser with the user info
            chooser.status = new common_1.StatusHandler(cloud.user.profile_photo_url || "");
            chooser.userInfo = {
                accountID: _user.account_id,
                profile_photo_url: _user.profile_photo_url || '',
                name: _user.name.display_name,
                orgInfo: _user.team && _user.team.name || ''
            };
            //check the url is for the current user
            if (options.user && cloud.user.account_id !== options.user) {
                alert('You are logged into a different dropbox account than the one specified in this link');
                delete options.user;
                delete options.path;
                delete options.type;
            }
            //check for a preload or load the chooser
            if (options.path)
                return Promise.resolve(options.path);
            else
                return new Promise(resolve => chooser.loadChooser(resolve));
        }).then((stat) => {
            container.style.display = "none";
            chooser.status.setStatusMessage("Loading...");
            cloud.filesDownload({ path: typeof stat === "string" ? stat : stat.fullpath })
                .then(stat => handleDatafolder(cloud, stat));
        });
    }
});
function handleDatafolder(cloud, stat) {
    // let cloud = chooser.cloud;
    const status = new common_1.StatusHandler("");
    async_1.override(window.$tw, new Container(cloud), ff);
    let clear = setInterval(() => {
        status.setStatusMessage(cloud.requestFinishCount + "/" + cloud.requestStartCount);
    }, 100);
    var folderPath = path.dirname(stat.path_lower);
    console.time('handleDatafolder');
    return cloud.filesListFolder({ path: folderPath }).then(files => {
        // for now let's not make any changes until I've tested everything
        // let index = files.findIndex(e => Stats.isFolderMetadata(e) && e.name === "tiddlers");
        // if (index === -1)
        // 	return chooser.cloud.filesCreateFolder({ path: path.join(folderPath, "tiddlers") }).catch(() => true)
        // else
        return Promise.resolve(true);
    }).then(() => {
        return new Promise(resolve => {
            console.timeEnd('handleDatafolder');
            console.time('tiddlywikiboot');
            window.$tw.boot.wikiPath = folderPath;
            window.$tw.boot.boot(resolve);
        });
    }).then(() => {
        console.timeEnd('tiddlywikiboot');
        clearInterval(clear);
        status.clearStatusMessage();
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXgtZHJvcGJveC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImluZGV4LWRyb3Bib3gudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSxxQ0FBbUU7QUFDbkUsK0JBQThHO0FBQzlHLDhDQUFtRjtBQUNuRiw2QkFBNkI7QUFDN0IsbUNBQWdDO0FBQ2hDLHFDQUF3RTtBQVd4RSx1Q0FBb0M7QUFDcEMsbUNBQW1DO0FBSW5DO0lBQ0MsTUFBTSxDQUFDLENBQUMsTUFBcUIsS0FBSyxNQUFNLENBQUMsSUFBSSxDQUM1QyxrQkFBTSxDQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFTLENBQUMsQ0FDN0QsQ0FBQztBQUNILENBQUM7QUFKRCxrQ0FJQztBQUlELG1CQUEwQixJQUFZO0lBQ3JDLE1BQU0sQ0FBQyxDQUFDLElBQUksS0FBSyxNQUFNLEdBQUcsaUJBQWlCO1VBQ3hDLENBQUMsSUFBSSxLQUFLLE1BQU0sR0FBRyxpQkFBaUI7Y0FDbkMsRUFBRSxDQUFDLENBQUMsQ0FBQztBQUNWLENBQUM7QUFKRCw4QkFJQztBQUNEO0lBQ0MsWUFBb0IsSUFBNkI7UUFBN0IsU0FBSSxHQUFKLElBQUksQ0FBeUI7SUFBSSxDQUFDO0lBQ3RELE1BQU0sS0FBSyxNQUFNLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQUEsQ0FBQztJQUNyRCxXQUFXLEtBQUssTUFBTSxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUEsQ0FBQyxDQUFDO0lBQUEsQ0FBQztJQUMzRCxhQUFhLEtBQUssTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7SUFDakMsaUJBQWlCLEtBQUssTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7SUFDckMsY0FBYyxLQUFLLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO0lBQ2xDLE1BQU0sS0FBSyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztJQUMxQixRQUFRLEtBQUssTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7SUFDNUIsSUFBSSxHQUFHLEtBQUssTUFBTSxpQkFBaUIsQ0FBQSxDQUFDLENBQUM7SUFBQSxDQUFDO0lBQ3RDLElBQUksR0FBRyxLQUFLLE1BQU0saUJBQWlCLENBQUEsQ0FBQyxDQUFDO0lBQUEsQ0FBQztJQUN0QyxJQUFJLElBQUksS0FBSyxNQUFNLGlCQUFpQixDQUFBLENBQUMsQ0FBQztJQUFBLENBQUM7SUFDdkMsSUFBSSxLQUFLLEtBQUssTUFBTSxpQkFBaUIsQ0FBQSxDQUFDLENBQUM7SUFBQSxDQUFDO0lBQ3hDLElBQUksR0FBRyxLQUFLLE1BQU0saUJBQWlCLENBQUEsQ0FBQyxDQUFDO0lBQUEsQ0FBQztJQUN0QyxJQUFJLEdBQUcsS0FBSyxNQUFNLGlCQUFpQixDQUFBLENBQUMsQ0FBQztJQUFBLENBQUM7SUFDdEMsSUFBSSxJQUFJLEtBQUssTUFBTSxpQkFBaUIsQ0FBQSxDQUFDLENBQUM7SUFBQSxDQUFDO0lBQ3ZDLElBQUksSUFBSSxLQUFLLE1BQU0sQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksR0FBRyxDQUFDLENBQUEsQ0FBQyxDQUFDO0lBQUEsQ0FBQztJQUMzRSxJQUFJLE9BQU8sS0FBSyxNQUFNLGlCQUFpQixDQUFBLENBQUMsQ0FBQztJQUFBLENBQUM7SUFDMUMsSUFBSSxNQUFNLEtBQUssTUFBTSxpQkFBaUIsQ0FBQSxDQUFDLENBQUM7SUFBQSxDQUFDO0lBQ3pDLElBQUksS0FBSyxLQUFLLE1BQU0sQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxHQUFHLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBLENBQUMsQ0FBQztJQUMxRyxJQUFJLEtBQUssS0FBSyxNQUFNLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsR0FBRyxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQSxDQUFDLENBQUM7SUFDMUcsSUFBSSxLQUFLLEtBQUssTUFBTSxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLEdBQUcsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUEsQ0FBQyxDQUFDO0lBQzFHLElBQUksU0FBUyxLQUFLLE1BQU0sQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxHQUFHLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBLENBQUMsQ0FBQztJQUM5RyxNQUFNLENBQUMsY0FBYyxDQUFDLENBQTBCO1FBQy9DLE1BQU0sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUssTUFBTSxDQUFDO0lBQzdCLENBQUM7SUFDRCxNQUFNLENBQUMsZ0JBQWdCLENBQUMsQ0FBMEI7UUFDakQsTUFBTSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxRQUFRLENBQUM7SUFDL0IsQ0FBQztJQUNELE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBMEI7UUFDcEMsTUFBTSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3JCLENBQUM7SUFDRCxNQUFNLENBQUMsV0FBVyxDQUFDLENBQTBCO1FBQzVDLEVBQUUsQ0FBQyxDQUFD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