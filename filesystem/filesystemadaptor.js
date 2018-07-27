/*\
title: $:/plugins/tiddlywiki/filesystem/filesystemadaptor.js
type: application/javascript
module-type: syncadaptor

A sync adaptor module for synchronising with the local filesystem via node.js APIs

\*/
(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

var path = require('$:/plugins/tiddlywiki/filesystem/path.js');

function writeFile(path, content, options, cb){

}

function readdir(path, cb){

}

function unlink(path, cb){

}

/*
Recursively create a directory
*/
function createDirectory(dirPath) {
	if(dirPath.substr(dirPath.length-1,1) !== path.sep) {
		dirPath = dirPath + path.sep;
	}
	var pos = 1;
	pos = dirPath.indexOf(path.sep,pos);
	while(pos !== -1) {
		var subDirPath = dirPath.substr(0,pos);
		if(!isDirectory(subDirPath)) {
			try {
				fs.mkdirSync(subDirPath);
			} catch(e) {
				return "Error creating directory '" + subDirPath + "'";
			}
		}
		pos = dirPath.indexOf(path.sep,pos + 1);
	}
	return null;
};

/*
Recursively create directories needed to contain a specified file
*/
function createFileDirectories(filePath) {
	return createDirectory(path.dirname(filePath));
};
/*
Check if a path identifies a directory
*/
function isDirectory(dirPath) {
	return fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory();
};

/*
Check if a path identifies a directory that is empty
*/
function isDirectoryEmpty(dirPath) {
	if(!isDirectory(dirPath)) {
		return false;
	}
	var files = fs.readdirSync(dirPath),
		empty = true;
	$tw.utils.each(files,function(file,index) {
		if(file.charAt(0) !== ".") {
			empty = false;
		}
	});
	return empty;
};
/*
Recursively delete a tree of empty directories
*/
function deleteEmptyDirs(dirpath,callback) {
	var self = this;
	fs.readdir(dirpath,function(err,files) {
		if(err) {
			return callback(err);
		}
		if(files.length > 0) {
			return callback(null);
		}
		fs.rmdir(dirpath,function(err) {
			if(err) {
				return callback(err);
			}
			self.deleteEmptyDirs(path.dirname(dirpath),callback);
		});
	});
};



// this is a modification of the filesystem adaptor, so references to the same 
// are referring to this plugin and not the real filesystem adaptor
function TW5CloudAdaptor(options) {
	var self = this;
	this.wiki = options.wiki;
	this.logger = new $tw.utils.Logger("twcloud-datafolder",{colour: "blue"});
	// Create the <wiki>/tiddlers folder if it doesn't exist
	// $tw.utils.createDirectory($tw.boot.wikiTiddlersPath);
}

TW5CloudAdaptor.prototype.name = "twcloud-datafolder";

TW5CloudAdaptor.prototype.isReady = function() {
	// We are ready once the chooser is handed in
	return !!this.chooser;
};

TW5CloudAdaptor.prototype.getTiddlerInfo = function(tiddler) {
	return {};
};

/*
Return a fileInfo object for a tiddler, creating it if necessary:
  filepath: the absolute path to the file containing the tiddler
  type: the type of the tiddler file (NOT the type of the tiddler -- see below)
  hasMetaFile: true if the file also has a companion .meta file

The boot process populates $tw.boot.files for each of the tiddler files that it loads. 
The type is found by looking up the extension in $tw.config.fileExtensionInfo (eg 
	"application/x-tiddler" for ".tid" files).

It is the responsibility of the filesystem adaptor to update $tw.boot.files for 
new files that are created.
*/
TW5CloudAdaptor.prototype.getTiddlerFileInfo = function(tiddler,callback) {
	// See if we've already got information about this file
	var self = this,
		title = tiddler.fields.title,
		fileInfo = $tw.boot.files[title];
	if(fileInfo) {
		// If so, just invoke the callback
		callback(null,fileInfo);
	} else {
		// Otherwise, we'll need to generate it
		fileInfo = {};
		var tiddlerType = tiddler.fields.type || "text/vnd.tiddlywiki";
		// Get the content type info
		var contentTypeInfo = $tw.config.contentTypeInfo[tiddlerType] || {};
		// Get the file type by looking up the extension
		var extension = contentTypeInfo.extension || ".tid";
		fileInfo.type = ($tw.config.fileExtensionInfo[extension] || {type: "application/x-tiddler"}).type;
		// Use a .meta file unless we're saving a .tid file.
		// (We would need more complex logic if we supported other template rendered tiddlers besides .tid)
		fileInfo.hasMetaFile = (fileInfo.type !== "application/x-tiddler") && (fileInfo.type !== "application/json");
		if(!fileInfo.hasMetaFile) {
			extension = ".tid";
		}
		// Generate the base filepath and ensure the directories exist
		var baseFilepath = path.resolve($tw.boot.wikiTiddlersPath,this.generateTiddlerBaseFilepath(title));
		$tw.utils.createFileDirectories(baseFilepath);
		// Start by getting a list of the existing files in the directory
		readdir(path.dirname(baseFilepath),function(err,files) {
			if(err) {
				return callback(err);
			}
			// Start with the base filename plus the extension
			var filepath = baseFilepath;
			if(filepath.substr(-extension.length).toLocaleLowerCase() !== extension.toLocaleLowerCase()) {
				filepath = filepath + extension;
			}
			var filename = path.basename(filepath),
				count = 1;
			// Add a discriminator if we're clashing with an existing filename while
			// handling case-insensitive filesystems (NTFS, FAT/FAT32, etc.)
			while(files.some(function(value) {return value.toLocaleLowerCase() === filename.toLocaleLowerCase();})) {
				filepath = baseFilepath + " " + (count++) + extension;
				filename = path.basename(filepath);
			}
			// Set the final fileInfo
			fileInfo.filepath = filepath;
console.log("\x1b[1;35m" + "For " + title + ", type is " + fileInfo.type + " hasMetaFile is " + fileInfo.hasMetaFile + " filepath is " + fileInfo.filepath + "\x1b[0m");
			$tw.boot.files[title] = fileInfo;
			// Pass it to the callback
			callback(null,fileInfo);
		});
	}
};

/*
Given a list of filters, apply every one in turn to source, and return the first result of the first filter with non-empty result.
*/
TW5CloudAdaptor.prototype.findFirstFilter = function(filters,source) {
	for(var i=0; i<filters.length; i++) {
		var result = this.wiki.filterTiddlers(filters[i],null,source);
		if(result.length > 0) {
			return result[0];
		}
	}
	return null;
};

/*
Given a tiddler title and an array of existing filenames, generate a new legal filename for the title, case insensitively avoiding the array of existing filenames
*/
TW5CloudAdaptor.prototype.generateTiddlerBaseFilepath = function(title) {
	var baseFilename;
	// Check whether the user has configured a tiddler -> pathname mapping
	var pathNameFilters = this.wiki.getTiddlerText("$:/config/FileSystemPaths");
	if(pathNameFilters) {
		var source = this.wiki.makeTiddlerIterator([title]);
		baseFilename = this.findFirstFilter(pathNameFilters.split("\n"),source);
		if(baseFilename) {
			// Interpret "/" and "\" as path separator
			baseFilename = baseFilename.replace(/\/|\\/g,path.sep);
		}
	}
	if(!baseFilename) {
		// No mappings provided, or failed to match this tiddler so we use title as filename
		baseFilename = title.replace(/\/|\\/g,"_");
	}
	// Remove any of the characters that are illegal in Windows filenames
	var baseFilename = $tw.utils.transliterate(baseFilename.replace(/<|>|\:|\"|\||\?|\*|\^/g,"_"));
	// Truncate the filename if it is too long
	if(baseFilename.length > 200) {
		baseFilename = baseFilename.substr(0,200);
	}
	return baseFilename;
};

/*
Save a tiddler and invoke the callback with (err,adaptorInfo,revision)
*/
TW5CloudAdaptor.prototype.saveTiddler = function(tiddler,callback) {
	var self = this;
	this.getTiddlerFileInfo(tiddler,function(err,fileInfo) {
		if(err) {
			return callback(err);
		}
		var filepath = fileInfo.filepath,
			error = $tw.utils.createDirectory(path.dirname(filepath));
		if(error) {
			return callback(error);
		}
		if(fileInfo.hasMetaFile) {
			// Save the tiddler as a separate body and meta file
			var typeInfo = $tw.config.contentTypeInfo[tiddler.fields.type || "text/plain"] || {encoding: "utf8"};
			writeFile(filepath,tiddler.fields.text,{encoding: typeInfo.encoding},function(err) {
				if(err) {
					return callback(err);
				}
				content = self.wiki.renderTiddler("text/plain","$:/core/templates/tiddler-metadata",{variables: {currentTiddler: tiddler.fields.title}});
				writeFile(fileInfo.filepath + ".meta",content,{encoding: "utf8"},function (err) {
					if(err) {
						return callback(err);
					}
					self.logger.log("Saved file",filepath);
					return callback(null);
				});
			});
		} else {
			// Save the tiddler as a self contained templated file
			var content = self.wiki.renderTiddler("text/plain","$:/core/templates/tid-tiddler",{variables: {currentTiddler: tiddler.fields.title}});
			writeFile(filepath,content,{encoding: "utf8"},function (err) {
				if(err) {
					return callback(err);
				}
				self.logger.log("Saved file",filepath);
				return callback(null);
			});
		}
	});
};

/*
Load a tiddler and invoke the callback with (err,tiddlerFields)

We don't need to implement loading for the file system adaptor, because all the tiddler files will have been loaded during the boot process.
*/
TW5CloudAdaptor.prototype.loadTiddler = function(title,callback) {
	callback(null,null);
};

/*
Delete a tiddler and invoke the callback with (err)
*/
TW5CloudAdaptor.prototype.deleteTiddler = function(title,callback,options) {
	var self = this,
		fileInfo = $tw.boot.files[title];
	// Only delete the tiddler if we have writable information for the file
	if(fileInfo) {
		// Delete the file
		unlink(fileInfo.filepath,function(err) {
			if(err) {
				return callback(err);
			}
			self.logger.log("Deleted file",fileInfo.filepath);
			// Delete the metafile if present
			if(fileInfo.hasMetaFile) {
				unlink(fileInfo.filepath + ".meta",function(err) {
					if(err) {
						return callback(err);
					}
					return $tw.utils.deleteEmptyDirs(path.dirname(fileInfo.filepath),callback);
				});
			} else {
				return $tw.utils.deleteEmptyDirs(path.dirname(fileInfo.filepath),callback);
			}
		});
	} else {
		callback(null);
	}
};

// this adaptor always tries to activate
exports.adaptorClass = TW5CloudAdaptor;


})();
