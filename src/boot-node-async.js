"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const rxjs_1 = require("rxjs");
const common_1 = require("./common");
const operators_1 = require("../node_modules/rxjs/operators");
const path = require("path");
const buffer_1 = require("buffer");
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
exports.obs_stat = (cloud, skipCache) => (tag = undefined) => (filepath) => rxjs_1.from(cloud.filesGetMetadata({ path: filepath }, skipCache || false))
    .pipe(operators_1.map(Stats.map))
    .pipe(operators_1.map((stat) => [undefined, stat, tag, filepath]), operators_1.catchError((err, obs) => {
    // console.error('stat error %s', filepath, err);
    return rxjs_1.of([err, undefined, tag, filepath]);
}));
exports.obs_exists = (cloud, skipCache) => (tag = undefined) => (filepath) => exports.obs_stat(cloud, skipCache)(tag)(filepath).pipe(operators_1.map((ret) => [!ret[0] && !!ret[1], ret[2], ret[3]]));
exports.obs_readdir = (cloud) => (tag = undefined) => (filepath) => cloud.filesListFolder({ path: filepath })
    .pipe(operators_1.map(files => [
    undefined,
    files.map(e => path.basename(e.path_lower)),
    tag, filepath
]), operators_1.catchError((err, obs) => {
    // console.error('readdir error %s', filepath, err);
    return rxjs_1.of([err, undefined, tag, filepath]);
}));
exports.obs_readFile = (cloud) => (tag = undefined) => ((filepath, encoding) => new rxjs_1.Observable(subs => {
    const cb = (err, data) => {
        subs.next([err, data, tag, filepath]);
        subs.complete();
    };
    cloud.filesDownload({ path: filepath }).then((data) => {
        return fetch(URL.createObjectURL(data.fileBlob));
    }).then(res => res.arrayBuffer()).then(buff => {
        var newbuff = buffer_1.Buffer.from(buff);
        cb(undefined, encoding ? newbuff.toString(encoding) : newbuff);
    }).catch(err => {
        console.error('readFile error %s', filepath, err);
        cb(err);
    });
}));
function obs_tw_each(obj) {
    return new rxjs_1.Observable(subs => {
        $tw.utils.each(obj, (item, index) => { subs.next([item, index]); });
        subs.complete();
    });
}
function loadTiddlersFromFile(filepath, fields) {
    var ext = path.extname(filepath), extensionInfo = $tw.utils.getFileExtensionInfo(ext), type = extensionInfo ? extensionInfo.type : null, typeInfo = type ? $tw.config.contentTypeInfo[type] : null;
    return exports.obs_readFile(this.cloud)()(filepath, typeInfo ? typeInfo.encoding : "utf8")
        .pipe(operators_1.mergeMap(([err, data]) => {
        if (err || !data) {
            console.log('Error reading file %s', filepath, err);
            return rxjs_1.empty();
        }
        var tiddlers = $tw.wiki.deserializeTiddlers(ext, data, fields);
        if (ext !== ".json" && tiddlers.length === 1) {
            return $tw.loadMetadataForFile(filepath).pipe(operators_1.map(metadata => {
                tiddlers = [$tw.utils.extend({}, tiddlers[0], metadata)];
                return { filepath: filepath, type: type, tiddlers: tiddlers, hasMetaFile: true };
            }));
        }
        else {
            return rxjs_1.of({ filepath: filepath, type: type, tiddlers: tiddlers, hasMetaFile: false });
        }
    }));
}
;
function loadMetadataForFile(filepath) {
    var metafilename = filepath + ".meta";
    return exports.obs_exists(this.cloud)()(metafilename)
        .pipe(operators_1.mergeMap(([exists]) => {
        if (exists)
            return exports.obs_readFile(this.cloud)()(metafilename, "utf8");
        else
            return rxjs_1.of([true]);
    }))
        .pipe(operators_1.map(([err, data]) => {
        if (err)
            return {};
        else
            return $tw.utils.parseFields(data);
    }));
}
;
function loadTiddlersFromPath(filepath, excludeRegExp = $tw.boot.excludeRegExp) {
    // excludeRegExp = excludeRegExp || ;
    return exports.obs_stat(this.cloud)()(filepath).pipe(operators_1.mergeMap(([err, stat]) => {
        if (err || !stat) {
            return rxjs_1.empty();
        }
        else if (!err && stat.isDirectory()) {
            return exports.obs_readdir(this.cloud)()(filepath).pipe(operators_1.mergeMap(([err, files]) => {
                if (err)
                    return rxjs_1.empty();
                if (files.indexOf("tiddlywiki.files") !== -1)
                    return $tw.loadTiddlersFromSpecification(filepath, excludeRegExp);
                else
                    return rxjs_1.from(files).pipe(operators_1.mergeMap(file => {
                        if (!excludeRegExp.test(file) && file !== "plugin.info") {
                            return $tw.loadTiddlersFromPath(filepath + path.sep + file, excludeRegExp);
                        }
                        else {
                            return rxjs_1.empty();
                        }
                    }));
            }));
        }
        else if (stat.isFile()) {
            return $tw.loadTiddlersFromFile(filepath, { title: filepath });
        }
        else {
            return rxjs_1.empty();
        }
    }));
}
;
function loadTiddlersFromSpecification(filepath, excludeRegExp) {
    var tiddlers = [];
    // Read the specification
    return exports.obs_readFile(this.cloud)()(filepath + path.sep + "tiddlywiki.files", "utf8").pipe(operators_1.map(([err, data]) => {
        if (err || !data)
            throw "error reading tiddlywiki.files in loadTiddlersFromSpecification";
        var filesInfo = JSON.parse(data);
        return rxjs_1.merge(
        // Process the listed tiddlers
        obs_tw_each(filesInfo.tiddlers).pipe(operators_1.mergeMap(([tidInfo]) => {
            if (tidInfo.prefix && tidInfo.suffix) {
                tidInfo.fields.text = { prefix: tidInfo.prefix, suffix: tidInfo.suffix };
            }
            else if (tidInfo.prefix) {
                tidInfo.fields.text = { prefix: tidInfo.prefix };
            }
            else if (tidInfo.suffix) {
                tidInfo.fields.text = { suffix: tidInfo.suffix };
            }
            return processFile(tidInfo.file, tidInfo.isTiddlerFile, tidInfo.fields);
        })), 
        // Process any listed directories
        obs_tw_each(filesInfo.directories).pipe(operators_1.mergeMap(([dirSpec]) => {
            // Read literal directories directly
            if (typeof dirSpec === "string") {
                var pathname = path.resolve(filepath, dirSpec);
                return exports.obs_stat(this.cloud)()(pathname).pipe(operators_1.mergeMap(([err, stat]) => {
                    if (!err && stat && stat.isDirectory())
                        return $tw.loadTiddlersFromPath(pathname, excludeRegExp);
                    else
                        return rxjs_1.empty();
                }));
            }
            else {
                // Process directory specifier
                var dirPath = path.resolve(filepath, dirSpec.path);
                return exports.obs_readdir(this.cloud)()(dirPath).pipe(operators_1.map(([err, files]) => {
                    var fileRegExp = new RegExp(dirSpec.filesRegExp || "^.*$"), metaRegExp = /^.*\.meta$/;
                    return rxjs_1.from(files).pipe(operators_1.mergeMap(filename => {
                        if (filename !== "tiddlywiki.files" && !metaRegExp.test(filename) && fileRegExp.test(filename)) {
                            return processFile(dirPath + path.sep + filename, dirSpec.isTiddlerFile, dirSpec.fields);
                        }
                        else {
                            return rxjs_1.empty();
                        }
                    }));
                }));
            }
        })));
    }));
    // Helper to process a file
    const processFile = (filename, isTiddlerFile, fields) => {
        var extInfo = $tw.config.fileExtensionInfo[path.extname(filename)], type = (extInfo || {}).type || fields.type || "text/plain", typeInfo = $tw.config.contentTypeInfo[type] || {}, pathname = path.resolve(filepath, filename);
        return rxjs_1.zip(exports.obs_readFile(this.cloud)()(pathname, typeInfo.encoding || "utf8"), $tw.loadMetadataForFile(pathname)).pipe(operators_1.mergeMap(([text, metadata]) => {
            var fileTiddlers;
            if (isTiddlerFile) {
                fileTiddlers = $tw.wiki.deserializeTiddlers(path.extname(pathname), text, metadata) || [];
            }
            else {
                fileTiddlers = [$tw.utils.extend({ text: text }, metadata)];
            }
            var combinedFields = $tw.utils.extend({}, fields, metadata);
            return obs_tw_each(fileTiddlers).pipe(operators_1.mergeMap((tiddler) => {
                return obs_tw_each(combinedFields).pipe(operators_1.mergeMap(([fieldInfo, name]) => {
                    if (typeof fieldInfo === "string" || $tw.utils.isArray(fieldInfo)) {
                        tiddler[name] = fieldInfo;
                        //this will signal immediate completion
                        return rxjs_1.empty();
                    }
                    else {
                        var value = tiddler[name];
                        //holds an arraylike or observable with exactly one item
                        var newValue = (() => {
                            switch (fieldInfo.source) {
                                case "filename":
                                    return [path.basename(filename)];
                                case "filename-uri-decoded":
                                    return [decodeURIComponent(path.basename(filename))];
                                case "basename":
                                    return [path.basename(filename, path.extname(filename))];
                                case "basename-uri-decoded":
                                    return [decodeURIComponent(path.basename(filename, path.extname(filename)))];
                                case "extname":
                                    return [path.extname(filename)];
                                case "created":
                                    return exports.obs_stat(this.cloud)()(pathname).pipe(operators_1.map(([err, stat]) => stat && new Date(stat.birthtime)));
                                case "modified":
                                    return exports.obs_stat(this.cloud)()(pathname).pipe(operators_1.map(([err, stat]) => stat && new Date(stat.mtime)));
                            }
                        })();
                        //here we ignore elements to capture observable completion
                        return rxjs_1.from(newValue).pipe(operators_1.map(value => {
                            if (fieldInfo.prefix) {
                                value = fieldInfo.prefix + value;
                            }
                            if (fieldInfo.suffix) {
                                value = value + fieldInfo.suffix;
                            }
                            tiddler[name] = value;
                        })).pipe(operators_1.ignoreElements());
                    }
                })).pipe(operators_1.reduce((n) => n, tiddler)); //we reduce this so the tiddler is eventually returned
            })).pipe(operators_1.reduce((n, e) => {
                n.tiddlers.push(e);
                return n;
            }, { tiddlers: [] }));
        }));
    };
}
function loadPluginFolder(filepath, excludeRegExp) {
    excludeRegExp = excludeRegExp || $tw.boot.excludeRegExp;
    var infoPath = filepath + path.sep + "plugin.info";
    return exports.obs_stat(this.cloud)()(filepath).pipe(operators_1.mergeMap(([err, stat]) => {
        if ((err) || (stat && !stat.isDirectory()))
            return rxjs_1.empty();
        return exports.obs_readFile(this.cloud)()(infoPath, "utf8").pipe(operators_1.mergeMap(([err, data]) => {
            if (err || !data) {
                console.log("Warning: missing plugin.info file in " + filepath);
                return rxjs_1.empty();
            }
            var pluginInfo = JSON.parse(data);
            pluginInfo.tiddlers = pluginInfo.tiddlers || Object.create(null);
            return $tw.loadTiddlersFromPath(filepath, excludeRegExp).pipe(common_1.dumpToArray(), operators_1.map(pluginFiles => {
                // Save the plugin tiddlers into the plugin info
                for (var f = 0; f < pluginFiles.length; f++) {
                    var tiddlers = pluginFiles[f].tiddlers;
                    for (var t = 0; t < tiddlers.length; t++) {
                        var tiddler = tiddlers[t];
                        if (tiddler.title) {
                            pluginInfo.tiddlers[tiddler.title] = tiddler;
                        }
                    }
                }
                // Give the plugin the same version number as the core if it doesn't have one
                if (!("version" in pluginInfo)) {
                    pluginInfo.version = $tw.packageInfo.version;
                }
                // Use "plugin" as the plugin-type if we don't have one
                if (!("plugin-type" in pluginInfo)) {
                    pluginInfo["plugin-type"] = "plugin";
                }
                pluginInfo.dependents = pluginInfo.dependents || [];
                pluginInfo.type = "application/json";
                // Set plugin text
                pluginInfo.text = JSON.stringify({ tiddlers: pluginInfo.tiddlers }, null, 4);
                delete pluginInfo.tiddlers;
                // Deserialise array fields (currently required for the dependents field)
                for (var field in pluginInfo) {
                    if ($tw.utils.isArray(pluginInfo[field])) {
                        pluginInfo[field] = $tw.utils.stringifyList(pluginInfo[field]);
                    }
                }
                return pluginInfo;
            }));
        }));
    }));
}
;
function findLibraryItem(name, paths) {
    return rxjs_1.from(paths).pipe(
    //add the plugin name to each path and check if it exists
    operators_1.map(e => path.resolve(e, "./" + name)), 
    //if we get an empty string we return a boolean for special processing
    operators_1.concatMap(pluginPath => exports.obs_stat(this.cloud)()(pluginPath)), 
    //find the correct path
    operators_1.reduce((n, e) => {
        const [err, stat, tag, pluginPath] = e;
        return (!n && (!err && stat && stat.isDirectory())) ? e : n;
    }), operators_1.map(([err, stat, tag, pluginPath]) => (pluginPath)));
}
;
function loadPlugin(name, paths, pluginType) {
    // first check the installed plugins then check the env directories
    return rxjs_1.from(this.cloud.getNamedPlugin(name, pluginType))
        .pipe(operators_1.mergeMap(pluginInfo => pluginInfo ? rxjs_1.of(pluginInfo) : $tw.findLibraryItem(name, paths)
        .pipe(operators_1.mergeMap(pluginPath => $tw.loadPluginFolder(pluginPath)))))
        .pipe(operators_1.tap(pluginInfo => $tw.wiki.addTiddler(pluginInfo)))
        .pipe(operators_1.ignoreElements());
}
;
function getLibraryItemSearchPaths(libraryPath, envVar) {
    var pluginPaths = [], env = window.env && window.env[envVar];
    if (env) {
        env.split(path.delimiter).map((item) => {
            if (item) {
                pluginPaths.push(item);
            }
        });
    }
    return pluginPaths;
}
;
function loadPlugins(plugins, libraryPath, envVar, type) {
    var pluginPaths = $tw.getLibraryItemSearchPaths(libraryPath, envVar);
    if (plugins)
        return rxjs_1.from(plugins).pipe(operators_1.mergeMap(plugin => $tw.loadPlugin(plugin, pluginPaths, type)));
    else
        return rxjs_1.empty();
}
function loadWikiTiddlers(wikiPath, options) {
    options = options || {};
    var parentPaths = options.parentPaths || [], wikiInfoPath = path.resolve(wikiPath, $tw.config.wikiInfo);
    return exports.obs_readFile(this.cloud)()(wikiInfoPath, "utf8").pipe(operators_1.mergeMap(([err, wikiInfoText]) => {
        if (err || !wikiInfoText)
            throw new Error("wiki info could not be read");
        var wikiInfo = JSON.parse(wikiInfoText);
        // Load the wiki files, registering them as writable
        var resolvedWikiPath = path.resolve(wikiPath, $tw.config.wikiTiddlersSubDir);
        // Save the original tiddler file locations if requested
        var config = wikiInfo.config || {};
        if (config["retain-original-tiddler-path"]) {
            var output = {}, relativePath;
            for (var title in $tw.boot.files) {
                relativePath = path.relative(resolvedWikiPath, $tw.boot.files[title].filepath);
                output[title] =
                    path.sep === path.posix.sep ?
                        relativePath :
                        relativePath.split(path.sep).join(path.posix.sep);
            }
            $tw.wiki.addTiddler({ title: "$:/config/OriginalTiddlerPaths", type: "application/json", text: JSON.stringify(output) });
        }
        // Save the path to the tiddlers folder for the filesystemadaptor
        $tw.boot.wikiTiddlersPath = path.resolve($tw.boot.wikiPath, config["default-tiddler-location"] || $tw.config.wikiTiddlersSubDir);
        parentPaths = parentPaths.slice(0);
        parentPaths.push(wikiPath);
        var loadIncludesObs = obs_tw_each((wikiInfo.includeWikis || []))
            .pipe(operators_1.mergeMap(([info]) => {
            if (typeof info === "string") {
                info = { path: info };
            }
            var resolvedIncludedWikiPath = path.resolve(wikiPath, info.path);
            if (parentPaths.indexOf(resolvedIncludedWikiPath) === -1) {
                return $tw.loadWikiTiddlers(resolvedIncludedWikiPath, {
                    parentPaths: parentPaths,
                    readOnly: true
                }).pipe(operators_1.map((subWikiInfo) => {
                    // Merge the build targets
                    wikiInfo.build = $tw.utils.extend([], subWikiInfo.build, wikiInfo.build);
                }));
            }
            else {
                $tw.utils.error("Cannot recursively include wiki " + resolvedIncludedWikiPath);
                return rxjs_1.empty();
            }
        }));
        var loadWiki = $tw.loadTiddlersFromPath(resolvedWikiPath).pipe(operators_1.tap((tiddlerFile) => {
            if (!options.readOnly && tiddlerFile.filepath) {
                $tw.utils.each(tiddlerFile.tiddlers, (tiddler) => {
                    $tw.boot.files[tiddler.title] = {
                        filepath: tiddlerFile.filepath,
                        type: tiddlerFile.type,
                        hasMetaFile: tiddlerFile.hasMetaFile
                    };
                });
            }
            $tw.wiki.addTiddlers(tiddlerFile.tiddlers);
        }), operators_1.ignoreElements());
        // Load any plugins within the wiki folder
        var loadWikiPlugins = rxjs_1.of(path.resolve(wikiPath, $tw.config.wikiPluginsSubDir), path.resolve(wikiPath, $tw.config.wikiThemesSubDir), path.resolve(wikiPath, $tw.config.wikiLanguagesSubDir)).pipe(operators_1.mergeMap(wpp => exports.obs_readdir(this.cloud)()(wpp)), operators_1.mergeMap(([err, pluginFolders, tag, wikiPluginsPath]) => {
            if (err)
                return rxjs_1.empty();
            return rxjs_1.from(pluginFolders).pipe(operators_1.mergeMap(folder => {
                return $tw.loadPluginFolder(path.resolve(wikiPluginsPath, "./" + folder));
            }), operators_1.tap(pluginFields => {
                $tw.wiki.addTiddler(pluginFields);
            }), operators_1.ignoreElements());
        }));
        return rxjs_1.concat(
        // Load includeWikis
        loadIncludesObs, 
        // Load any plugins, themes and languages listed in the wiki info file
        $tw.loadPlugins(wikiInfo.plugins, $tw.config.pluginsPath, $tw.config.pluginsEnvVar, "plugin"), $tw.loadPlugins(wikiInfo.themes, $tw.config.themesPath, $tw.config.themesEnvVar, "theme"), $tw.loadPlugins(wikiInfo.languages, $tw.config.languagesPath, $tw.config.languagesEnvVar, "language"), 
        // Load the wiki folder
        loadWiki, loadWikiPlugins).pipe(operators_1.reduce(n => n, wikiInfo));
    }));
}
;
function loadTiddlersNode() {
    // Load the boot tiddlers
    // $tw.loadTiddlersFromPath($tw.boot.bootPath)
    // 	.subscribe(tiddlerFile => $tw.wiki.addTiddlers(tiddlerFile.tiddlers));
    // Load the core tiddlers
    // $tw.loadPluginFolder($tw.boot.corePath)
    // 	.subscribe(pluginFolder => $tw.wiki.addTiddler(pluginFolder));
    // Load the tiddlers from the wiki directory
    return new Promise(resolve => {
        if ($tw.boot.wikiPath) {
            $tw.loadWikiTiddlers($tw.boot.wikiPath).subscribe((wikiInfo) => {
                $tw.boot.wikiInfo = wikiInfo;
                resolve();
            });
        }
    });
}
;
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
        let folder = path.dirname(arg.path);
        if (skipCache || (!this.listedFolders[folder] && !this.cache[arg.path])) {
            return this.client.filesGetMetadata(arg).then(res => {
                this.cache[arg.path] = res;
                this.requestFinishCount++;
                return res;
            }, (err) => {
                this.requestFinishCount++;
                throw err;
            });
        }
        else {
            // console.log(arg.path, folder, this.listedFolders, this.cache)
            this.requestStartCount--;
            if (this.listedFolders[folder]) {
                //find it by joining the folder name with the path_lower name of each item
                //since a readdir returns the basename of path_lower
                let index = this.listedFolders[folder].findIndex((e) => path.join(folder, path.basename(e.path_lower)) === arg.path);
                // console.log(folder, this.listedFolders[folder], arg.path);
                if (index === -1)
                    return Promise.reject("path_not_found");
                else
                    return Promise.resolve(this.listedFolders[folder][index]);
            }
            else if (this.cache[arg.path]) {
                return Promise.resolve(this.cache[arg.path]);
            }
            else {
                return Promise.reject("path_not_found");
            }
        }
    }
    filesListFolder(arg) {
        if (!arg.path)
            throw new Error("empty path");
        this.requestStartCount++;
        return common_1.dbx_filesListFolder(this.client, arg).pipe(operators_1.tap((item) => {
            this.cache[path.join(arg.path, path.basename(item.path_lower))] = item;
        }), common_1.dumpToArray(), operators_1.tap((res) => {
            let folder = this.cache[arg.path];
            console.log(folder, res);
            this.listedFolders[arg.path] = res;
            this.requestFinishCount++;
        }), operators_1.catchError((err, obs) => {
            this.requestFinishCount++;
            return rxjs_1.throwError(err);
        }));
    }
    filesDownload(arg) {
        if (!arg.path)
            throw new Error("empty path");
        this.requestStartCount++;
        return this.client.filesDownload(arg).then(res => {
            this.requestFinishCount++;
            this.cache[res.path_lower] = res;
            return res;
        }, (err) => {
            this.requestFinishCount++;
            throw err;
        });
    }
    getNamedPlugin(name, type) {
        if (type === "plugin" && name === "tiddlywiki/tiddlyweb")
            return Promise.resolve({
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
            });
        return fetch("/assets/tiddlywiki/" + type + "/" + encodeURIComponent(name))
            .then(res => {
            if (res.status > 399)
                return false;
            else
                return res.text().then(data => {
                    // console.log(data);
                    const split = data.indexOf('\n');
                    const meta = JSON.parse(data.slice(0, split)), text = data.slice(split + 2);
                    console.log(split, meta);
                    //don't import the tiddlyweb plugin ()
                    meta.text = text;
                    // if (!text) console.log('no text', data, split, meta, text);
                    return meta;
                });
        });
    }
}
exports.CloudObject = CloudObject;
function override($tw, client) {
    const container = {
        cloud: new CloudObject(client)
    };
    $tw.findLibraryItem = findLibraryItem.bind(container);
    $tw.getLibraryItemSearchPaths = getLibraryItemSearchPaths.bind(container);
    $tw.loadMetadataForFile = loadMetadataForFile.bind(container);
    $tw.loadPlugin = loadPlugin.bind(container);
    $tw.loadPluginFolder = loadPluginFolder.bind(container);
    $tw.loadPlugins = loadPlugins.bind(container);
    $tw.loadTiddlersFromFile = loadTiddlersFromFile.bind(container);
    $tw.loadTiddlersFromPath = loadTiddlersFromPath.bind(container);
    $tw.loadTiddlersFromSpecification = loadTiddlersFromSpecification.bind(container);
    $tw.loadWikiTiddlers = loadWikiTiddlers.bind(container);
    $tw.loadTiddlersNode = loadTiddlersNode.bind(container);
    $tw.boot.excludeRegExp = $tw.boot.excludeRegExp || /^\.DS_Store$|^.*\.meta$|^\..*\.swp$|^\._.*$|^\.git$|^\.hg$|^\.lock-wscript$|^\.svn$|^\.wafpickle-.*$|^CVS$|^npm-debug\.log$/;
    return container.cloud;
}
exports.override = override;
