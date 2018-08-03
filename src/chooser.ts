import { StatusHandler, IUserInfo, contains } from './common';
import { FileFuncs, obs_readdir, IFolderEntry } from './async-types';
import { Observable } from 'rxjs';

const SESSION_KEY = 'twcloud-dropbox-session';
const ORIGINAL_KEY = 'twcloud-dropbox-original';
const SCRIPT_KEY = 'twcloud-dropbox-script';
const PRELOAD_KEY = 'twcloud-dropbox-preload';
const SCRIPT_CACHE = "201807041";
type OpenFileCallback = (stat: IFolderEntry | string) => void;
// type ListFolderResultEntry = (files.FileMetadataReference | files.FolderMetadataReference | files.DeletedMetadataReference);


function toPromise<T>(obs: Observable<T>): Promise<T[]> {
	const res: T[] = [];
	return new Promise((resolve, reject) => {
		obs.forEach((item) => { res.push(item) }).then(() => resolve(res), reject);
	})
}

export class Chooser {

	status: StatusHandler;
	filelist: { [K: string]: IFolderEntry } = {};
	constructor(
		public container: HTMLDivElement,
		public cont: any,
		public ff: FileFuncs,
		public userInfo: IUserInfo
	) {
		this.status = new StatusHandler(this.userInfo.profile_photo_url);
	}

	openFile: OpenFileCallback = () => { };



	loadChooser(callback: OpenFileCallback) {
		this.openFile = callback;

		this.container.appendChild(Chooser.getHeaderElement());
		this.container.appendChild(this.getUserProfileElement());
		this.container.appendChild(this.getFilesListElement());
		this.container.appendChild(Chooser.getFooterElement())
		this.readFolder("", document.getElementById('twits-files') as Node);

	}
	static getHeaderElement() {
		const header = document.createElement('div');
		header.id = "twits-header";
		header.innerHTML = `
		<h1>
			<span class="line1">TiddlyWiki in the Sky </span><br>
			<span class="line2">using Dropbox</span><br/>
			<span class="line3">(by <a href="https://github.com/Arlen22">@Arlen22</a>*) <span class="twits-beta">beta</span></span>
		</h1>
		<p>
			The data folder will be loaded directly into the browser rather than being loaded into the server 
			and then served to the browser. This is akin to calling the server command with the template $:/core/save/all 
			(which is the default for the server command). There may be a few edge cases where this might not work, but it 
			should be fine for a standard data folder with core plugins.
		</p>
		<h3>
			Data folders loaded here are readonly until I get the bugs worked out. 
			There is no code to save changes back to the server yet, so fear not.
		</h3>
		`;

		return header;
	}
	getUserProfileElement() {
		const profile = document.createElement('div')
		profile.id = "twits-profile";
		const pic = document.createElement('img');
		pic.src = this.userInfo.profile_photo_url || "";
		pic.classList.add("profile-pic");
		profile.appendChild(pic);
		const textdata = document.createElement('span');
		textdata.innerText = this.userInfo.name
			+ (this.userInfo.orgInfo ? ("\n" + this.userInfo.orgInfo) : "");
		textdata.classList.add(this.userInfo.orgInfo ? "profile-name-team" : "profile-name");
		profile.appendChild(textdata);
		return profile;
	}
	getFilesListElement() {
		const el = document.createElement('div');
		el.id = "twits-files";
		return el;
	}
	static getFooterElement() {
		const el = document.createElement('div');
		el.id = "twits-footer";
		el.innerHTML = `
	<p>
		Comments or questions are welcome at
		<a href="https://github.com/twcloud/dropbox-datafolder">https://github.com/twcloud/dropbox-datafolder</a>
	</p>
	<p>
		*Originally built by <a href="http://twitter.com/Jermolene">@Jermolene</a> for TWC, and updated 
		by <a href="https://github.com/Arlen22">@Arlen22</a> to use the Dropbox v2 API and work with TW5.
	</p>
	<p>
		**The TiddlyWiki files and datafolders you open have full access to the page, they are not sandboxed in any way.
	</p>
`
		return el;
	}
	isTWInfoFile(stat: IFolderEntry) {
		return stat.name === "tiddlywiki.info";
	}
	getHumanSize(size: number) {
		const TAGS = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
		let power = 0;
		while (size >= 1024) {
			size /= 1024;
			power++;
		}
		return size.toFixed(1) + TAGS[power];
	}

