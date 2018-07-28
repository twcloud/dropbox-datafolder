///<reference types="node"/>
import "source-map-support/register";
import { from, of, empty } from 'rxjs';
import { map, mergeMap, startWith, tap, catchError, count, mapTo, concatMap, merge } from 'rxjs/operators'
import * as path from 'path';
import { obs_readdir, Container } from '../src/async-filesystem';
import { override, startup_patch } from '../src/async';
import { inspect } from "util";
function tlog<T>(a: T): T {
	console.log(a);
	return a;
}
Error.stackTraceLimit = Infinity;
// var pause = true;
// while(pause) debugger;
const cont = override({ boot: {} });
type $TW = typeof cont["wikidud"];

const TWSource = "C:\\ArlenStuff\\TiddlyWiki5-compiled\\Source\\TiddlyWiki5-5.1.17";
const TWOutput = "C:\\ArlenStuff\\twcloud\\datafolder\\boot-async\\test-output";

var $tw: $TW = require(TWSource).TiddlyWiki();
$tw.boot.argv = [path.join(TWSource, "editions/empty")]
$tw.packageInfo = require(path.join(TWSource, "package.json"));
startup_patch($tw, { bootPath: path.join(TWSource, "boot") });
override($tw);

console.log('tiddlywiki loaded');
console.log('override complete');
from(['plugins', 'themes']).pipe(
	map(folder => path.join(TWSource, folder)),
	mergeMap(fullpath => obs_readdir(cont)()(fullpath)),
	mergeMap(([err, files, t, folder]) =>
		from(files.map(author => path.join(folder, author)))),
	startWith(path.join(TWSource, 'languages')),
	mergeMap(fullpath => obs_readdir(cont)()(fullpath)),
	mergeMap(([err, files, t, folder]) =>
		from(files.map(plugin => path.join(folder, plugin)))),
	startWith(path.join(TWSource, 'core')),
	mergeMap(fullpath => $tw.loadPluginFolder(of(fullpath)).pipe(mapTo(fullpath)))
).pipe(
	tap(console.log), count(), tap(console.log)
).pipe(
	mapTo(path.join(TWSource, "editions")),
	mergeMap(fullpath => obs_readdir(cont)()(fullpath)),
	mergeMap(([err, files, tag, editionsFolder]) =>
		tlog(err) ? empty() : from(files.map(file => path.join(editionsFolder, file)))
	),
	mergeMap((edition) => {
		var $tw2: $TW = require(TWSource).TiddlyWiki();
		$tw2.boot.argv = [edition];
		$tw2.packageInfo = require(path.join(TWSource, "package.json"));
		startup_patch($tw2, { bootPath: path.join(TWSource, "boot") });
		override($tw2);
		return of(true).pipe(
			tap(() => { console.time(edition); }),
			mergeMap(() => $tw2.loadWikiTiddlers(edition)),
			map(wikiInfo => {
				$tw2.boot.wikiInfo = wikiInfo;
				console.timeEnd(edition);
				return $tw2;
			})
		);
	})
).subscribe(() => { }, (err) => {
	// console.log(new Error().stack);
	console.log(inspect(err));
}, () => { cont.closeSubjects() })


