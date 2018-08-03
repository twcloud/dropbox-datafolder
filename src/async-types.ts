import { Observable } from 'rxjs';
import { Buffer } from 'buffer';

export interface StatsClass<BASE, FILE extends BASE, FOLDER extends BASE> {
	new(meta: BASE): Stats;
	isFileMetadata(a: BASE): a is FILE;
	isFolderMetadata(a: BASE): a is FOLDER;
	map(a: BASE): Stats;
}

export interface Stats {
	isFile(): boolean;
	isDirectory(): boolean;
	isBlockDevice(): boolean;
	isCharacterDevice(): boolean;
	isSymbolicLink(): boolean;
	isFIFO(): boolean;
	isSocket(): boolean;
	readonly dev: void;
	readonly ino: void;
	readonly mode: void;
	readonly nlink: void;
	readonly uid: void;
	readonly gid: void;
	readonly rdev: void;
	readonly size: number;
	readonly blksize: void;
	readonly blocks: void;
	readonly atime: Date;
	readonly mtime: Date;
	readonly ctime: Date;
	readonly birthtime: Date;
}

export interface IFolderEntry {
	name: string;
	basename: string;
	fullpath: string;
	type: "folder" | "htmlfile" | "datafolder" | "other" | "unknown",
	size?: number;
}

//obs_stat
export type obs_stat_result<T> = [Error | undefined, Stats, T, string];
declare const obs_stat: (cont: any, skipCache?: boolean | undefined) =>
	<T = undefined>(tag?: T) => (filepath: string) => Observable<obs_stat_result<T>>;
export type obs_stat = typeof obs_stat;
//obs_exists
export type obs_exists_result<T> = [boolean, T, string];
declare const obs_exists: (cont: any, skipCache?: boolean | undefined) =>
	<T = undefined>(tag?: T) => (filepath: string) => Observable<obs_exists_result<T>>;
export type obs_exists = typeof obs_exists;
//obs_readdir
export type obs_readdir_result<T> = [Error | undefined, Array<IFolderEntry>, T, string];
declare const obs_readdir: (cont: any) => <T>(tag?: T) =>
	(filepath: string) => Observable<obs_readdir_result<T>>;
export type obs_readdir = typeof obs_readdir;
// obs_readFile
export type obs_readFile_result_inner<T, U> = [Error | undefined, U, T, string];
declare const obs_readFile: (cont: any) => <T>(tag?: T) => {
	(filepath: string): Observable<obs_readFile_result_inner<T, Buffer>>;
	(filepath: string, encoding: string): Observable<obs_readFile_result_inner<T, string>>;
};
export type obs_readFile = typeof obs_readFile;

export interface FileFuncs {
	obs_stat: obs_stat;
	obs_exists: obs_exists;
	obs_readdir: obs_readdir;
	obs_readFile: obs_readFile;
	ENV: { [K: string]: string }
}