	// streamFilesListFolder(folderpath: string, handler: (entries: IFolderEntry[]) => void) {
	// 	var res: IFolderEntry[];
	// 	return this.ff.obs_readdir(this.cont)()(folderpath).forEach(([err, files]) => {
	// 		if(err) throw err;
	// 		else res = files; 
	// 	}).then(() => res)
	// }

	readFolder(folderpath: string, parentNode: Node) {
		const pageurl = new URL(location.href);
		const loadingMessage = document.createElement("div");
		loadingMessage.innerText = "Loading...";
		loadingMessage.classList.add("loading-message");

		var listParent = document.createElement("div");
		listParent.classList.add("twits-folderlist");
		listParent.appendChild(loadingMessage);
		parentNode.appendChild(listParent);

		// const filelist: files.ListFolderResult["entries"] = [];
		const stats: string[] = []
		return this.ff.obs_readdir(this.cont)()(folderpath).forEach(([err, stats]) => {
			loadingMessage.innerText = "Loading " + stats.length + "...";
			loadingMessage.remove();
			stats.forEach(e => { this.filelist[e.fullpath] = e; })
			stats.sort((a, b) => (
				+(b.type === "folder") - +(a.type === "folder")) || a.name.localeCompare(b.name)
			);

			for (var t = 0; t < stats.length; t++) {
				const stat = stats[t];

				var listItem = document.createElement("div"),
					classes = [], type = "";
				if (stat.type === "folder") {
					classes.push("twits-folder");
					type = "folder"
				} else {
					classes.push("twits-file");
					if (stat.type === "htmlfile") {
						classes.push("twits-file-html");
						type = "files/htmlfile"
					} else if (this.isTWInfoFile(stat)) {
						classes.push("twits-file-twinfo");
						type = "datafolder"
					} else {
						classes.push("twits-file-other");
						type = "other";
					}
				}

				var link;
				classes.push("twits-file-entry");
				if (contains(stat.type, ["folder", "htmlfile", "datafolder"])) {
					link = document.createElement("a");
					link.href = location.origin + location.pathname + location.search
						+ "&path=" + encodeURIComponent(stat.fullpath)
						+ "&user=" + encodeURIComponent(this.userInfo.accountID) + location.hash;
					link.setAttribute("data-twits-path", stat.fullpath);
					link.addEventListener("click", this.onClickFolderEntry(), false);
				} else {
					link = document.createElement("span");
				}
				link.className = classes.join(" ");
				var img = document.createElement("img");
				img.src = "icons/" + type + ".png";
				img.style.width = "16px";
				img.style.height = "16px";
				link.appendChild(img);
				link.appendChild(document.createTextNode(stat.name));

				if (stat.type !== "folder" && typeof stat.size === "number" && this.getHumanSize(stat.size)) {
					var size = document.createElement("span");
					size.appendChild(document.createTextNode(" (" + this.getHumanSize(stat.size) + ")"));
					link.appendChild(size);
				}
				listItem.appendChild(link);
				listParent.appendChild(listItem);
			}
		});
	};

	onClickFolderEntry() {
		const self = this;
		return function (this: HTMLAnchorElement, event: MouseEvent) {
			if (event.altKey || event.ctrlKey || event.shiftKey) return true;
			var filepath = this.getAttribute("data-twits-path") || "";
			if (this.classList.contains("twits-folder") && !this.classList.contains("twits-folder-open")) {
				this.classList.add("twits-folder-open");
				self.readFolder(filepath, this.parentNode as Node);
			} else {
				var type = this.classList.contains("twits-file-html") ? "htmlfile" :
					this.classList.contains("twits-file-twinfo") ? "datafolder" : "";
				var meta = self.filelist[filepath];
				self.openFile(meta || filepath);
			}
			event.preventDefault();
			return false;
		}
	}

}