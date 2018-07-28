"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("./common");
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const path = require("path");
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
        rxjs_1.from(chooser.client.filesDownload({ path: stat.path_lower }).then((file) => fetch(URL.createObjectURL(file.fileBlob)).then(res => {
            res.text().then(text => { state.info.json = JSON.parse(text); });
        }))).pipe(operators_1.mergeMap(() => dbx_filesListFolder(chooser, folderPath)), operators_1.tap((ent) => {
            if (chooser.isFileMetadata(ent)) {
                if (ent.name === "tiddlywiki.info")
                    state.has["info"] = true;
            }
            else if (chooser.isFolderMetadata(ent)) {
                if (common_1.contains(ent.name, ["plugins", "themes", "languages", "tiddlers"])) {
                    ///@ts-ignore
                    state.has[ent.name] = true;
                }
            }
            state.folderEntries.push(ent);
        }), operators_1.count()).subscribe(() => {
            var cb = () => {
                state.has["tiddlers"] = true;
                window.$tw.boot.wikiPath = state.folderPath;
                window.$tw.boot.boot(resolve);
            };
            console.log('booting', chooser, state);
            if (!state.has.tiddlers)
                chooser.client.filesCreateFolder({ path: path.join(folderPath, "tiddlers") }).then(cb);
            else
                cb();
        });
    }).then(() => { chooser.status.clearStatusMessage(); });
}
exports.handleDatafolder = handleDatafolder;
//dump the tiddlers into an array
// .pipe(dumpToArray())
//determine the tiddlers to be preloaded
// .pipe(map(tiddlers => {
// 	state.tiddlersEntries = tiddlers;
// 	state.preload = [];
// 	tiddlers.forEach(entry => {
// 		var ext = entry.name.split('.').pop();
// 		if (chooser.isFileMetadata(entry) && (entry.name.startsWith('$') || contains(ext, ["tid", "meta"]))) {
// 			state.preload.push(entry);
// 		} else if (chooser.isFolderMetadata(entry)) {
// 			chooser.status.setStatusMessage("TWITS does not support data folders with custom folder schemes");
// 			throw "folder found in tiddlers folder";
// 		}
// 	})
// }))
//wait for everything to come through
// .pipe(dumpToArray())
//emit the preload entries individually
// .pipe(mergeMap(() => from(state.preload)))
//download the actual files
// .pipe(mergeMap((entry) => chooser.client.filesDownload({ path: entry.path_lower as string })))
//dump the preload files into an array
// .pipe(dumpToArray())
//set state.preload to the new array with file contents
// .pipe(map((preload: files.FileMetadata[]) => { state.preload = preload; console.log(preload); }))
//emit the plugin folder types
// .pipe(mergeMap(() => from(["plugins", "themes", "languages"])))
//download the entire folder as a zip file
// .pipe(mergeMap(t => chooser.client.filesDownloadZip({ path: state.folderPath + "/" + t })))
//process it with some kind of unzip software
//use modified code from TiddlyServer/lib/boot-node-async.ts to load the plugins as tiddlers
//seriously? for now let's just focus on getting the tiddlers folder working
//use the boot code to parse the preloads as tiddlers
//why on earth am I doing this like this? This is crazy.
//I think it is the only way to do it. Once I do it I'll figure out what to do different.
//I like the new rxjs
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9hZGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsibG9hZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBRUEscUNBQWtFO0FBQ2xFLCtCQUEwRTtBQUMxRSw4Q0FBa0g7QUFDbEgsNkJBQTZCO0FBRTdCLDZCQUE2QixPQUFnQixFQUFFLFVBQWtCO0lBQ2hFLE1BQU0sQ0FBQyxJQUFJLGlCQUFVLENBQWlHLEdBQUc7UUFDeEgsT0FBTyxDQUFDLHFCQUFxQixDQUFDLFVBQVUsRUFBRSxDQUFDLElBQUksRUFBRSxJQUFJO1lBQ3BELElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUMvQixFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztnQkFDVCxHQUFHLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDakIsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztBQUNKLENBQUM7QUFFRCw0QkFBNEI7QUFDNUIsMEJBQWlDLE9BQWdCLEVBQUUsSUFBd0I7SUFDMUUsNEVBQTRFO0lBQzVFLElBQUksTUFBTSxHQUFJLElBQUksQ0FBQyxVQUFxQixDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUNwRCxPQUFPLENBQUMsR0FBRyxDQUFDLFlBQVksRUFBRSxNQUFNLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQztJQUN4QyxJQUFJLFVBQVUsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ2xDLElBQUksS0FBSyxHQUFvQjtRQUM1QixVQUFVO1FBQ1YsYUFBYSxFQUFFLEVBQUU7UUFDakIsR0FBRyxFQUFFLEVBQUU7UUFDUCxJQUFJLEVBQUUsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRTtLQUN4QixDQUFDO0lBQ1QsTUFBTSxDQUFDLElBQUksT0FBTyxDQUFDLE9BQU87UUFHekIsV0FBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsYUFBYSxDQUFDLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxVQUFvQixFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLEtBQ2hGLEtBQUssQ0FBQyxHQUFHLENBQUMsZUFBZSxDQUFFLElBQXVCLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRztZQUNyRSxHQUFHLENBQUMsSUFBSSxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUksTUFBTSxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDakUsQ0FBQyxDQUFDLENBQ0YsQ0FBQyxDQUFDLElBQUksQ0FDTixvQkFBUSxDQUFDLE1BQU0sbUJBQW1CLENBQUMsT0FBTyxFQUFFLFVBQVUsQ0FBQyxDQUFDLEVBQ3hELGVBQUcsQ0FBQyxDQUFDLEdBQUc7WUFDUCxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDakMsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksS0FBSyxpQkFBaUIsQ0FBQztvQkFDbEMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxJQUFJLENBQUM7WUFDM0IsQ0FBQztZQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUMxQyxFQUFFLENBQUMsQ0FBQyxpQkFBUSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxTQUFTLEVBQUUsUUFBUSxFQUFFLFdBQVcsRUFBRSxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDeEUsYUFBYTtvQkFDYixLQUFLLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUM7Z0JBQzVCLENBQUM7WUFDRixDQUFDO1lBQ0QsS0FBSyxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDL0IsQ0FBQyxDQUFDLEVBQ0YsaUJBQUssRUFBRSxDQUNQLENBQUMsU0FBUyxDQUFDO1lBQ1gsSUFBSSxFQUFFLEdBQUc7Z0JBQ1IsS0FBSyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsR0FBRyxJQUFJLENBQUM7Z0JBQzVCLE1BQWMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFFBQVEsR0FBRyxLQUFLLENBQUMsVUFBVSxDQUFDO2dCQUNwRCxNQUFjLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDeEMsQ0FBQyxDQUFDO1lBQ0YsT0FBTyxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsT0FBTyxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQ3ZDLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUM7Z0JBQ3ZCLE9BQU8sQ0FBQyxNQUFNLENBQUMsaUJBQWlCLENBQUMsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsVUFBVSxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUN4RixJQUFJO2dCQUFDLEVBQUUsRUFBRSxDQUFDO1FBQ1gsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxPQUFPLENBQUMsTUFBTSxDQUFDLGtCQUFrQixFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtBQUN4RCxDQUFDO0FBN0NELDRDQTZDQztBQUVFLGlDQUFpQztBQUNqQyx1QkFBdUI7QUFDdkIsd0NBQXdDO0FBQ3hDLDBCQUEwQjtBQUMxQixxQ0FBcUM7QUFDckMsdUJBQXVCO0FBQ3ZCLCtCQUErQjtBQUMvQiwyQ0FBMkM7QUFDM0MsMkdBQTJHO0FBQzNHLGdDQUFnQztBQUNoQyxrREFBa0Q7QUFDbEQsd0dBQXdHO0FBQ3hHLDhDQUE4QztBQUM5QyxNQUFNO0FBQ04sTUFBTTtBQUNOLE1BQU07QUFDTixxQ0FBcUM7QUFDckMsdUJBQXVCO0FBQ3ZCLHVDQUF1QztBQUN2Qyw2Q0FBNkM7QUFDN0MsMkJBQTJCO0FBQzNCLGlHQUFpRztBQUNqRyxzQ0FBc0M7QUFDdEMsdUJBQXVCO0FBQ3ZCLHVEQUF1RDtBQUN2RCxvR0FBb0c7QUFDcEcsOEJBQThCO0FBQzlCLGtFQUFrRTtBQUNsRSwwQ0FBMEM7QUFDMUMsOEZBQThGO0FBQzlGLDZDQUE2QztBQUM3Qyw0RkFBNEY7QUFDNUYsNEVBQTRFO0FBQzVFLHFEQUFxRDtBQUNyRCx3REFBd0Q7QUFDeEQseUZBQXlGO0FBQ3pGLHFCQUFxQiJ9