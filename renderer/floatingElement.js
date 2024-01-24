const searchBox = document.getElementById("searchBox");
const sceneFileContent = document.getElementById("sceneFileContent");

// Make the element draggable
const element = document.getElementById("floatingElement");
const header = document.querySelector(".header");

let isDragging = false;
let offsetX, offsetY;

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


  // populate the sceneFileContent div with the content of the database
  
ipcRenderer.on('database-updated', (event, newData, uiContent) => {
    console.log("database updated, populating sceneFileContent");
    createSceneFile(uiContent, newData);
    toggleCollapsible();
    clickToggle();
});

ipcRenderer.on('database-loaded', (event, databaseContent) => {
    console.log("database loaded, populating sceneFileContent");
    populateSceneFileContent(databaseContent);
    toggleCollapsible();
    clickToggle();
});

function createSceneFile(uiContent, newData) {
    const container = sceneFileContent;
    if (container) {
        //container.innerHTML = ''; // Clear existing content
        const entryDiv = createSingleDivTemplate(uiContent, newData);
        container.innerHTML += entryDiv;
    }
}

function populateSceneFileContent(databaseData) {
    const container = sceneFileContent;
    if (container) {
        container.innerHTML = ''; // Clear existing content

        databaseData.data.forEach(entry => {
            const entryDiv = createDivTemplate(entry);
            container.innerHTML += entryDiv;
        });
    }
}

function toggleCollapsible() {
    const coll = document.getElementsByClassName("collapsible");
    let i;

    for (i = 0; i < coll.length; i++) {
        coll[i].addEventListener("click", function() {
        this.classList.toggle("active");
        var content = this.nextElementSibling;
        if(content.class != "assets-outputs") {
            content = content.nextElementSibling;
        }
        if (content.style.display === "block") {
            content.style.display = "none";
        } else {
            content.style.display = "block";
        }
        });
    }
}

function createDivTemplate(entry) {
    try {

        const assets = entry.assets ? entry.assets.map(asset => `<li>${pathBasename(asset.file_path)}</li>`).join('') : '';
        const outputs = entry.outputs ? entry.outputs.map(output => `<li>${pathBasename(output.file_path)}</li>`).join('') : '';

        return `
            <div class="scene-file-entry" style="display:flex">
                <button class="collapsible">
                ${entry.file_name}</button>
                <button class="toggle-button" id="${entry.id}">X</button>
                <div class="assets-outputs">
                    <h4>Assets:</h4>
                    <ul>
                        <div>${assets}</div>
                    </ul>
                    <h4>Outputs:</h4>
                    <ul>
                        <div>${outputs}</div>
                    </ul>
                </div>
            </div>
        `;
    } catch (error) {
        console.error("Error occurred while creating div template:", error);
        return ""; // Return empty string in case of error
    }
}

function clickToggle() {
    const toggleButton = document.getElementsByClassName("toggle-button");
    let i;

    for (i = 0; i < toggleButton.length; i++) {
        toggleButton[i].addEventListener("click", function() {
            console.log("toggle button clicked");
            window.ipcRenderer.send("toggleButton", this.id);
        });
    }
}

function createSingleDivTemplate(uiContent, newData) {
    try {

        const assets = newData.assets ? newData.assets.map(asset => `<li>${pathBasename(asset.file_path)}</li>`).join('') : '';
        const outputs = newData.outputs ? newData.outputs.map(output => `<li>${pathBasename(output.file_path)}</li>`).join('') : '';

        return `
            <div class="scene-file-entry" style="display:flex">
                <button class="collapsible">
                ${newData.file_name}</button>
                <button class="toggle-button" id="${newData.id}">X</button>
                <div class="assets-outputs">
                    <h4>Assets:</h4>
                    <ul>
                        <div>${assets}</div>
                    </ul>
                    <h4>Outputs:</h4>
                    <ul>
                        <div>${outputs}</div>
                    </ul>
                </div>
            </div>
        `;
    } catch (error) {
        console.error("Error occurred while creating div template:", error);
        return ""; // Return empty string in case of error
    }
}