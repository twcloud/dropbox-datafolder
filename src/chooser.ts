import { files, users, Dropbox, auth } from 'dropbox';
import { StatusHandler, dbx_filesListFolder } from './common';
import { CloudObject } from './async';

const SESSION_KEY = 'twcloud-dropbox-session';
const ORIGINAL_KEY = 'twcloud-dropbox-original';
const SCRIPT_KEY = 'twcloud-dropbox-script';
const PRELOAD_KEY = 'twcloud-dropbox-preload';
const SCRIPT_CACHE = "201807041";
type OpenFileCallback = (stat: files.FileMetadataReference | string) => void;
type ListFolderResultEntry = (files.FileMetadataReference | files.FolderMetadataReference | files.DeletedMetadataReference);
interface IDropboxToken {
	access_token: string,
	account_id: string,
	token_type: "bearer",
	uid: string;
	[K: string]: string;
}
interface IPreloadInfo {
	type: string;
	path: string;
	user: string;
	hash: string;
	tokenHash: string;
}
export class Chooser {
	cloud: CloudObject;
	user: users.FullAccount = undefined as any;
	status: StatusHandler;
	type: "apps" | "full";
	token: IDropboxToken = {} as any;
	filelist: { [K: string]: ListFolderResultEntry } = {};
	preload: { user: string; path: string; type: "apps" | "full" }
	getKey() {
		return (
			this.type === "full" ? "gy3j4gsa191p31x"
				: (this.type === "apps" ? "tu8jc7jsdeg55ta"
					: ""))
	}

	constructor(public container: HTMLDivElement, options: IPreloadInfo) {
		this.status = new StatusHandler("");
		if (options.type !== "apps" && options.type !== "full") {
			this.status.setStatusMessage("type must be apps or full");
			throw "type must be apps or full";
		}
		this.type = options.type;
		this.cloud = new CloudObject(new Dropbox({ clientId: this.getKey() }));
		//save the preload info in case we don't have a dropbox token
		this.preload = {
			user: options.user,
			path: options.path,
			type: options.type
		};
		//if the hash has the access_token then it is the dropbox oauth response
		// this.token = devtoken as any;
		this.token = {} as any;
		if (options.tokenHash) {
			let hash = options.tokenHash;
			if (hash.startsWith("#")) hash = hash.slice(1);
			hash.split('&').map(item => {
				let part = item.split('=');
				this.token[part[0]] = part[1];
			})
			this.cloud.client.setAccessToken(this.token.access_token);
			var preload = sessionStorage.getItem(PRELOAD_KEY);
			if (preload) this.preload = JSON.parse(preload);
			sessionStorage.setItem(PRELOAD_KEY, '');
		}
	}

	openFile: OpenFileCallback = () => { };

