"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const path = require("path");
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
const isArray = Array.isArray;
function override(_$tw, container, closures) {
    function obs_tw_each(obj) {
        return new rxjs_1.Observable(subs => {
            $tw.utils.each(obj, (item, index) => { subs.next([item, index]); });
            subs.complete();
        });
    }
    var $tw = _$tw;
    const { obs_exists, obs_readFile, obs_stat, ENV } = closures;
    const obs_readdir = (a) => (b = undefined) => (c) => closures.obs_readdir(a)(b)(c).pipe(operators_1.map(([err, files, tag, dirpath]) => [err, files.map(f => f.basename), tag, dirpath]));
    // =======================================================
    function loadTiddlersFromFile(filepath, fields) {
        //get the type info for this extension
        var ext = path.extname(filepath), extensionInfo = $tw.utils.getFileExtensionInfo(ext), type = extensionInfo ? extensionInfo.type : null, typeInfo = type ? $tw.config.contentTypeInfo[type] : null;
        //read the file without checking if it exists
        return obs_readFile(this)()(filepath, typeInfo ? typeInfo.encoding : "utf8").pipe(
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
        return obs_exists(this)()(filepath + ".meta").pipe(operators_1.mergeMap(([exists, tag, metafilename]) => exists ? obs_readFile(this)()(metafilename, "utf8") : rxjs_1.of(false)), operators_1.map((data) => data && $tw.utils.parseFields(data[1])));
    }
    function loadTiddlersFromPath(filepath, excludeRegExp = $tw.boot.excludeRegExp) {
        //stat the filepath
        return obs_stat(this)()(filepath).pipe(operators_1.mergeMap(([err, stat, tag]) => !!err ? rxjs_1.empty() : (stat.isDirectory())
            ? obs_readdir(this)()(filepath).pipe(
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
                        return obs_stat(self)()(pathname).pipe(operators_1.map(([err, stat]) => new Date(stat.birthtime)));
                    case "modified":
                        return obs_stat(self)()(pathname).pipe(operators_1.map(([err, stat]) => new Date(stat.mtime)));
                    default:
                        return rxjs_1.of(value);
                }
            }
            return (source) => source.pipe(operators_1.mergeMap(({ filename, isTiddlerFile, fields }) => {
                var extInfo = $tw.config.fileExtensionInfo[path.extname(filename)], type = (extInfo || {}).type || fields.type || "text/plain", typeInfo = $tw.config.contentTypeInfo[type] || {}, pathname = path.resolve(filepath, filename);
                return rxjs_1.zip(obs_readFile(self)()(pathname, typeInfo.encoding || "utf8"), $tw.loadMetadataForFile(pathname)).pipe(
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
        return obs_readFile(this)()(filepath + path.sep + "tiddlywiki.files", "utf8").pipe(operators_1.map(([err, data]) => {
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
                return obs_stat(this)(dirSpec)(path.resolve(filepath, dirSpec))
                    .pipe(operators_1.mergeMap(([err, stat, dirSpec, pathname]) => (!err && stat.isDirectory()) ? $tw.loadTiddlersFromPath(pathname, excludeRegExp) : rxjs_1.empty()));
            }
            else {
                //if it is an object there is more to the story
                const fileRegExp = new RegExp(dirSpec.filesRegExp || "^.*$"), metaRegExp = /^.*\.meta$/;
                const dirPath = path.resolve(filepath, dirSpec.path);
                const { isTiddlerFile, fields } = dirSpec;
                return obs_readdir(this)()(dirPath).pipe(
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
        operators_1.mergeMap(filepath => !filepath ? rxjs_1.empty() : rxjs_1.zip(obs_stat(this)()(filepath), obs_stat(this)()(filepath + path.sep + "plugin.info"))), 
        //check the stats and return empty if we aren't loading anything
        operators_1.mergeMap(([[err1, stat1, tag1, filepath], [err2, stat2, tag2, infoPath]]) => {
            if (err1 || !stat1.isDirectory())
                return rxjs_1.empty();
            if (err2 || !stat2.isFile()) {
                console.log("Warning: missing plugin.info file in " + filepath);
                return rxjs_1.empty();
            }
            return obs_readFile(this)(filepath)(infoPath, "utf8");
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
        return rxjs_1.from(paths.map(e => path.resolve(e, "./" + name))).pipe(operators_1.mergeMap(pluginPath => obs_stat(this)()(pluginPath)), operators_1.find(e => !e[0] && e[1].isDirectory()), operators_1.map(res => res && res[3]));
    }
    function loadPlugin(name, paths, pluginType) {
        return rxjs_1.from(this.getNamedPlugin(name, pluginType)).pipe(operators_1.mergeMap(pluginInfo => pluginInfo ? rxjs_1.of(pluginInfo) : $tw.loadPluginFolder($tw.findLibraryItem(name, paths))));
    }
    function getLibraryItemSearchPaths(libraryPath, envVar) {
        var pluginPaths = [], env = ENV[envVar];
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
        var resolvedWikiPath = path.resolve(wikiPath, $tw.config.wikiTiddlersSubDir);
        return rxjs_1.zip(obs_readFile(this)()(path.resolve(wikiPath, $tw.config.wikiInfo), "utf8"), obs_readdir(this)()(path.resolve(wikiPath)) //read this to prime the cache
        ).pipe(operators_1.map(([[err, data, t, wikiInfoPath]]) => {
            if (err || !data)
                throw "Error loading the " + $tw.config.wikiInfo + " file";
            else
                return JSON.parse(data);
        }), operators_1.mergeMap(wikiInfo => {
            parentPaths = parentPaths.slice(0);
            parentPaths.push(wikiPath);
            const includeWikis = obs_tw_each(wikiInfo.includeWikis).pipe(operators_1.map(([info]) => path.resolve(wikiPath, typeof info === "object" ? info.path : info)), operators_1.concatMap((resolvedIncludedWikiPath) => {
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
            var wikiFolderPlugins = [];
            var wikiFolderPluginsLoader = rxjs_1.of(["plugins", path.resolve(wikiPath, $tw.config.wikiPluginsSubDir)], ["themes", path.resolve(wikiPath, $tw.config.wikiThemesSubDir)], ["languages", path.resolve(wikiPath, $tw.config.wikiLanguagesSubDir)]).pipe(operators_1.mergeMap(([type, wpp]) => obs_exists(this)(type)(wpp)), operators_1.mergeMap(([exists, type, wpp]) => exists ? obs_readdir(this)(type)(wpp) : rxjs_1.empty()), operators_1.mergeMap(([err, pluginFolders, pluginType, wikiPluginsPath]) => err ? rxjs_1.empty() : rxjs_1.from(pluginFolders).pipe(operators_1.mergeMap(folder => $tw.loadPluginFolder(rxjs_1.of(path.resolve(wikiPluginsPath, "./" + folder))))))).forEach((pluginInfo) => {
                wikiFolderPlugins.push(pluginInfo);
            });
            var wikiInfoPlugins = [];
            var wikiInfoPluginsLoader = rxjs_1.merge(// Load any plugins, themes and languages listed in the wiki info file
            $tw.loadPlugins(wikiInfo.plugins, $tw.config.pluginsPath, $tw.config.pluginsEnvVar, "plugin"), $tw.loadPlugins(wikiInfo.themes, $tw.config.themesPath, $tw.config.themesEnvVar, "theme"), $tw.loadPlugins(wikiInfo.languages, $tw.config.languagesPath, $tw.config.languagesEnvVar, "language")).forEach((pluginInfo) => {
                wikiInfoPlugins.push(pluginInfo);
            });
            return rxjs_1.concat(Promise.all([
                wikiInfoPluginsLoader,
                wikiFolderPluginsLoader,
                includeWikis.forEach(() => { }),
                obs_readdir(this)()(resolvedWikiPath).forEach(() => { })
            ]), rxjs_1.from(wikiInfoPlugins).pipe(operators_1.tap(plugin => $tw.wiki.addTiddler(plugin))), loadWiki, rxjs_1.from(wikiFolderPlugins).pipe(operators_1.tap(plugin => $tw.wiki.addTiddler(plugin)))).pipe(operators_1.count(), operators_1.mapTo(wikiInfo));
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
    $tw.findLibraryItem =
        findLibraryItem.bind(container);
    $tw.getLibraryItemSearchPaths =
        getLibraryItemSearchPaths.bind(container);
    $tw.loadMetadataForFile =
        loadMetadataForFile.bind(container);
    $tw.loadPlugin =
        loadPlugin.bind(container);
    $tw.loadPluginFolder =
        loadPluginFolder.bind(container);
    $tw.loadPlugins =
        loadPlugins.bind(container);
    $tw.loadTiddlersFromFile =
        loadTiddlersFromFile.bind(container);
    $tw.loadTiddlersFromPath =
        loadTiddlersFromPath.bind(container);
    $tw.loadTiddlersFromSpecification =
        loadTiddlersFromSpecification.bind(container);
    $tw.loadWikiTiddlers =
        loadWikiTiddlers.bind(container);
    $tw.loadTiddlersNode =
        loadTiddlersNode.bind(container);
    $tw.boot.excludeRegExp = $tw.boot.excludeRegExp || /^\.DS_Store$|^.*\.meta$|^\..*\.swp$|^\._.*$|^\.git$|^\.hg$|^\.lock-wscript$|^\.svn$|^\.wafpickle-.*$|^CVS$|^npm-debug\.log$/;
    return $tw;
}
exports.override = override;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXN5bmMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJhc3luYy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLCtCQUFxSDtBQUNySCw4Q0FHd0I7QUFDeEIsNkJBQTZCO0FBSzdCLGNBQWlCLENBQUk7SUFDcEIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNmLE1BQU0sQ0FBQyxDQUFDLENBQUM7QUFDVixDQUFDO0FBS0QsdUJBQThCLEdBQVEsRUFBRSxVQUFlLEVBQUU7SUFDeEQsR0FBRyxDQUFDLE1BQU0sR0FBRyxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUM7SUFDcEMsMkJBQTJCO0lBQzNCLDJDQUEyQztJQUMzQyxHQUFHLENBQUMsWUFBWSxHQUFHLEdBQUcsQ0FBQztJQUN2QixFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDOUIsRUFBRSxDQUFDLENBQUMsUUFBUSxDQUFDLElBQUksS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDO1lBQ2hDLEdBQUcsQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDO1FBQ3JCLENBQUM7UUFBQyxJQUFJLENBQUMsQ0FBQztZQUNQLEdBQUcsQ0FBQyxZQUFZLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxlQUFlLEVBQUUsQ0FBQztRQUNoRCxDQUFDO0lBQ0YsQ0FBQztJQUNELHNDQUFzQztJQUN0QyxHQUFHLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxHQUFHLEVBQUU7UUFDM0IsT0FBTyxFQUFFO1lBQ1IsTUFBTSxFQUFFLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDO1lBQzNCLEtBQUssRUFBRSxFQUFFLENBQUMsK0NBQStDO1NBQ3pEO1FBQ0QsTUFBTSxFQUFFO1lBQ1AsV0FBVyxFQUFFLGFBQWE7WUFDMUIsVUFBVSxFQUFFLFlBQVk7WUFDeEIsYUFBYSxFQUFF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