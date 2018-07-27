{

	/*
	Load the tiddlers contained in a particular file (and optionally extract fields from the accompanying .meta file) returned as {filepath:,type:,tiddlers:[],hasMetaFile:}
	*/
	$tw.loadTiddlersFromFile = function(filepath,fields) {
		var ext = path.extname(filepath),
			extensionInfo = $tw.utils.getFileExtensionInfo(ext),
			type = extensionInfo ? extensionInfo.type : null,
			typeInfo = type ? $tw.config.contentTypeInfo[type] : null,
			data = fs.readFileSync(filepath,typeInfo ? typeInfo.encoding : "utf8"),
			tiddlers = $tw.wiki.deserializeTiddlers(ext,data,fields),
			metadata;
		if(ext !== ".json" && tiddlers.length === 1) {
			metadata = $tw.loadMetadataForFile(filepath);
			tiddlers = [$tw.utils.extend({},tiddlers[0],metadata)];
		}
		return {filepath: filepath, type: type, tiddlers: tiddlers, hasMetaFile: !!metadata};
	};
	
	/*
	Load the metadata fields in the .meta file corresponding to a particular file
	*/
	$tw.loadMetadataForFile = function(filepath) {
		var metafilename = filepath + ".meta";
		if(fs.existsSync(metafilename)) {
			return $tw.utils.parseFields(fs.readFileSync(metafilename,"utf8") || "");
		} else {
			return null;
		}
	};
	
	/*
	A default set of files for TiddlyWiki to ignore during load.
	This matches what NPM ignores, and adds "*.meta" to ignore tiddler
	metadata files.
	*/
	$tw.boot.excludeRegExp = /^\.DS_Store$|^.*\.meta$|^\..*\.swp$|^\._.*$|^\.git$|^\.hg$|^\.lock-wscript$|^\.svn$|^\.wafpickle-.*$|^CVS$|^npm-debug\.log$/;
	
	/*
	Load all the tiddlers recursively from a directory, including honouring `tiddlywiki.files` files for drawing in external files. Returns an array of {filepath:,type:,tiddlers: [{..fields...}],hasMetaFile:}. Note that no file information is returned for externally loaded tiddlers, just the `tiddlers` property.
	*/
	$tw.loadTiddlersFromPath = function(filepath,excludeRegExp) {
		excludeRegExp = excludeRegExp || $tw.boot.excludeRegExp;
		var tiddlers = [];
		if(fs.existsSync(filepath)) {
			var stat = fs.statSync(filepath);
			if(stat.isDirectory()) {
				var files = fs.readdirSync(filepath);
				// Look for a tiddlywiki.files file
				if(files.indexOf("tiddlywiki.files") !== -1) {
					Array.prototype.push.apply(tiddlers,$tw.loadTiddlersFromSpecification(filepath,excludeRegExp));
				} else {
					// If not, read all the files in the directory
					$tw.utils.each(files,function(file) {
						if(!excludeRegExp.test(file) && file !== "plugin.info") {
							tiddlers.push.apply(tiddlers,$tw.loadTiddlersFromPath(filepath + path.sep + file,excludeRegExp));
						}
					});
				}
			} else if(stat.isFile()) {
				tiddlers.push($tw.loadTiddlersFromFile(filepath,{title: filepath}));
			}
		}
		return tiddlers;
	};
	
	/*
	Load all the tiddlers defined by a `tiddlywiki.files` specification file
	filepath: pathname of the directory containing the specification file
	*/
	$tw.loadTiddlersFromSpecification = function(filepath,excludeRegExp) {
		var tiddlers = [];
		// Read the specification
		var filesInfo = JSON.parse(fs.readFileSync(filepath + path.sep + "tiddlywiki.files","utf8"));
		// Helper to process a file
		var processFile = loadTiddlersFromSpecificationProcessFile(filepath, tiddlers);
		// Process the listed tiddlers
		$tw.utils.each(filesInfo.tiddlers,function(tidInfo) {
			if(tidInfo.prefix && tidInfo.suffix) {
				tidInfo.fields.text = {prefix: tidInfo.prefix,suffix: tidInfo.suffix};
			} else if(tidInfo.prefix) {
				tidInfo.fields.text = {prefix: tidInfo.prefix};
			} else if(tidInfo.suffix) {
				tidInfo.fields.text = {suffix: tidInfo.suffix};
			}
			processFile(tidInfo.file,tidInfo.isTiddlerFile,tidInfo.fields);
		});
		// Process any listed directories
		$tw.utils.each(filesInfo.directories,function(dirSpec) {
			// Read literal directories directly
			if(typeof dirSpec === "string") {
				var pathname = path.resolve(filepath,dirSpec);
				if(fs.existsSync(pathname) && fs.statSync(pathname).isDirectory()) {
					tiddlers.push.apply(tiddlers,$tw.loadTiddlersFromPath(pathname,excludeRegExp));
				}
			} else {
				// Process directory specifier
				var dirPath = path.resolve(filepath,dirSpec.path),
					files = fs.readdirSync(dirPath),
					fileRegExp = new RegExp(dirSpec.filesRegExp || "^.*$"),
					metaRegExp = /^.*\.meta$/;
				for(var t=0; t<files.length; t++) {
					var filename = files[t];
					if(filename !== "tiddlywiki.files" && !metaRegExp.test(filename) && fileRegExp.test(filename)) {
						processFile(dirPath + path.sep + filename,dirSpec.isTiddlerFile,dirSpec.fields);
					}
				}
			}
		});
		return tiddlers;
	};
	
	/*
	Load the tiddlers from a plugin folder, and package them up into a proper JSON plugin tiddler
	*/
	$tw.loadPluginFolder = function(filepath,excludeRegExp) {
		excludeRegExp = excludeRegExp || $tw.boot.excludeRegExp;
		var infoPath = filepath + path.sep + "plugin.info";
		if(fs.existsSync(filepath) && fs.statSync(filepath).isDirectory()) {
			// Read the plugin information
			if(!fs.existsSync(infoPath) || !fs.statSync(infoPath).isFile()) {
				console.log("Warning: missing plugin.info file in " + filepath);
				return null;
			}
			var pluginInfo = JSON.parse(fs.readFileSync(infoPath,"utf8"));
			// Read the plugin files
			var pluginFiles = $tw.loadTiddlersFromPath(filepath,excludeRegExp);
			// Save the plugin tiddlers into the plugin info
			pluginInfo.tiddlers = pluginInfo.tiddlers || Object.create(null);
			for(var f=0; f<pluginFiles.length; f++) {
				var tiddlers = pluginFiles[f].tiddlers;
				for(var t=0; t<tiddlers.length; t++) {
					var tiddler= tiddlers[t];
					if(tiddler.title) {
						pluginInfo.tiddlers[tiddler.title] = tiddler;
					}
				}
			}
			// Give the plugin the same version number as the core if it doesn't have one
			if(!("version" in pluginInfo)) {
				pluginInfo.version = $tw.packageInfo.version;
			}
			// Use "plugin" as the plugin-type if we don't have one
			if(!("plugin-type" in pluginInfo)) {
				pluginInfo["plugin-type"] = "plugin";
			}
			pluginInfo.dependents = pluginInfo.dependents || [];
			pluginInfo.type = "application/json";
			// Set plugin text
			pluginInfo.text = JSON.stringify({tiddlers: pluginInfo.tiddlers},null,4);
			delete pluginInfo.tiddlers;
			// Deserialise array fields (currently required for the dependents field)
			for(var field in pluginInfo) {
				if($tw.utils.isArray(pluginInfo[field])) {
					pluginInfo[field] = $tw.utils.stringifyList(pluginInfo[field]);
				}
			}
			return pluginInfo;
		} else {
				return null;
		}
	};
	
	/*
	name: Name of the plugin to find
	paths: array of file paths to search for it
	Returns the path of the plugin folder
	*/
	$tw.findLibraryItem = function(name,paths) {
		var pathIndex = 0;
		do {
			var pluginPath = path.resolve(paths[pathIndex],"./" + name)
			if(fs.existsSync(pluginPath) && fs.statSync(pluginPath).isDirectory()) {
				return pluginPath;
			}
		} while(++pathIndex < paths.length);
		return null;
	};
	
	/*
	name: Name of the plugin to load
	paths: array of file paths to search for it
	*/
	$tw.loadPlugin = function(name,paths) {
		var pluginPath = $tw.findLibraryItem(name,paths);
		if(pluginPath) {
			var pluginFields = $tw.loadPluginFolder(pluginPath);
			if(pluginFields) {
				$tw.wiki.addTiddler(pluginFields);
			}
		}
	};
	
	/*
	libraryPath: Path of library folder for these plugins (relative to core path)
	envVar: Environment variable name for these plugins
	Returns an array of search paths
	*/
	$tw.getLibraryItemSearchPaths = function(libraryPath,envVar) {
		var pluginPaths = [path.resolve($tw.boot.corePath,libraryPath)],
			env = process.env[envVar];
		if(env) {
			env.split(path.delimiter).map(function(item) {
				if(item) {
					pluginPaths.push(item)
				}
			});
		}
		return pluginPaths;
	};
	
	/*
	plugins: Array of names of plugins (eg, "tiddlywiki/filesystemadaptor")
	libraryPath: Path of library folder for these plugins (relative to core path)
	envVar: Environment variable name for these plugins
	*/
	$tw.loadPlugins = function(plugins,libraryPath,envVar) {
		if(plugins) {
			var pluginPaths = $tw.getLibraryItemSearchPaths(libraryPath,envVar);
			for(var t=0; t<plugins.length; t++) {
				$tw.loadPlugin(plugins[t],pluginPaths);
			}
		}
	};
	
	/*
	path: path of wiki directory
	options:
		parentPaths: array of parent paths that we mustn't recurse into
		readOnly: true if the tiddler file paths should not be retained
	*/
	$tw.loadWikiTiddlers = function(wikiPath,options) {
		options = options || {};
		var parentPaths = options.parentPaths || [],
			wikiInfoPath = path.resolve(wikiPath,$tw.config.wikiInfo),
			wikiInfo,
			pluginFields;
		// Bail if we don't have a wiki info file
		if(fs.existsSync(wikiInfoPath)) {
			wikiInfo = JSON.parse(fs.readFileSync(wikiInfoPath,"utf8"));
		} else {
			return null;
		}
		// Load any parent wikis
		if(wikiInfo.includeWikis) {
			parentPaths = parentPaths.slice(0);
			parentPaths.push(wikiPath);
			$tw.utils.each(wikiInfo.includeWikis,function(info) {
				if(typeof info === "string") {
					info = {path: info};
				}
				var resolvedIncludedWikiPath = path.resolve(wikiPath,info.path);
				if(parentPaths.indexOf(resolvedIncludedWikiPath) === -1) {
					var subWikiInfo = $tw.loadWikiTiddlers(resolvedIncludedWikiPath,{
						parentPaths: parentPaths,
						readOnly: info["read-only"]
					});
					// Merge the build targets
					wikiInfo.build = $tw.utils.extend([],subWikiInfo.build,wikiInfo.build);
				} else {
					$tw.utils.error("Cannot recursively include wiki " + resolvedIncludedWikiPath);
				}
			});
		}
		// Load any plugins, themes and languages listed in the wiki info file
		$tw.loadPlugins(wikiInfo.plugins,$tw.config.pluginsPath,$tw.config.pluginsEnvVar);
		$tw.loadPlugins(wikiInfo.themes,$tw.config.themesPath,$tw.config.themesEnvVar);
		$tw.loadPlugins(wikiInfo.languages,$tw.config.languagesPath,$tw.config.languagesEnvVar);
		// Load the wiki files, registering them as writable
		var resolvedWikiPath = path.resolve(wikiPath,$tw.config.wikiTiddlersSubDir);
		$tw.utils.each($tw.loadTiddlersFromPath(resolvedWikiPath),function(tiddlerFile) {
			if(!options.readOnly && tiddlerFile.filepath) {
				$tw.utils.each(tiddlerFile.tiddlers,function(tiddler) {
					$tw.boot.files[tiddler.title] = {
						filepath: tiddlerFile.filepath,
						type: tiddlerFile.type,
						hasMetaFile: tiddlerFile.hasMetaFile
					};
				});
			}
			$tw.wiki.addTiddlers(tiddlerFile.tiddlers);
		});
		// Save the original tiddler file locations if requested
		var config = wikiInfo.config || {};
		if(config["retain-original-tiddler-path"]) {
			var output = {}, relativePath;
			for(var title in $tw.boot.files) {
				relativePath = path.relative(resolvedWikiPath,$tw.boot.files[title].filepath);
				output[title] =
					path.sep === path.posix.sep ?
					relativePath :
					relativePath.split(path.sep).join(path.posix.sep);
			}
			$tw.wiki.addTiddler({title: "$:/config/OriginalTiddlerPaths", type: "application/json", text: JSON.stringify(output)});
		}
		// Save the path to the tiddlers folder for the filesystemadaptor
		$tw.boot.wikiTiddlersPath = path.resolve($tw.boot.wikiPath,config["default-tiddler-location"] || $tw.config.wikiTiddlersSubDir);
		// Load any plugins within the wiki folder
		var wikiPluginsPath = path.resolve(wikiPath,$tw.config.wikiPluginsSubDir);
		if(fs.existsSync(wikiPluginsPath)) {
			var pluginFolders = fs.readdirSync(wikiPluginsPath);
			for(var t=0; t<pluginFolders.length; t++) {
				pluginFields = $tw.loadPluginFolder(path.resolve(wikiPluginsPath,"./" + pluginFolders[t]));
				if(pluginFields) {
					$tw.wiki.addTiddler(pluginFields);
				}
			}
		}
		// Load any themes within the wiki folder
		var wikiThemesPath = path.resolve(wikiPath,$tw.config.wikiThemesSubDir);
		if(fs.existsSync(wikiThemesPath)) {
			var themeFolders = fs.readdirSync(wikiThemesPath);
			for(var t=0; t<themeFolders.length; t++) {
				pluginFields = $tw.loadPluginFolder(path.resolve(wikiThemesPath,"./" + themeFolders[t]));
				if(pluginFields) {
					$tw.wiki.addTiddler(pluginFields);
				}
			}
		}
		// Load any languages within the wiki folder
		var wikiLanguagesPath = path.resolve(wikiPath,$tw.config.wikiLanguagesSubDir);
		if(fs.existsSync(wikiLanguagesPath)) {
			var languageFolders = fs.readdirSync(wikiLanguagesPath);
			for(var t=0; t<languageFolders.length; t++) {
				pluginFields = $tw.loadPluginFolder(path.resolve(wikiLanguagesPath,"./" + languageFolders[t]));
				if(pluginFields) {
					$tw.wiki.addTiddler(pluginFields);
				}
			}
		}
		return wikiInfo;
	};
	
	$tw.loadTiddlersNode = function() {
		// Load the boot tiddlers
		$tw.utils.each($tw.loadTiddlersFromPath($tw.boot.bootPath),function(tiddlerFile) {
			$tw.wiki.addTiddlers(tiddlerFile.tiddlers);
		});
		// Load the core tiddlers
		$tw.wiki.addTiddler($tw.loadPluginFolder($tw.boot.corePath));
		// Load the tiddlers from the wiki directory
		if($tw.boot.wikiPath) {
			$tw.boot.wikiInfo = $tw.loadWikiTiddlers($tw.boot.wikiPath);
		}
	};
	
	// End of if($tw.node)
	}