	loadChooser(callback: OpenFileCallback) {
		this.openFile = callback;

		if (!this.token.access_token) {
			if (this.preload.path) sessionStorage.setItem(PRELOAD_KEY, JSON.stringify(this.preload));
			else sessionStorage.setItem(PRELOAD_KEY, '');
			location.href = this.cloud.client.getAuthenticationUrl(
				encodeURIComponent(location.origin + location.pathname + "?source=oauth2&type=" + this.type),
				"",
				"token"
			);
			return;
		}
		this.status = new StatusHandler("");
		this.status.setStatusMessage("Loading account");
		Promise.all([
			this.cloud.filesListFolder({ path: "" }),
			this.cloud.client.usersGetCurrentAccount(undefined)
		]).then(([files, _user]) => {
			this.user = _user;
			this.status = new StatusHandler(this.user.profile_photo_url || "");
			if (this.preload.user
				&& (this.user.account_id !== this.preload.user
					|| this.token.account_id !== this.preload.user
					|| this.type !== this.preload.type)
			) {
				alert('You are logged into a different dropbox account than the one specified in this link');
				delete this.preload.user;
				delete this.preload.path;
				delete this.preload.type;
			}
			if (this.preload.path) return this.openFile(this.preload.path);

			this.container.appendChild(this.getHeaderElement());
			this.container.appendChild(this.getUserProfileElement());
			this.container.appendChild(this.getFilesListElement());
			this.container.appendChild(this.getFooterElement())
			this.readFolder(files, document.getElementById('twits-files') as Node);
			// this.openFile("/arlennotes/arlen-nature/tiddlywiki.info");
		});
	}
	getHeaderElement() {
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
		pic.src = this.user.profile_photo_url || "";
		pic.classList.add("profile-pic");
		profile.appendChild(pic);
		const textdata = document.createElement('span');
		textdata.innerText = this.user.name.display_name
			+ (this.user.team ? ("\n" + this.user.team.name) : "");
		textdata.classList.add(this.user.team ? "profile-name-team" : "profile-name");
		profile.appendChild(textdata);
		return profile;
	}
	getFilesListElement() {
		const el = document.createElement('div');
		el.id = "twits-files";
		return el;
	}
	getFooterElement() {
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
	isFileMetadata(a: any): a is files.FileMetadataReference {
		return a[".tag"] === "file";
	}
	isFolderMetadata(a: any): a is files.FolderMetadataReference {
		return a[".tag"] === "folder";
	}
	isHtmlFile(stat: files.FileMetadataReference) {
		return ['.htm', '.html'].indexOf(stat.name.slice(stat.name.lastIndexOf('.'))) > -1
	}
	isTWInfoFile(stat: files.FileMetadataReference) {
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

	streamFilesListFolder(folderpath: string, handler: (entries: files.MetadataReference[]) => void) {
		this.cloud.filesListFolder({ path: folderpath }).then((entries) => {
			handler(entries);
		})
	}

	readFolder(folderpath: string | files.MetadataReference[], parentNode: Node) {
		const pageurl = new URL(location.href);
		const loadingMessage = document.createElement("div");
		loadingMessage.innerText = "Loading...";
		loadingMessage.classList.add("loading-message");

		var listParent = document.createElement("div");
		listParent.classList.add("twits-folderlist");
		listParent.appendChild(loadingMessage);
		parentNode.appendChild(listParent);

		// const filelist: files.ListFolderResult["entries"] = [];
		Promise.resolve(Array.isArray(folderpath)
			? folderpath : this.cloud.filesListFolder({ path: folderpath })
		).then((stats) => {
			// filelist.push.apply(filelist, stats);
			stats.forEach(e => this.filelist[e.path_lower as string] = e as any);
			loadingMessage.innerText = "Loading " + stats.length + "...";
			loadingMessage.remove();
			stats.sort((a, b) =>
				//order by isFolder DESC, name ASC
				(+this.isFolderMetadata(b) - +this.isFolderMetadata(a)) || a.name.localeCompare(b.name)
			)

			for (var t = 0; t < stats.length; t++) {
				const stat = stats[t];

				var listItem = document.createElement("div"),
					classes = [], type = "";
				if (this.isFolderMetadata(stat)) {
					classes.push("twits-folder");
					type = "folder"
				} else if (this.isFileMetadata(stat)) {
					classes.push("twits-file");
					if (this.isHtmlFile(stat)) {
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
				if (this.isFolderMetadata(stat) || (this.isFileMetadata(stat) && (this.isHtmlFile(stat) || this.isTWInfoFile(stat)))) {
					link = document.createElement("a");
					link.href = location.origin + location.pathname + location.search
						+ "&path=" + encodeURIComponent(stat.path_lower as string)
						+ "&user=" + encodeURIComponent(this.user.account_id) + location.hash;
					link.setAttribute("data-twits-path", stat.path_lower as string);
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
				
				if (this.isFileMetadata(stat) && this.getHumanSize(stat.size)) {
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
				self.openFile(self.isFileMetadata(meta) ? meta : filepath);
			}
			event.preventDefault();
			return false;
		}
	}

}