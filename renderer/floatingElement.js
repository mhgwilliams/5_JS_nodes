const searchBox = document.getElementById("searchBox");
const sceneFileContent = document.getElementById("sceneFileContent");

// Make the element draggable
const element = document.getElementById("floatingElement");
const header = document.querySelector(".header");

let isDragging = false;
let offsetX, offsetY;

// #region Icons
const trashIcon = `
    <?xml version="1.0" encoding="utf-8"?>
    <svg width="50px" height="50px" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" class = "trash-icon">
    <path  d="M3 6.38597C3 5.90152 3.34538 5.50879 3.77143 5.50879L6.43567 5.50832C6.96502 5.49306 7.43202 5.11033 7.61214 4.54412C7.61688 4.52923 7.62232 4.51087 7.64185 4.44424L7.75665 4.05256C7.8269 3.81241 7.8881 3.60318 7.97375 3.41617C8.31209 2.67736 8.93808 2.16432 9.66147 2.03297C9.84457 1.99972 10.0385 1.99986 10.2611 2.00002H13.7391C13.9617 1.99986 14.1556 1.99972 14.3387 2.03297C15.0621 2.16432 15.6881 2.67736 16.0264 3.41617C16.1121 3.60318 16.1733 3.81241 16.2435 4.05256L16.3583 4.44424C16.3778 4.51087 16.3833 4.52923 16.388 4.54412C16.5682 5.11033 17.1278 5.49353 17.6571 5.50879H20.2286C20.6546 5.50879 21 5.90152 21 6.38597C21 6.87043 20.6546 7.26316 20.2286 7.26316H3.77143C3.34538 7.26316 3 6.87043 3 6.38597Z" />
    <path fill-rule="evenodd"  clip-rule="evenodd" d="M11.5956 22.0001H12.4044C15.1871 22.0001 16.5785 22.0001 17.4831 21.1142C18.3878 20.2283 18.4803 18.7751 18.6654 15.8686L18.9321 11.6807C19.0326 10.1037 19.0828 9.31524 18.6289 8.81558C18.1751 8.31592 17.4087 8.31592 15.876 8.31592H8.12404C6.59127 8.31592 5.82488 8.31592 5.37105 8.81558C4.91722 9.31524 4.96744 10.1037 5.06788 11.6807L5.33459 15.8686C5.5197 18.7751 5.61225 20.2283 6.51689 21.1142C7.42153 22.0001 8.81289 22.0001 11.5956 22.0001ZM10.2463 12.1886C10.2051 11.7548 9.83753 11.4382 9.42537 11.4816C9.01321 11.525 8.71251 11.9119 8.75372 12.3457L9.25372 17.6089C9.29494 18.0427 9.66247 18.3593 10.0746 18.3159C10.4868 18.2725 10.7875 17.8856 10.7463 17.4518L10.2463 12.1886ZM14.5746 11.4816C14.9868 11.525 15.2875 11.9119 15.2463 12.3457L14.7463 17.6089C14.7051 18.0427 14.3375 18.3593 13.9254 18.3159C13.5132 18.2725 13.2125 17.8856 13.2537 17.4518L13.7537 12.1886C13.7949 11.7548 14.1625 11.4382 14.5746 11.4816Z" />
    </svg>
    `
const addIcon = `<?xml version="1.0" encoding="utf-8"?>
    <svg width="15px" height="15px" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" class = "add-icon">
    <path  fill-rule="evenodd" clip-rule="evenodd" d="M14.5 2.75C14.5 2.33579 14.8358 2 15.25 2H21.25C21.6642 2 22 2.33579 22 2.75V8.75C22 9.16421 21.6642 9.5 21.25 9.5C20.8358 9.5 20.5 9.16421 20.5 8.75V4.56066L13.7803 11.2803C13.4874 11.5732 13.0126 11.5732 12.7197 11.2803C12.4268 10.9874 12.4268 10.5126 12.7197 10.2197L19.4393 3.5H15.25C14.8358 3.5 14.5 3.16421 14.5 2.75Z" />
    <path  d="M11.25 2.75C5.72715 2.75 1.25 7.22715 1.25 12.75C1.25 18.2728 5.72715 22.75 11.25 22.75C16.7728 22.75 21.25 18.2728 21.25 12.75C21.25 12.1512 21.1974 11.5647 21.0965 10.9948C19.9254 10.9159 19 9.94104 19 8.75V8.18198L14.841 12.341C13.9623 13.2197 12.5377 13.2197 11.659 12.341C10.7803 11.4623 10.7803 10.0377 11.659 9.15901L15.818 5H15.25C14.059 5 13.0841 4.07456 13.0052 2.90352C12.4353 2.80263 11.8488 2.75 11.25 2.75Z"/>
    </svg>
    `