function loadTiddlersFromSpecificationProcessFile(filepath, tiddlers) {
	return function (filename, isTiddlerFile, fields) {
		var extInfo = $tw.config.fileExtensionInfo[path.extname(filename)], 
		type = (extInfo || {}).type || fields.type || "text/plain", 
		typeInfo = $tw.config.contentTypeInfo[type] || {}, 
		pathname = path.resolve(filepath, filename), 
		text = fs.readFileSync(pathname, typeInfo.encoding || "utf8"), 
		metadata = $tw.loadMetadataForFile(pathname) || {}, 
		fileTiddlers;
		if (isTiddlerFile) {
			fileTiddlers = $tw.wiki.deserializeTiddlers(path.extname(pathname), text, metadata) || [];
		}
		else {
			fileTiddlers = [$tw.utils.extend({ text: text }, metadata)];
		}
		var combinedFields = $tw.utils.extend({}, fields, metadata);
		$tw.utils.each(fileTiddlers, function (tiddler) {
			$tw.utils.each(combinedFields, function (fieldInfo, name) {
				if (typeof fieldInfo === "string" || $tw.utils.isArray(fieldInfo)) {
					tiddler[name] = fieldInfo;
				}
				else {
					var value = tiddler[name];
					switch (fieldInfo.source) {
						case "filename":
							value = path.basename(filename);
							break;
						case "filename-uri-decoded":
							value = decodeURIComponent(path.basename(filename));
							break;
						case "basename":
							value = path.basename(filename, path.extname(filename));
							break;
						case "basename-uri-decoded":
							value = decodeURIComponent(path.basename(filename, path.extname(filename)));
							break;
						case "extname":
							value = path.extname(filename);
							break;
						case "created":
							value = new Date(fs.statSync(pathname).birthtime);
							break;
						case "modified":
							value = new Date(fs.statSync(pathname).mtime);
							break;
					}
					if (fieldInfo.prefix) {
						value = fieldInfo.prefix + value;
					}
					if (fieldInfo.suffix) {
						value = value + fieldInfo.suffix;
					}
					tiddler[name] = value;
				}
			});
		});
		tiddlers.push({ tiddlers: fileTiddlers });
	};
}
