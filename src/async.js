"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// import { files, Dropbox, Error } from 'dropbox';
const rxjs_1 = require("rxjs");
// import { dbx_filesListFolder, GetMetadataResult, dumpToArray, TiddlyWikiInfo } from '../src/common';
const operators_1 = require("rxjs/operators");
const path = require("path");
const async_dropbox_1 = require("./async-dropbox");
function tlog(a) {
    console.log(a);
    return a;
}
function startup_patch($tw, options = {}) {
    $tw.crypto = new $tw.utils.Crypto();
    // options = options || {};
    // Get the URL hash and check for safe mode
    $tw.locationHash = "#";
    if ($tw.browser && !$tw.node) {
        if (location.hash === "#:safe") {
            $tw.safeMode = true;
        }
        else {
            $tw.locationHash = $tw.utils.getLocationHash();
        }
    }
    // Initialise some more $tw properties
    $tw.utils.deepDefaults($tw, {
        modules: {
            titles: Object.create(null),
            types: {} // hashmap by module type of hashmap of exports
        },
        config: {
            pluginsPath: "../plugins/",
            themesPath: "../themes/",
            languagesPath: "../languages/",
            editionsPath: "../editions/",
            wikiInfo: "./tiddlywiki.info",
            wikiPluginsSubDir: "./plugins",
            wikiThemesSubDir: "./themes",
            wikiLanguagesSubDir: "./languages",
            wikiTiddlersSubDir: "./tiddlers",
            wikiOutputSubDir: "./output",
            jsModuleHeaderRegExpString: "^\\/\\*\\\\(?:\\r?\\n)((?:^[^\\r\\n]*(?:\\r?\\n))+?)(^\\\\\\*\\/$(?:\\r?\\n)?)",
            fileExtensionInfo: Object.create(null),
            contentTypeInfo: Object.create(null),
            pluginsEnvVar: "TIDDLYWIKI_PLUGIN_PATH",
            themesEnvVar: "TIDDLYWIKI_THEME_PATH",
            languagesEnvVar: "TIDDLYWIKI_LANGUAGE_PATH",
            editionsEnvVar: "TIDDLYWIKI_EDITION_PATH"
        },
        log: {},
        unloadTasks: []
    });
    if (!$tw.boot.tasks.readBrowserTiddlers) {
        // For writable tiddler files, a hashmap of title to {filepath:,type:,hasMetaFile:}
        $tw.boot.files = Object.create(null);
        // System paths and filenames
        $tw.boot.bootPath = options.bootPath || path.dirname(module.filename);
        $tw.boot.corePath = path.resolve($tw.boot.bootPath, "../core");
        // If there's no arguments then default to `--help`
        if ($tw.boot.argv.length === 0) {
            $tw.boot.argv = ["--help"];
        }
        // If the first command line argument doesn't start with `--` then we
        // interpret it as the path to the wiki folder, which will otherwise default
        // to the current folder
        if ($tw.boot.argv[0] && $tw.boot.argv[0].indexOf("--") !== 0) {
            $tw.boot.wikiPath = $tw.boot.argv[0];
            $tw.boot.argv = $tw.boot.argv.slice(1);
        }
        else {
            $tw.boot.wikiPath = process.cwd();
        }
        // Read package info
        $tw.packageInfo = $tw.packageInfo || require("../twits-5-1-17/package.json");
        // Check node version number
        if (!$tw.utils.checkVersions(process.version.substr(1), $tw.packageInfo.engines.node.substr(2))) {
            $tw.utils.error("TiddlyWiki5 requires node.js version " + $tw.packageInfo.engines.node);
        }
    }
    // Add file extension information
    $tw.utils.registerFileType("text/vnd.tiddlywiki", "utf8", ".tid");
    $tw.utils.registerFileType("application/x-tiddler", "utf8", ".tid");
    $tw.utils.registerFileType("application/x-tiddlers", "utf8", ".multids");
    $tw.utils.registerFileType("application/x-tiddler-html-div", "utf8", ".tiddler");
    $tw.utils.registerFileType("text/vnd.tiddlywiki2-recipe", "utf8", ".recipe");
    $tw.utils.registerFileType("text/plain", "utf8", ".txt");
    $tw.utils.registerFileType("text/css", "utf8", ".css");
    $tw.utils.registerFileType("text/html", "utf8", [".html", ".htm"]);
    $tw.utils.registerFileType("application/hta", "utf16le", ".hta", { deserializerType: "text/html" });
    $tw.utils.registerFileType("application/javascript", "utf8", ".js");
    $tw.utils.registerFileType("application/json", "utf8", ".json");
    $tw.utils.registerFileType("application/pdf", "base64", ".pdf", { flags: ["image"] });
    $tw.utils.registerFileType("application/zip", "base64", ".zip");
    $tw.utils.registerFileType("image/jpeg", "base64", [".jpg", ".jpeg"], { flags: ["image"] });
    $tw.utils.registerFileType("image/png", "base64", ".png", { flags: ["image"] });
    $tw.utils.registerFileType("image/gif", "base64", ".gif", { flags: ["image"] });
    $tw.utils.registerFileType("image/svg+xml", "utf8", ".svg", { flags: ["image"] });
    $tw.utils.registerFileType("image/x-icon", "base64", ".ico", { flags: ["image"] });
    $tw.utils.registerFileType("application/font-woff", "base64", ".woff");
    $tw.utils.registerFileType("application/x-font-ttf", "base64", ".woff");
    $tw.utils.registerFileType("audio/ogg", "base64", ".ogg");
    $tw.utils.registerFileType("video/mp4", "base64", ".mp4");
    $tw.utils.registerFileType("audio/mp3", "base64", ".mp3");
    $tw.utils.registerFileType("audio/mp4", "base64", [".mp4", ".m4a"]);
    $tw.utils.registerFileType("text/markdown", "utf8", [".md", ".markdown"], { deserializerType: "text/x-markdown" });
    $tw.utils.registerFileType("text/x-markdown", "utf8", [".md", ".markdown"]);
    $tw.utils.registerFileType("application/enex+xml", "utf8", ".enex");
    $tw.utils.registerFileType("application/vnd.openxmlformats-officedocument.wordprocessingml.document", "base64", ".docx");
    $tw.utils.registerFileType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "base64", ".xlsx");
    $tw.utils.registerFileType("application/vnd.openxmlformats-officedocument.presentationml.presentation", "base64", ".pptx");
    $tw.utils.registerFileType("application/x-bibtex", "utf8", ".bib");
    $tw.utils.registerFileType("application/epub+zip", "base64", ".epub");
    // Create the wiki store for the app
    $tw.wiki = new $tw.Wiki();
    // Install built in tiddler fields modules
    $tw.Tiddler.fieldModules = $tw.modules.getModulesByTypeAsHashmap("tiddlerfield");
    // Install the tiddler deserializer modules
    $tw.Wiki.tiddlerDeserializerModules = Object.create(null);
    $tw.modules.applyMethods("tiddlerdeserializer", $tw.Wiki.tiddlerDeserializerModules);
}
exports.startup_patch = startup_patch;
function override(_$tw, ...args) {
    var $tw = _$tw;
    function obs_tw_each(obj) {
        return new rxjs_1.Observable(subs => {
            $tw.utils.each(obj, (item, index) => { subs.next([item, index]); });
            subs.complete();
        });
    }
    const isArray = Array.isArray;
    function loadTiddlersFromFile(filepath, fields) {
        //get the type info for this extension
        var ext = path.extname(filepath), extensionInfo = $tw.utils.getFileExtensionInfo(ext), type = extensionInfo ? extensionInfo.type : null, typeInfo = type ? $tw.config.contentTypeInfo[type] : null;
        //read the file without checking if it exists
        return async_dropbox_1.obs_readFile(this)()(filepath, typeInfo ? typeInfo.encoding : "utf8").pipe(
        //parse the tiddlers in the file
        operators_1.tap(([err]) => { if (err) {
            throw err;
        } }), operators_1.map(([err, data]) => $tw.wiki.deserializeTiddlers(ext, data, fields)), operators_1.mergeMap(tiddlers => 
        //if there is exactly one tiddler and it isn't a json file, load the metadata
        ((ext !== ".json" && tiddlers.length === 1) ? $tw.loadMetadataForFile(filepath) : rxjs_1.of(false)).pipe(operators_1.map(metadata => {
            //if there is metadata, add it to the tiddlers array
            if (metadata)
                tiddlers = [$tw.utils.extend({}, tiddlers[0], metadata)];
            //return the TiddlerFileInfo
            return { filepath, type, tiddlers, hasMetaFile: !!metadata };
        }))));
    }
    /**
     * Load the metadata fields in the .meta file corresponding to a particular file.
     * Emits the parsed meta fields or emits false if the meta file does not exist.
     * Uses obs_exists to check if the file exists before reading it.
     * @param this
     * @param filepath Path to check for a .meta file for.
     */
    function loadMetadataForFile(filepath) {
        return async_dropbox_1.obs_exists(this)()(filepath + ".meta").pipe(operators_1.mergeMap(([exists, tag, metafilename]) => exists ? async_dropbox_1.obs_readFile(this)()(metafilename, "utf8") : rxjs_1.of(false)), operators_1.map((data) => data && $tw.utils.parseFields(data[1])));
    }
    function loadTiddlersFromPath(filepath, excludeRegExp = $tw.boot.excludeRegExp) {
        //stat the filepath
        return async_dropbox_1.obs_stat(this)()(filepath).pipe(operators_1.mergeMap(([err, stat, tag]) => !!err ? rxjs_1.empty() : (stat.isDirectory())
            ? async_dropbox_1.obs_readdir(this)()(filepath).pipe(
            //check for a tiddlywiki.files file in the folder
            operators_1.mergeMap(([err, files]) => (files.indexOf("tiddlywiki.files") !== -1)
                ? $tw.loadTiddlersFromSpecification(filepath, excludeRegExp)
                : rxjs_1.from(files.filter(file => !excludeRegExp.test(file) && file !== "plugin.info"))
                    .pipe(operators_1.mergeMap(file => $tw.loadTiddlersFromPath(filepath + path.sep + file, excludeRegExp)))))
            : ((stat.isFile()) ? $tw.loadTiddlersFromFile(filepath, { title: filepath }) : rxjs_1.empty())));
    }
    /**
     * This very crazy function should actually be the correct translation of processfile
     */
    function loadTiddlersFromSpecification(filepath, excludeRegExp) {
        function ProcessFile(self, filepath) {
            function getFieldValue(tiddler, name, fieldInfo, filename, pathname) {
                var value = tiddler[name];
                switch (fieldInfo.source) {
                    case "filename":
                        return rxjs_1.of(path.basename(filename));
                    case "filename-uri-decoded":
                        return rxjs_1.of(decodeURIComponent(path.basename(filename)));
                    case "basename":
                        return rxjs_1.of(path.basename(filename, path.extname(filename)));
                    case "basename-uri-decoded":
                        return rxjs_1.of(decodeURIComponent(path.basename(filename, path.extname(filename))));
                    case "extname":
                        return rxjs_1.of(path.extname(filename));
                    case "created":
                        return async_dropbox_1.obs_stat(self)()(pathname).pipe(operators_1.map(([err, stat]) => new Date(stat.birthtime)));
                    case "modified":
                        return async_dropbox_1.obs_stat(self)()(pathname).pipe(operators_1.map(([err, stat]) => new Date(stat.mtime)));
                    default:
                        return rxjs_1.of(value);
                }
            }
            return (source) => source.pipe(operators_1.mergeMap(({ filename, isTiddlerFile, fields }) => {
                var extInfo = $tw.config.fileExtensionInfo[path.extname(filename)], type = (extInfo || {}).type || fields.type || "text/plain", typeInfo = $tw.config.contentTypeInfo[type] || {}, pathname = path.resolve(filepath, filename);
                return rxjs_1.zip(async_dropbox_1.obs_readFile(self)()(pathname, typeInfo.encoding || "utf8"), $tw.loadMetadataForFile(pathname)).pipe(
                //if there is an error reading the file, then throw it
                operators_1.tap(([[err]]) => { if (err)
                    throw err; }), 
                //deserialize and combine the result
                operators_1.map(([[err, text], metadata]) => [
                    ((isTiddlerFile)
                        ? ($tw.wiki.deserializeTiddlers(path.extname(pathname), text, metadata))
                        : ([$tw.utils.extend({ text }, metadata || {})])),
                    $tw.utils.extend({}, fields, metadata || {})
                ]), 
                //process the product of the two variables
                operators_1.mergeMap(([fileTiddlers, combinedFields]) => obs_tw_each(fileTiddlers).pipe(operators_1.mergeMap(([tiddler]) => obs_tw_each(combinedFields).pipe(operators_1.mergeMap(([fieldInfo, name]) => (typeof fieldInfo === "string" || $tw.utils.isArray(fieldInfo))
                    ? rxjs_1.of([fieldInfo, name])
                    : getFieldValue(tiddler, name, fieldInfo, filename, pathname)
                        .pipe(operators_1.map(value => [(fieldInfo.prefix || "") + value + (fieldInfo.suffix || ""), name]))), 
                // assign the resulting value to the tiddler
                operators_1.tap(([value, name]) => { tiddler[name] = value; }))), 
                //count will only emit once the fileTiddlers have been processed
                operators_1.count(), 
                //once we're done, 
                operators_1.mapTo({ tiddlers: fileTiddlers }))));
            }));
        }
        return async_dropbox_1.obs_readFile(this)()(filepath + path.sep + "tiddlywiki.files", "utf8").pipe(operators_1.map(([err, data]) => {
            if (err || !data)
                throw "Error reading tiddlywiki.files";
            return JSON.parse(data);
        }), operators_1.mergeMap((filesInfo) => rxjs_1.concat(
        //first load the specified tiddlers
        obs_tw_each(filesInfo.tiddlers).pipe(operators_1.map(([tidInfo]) => {
            const { file: filename, isTiddlerFile, fields } = tidInfo;
            if (tidInfo.prefix && tidInfo.suffix) {
                tidInfo.fields.text = { prefix: tidInfo.prefix, suffix: tidInfo.suffix };
            }
            else if (tidInfo.prefix) {
                tidInfo.fields.text = { prefix: tidInfo.prefix };
            }
            else if (tidInfo.suffix) {
                tidInfo.fields.text = { suffix: tidInfo.suffix };
            }
            return { filename, isTiddlerFile, fields };
        }), ProcessFile(this, filepath)), 
        //then load the specified directories
        obs_tw_each(filesInfo.directories).pipe(operators_1.mergeMap(([dirSpec]) => {
            if (typeof dirSpec === "string") {
                //if the dirSpec is a string, we load the path
                return async_dropbox_1.obs_stat(this)(dirSpec)(path.resolve(filepath, dirSpec))
                    .pipe(operators_1.mergeMap(([err, stat, dirSpec, pathname]) => (!err && stat.isDirectory()) ? $tw.loadTiddlersFromPath(pathname, excludeRegExp) : rxjs_1.empty()));
            }
            else {
                //if it is an object there is more to the story
                const fileRegExp = new RegExp(dirSpec.filesRegExp || "^.*$"), metaRegExp = /^.*\.meta$/;
                const dirPath = path.resolve(filepath, dirSpec.path);
                const { isTiddlerFile, fields } = dirSpec;
                return async_dropbox_1.obs_readdir(this)()(dirPath).pipe(
                //filter the list of files to only load the valid ones
                operators_1.mergeMap(([err, files, tag, dirPath]) => rxjs_1.from(files.filter(filename => filename !== "tiddlywiki.files" && !metaRegExp.test(filename) && fileRegExp.test(filename)))), 
                //map each file to the processFile input arguments
                operators_1.map(filename => { return { filename: dirPath + path.sep + filename, isTiddlerFile, fields }; }), 
                //process the file to get the tiddlers from it
                ProcessFile(this, filepath));
            }
        })))));
    }
    function loadPluginFolder(filepath_source, excludeRegExp = $tw.boot.excludeRegExp) {
        return filepath_source.pipe(
        //if no plugin is found, the source will emit an empty string
        operators_1.mergeMap(filepath => !filepath ? rxjs_1.empty() : rxjs_1.zip(async_dropbox_1.obs_stat(this)()(filepath), async_dropbox_1.obs_stat(this)()(filepath + path.sep + "plugin.info"))), 
        //check the stats and return empty if we aren't loading anything
        operators_1.mergeMap(([[err1, stat1, tag1, filepath], [err2, stat2, tag2, infoPath]]) => {
            if (err1 || !stat1.isDirectory())
                return rxjs_1.empty();
            if (err2 || !stat2.isFile()) {
                console.log("Warning: missing plugin.info file in " + filepath);
                return rxjs_1.empty();
            }
            return async_dropbox_1.obs_readFile(this)(filepath)(infoPath, "utf8");
        }), 
        //parse the plugin info and load the folder
        operators_1.mergeMap(([err, plugindata, filepath]) => {
            //here we throw because this should not happen
            if (err || !plugindata)
                throw new Error("Error: missing plugin.info file in " + filepath);
            const pluginInfo = JSON.parse(plugindata);
            pluginInfo.tiddlers = pluginInfo.tiddlers || Object.create(null);
            return $tw.loadTiddlersFromPath(filepath, excludeRegExp).pipe(operators_1.tap(pluginFile => {
                pluginFile.tiddlers.forEach(tiddler => {
                    pluginInfo.tiddlers[tiddler.title] = tiddler;
                });
            }), 
            //wait until all the tiddlers have been loaded
            operators_1.count(), 
            //finish processing the pluginInfo file
            operators_1.map(() => {
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
    }
    function findLibraryItem(name, paths) {
        return rxjs_1.from(paths.map(e => path.resolve(e, "./" + name))).pipe(operators_1.mergeMap(pluginPath => async_dropbox_1.obs_stat(this)()(pluginPath)), operators_1.find(e => !e[0] && e[1].isDirectory()), operators_1.map(res => res && res[3]));
    }
    function loadPlugin(name, paths, pluginType) {
        return rxjs_1.from(this.getNamedPlugin(name, pluginType)).pipe(operators_1.mergeMap(pluginInfo => pluginInfo ? rxjs_1.of(pluginInfo) : $tw.loadPluginFolder($tw.findLibraryItem(name, paths))), operators_1.tap(pluginInfo => $tw.wiki.addTiddler(pluginInfo)), operators_1.ignoreElements());
    }
    function getLibraryItemSearchPaths(libraryPath, envVar) {
        var pluginPaths = [], env = async_dropbox_1.ENV[envVar];
        if (env)
            env.split(path.delimiter).map((item) => { if (item)
                pluginPaths.push(item); });
        return pluginPaths;
    }
    function loadPlugins(plugins, libraryPath, envVar, type) {
        var pluginPaths = $tw.getLibraryItemSearchPaths(libraryPath, envVar);
        if (plugins)
            return rxjs_1.from(plugins).pipe(operators_1.mergeMap(plugin => $tw.loadPlugin(plugin, pluginPaths, type)));
        else
            return rxjs_1.empty();
    }
    function loadWikiTiddlers(wikiPath, options = {}) {
        var parentPaths = options.parentPaths || [];
        return async_dropbox_1.obs_readFile(this)()(path.resolve(wikiPath, $tw.config.wikiInfo), "utf8").pipe(operators_1.map(([err, data, t, wikiInfoPath]) => {
            if (err || !data)
                throw "Error loading the " + $tw.config.wikiInfo + " file";
            else
                return JSON.parse(data);
        }), operators_1.mergeMap(wikiInfo => {
            parentPaths = parentPaths.slice(0);
            parentPaths.push(wikiPath);
            const includeWikis = obs_tw_each(wikiInfo.includeWikis).pipe(operators_1.map(([info]) => path.resolve(wikiPath, typeof info === "object" ? info.path : info)), operators_1.mergeMap((resolvedIncludedWikiPath) => {
                if (parentPaths.indexOf(resolvedIncludedWikiPath) === -1) {
                    return $tw.loadWikiTiddlers(resolvedIncludedWikiPath, {
                        parentPaths: parentPaths,
                        readOnly: true
                    }).pipe(operators_1.tap((subWikiInfo) => {
                        wikiInfo.build = $tw.utils.extend([], subWikiInfo.build, wikiInfo.build);
                    }), operators_1.ignoreElements());
                }
                else {
                    $tw.utils.error("Cannot recursively include wiki " + resolvedIncludedWikiPath);
                    return rxjs_1.empty();
                }
            }));
            var resolvedWikiPath = path.resolve(wikiPath, $tw.config.wikiTiddlersSubDir);
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
            }), operators_1.count(), operators_1.map(() => {
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
            }), operators_1.ignoreElements());
            // Load any plugins within the wiki folder
            var loadWikiPlugins = rxjs_1.of(["plugins", path.resolve(wikiPath, $tw.config.wikiPluginsSubDir)], ["themes", path.resolve(wikiPath, $tw.config.wikiThemesSubDir)], ["languages", path.resolve(wikiPath, $tw.config.wikiLanguagesSubDir)]).pipe(operators_1.mergeMap(([type, wpp]) => async_dropbox_1.obs_exists(this)(type)(wpp)), operators_1.mergeMap(([exists, type, wpp]) => exists ? async_dropbox_1.obs_readdir(this)(type)(wpp) : rxjs_1.empty()), operators_1.mergeMap(([err, pluginFolders, pluginType, wikiPluginsPath]) => err ? rxjs_1.empty() : rxjs_1.from(pluginFolders).pipe(operators_1.mergeMap(folder => $tw.loadPluginFolder(rxjs_1.of(path.resolve(wikiPluginsPath, "./" + folder)))), operators_1.tap(pluginFields => $tw.wiki.addTiddler(pluginFields)), operators_1.ignoreElements())));
            return rxjs_1.concat(includeWikis, rxjs_1.merge(// Load any plugins, themes and languages listed in the wiki info file
            $tw.loadPlugins(wikiInfo.plugins, $tw.config.pluginsPath, $tw.config.pluginsEnvVar, "plugin"), $tw.loadPlugins(wikiInfo.themes, $tw.config.themesPath, $tw.config.themesEnvVar, "theme"), $tw.loadPlugins(wikiInfo.languages, $tw.config.languagesPath, $tw.config.languagesEnvVar, "language")), loadWiki, loadWikiPlugins).pipe(operators_1.count(), operators_1.mapTo(wikiInfo));
        }));
    }
    function loadTiddlersNode() {
        // Load the boot tiddlers
        return $tw.loadWikiTiddlers($tw.boot.wikiPath).forEach(wikiInfo => {
            $tw.boot.wikiInfo = wikiInfo;
        });
        // return merge(
        // 	$tw.loadTiddlersFromPath($tw.boot.bootPath).pipe(tap(tiddlerFile =>
        // 		$tw.wiki.addTiddlers(tiddlerFile.tiddlers)
        // 	)),
        // 	$tw.loadPluginFolder(of($tw.boot.corePath)).pipe(tap(pluginInfo =>
        // 		$tw.wiki.addTiddler(pluginInfo)
        // 	)),
        // 	$tw.loadWikiTiddlers($tw.boot.wikiPath).pipe(tap(wikiInfo =>
        // 		$tw.boot.wikiInfo = wikiInfo
        // 	))
        // ).pipe(ignoreElements())
    }
    // =======================================================
    const container = new async_dropbox_1.Container(args);
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
    return container;
}
exports.override = override;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXN5bmMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJhc3luYy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLG1EQUFtRDtBQUNuRCwrQkFBcUg7QUFDckgsdUdBQXVHO0FBQ3ZHLDhDQUd3QjtBQUN4Qiw2QkFBNkI7QUFHN0IsbURBQWtHO0FBTWxHLGNBQWlCLENBQUk7SUFDcEIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNmLE1BQU0sQ0FBQyxDQUFDLENBQUM7QUFDVixDQUFDO0FBS0QsdUJBQThCLEdBQVEsRUFBRSxVQUFlLEVBQUU7SUFDeEQsR0FBRyxDQUFDLE1BQU0sR0FBRyxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUM7SUFDcEMsMkJBQTJCO0lBQzNCLDJDQUEyQztJQUMzQyxHQUFHLENBQUMsWUFBWSxHQUFHLEdBQUcsQ0FBQztJQUN2QixFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDOUIsRUFBRSxDQUFDLENBQUMsUUFBUSxDQUFDLElBQUksS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDO1lBQ2hDLEdBQUcsQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDO1FBQ3JCLENBQUM7UUFBQyxJQUFJLENBQUMsQ0FBQztZQUNQLEdBQUcsQ0FBQyxZQUFZLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxlQUFlLEVBQUUsQ0FBQztRQUNoRCxDQUFDO0lBQ0YsQ0FBQztJQUNELHNDQUFzQztJQUN0QyxHQUFHLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxHQUFHLEVBQUU7UUFDM0IsT0FBTyxFQUFFO1lBQ1IsTUFBTSxFQUFFLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDO1lBQzNCLEtBQUssRUFBRSxFQUFFLENBQUMsK0NBQStDO1NBQ3pEO1FBQ0QsTUFBTSxFQUFFO1lBQ1AsV0FBVyxFQUFFLGFB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