const removeIcon = `<?xml version="1.0" encoding="utf-8"?>
    <svg width="50px" height="50px" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" class = "remove-icon">
    <path fill-rule="evenodd" clip-rule="evenodd" d="M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12ZM8.96963 8.96965C9.26252 8.67676 9.73739 8.67676 10.0303 8.96965L12 10.9393L13.9696 8.96967C14.2625 8.67678 14.7374 8.67678 15.0303 8.96967C15.3232 9.26256 15.3232 9.73744 15.0303 10.0303L13.0606 12L15.0303 13.9696C15.3232 14.2625 15.3232 14.7374 15.0303 15.0303C14.7374 15.3232 14.2625 15.3232 13.9696 15.0303L12 13.0607L10.0303 15.0303C9.73742 15.3232 9.26254 15.3232 8.96965 15.0303C8.67676 14.7374 8.67676 14.2625 8.96965 13.9697L10.9393 12L8.96963 10.0303C8.67673 9.73742 8.67673 9.26254 8.96963 8.96965Z"/>
    </svg>
    `
// #endregion Icons

header.addEventListener("mousedown", (e) => {
    isDragging = true;
    offsetX = e.clientX - element.getBoundingClientRect().left;
    offsetY = e.clientY - element.getBoundingClientRect().top;
    document.addEventListener("mousemove", onDragMouseMove);
    document.addEventListener("mouseup", onDragMouseUp);
    
    header.style.userSelect = "none";
    element.style.userSelect = "none";
});

function onDragMouseMove(e) {
    if (!isDragging) return;
    element.style.left = e.clientX - offsetX + 'px';
    element.style.top = e.clientY - offsetY + 'px';
}

function onDragMouseUp() {
    isDragging = false;
    document.removeEventListener("mousemove", onDragMouseMove);
    document.removeEventListener("mouseup", onDragMouseUp);

    header.style.userSelect = "";
    element.style.userSelect = "";
}

// Collapse functionality
const collapseButton = document.querySelector(".collapse-button");
const content = document.querySelector("#floatingElement .content");

collapseButton.textContent = '-'; 

collapseButton.addEventListener("click", () => {
    const isCollapsed = content.style.display === "none";
    element.style.height = isCollapsed ? "450px" : "30px";
    element.style.width = isCollapsed ? "auto" : "170px";
    content.style.display = isCollapsed ? "" : "none";
    collapseButton.textContent = isCollapsed ? '-' : '+';
});

// Make the element resizable
const resizeHandle = document.querySelector(".resize-handle");

let isResizing = false;
let startX, startY, startWidth, startHeight;

resizeHandle.addEventListener("mousedown", (e) => {
    isResizing = true;
    startX = e.clientX;
    startY = e.clientY;
    startWidth = parseInt(document.defaultView.getComputedStyle(element).width, 10);
    startHeight = parseInt(document.defaultView.getComputedStyle(element).height, 10);
    document.addEventListener("mousemove", onResizeMouseMove);
    document.addEventListener("mouseup", onResizeMouseUp);
});

function onResizeMouseMove(e) {
    if (!isResizing) return;
    let width = startWidth + e.clientX - startX;
    let height = startHeight + e.clientY - startY;

    width = Math.max(width, 100);
    height = Math.max(height, 50);

    element.style.width = width + 'px';
    element.style.height = height + 'px';
}

function onResizeMouseUp() {
    isResizing = false;
    document.removeEventListener("mousemove", onResizeMouseMove);
    document.removeEventListener("mouseup", onResizeMouseUp);
}


searchBox.addEventListener("input", (event) => {
    const searchText = event.target.value;
    window.ipcRenderer.send("searchBox", searchText);
  });

ipcRenderer.on('search-results', (event, results) => {
    const container = sceneFileContent;
});

