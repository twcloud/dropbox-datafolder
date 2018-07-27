"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("./common");
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
function dbx_filesListFolder(chooser, folderPath) {
    return new rxjs_1.Observable(sub => {
        chooser.streamFilesListFolder(folderPath, (ents, more) => {
            ents.forEach(e => sub.next(e));
            if (!more)
                sub.complete();
        });
    });
}
// type t = OperatorFunction
function handleDatafolder(chooser, stat) {
    // if (!stat.path_lower) throw "stat did not contain a path_lower property";
    var folder = stat.path_lower.split('/');
    console.log('folder pop', folder.pop());
    var folderPath = folder.join('/');
    var state = {
        folderPath,
        folderEntries: [],
        has: {},
        info: { stat, json: undefined }
    };
    return new Promise(resolve => {
        //download the tiddlywiki.info file
        rxjs_1.from(chooser.client.filesDownload({ path: stat.path_lower }))
            .pipe(operators_1.mergeMap((file) => {
            return fetch(URL.createObjectURL(file.fileBlob)).then(res => {
                res.text().then(text => { state.info.json = JSON.parse(text); });
                return dbx_filesListFolder(chooser, folderPath);
            });
        }))
            .pipe(operators_1.mergeAll())
            .pipe(operators_1.map((ent, i) => {
            if (chooser.isFileMetadata(ent)) {
                if (ent.name === "tiddlywiki.info")
                    state.has["info"] = true;
            }
            else if (chooser.isFolderMetadata(ent)) {
                if (common_1.contains(ent.name, ["plugins", "themes", "languages", "tiddlers"])) {
                    state.has[ent.name] = true;
                }
            }
            return ent;
        }))
            .pipe(common_1.dumpToArray())
            .pipe(operators_1.concatMap((entries) => {
            state.folderEntries = entries;
            if (!state.has.tiddlers) {
                chooser.status.setStatusMessage("There is no tiddlers folder");
                //we can actually create one here since that is the default for a tiddlywiki.info file
                throw "there is no tiddlers folder";
            }
            return dbx_filesListFolder(chooser, state.folderPath + "/tiddlers");
        }))
            .pipe(common_1.dumpToArray())
            .pipe(operators_1.map(tiddlers => {
            state.tiddlersEntries = tiddlers;
            state.preload = [];
            tiddlers.forEach(entry => {
                var ext = entry.name.split('.').pop();
                if (chooser.isFileMetadata(entry) && (entry.name.startsWith('$') || common_1.contains(ext, ["tid", "meta"]))) {
                    state.preload.push(entry);
                }
                else if (chooser.isFolderMetadata(entry)) {
                    chooser.status.setStatusMessage("TWITS does not support data folders with custom folder schemes");
                    throw "folder found in tiddlers folder";
                }
            });
        }))
            .pipe(common_1.dumpToArray())
            .subscribe(() => {
            console.log('booting', chooser, state);
            chooser.status.setStatusMessage("Loading tiddlywiki");
            setTimeout(() => {
                window.$tw.boot.wikiPath = state.folderPath;
                window.$tw.boot.boot(resolve);
            });
        });
    }).then(() => { chooser.status.clearStatusMessage(); });
}
exports.handleDatafolder = handleDatafolder;
