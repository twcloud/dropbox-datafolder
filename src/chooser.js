"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dropbox_1 = require("dropbox");
const common_1 = require("./common");
const async_1 = require("./async");
const SESSION_KEY = 'twcloud-dropbox-session';
const ORIGINAL_KEY = 'twcloud-dropbox-original';
const SCRIPT_KEY = 'twcloud-dropbox-script';
const PRELOAD_KEY = 'twcloud-dropbox-preload';
const SCRIPT_CACHE = "201807041";
function getAppKey(type) {
    return (type === "full" ? "gy3j4gsa191p31x"
        : (type === "apps" ? "tu8jc7jsdeg55ta"
            : ""));
}
exports.getAppKey = getAppKey;
class Chooser {
    constructor(container, options) {
        this.container = container;
        this.user = undefined;
        this.token = {};
        this.filelist = {};
        this.openFile = () => { };
        this.status = new common_1.StatusHandler("");
        if (options.type !== "apps" && options.type !== "full") {
            this.status.setStatusMessage("type must be apps or full");
            throw "type must be apps or full";
        }
        this.type = options.type;
        this.cloud = new async_1.CloudObject(new dropbox_1.Dropbox({ clientId: this.getKey() }));
        //save the preload info in case we don't have a dropbox token
        this.preload = {
            user: options.user,
            path: options.path,
            type: options.type
        };
        this.token = options.token;
        this.cloud.client.setAccessToken(this.token.access_token);
    }
    getKey() { return getAppKey(this.type); }
    loadChooser(callback) {
        this.openFile = callback;
        this.status = new common_1.StatusHandler("");
        this.status.setStatusMessage("Loading account");
        Promise.all([
            this.cloud.filesListFolder({ path: "" }),
            this.cloud.client.usersGetCurrentAccount(undefined)
        ]).then(([files, _user]) => {
            this.user = _user;
            this.status = new common_1.StatusHandler(this.user.profile_photo_url || "");
            if (this.preload.user
                && (this.user.account_id !== this.preload.user
                    || this.token.account_id !== this.preload.user
                    || this.type !== this.preload.type)) {
                alert('You are logged into a different dropbox account than the one specified in this link');
                delete this.preload.user;
                delete this.preload.path;
                delete this.preload.type;
            }
            if (this.preload.path)
                return this.openFile(this.preload.path);
            this.container.appendChild(this.getHeaderElement());
            this.container.appendChild(this.getUserProfileElement());
            this.container.appendChild(this.getFilesListElement());
            this.container.appendChild(this.getFooterElement());
            this.readFolder(files, document.getElementById('twits-files'));
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
        const profile = document.createElement('div');
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
`;
        return el;
    }
    isFileMetadata(a) {
        return a[".tag"] === "file";
    }
    isFolderMetadata(a) {
        return a[".tag"] === "folder";
    }
    isHtmlFile(stat) {
        return ['.htm', '.html'].indexOf(stat.name.slice(stat.name.lastIndexOf('.'))) > -1;
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
    streamFilesListFolder(folderpath, handler) {
        this.cloud.filesListFolder({ path: folderpath }).then((entries) => {
            handler(entries);
        });
    }
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
        Promise.resolve(Array.isArray(folderpath)
            ? folderpath : this.cloud.filesListFolder({ path: folderpath })).then((stats) => {
            // filelist.push.apply(filelist, stats);
            stats.forEach(e => this.filelist[e.path_lower] = e);
            loadingMessage.innerText = "Loading " + stats.length + "...";
            loadingMessage.remove();
            stats.sort((a, b) => 
            //order by isFolder DESC, name ASC
            (+this.isFolderMetadata(b) - +this.isFolderMetadata(a)) || a.name.localeCompare(b.name));
            for (var t = 0; t < stats.length; t++) {
                const stat = stats[t];
                var listItem = document.createElement("div"), classes = [], type = "";
                if (this.isFolderMetadata(stat)) {
                    classes.push("twits-folder");
                    type = "folder";
                }
                else if (this.isFileMetadata(stat)) {
                    classes.push("twits-file");
                    if (this.isHtmlFile(stat)) {
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
                if (this.isFolderMetadata(stat) || (this.isFileMetadata(stat) && (this.isHtmlFile(stat) || this.isTWInfoFile(stat)))) {
                    link = document.createElement("a");
                    link.href = location.origin + location.pathname + location.search
                        + "&path=" + encodeURIComponent(stat.path_lower)
                        + "&user=" + encodeURIComponent(this.user.account_id) + location.hash;
                    link.setAttribute("data-twits-path", stat.path_lower);
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
                if (this.isFileMetadata(stat) && this.getHumanSize(stat.size)) {
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
                self.openFile(self.isFileMetadata(meta) ? meta : filepath);
            }
            event.preventDefault();
            return false;
        };
    }
}
exports.Chooser = Chooser;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hvb3Nlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImNob29zZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSxxQ0FBc0Q7QUFDdEQscUNBQThEO0FBQzlELG1DQUFzQztBQUV0QyxNQUFNLFdBQVcsR0FBRyx5QkFBeUIsQ0FBQztBQUM5QyxNQUFNLFlBQVksR0FBRywwQkFBMEIsQ0FBQztBQUNoRCxNQUFNLFVBQVUsR0FBRyx3QkFBd0IsQ0FBQztBQUM1QyxNQUFNLFdBQVcsR0FBRyx5QkFBeUIsQ0FBQztBQUM5QyxNQUFNLFlBQVksR0FBRyxXQUFXLENBQUM7QUFtQmpDLG1CQUEwQixJQUFZO0lBQ3JDLE1BQU0sQ0FBQyxDQUFDLElBQUksS0FBSyxNQUFNLEdBQUcsaUJBQWlCO1VBQ3hDLENBQUMsSUFBSSxLQUFLLE1BQU0sR0FBRyxpQkFBaUI7Y0FDbkMsRUFBRSxDQUFDLENBQUMsQ0FBQztBQUNWLENBQUM7QUFKRCw4QkFJQztBQUVEO0lBVUMsWUFBbUIsU0FBeUIsRUFBRSxPQUFxQjtRQUFoRCxjQUFTLEdBQVQsU0FBUyxDQUFnQjtRQVI1QyxTQUFJLEdBQXNCLFNBQWdCLENBQUM7UUFHM0MsVUFBSyxHQUFrQixFQUFTLENBQUM7UUFDakMsYUFBUSxHQUEyQyxFQUFFLENBQUM7UUFzQnRELGFBQVEsR0FBcUIsUUFBUSxDQUFDLENBQUM7UUFqQnRDLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxzQkFBYSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ3BDLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEtBQUssTUFBTSxJQUFJLE9BQU8sQ0FBQyxJQUFJLEtBQUssTUFBTSxDQUFDLENBQUMsQ0FBQztZQUN4RCxJQUFJLENBQUMsTUFBTSxDQUFDLGdCQUFnQixDQUFDLDJCQUEyQixDQUFDLENBQUM7WUFDMUQsTUFBTSwyQkFBMkIsQ0FBQztRQUNuQyxDQUFDO1FBQ0QsSUFBSSxDQUFDLElBQUksR0FBRyxPQUFPLENBQUMs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