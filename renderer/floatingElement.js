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
  
/* ipcRenderer.on('database-updated', (event, newData, uiContent) => {
    console.log("database updated, populating sceneFileContent");
    createSceneFile(uiContent, newData);
}); */

ipcRenderer.on('database-loaded', (event, databaseContent) => {
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

        databaseData.data.forEach(entry => {
            container.appendChild(constructDiv(entry));
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
    toggleButton.addEventListener("click", function() {
        console.log("toggle button clicked");
        window.ipcRenderer.send("toggleButton", this.id);
    });
}

function clickAdd(element) {
    const addButton = element;
    addButton.addEventListener("click", function() {
        console.log("add button clicked");
        window.ipcRenderer.send("addButton", this.id);
    });
}

function constructDiv(newData) {
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
        toggleButton.className = 'toggle-button';
        toggleButton.id = newData.id;
        toggleButton.textContent = 'X';
        buttonContainer.appendChild(toggleButton);
        clickToggle(toggleButton);

        const addButton = document.createElement('button');
        addButton.className = 'add-button';
        addButton.id = newData.id;
        addButton.textContent = '+';
        buttonContainer.appendChild(addButton);
        clickAdd(addButton);

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

