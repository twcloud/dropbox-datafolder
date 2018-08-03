"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("./common");
const SESSION_KEY = 'twcloud-dropbox-session';
const ORIGINAL_KEY = 'twcloud-dropbox-original';
const SCRIPT_KEY = 'twcloud-dropbox-script';
const PRELOAD_KEY = 'twcloud-dropbox-preload';
const SCRIPT_CACHE = "201807041";
// type ListFolderResultEntry = (files.FileMetadataReference | files.FolderMetadataReference | files.DeletedMetadataReference);
function toPromise(obs) {
    const res = [];
    return new Promise((resolve, reject) => {
        obs.forEach((item) => { res.push(item); }).then(() => resolve(res), reject);
    });
}
class Chooser {
    constructor(container, cont, ff, userInfo) {
        this.container = container;
        this.cont = cont;
        this.ff = ff;
        this.userInfo = userInfo;
        this.filelist = {};
        this.openFile = () => { };
        this.status = new common_1.StatusHandler(this.userInfo.profile_photo_url);
    }
    loadChooser(callback) {
        this.openFile = callback;
        this.container.appendChild(Chooser.getHeaderElement());
        this.container.appendChild(this.getUserProfileElement());
        this.container.appendChild(this.getFilesListElement());
        this.container.appendChild(Chooser.getFooterElement());
        this.readFolder("", document.getElementById('twits-files'));
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
        const profile = document.createElement('div');
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
`;
        return el;
    }
    isTWInfoFile(stat) {
        return stat.name === "tiddlywiki.info";
    }
    getHumanSize(size) {
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
    readFolder(folderpath, parentNode) {
        const pageurl = new URL(location.href);
        const loadingMessage = document.createElement("div");
        loadingMessage.innerText = "Loading...";
        loadingMessage.classList.add("loading-message");
        var listParent = document.createElement("div");
        listParent.classList.add("twits-folderlist");
        listParent.appendChild(loadingMessage);
        parentNode.appendChild(listParent);
        // const filelist: files.ListFolderResult["entries"] = [];
        const stats = [];
        return this.ff.obs_readdir(this.cont)()(folderpath).forEach(([err, stats]) => {
            loadingMessage.innerText = "Loading " + stats.length + "...";
            loadingMessage.remove();
            stats.forEach(e => { this.filelist[e.fullpath] = e; });
            stats.sort((a, b) => (+(b.type === "folder") - +(a.type === "folder")) || a.name.localeCompare(b.name));
            for (var t = 0; t < stats.length; t++) {
                const stat = stats[t];
                var listItem = document.createElement("div"), classes = [], type = "";
                if (stat.type === "folder") {
                    classes.push("twits-folder");
                    type = "folder";
                }
                else {
                    classes.push("twits-file");
                    if (stat.type === "htmlfile") {
                        classes.push("twits-file-html");
                        type = "files/htmlfile";
                    }
                    else if (this.isTWInfoFile(stat)) {
                        classes.push("twits-file-twinfo");
                        type = "datafolder";
                    }
                    else {
                        classes.push("twits-file-other");
                        type = "other";
                    }
                }
                var link;
                classes.push("twits-file-entry");
                if (common_1.contains(stat.type, ["folder", "htmlfile", "datafolder"])) {
                    link = document.createElement("a");
                    link.href = location.origin + location.pathname + location.search
                        + "&path=" + encodeURIComponent(stat.fullpath)
                        + "&user=" + encodeURIComponent(this.userInfo.accountID) + location.hash;
                    link.setAttribute("data-twits-path", stat.fullpath);
                    link.addEventListener("click", this.onClickFolderEntry(), false);
                }
                else {
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
    }
    ;
    onClickFolderEntry() {
        const self = this;
        return function (event) {
            if (event.altKey || event.ctrlKey || event.shiftKey)
                return true;
            var filepath = this.getAttribute("data-twits-path") || "";
            if (this.classList.contains("twits-folder") && !this.classList.contains("twits-folder-open")) {
                this.classList.add("twits-folder-open");
                self.readFolder(filepath, this.parentNode);
            }
            else {
                var type = this.classList.contains("twits-file-html") ? "htmlfile" :
                    this.classList.contains("twits-file-twinfo") ? "datafolder" : "";
                var meta = self.filelist[filepath];
                self.openFile(meta || filepath);
            }
            event.preventDefault();
            return false;
        };
    }
}
exports.Chooser = Chooser;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hvb3Nlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImNob29zZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSxxQ0FBOEQ7QUFJOUQsTUFBTSxXQUFXLEdBQUcseUJBQXlCLENBQUM7QUFDOUMsTUFBTSxZQUFZLEdBQUcsMEJBQTBCLENBQUM7QUFDaEQsTUFBTSxVQUFVLEdBQUcsd0JBQXdCLENBQUM7QUFDNUMsTUFBTSxXQUFXLEdBQUcseUJBQXlCLENBQUM7QUFDOUMsTUFBTSxZQUFZLEdBQUcsV0FBVyxDQUFDO0FBRWpDLCtIQUErSDtBQUcvSCxtQkFBc0IsR0FBa0I7SUFDdkMsTUFBTSxHQUFHLEdBQVEsRUFBRSxDQUFDO0lBQ3BCLE1BQU0sQ0FBQyxJQUFJLE9BQU8sQ0FBQyxDQUFDLE9BQU8sRUFBRSxNQUFNO1FBQ2xDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLE9BQU8sR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQztJQUM1RSxDQUFDLENBQUMsQ0FBQTtBQUNILENBQUM7QUFFRDtJQUlDLFlBQ1EsU0FBeUIsRUFDekIsSUFBUyxFQUNULEVBQWEsRUFDYixRQUFtQjtRQUhuQixjQUFTLEdBQVQsU0FBUyxDQUFnQjtRQUN6QixTQUFJLEdBQUosSUFBSSxDQUFLO1FBQ1QsT0FBRSxHQUFGLEVBQUUsQ0FBVztRQUNiLGFBQVEsR0FBUixRQUFRLENBQVc7UUFMM0IsYUFBUSxHQUFrQyxFQUFFLENBQUM7UUFVN0MsYUFBUSxHQUFxQixRQUFRLENBQUMsQ0FBQztRQUh0QyxJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksc0JBQWEsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLGlCQUFpQixDQUFDLENBQUM7SUFDbEUsQ0FBQztJQU1ELFdBQVcsQ0FBQyxRQUEwQjtRQUNy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