document.addEventListener('DOMContentLoaded', () => {
    // Your DOM manipulation code here
    console.log("DOM loaded in floatingElement.js");
});


ipcRenderer.on('load-ui', (event, databaseContent) => {
    console.log("database loaded, populating sceneFileContent");
    populateSceneFileContent(databaseContent);
});

ipcRenderer.on('newProjectFile', (event, newData) => {
    console.log("new project file, populating sceneFileContent");
    const container = sceneFileContent;

    if (container) {
        container.appendChild(constructDiv(newData));
    }
});

function populateSceneFileContent(databaseData) {
    const container = sceneFileContent;
    if (container) {
        container.innerHTML = ''; // Clear existing content

        databaseData.data.forEach((entry, index) => {
            const uiContent = databaseData.uiContent[index];
            container.appendChild(constructDiv(entry, uiContent));
        });
    }
}

function toggleCollapsible(element) {
    const coll = element;

    coll.addEventListener("click", function() {
        this.classList.toggle("active");
        var parent = this.parentElement;
        var content = parent.querySelector(".assets-outputs");
        if (!content) {
            content = parent.nextElementSibling;
        }
        if (content.style.display === "block") {
            content.style.display = "none";
        } else {
            content.style.display = "block";
        }
    });
}

function clickToggle(element) {
    const toggleButton = element;
    var state = 'add';
    toggleButton.addEventListener("click", function() {
        if (this.classList.contains("toggle-button-add")) {
            this.classList.remove("toggle-button-add");
            this.classList.add("toggle-button-remove");
            state = 'add';
            this.innerHTML = removeIcon;
            window.ipcRenderer.send("toggleButton", this.id, state);
        } else {
            this.classList.remove("toggle-button-remove");
            this.classList.add("toggle-button-add");
            state = 'remove';
            this.innerHTML = addIcon;
            window.ipcRenderer.send("toggleButton", this.id, state);
        }
    });
}

function clickDel(element) {
    const delButton = element;
    delButton.addEventListener("click", function() {
        console.log("del button clicked");
        window.ipcRenderer.send("delButton", this.id);
    });
}

function constructDiv(newData, uiContent) {
    try {
        const container = document.createElement('div');
        container.className = 'scene-file-entry';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';

        // Button container
        const buttonContainer = document.createElement('div');
        buttonContainer.style.display = 'flex';
        buttonContainer.style.flexWrap = 'nowrap';

        const collapsibleButton = document.createElement('button');
        collapsibleButton.className = 'collapsible';
        collapsibleButton.textContent = newData.file_name;
        buttonContainer.appendChild(collapsibleButton);
        toggleCollapsible(collapsibleButton);

        const toggleButton = document.createElement('button');

        if (uiContent.deployed === false) {
            toggleButton.className = 'toggle-button-add';
            toggleButton.innerHTML = addIcon;
        } else if (uiContent.deployed === true) {
            toggleButton.className = 'toggle-button-remove';
            toggleButton.innerHTML = removeIcon;
        }

        toggleButton.id = newData.id;
        toggleButton.style.backgroundColor = 'transparent';
        toggleButton.style.display = 'contents';
        buttonContainer.appendChild(toggleButton);
        clickToggle(toggleButton);

        const delButton = document.createElement('button');
        delButton.className = 'del-button';
        delButton.id = newData.id;
        delButton.style.backgroundColor = 'transparent';
        delButton.style.display = 'contents';
        delButton.innerHTML = trashIcon;
        buttonContainer.appendChild(delButton);
        clickDel(delButton);

        container.appendChild(buttonContainer);

        const assetsOutputsDiv = document.createElement('div');
        assetsOutputsDiv.className = 'assets-outputs';
        container.appendChild(assetsOutputsDiv);

        const assetsList = document.createElement('ul');
        if (newData.assets) {
            newData.assets.forEach(asset => {
                const li = document.createElement('li');
                li.textContent = pathBasename(asset.file_path);
                assetsList.appendChild(li);
            });
        }
        assetsOutputsDiv.appendChild(assetsList);

        // Similar construction for outputs

        return container;
    } catch (error) {
        console.error("Error occurred while creating div template:", error);
        return document.createElement('div'); // Return empty div in case of error
    }
}

